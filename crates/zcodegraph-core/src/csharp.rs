//! C# baseline extraction (roadmap 1-2-4).
//!
//! Mirrors the legacy TS csharpExtractor (src/extraction/languages/csharp.ts)
//! plus the orchestrator C#-specific passes (type-position refs, primary-ctor
//! param refs; #381/#237) over tree-sitter-c-sharp 0.23.1 (ABI 14).
//! Preprocessor directive blanking lives in the parent's parse normalization.
//! ASP.NET route resolution and Razor stay in the TS shell.
//!
//! Scoping mirrors the TS orchestrator's single semantic stack: a `file` frame
//! sits at the bottom (excluded from qualified names), namespace/class-like/
//! method frames push on entry. Field/property/local/import never push. Rust's
//! other migrated languages model a package/namespace as kind `module`, so C#
//! namespaces become `module` nodes too; a namespace NAME keeps its dotted
//! form as a single segment (`App.Entities`), matching the TS
//! `App.Entities::CatalogBrand` qualified-name shape.

use tree_sitter::Node as SyntaxNode;

use crate::{push_ref, ExtractedEdge, ExtractedNode, SourceLanguage, UnresolvedRef};

const LANG: &str = "csharp";

fn is_builtin_type(name: &str) -> bool {
    matches!(
        name,
        "void" | "bool" | "byte" | "sbyte" | "char" | "decimal" | "double" | "float" | "int"
            | "uint" | "nint" | "nuint" | "long" | "ulong" | "short" | "ushort" | "object"
            | "string" | "dynamic"
    )
}

/// Reduce a type-position subtree to resolvable leaf names and their nodes.
fn type_leaf_names<'a>(
    node: SyntaxNode<'a>,
    source: &'a [u8],
) -> Vec<(String, SyntaxNode<'a>)> {
    fn push_text<'a>(
        n: SyntaxNode<'a>,
        source: &'a [u8],
        out: &mut Vec<(String, SyntaxNode<'a>)>,
    ) {
        if let Ok(text) = n.utf8_text(source) {
            let text = text.trim();
            if !text.is_empty() {
                out.push((text.to_string(), n));
            }
        }
    }

    fn walk<'a>(
        node: SyntaxNode<'a>,
        source: &'a [u8],
        out: &mut Vec<(String, SyntaxNode<'a>)>,
    ) {
        match node.kind() {
            // int/string/bool/var — never project refs.
            "predefined_type" | "implicit_type" => {}
            // `Namespace.Foo` / `Alias::Foo` — only the rightmost name is the type.
            "qualified_name" | "alias_qualified_name" => {
                if let Some(leaf) = node.child_by_field_name("name") {
                    if leaf.kind() == "generic_name" {
                        walk(leaf, source, out);
                    } else {
                        push_text(leaf, source, out);
                    }
                }
            }
            "generic_name" => {
                // Head identifier + every type argument.
                for c in node.named_children(&mut node.walk()) {
                    match c.kind() {
                        "identifier" => push_text(c, source, out),
                        "type_argument_list" => {
                            for arg in c.named_children(&mut c.walk()) {
                                walk(arg, source, out);
                            }
                        }
                        _ => {}
                    }
                }
            }
            "identifier" => push_text(node, source, out),
            // tuple_element has BOTH a type and an element-label name; walk
            // only the type field so the label never leaks as a ref.
            "tuple_element" => {
                if let Some(t) = node.child_by_field_name("type") {
                    walk(t, source, out);
                }
            }
            // Composite wrappers (nullable/array/pointer/ref/tuple types).
            // Callers only walk known type positions.
            _ => {
                for child in node.named_children(&mut node.walk()) {
                    walk(child, source, out);
                }
            }
        }
    }

    let mut out = Vec::new();
    walk(node, source, &mut out);
    out
}

fn emit_type_refs(
    type_node: SyntaxNode,
    from_id: &str,
    relative_path: &str,
    unresolved_refs: &mut Vec<UnresolvedRef>,
    source: &[u8],
) {
    for (name, at) in type_leaf_names(type_node, source) {
        if is_builtin_type(&name) {
            continue;
        }
        push_ref(
            unresolved_refs,
            from_id,
            &name,
            "references",
            at,
            relative_path,
            SourceLanguage::Csharp,
        );
    }
}

/// C# visibility/static/async modifiers.
///
/// The grammar wraps each keyword in a NAMED `modifier` node whose own text is
/// the keyword (`modifier @ 9,092 text "public"`; the keyword is an anonymous
/// child). The TS extractor reads `modifier.text` directly, so do the same —
/// iterating named children finds nothing. C# defaults to private.
fn modifiers(node: SyntaxNode, source: &[u8]) -> (Option<String>, bool, bool) {
    let mut visibility: Option<String> = None;
    let mut is_static = false;
    let mut is_async = false;
    for child in node.children(&mut node.walk()) {
        if child.kind() != "modifier" {
            continue;
        }
        let Ok(text) = child.utf8_text(source) else { continue };
        match text.trim() {
            "public" | "private" | "protected" | "internal" => {
                if visibility.is_none() {
                    visibility = Some(text.trim().to_string());
                }
            }
            "static" => is_static = true,
            "async" => is_async = true,
            _ => {}
        }
    }
    (
        visibility.or_else(|| Some("private".to_string())),
        is_static,
        is_async,
    )
}

/// Leaf attribute names in a declaration's attribute_list children.
fn attribute_names<'a>(
    node: SyntaxNode<'a>,
    source: &'a [u8],
) -> Vec<(String, SyntaxNode<'a>)> {
    let mut out = Vec::new();
    for list in node
        .named_children(&mut node.walk())
        .filter(|c| c.kind() == "attribute_list")
    {
        for attr in list
            .named_children(&mut list.walk())
            .filter(|c| c.kind() == "attribute")
        {
            if let Some(name_node) = attr.child_by_field_name("name") {
                if let Some((leaf, at)) = type_leaf_names(name_node, source).into_iter().last() {
                    out.push((leaf, at));
                }
            }
        }
    }
    out
}

/// A semantic-scope frame. The `file` frame sits at the bottom and is excluded
/// from qualified names (mirrors the TS nodeStack, which skips kind==='file').
struct Frame {
    id: String,
    name: String,
    kind: &'static str,
}

impl Frame {
    fn is_class_like(&self) -> bool {
        matches!(
            self.kind,
            "class" | "struct" | "interface" | "enum" | "module"
        )
    }
}

fn contains_edge(source: &str, target: &str, node: SyntaxNode) -> ExtractedEdge {
    ExtractedEdge {
        source: source.to_string(),
        target: target.to_string(),
        kind: "contains".to_string(),
        line: node.start_position().row as i64 + 1,
        col: node.start_position().column as i64,
    }
}

/// Qualified name = every non-file frame's name, then the symbol name.
fn qualified_name(stack: &[Frame], name: &str) -> String {
    let mut parts: Vec<String> = stack
        .iter()
        .filter(|f| f.kind != "file")
        .map(|f| f.name.clone())
        .collect();
    parts.push(name.to_string());
    parts.join("::")
}

/// Nearest class-like frame (skipping method frames); mirrors TS
/// isInsideClassLikeNode.
fn class_like_frame(stack: &[Frame]) -> Option<&Frame> {
    stack.iter().rev().find(|f| f.is_class_like())
}

/// The id that owns refs/calls inside a body: the method frame when present,
/// otherwise the enclosing class-like (field initializers), otherwise the file.
fn ref_owner(stack: &[Frame]) -> &str {
    for f in stack.iter().rev() {
        if f.kind == "method" {
            return &f.id;
        }
    }
    for f in stack.iter().rev() {
        if f.is_class_like() {
            return &f.id;
        }
    }
    &stack[0].id
}

/// `record struct` parses as a record_declaration carrying a `struct` keyword
/// child (0.23.1); plain `record` / `record class` are reference types.
fn type_decl_kind(node: SyntaxNode) -> Option<&'static str> {
    match node.kind() {
        "class_declaration" => Some("class"),
        "struct_declaration" => Some("struct"),
        "interface_declaration" => Some("interface"),
        "enum_declaration" => Some("enum"),
        "record_declaration" => {
            let is_struct = node.children(&mut node.walk()).any(|c| c.kind() == "struct");
            Some(if is_struct { "struct" } else { "class" })
        }
        _ => None,
    }
}

/// Module name for a using_directive.
///
/// Mirrors the TS extractImport hook: it takes the FIRST `qualified_name`
/// named child if present, else the first `identifier`. An alias using
/// (`using MyList = System.Collections.Generic.List<int>;`) has the alias as an
/// anonymous-field identifier and the right-hand side as a `qualified_name`,
/// so it is still emitted — under the right-hand fully-qualified text
/// (`System.Collections.Generic.List<int>`), NOT the alias.
fn using_module_name(node: SyntaxNode, source: &[u8]) -> Option<String> {
    if let Some(q) = node
        .named_children(&mut node.walk())
        .find(|c| c.kind() == "qualified_name")
    {
        return q
            .utf8_text(source)
            .ok()
            .map(str::trim)
            .filter(|s| !s.is_empty())
            .map(ToString::to_string);
    }
    node.child_by_field_name("name")
        .or_else(|| node.named_children(&mut node.walk()).find(|c| c.kind() == "identifier"))
        .and_then(|n| n.utf8_text(source).ok())
        .map(str::trim)
        .filter(|s| !s.is_empty())
        .map(ToString::to_string)
}

/// Callee name for an invocation's `function` subtree. Member access becomes
/// `receiver.method` (unless the receiver is this/base); a bare identifier
/// stays bare. Mirrors the TS extractCall catch-all rules.
fn call_reference_name(callee: SyntaxNode, source: &[u8]) -> Option<String> {
    let text = |n: SyntaxNode| -> Option<String> {
        n.utf8_text(source)
            .ok()
            .map(str::trim)
            .filter(|s| !s.is_empty())
            .map(ToString::to_string)
    };
    if callee.kind() == "member_access_expression" {
        let method = callee.child_by_field_name("name").and_then(text)?;
        let Some(receiver) = callee.child_by_field_name("expression") else {
            return Some(method);
        };
        match receiver.kind() {
            "invocation_expression" | "this_expression" | "base_expression" => Some(method),
            _ => {
                let receiver_text = text(receiver).unwrap_or_default();
                if receiver_text == "this" || receiver_text == "base" {
                    Some(method)
                } else if receiver_text.is_empty() {
                    Some(method)
                } else {
                    // `a.b.C()` keeps the leaf receiver name.
                    let leaf = type_leaf_names(receiver, source)
                        .into_iter()
                        .last()
                        .map(|(n, _)| n)
                        .unwrap_or(receiver_text);
                    Some(format!("{leaf}.{method}"))
                }
            }
        }
    } else {
        text(callee)
    }
}

pub(crate) fn extract(
    root: SyntaxNode,
    source: &[u8],
    relative_path: &str,
    file_node_id: &str,
    nodes: &mut Vec<ExtractedNode>,
    edges: &mut Vec<ExtractedEdge>,
    unresolved_refs: &mut Vec<UnresolvedRef>,
) -> Result<(), Box<dyn std::error::Error>> {
    let file_name = relative_path
        .replace('\\', "/")
        .rsplit('/')
        .next()
        .unwrap_or(relative_path)
        .to_string();
    let mut stack: Vec<Frame> = vec![Frame {
        id: file_node_id.to_string(),
        name: file_name,
        kind: "file",
    }];

    // File-scoped namespace (`namespace Foo;`): its types are SIBLINGS under
    // compilation_unit, not children. Mirror the TS orchestrator's
    // extractFilePackage: create the module frame ONCE, visit every other
    // top-level child with the frame active, then pop. Block namespaces are
    // handled inline by `walk` (their types are real children).
    let file_scoped = root
        .named_children(&mut root.walk())
        .find(|c| c.kind() == "file_scoped_namespace_declaration");

    if let Some(ns) = file_scoped {
        if let Some(pkg) = namespace_name(ns, source) {
            let module = ExtractedNode::symbol_with_qualified_name(
                relative_path,
                "module",
                &pkg,
                ns,
                LANG,
                qualified_name(&stack, &pkg),
            );
            let module_id = module.id.clone();
            edges.push(contains_edge(file_node_id, &module_id, ns));
            nodes.push(module);
            stack.push(Frame {
                id: module_id,
                name: pkg,
                kind: "module",
            });
            for child in root.named_children(&mut root.walk()) {
                if child.kind() == "file_scoped_namespace_declaration" {
                    continue;
                }
                walk(
                    child,
                    source,
                    relative_path,
                    &mut stack,
                    nodes,
                    edges,
                    unresolved_refs,
                )?;
            }
            stack.pop();
            return Ok(());
        }
    }

    walk(root, source, relative_path, &mut stack, nodes, edges, unresolved_refs)?;
    Ok(())
}

/// Dotted/name of a namespace node (block or file-scoped).
fn namespace_name(node: SyntaxNode, source: &[u8]) -> Option<String> {
    node.child_by_field_name("name")
        .or_else(|| {
            node.named_children(&mut node.walk())
                .find(|c| matches!(c.kind(), "qualified_name" | "identifier"))
        })
        .and_then(|n| n.utf8_text(source).ok())
        .map(str::trim)
        .filter(|s| !s.is_empty())
        .map(ToString::to_string)
}

#[allow(clippy::too_many_arguments)]
fn walk(
    node: SyntaxNode,
    source: &[u8],
    relative_path: &str,
    stack: &mut Vec<Frame>,
    nodes: &mut Vec<ExtractedNode>,
    edges: &mut Vec<ExtractedEdge>,
    unresolved_refs: &mut Vec<UnresolvedRef>,
) -> Result<(), Box<dyn std::error::Error>> {
    let kind = node.kind();

    // ---- using_directive -> import node + imports ref (no frame push) ------
    if kind == "using_directive" {
        if let Some(module_name) = using_module_name(node, source) {
            let import = ExtractedNode::symbol_with_qualified_name(
                relative_path,
                "import",
                &module_name,
                node,
                LANG,
                qualified_name(stack, &module_name),
            );
            let import_id = import.id.clone();
            edges.push(contains_edge(&stack[stack.len() - 1].id, &import_id, node));
            push_ref(
                unresolved_refs,
                &stack[stack.len() - 1].id,
                &module_name,
                "imports",
                node,
                relative_path,
                SourceLanguage::Csharp,
            );
            nodes.push(import);
        }
        return Ok(());
    }

    // File-scoped namespace is handled once at the extract() entry point;
    // reaching it via generic descent means the file had no valid namespace
    // name — just skip the node itself.
    if kind == "file_scoped_namespace_declaration" {
        return Ok(());
    }

    // ---- block namespace -> module frame -----------------------------------
    if kind == "namespace_declaration" {
        if let Some(pkg) = namespace_name(node, source) {
            let module = ExtractedNode::symbol_with_qualified_name(
                relative_path,
                "module",
                &pkg,
                node,
                LANG,
                qualified_name(stack, &pkg),
            );
            let module_id = module.id.clone();
            edges.push(contains_edge(&stack[stack.len() - 1].id, &module_id, node));
            nodes.push(module);
            stack.push(Frame {
                id: module_id,
                name: pkg,
                kind: "module",
            });
            if let Some(decl_list) = node
                .named_children(&mut node.walk())
                .find(|c| c.kind() == "declaration_list")
            {
                for decl in decl_list.named_children(&mut decl_list.walk()) {
                    walk(
                        decl,
                        source,
                        relative_path,
                        stack,
                        nodes,
                        edges,
                        unresolved_refs,
                    )?;
                }
            }
            stack.pop();
        }
        return Ok(());
    }

    // ---- field_declaration: one field node per declarator -----------------
    // Emits nodes directly (declarators share the declaration's modifiers and
    // type), then descends to catch initializer calls. Mirrors TS extractField.
    if kind == "field_declaration" && class_like_frame(stack).is_some() {
        let (visibility, is_static, _is_async) = modifiers(node, source);
        if let Some(var_decl) = node
            .named_children(&mut node.walk())
            .find(|c| c.kind() == "variable_declaration")
        {
            if let Some(type_node) = var_decl.child_by_field_name("type") {
                emit_type_refs(
                    type_node,
                    ref_owner(stack),
                    relative_path,
                    unresolved_refs,
                    source,
                );
            }
            for declarator in var_decl
                .named_children(&mut var_decl.walk())
                .filter(|c| c.kind() == "variable_declarator")
            {
                if let Some(name_node) = declarator
                    .child_by_field_name("name")
                    .filter(|n| n.kind() == "identifier")
                {
                    let name = name_node.utf8_text(source)?.trim().to_string();
                    if name.is_empty() {
                        continue;
                    }
                    let qn = qualified_name(stack, &name);
                    let mut field = ExtractedNode::symbol_with_visibility_and_qualified_name(
                        relative_path,
                        "field",
                        &name,
                        declarator,
                        LANG,
                        visibility.clone(),
                        qn,
                    );
                    field.is_static = is_static;
                    let fid = field.id.clone();
                    edges.push(contains_edge(&stack[stack.len() - 1].id, &fid, declarator));
                    nodes.push(field);
                }
            }
        }
        // Descend normally so initializer calls are captured (declarators
        // themselves are not declarations/calls and emit nothing).
        for child in node.named_children(&mut node.walk()) {
            walk(child, source, relative_path, stack, nodes, edges, unresolved_refs)?;
        }
        return Ok(());
    }

    // ---- local_declaration_statement -> variable node(s) ------------------
    // Only when NOT directly under a class-like scope (there it is a field).
    // A local_declaration_statement only ever occurs in a method/local-function
    // body (class members are field_declaration), so it is always a local.
    if kind == "local_declaration_statement" {
        if let Some(var_decl) = node
            .named_children(&mut node.walk())
            .find(|c| c.kind() == "variable_declaration")
        {
            if let Some(type_node) = var_decl.child_by_field_name("type") {
                emit_type_refs(
                    type_node,
                    ref_owner(stack),
                    relative_path,
                    unresolved_refs,
                    source,
                );
            }
            for declarator in var_decl
                .named_children(&mut var_decl.walk())
                .filter(|c| c.kind() == "variable_declarator")
            {
                if let Some(name_node) = declarator
                    .child_by_field_name("name")
                    .filter(|n| n.kind() == "identifier")
                {
                    let name = name_node.utf8_text(source)?.trim().to_string();
                    if !name.is_empty() {
                        let var = ExtractedNode::symbol_with_qualified_name(
                            relative_path,
                            "variable",
                            &name,
                            declarator,
                            LANG,
                            qualified_name(stack, &name),
                        );
                        let vid = var.id.clone();
                        edges.push(contains_edge(&stack[stack.len() - 1].id, &vid, declarator));
                        nodes.push(var);
                    }
                }
            }
        }
        // Fall through to generic descent so initializer calls/new are captured.
    }

    // ---- call / object-creation refs (owner = method, else class/file) ----
    if kind == "invocation_expression" {
        if let Some(function) = node.child_by_field_name("function") {
            if let Some(name) = call_reference_name(function, source) {
                push_ref(
                    unresolved_refs,
                    ref_owner(stack),
                    &name,
                    "calls",
                    node,
                    relative_path,
                    SourceLanguage::Csharp,
                );
            }
        }
    } else if kind == "object_creation_expression" {
        if let Some(type_node) = node.child_by_field_name("type") {
            for (name, at) in type_leaf_names(type_node, source) {
                if is_builtin_type(&name) {
                    continue;
                }
                push_ref(
                    unresolved_refs,
                    ref_owner(stack),
                    &name,
                    "instantiates",
                    at,
                    relative_path,
                    SourceLanguage::Csharp,
                );
            }
        }
    }

    // ---- named type declarations ------------------------------------------
    if let Some(sym_kind) = type_decl_kind(node) {
        let name = node
            .child_by_field_name("name")
            .and_then(|n| n.utf8_text(source).ok())
            .map(str::trim)
            .filter(|s| !s.is_empty())
            .map(ToString::to_string);
        if let Some(name) = name {
            let (visibility, _is_static, _is_async) = modifiers(node, source);
            let qn = qualified_name(stack, &name);
            let extracted = ExtractedNode::symbol_with_visibility_and_qualified_name(
                relative_path,
                sym_kind,
                &name,
                node,
                LANG,
                visibility,
                qn,
            );
            let id = extracted.id.clone();
            edges.push(contains_edge(&stack[stack.len() - 1].id, &id, node));

            // base_list: every entry is an `extends` ref (C# mixes the base
            // class and interfaces in one colon-separated list).
            for base in node
                .named_children(&mut node.walk())
                .filter(|c| c.kind() == "base_list")
            {
                for entry in base.named_children(&mut base.walk()) {
                    let leaves = match entry.kind() {
                        "primary_constructor_base_type" => entry
                            .child_by_field_name("type")
                            .map(|t| type_leaf_names(t, source))
                            .unwrap_or_default(),
                        _ => type_leaf_names(entry, source),
                    };
                    for (rname, at) in leaves {
                        if is_builtin_type(&rname) {
                            continue;
                        }
                        push_ref(
                            unresolved_refs,
                            &id,
                            &rname,
                            "extends",
                            at,
                            relative_path,
                            SourceLanguage::Csharp,
                        );
                    }
                }
            }

            // C# 12 primary-constructor parameter types are dependencies of
            // the owning type. The parameter_list is a direct (unnamed-field)
            // child of the type declaration.
            for param_list in node
                .children(&mut node.walk())
                .filter(|c| c.kind() == "parameter_list")
            {
                for param in param_list
                    .named_children(&mut param_list.walk())
                    .filter(|c| c.kind() == "parameter")
                {
                    if let Some(t) = param.child_by_field_name("type") {
                        emit_type_refs(t, &id, relative_path, unresolved_refs, source);
                    }
                }
            }

            // Attribute usages -> decorates refs.
            for (attr_name, at) in attribute_names(node, source) {
                push_ref(
                    unresolved_refs,
                    &id,
                    &attr_name,
                    "decorates",
                    at,
                    relative_path,
                    SourceLanguage::Csharp,
                );
            }

            nodes.push(extracted);

            stack.push(Frame {
                id: id.clone(),
                name: name.clone(),
                kind: sym_kind,
            });
            for child in node.named_children(&mut node.walk()) {
                walk(child, source, relative_path, stack, nodes, edges, unresolved_refs)?;
            }
            stack.pop();
            return Ok(());
        }
    }

    // ---- enum member -------------------------------------------------------
    if kind == "enum_member_declaration" {
        if let Some(name) = node
            .child_by_field_name("name")
            .and_then(|n| n.utf8_text(source).ok())
            .map(str::trim)
            .filter(|s| !s.is_empty())
            .map(ToString::to_string)
        {
            // Enum members carry no declaration-level visibility (mirror TS).
            let member = ExtractedNode::symbol_with_qualified_name(
                relative_path,
                "enum_member",
                &name,
                node,
                LANG,
                qualified_name(stack, &name),
            );
            let mid = member.id.clone();
            edges.push(contains_edge(&stack[stack.len() - 1].id, &mid, node));
            nodes.push(member);
        }
        return Ok(());
    }

    // ---- method / constructor ---------------------------------------------
    if kind == "method_declaration" || kind == "constructor_declaration" {
        let name = node
            .child_by_field_name("name")
            .and_then(|n| n.utf8_text(source).ok())
            .map(str::trim)
            .filter(|s| !s.is_empty())
            .map(ToString::to_string);
        if let Some(name) = name {
            let (visibility, is_static, is_async) = modifiers(node, source);
            let qn = qualified_name(stack, &name);
            let mut method = ExtractedNode::symbol_with_visibility_and_qualified_name(
                relative_path,
                "method",
                &name,
                node,
                LANG,
                visibility,
                qn,
            );
            method.is_static = is_static;
            // `async` is not carried by ExtractedNode (the Rust baseline struct
            // has no is_async field, like the other migrated languages).
            let _ = is_async;
            let id = method.id.clone();
            edges.push(contains_edge(&stack[stack.len() - 1].id, &id, node));

            // Return type (`returns` for methods; constructors have none).
            if kind == "method_declaration" {
                if let Some(returns) = node.child_by_field_name("returns") {
                    emit_type_refs(returns, &id, relative_path, unresolved_refs, source);
                }
            }
            // Parameter types.
            if let Some(params) = node.child_by_field_name("parameters") {
                for param in params
                    .named_children(&mut params.walk())
                    .filter(|c| c.kind() == "parameter")
                {
                    if let Some(t) = param.child_by_field_name("type") {
                        emit_type_refs(t, &id, relative_path, unresolved_refs, source);
                    }
                }
            }
            // Attributes on the method.
            for (attr_name, at) in attribute_names(node, source) {
                push_ref(
                    unresolved_refs,
                    &id,
                    &attr_name,
                    "decorates",
                    at,
                    relative_path,
                    SourceLanguage::Csharp,
                );
            }

            nodes.push(method);
            stack.push(Frame {
                id: id.clone(),
                name: name.clone(),
                kind: "method",
            });
            if let Some(body) = node.child_by_field_name("body") {
                for child in body.named_children(&mut body.walk()) {
                    walk(child, source, relative_path, stack, nodes, edges, unresolved_refs)?;
                }
            }
            stack.pop();
            return Ok(());
        }
    }

    // ---- property ----------------------------------------------------------
    if kind == "property_declaration" {
        if let Some(name) = node
            .child_by_field_name("name")
            .and_then(|n| n.utf8_text(source).ok())
            .map(str::trim)
            .filter(|s| !s.is_empty())
            .map(ToString::to_string)
        {
            let (visibility, is_static, _is_async) = modifiers(node, source);
            let qn = qualified_name(stack, &name);
            let mut property = ExtractedNode::symbol_with_visibility_and_qualified_name(
                relative_path,
                "property",
                &name,
                node,
                LANG,
                visibility,
                qn,
            );
            property.is_static = is_static;
            let id = property.id.clone();
            edges.push(contains_edge(&stack[stack.len() - 1].id, &id, node));
            if let Some(t) = node.child_by_field_name("type") {
                emit_type_refs(t, &id, relative_path, unresolved_refs, source);
            }
            for (attr_name, at) in attribute_names(node, source) {
                push_ref(
                    unresolved_refs,
                    &id,
                    &attr_name,
                    "decorates",
                    at,
                    relative_path,
                    SourceLanguage::Csharp,
                );
            }
            nodes.push(property);
            // Do NOT push a property frame; descend only into an expression-bodied
            // /initializer value for calls, never into accessor declarations.
            if let Some(value) = node
                .named_children(&mut node.walk())
                .find(|c| matches!(c.kind(), "equals_value_clause" | "arrow_expression_clause"))
            {
                for child in value.named_children(&mut value.walk()) {
                    walk(child, source, relative_path, stack, nodes, edges, unresolved_refs)?;
                }
            }
            return Ok(());
        }
    }

    // ---- generic descent ---------------------------------------------------
    for child in node.named_children(&mut node.walk()) {
        walk(child, source, relative_path, stack, nodes, edges, unresolved_refs)?;
    }
    Ok(())
}
