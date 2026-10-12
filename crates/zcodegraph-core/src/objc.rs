//! Objective-C baseline extraction (roadmap 1-2-14-2).
//!
//! Mirrors the legacy TS `objcExtractor` (src/extraction/languages/objc.ts)
//! as driven by the shared orchestrator (src/extraction/tree-sitter.ts), over
//! the tree-sitter-objc 3.0.2 grammar (ABI 14, bridged via
//! tree-sitter-language) — the same grammar generation family as the
//! production tree-sitter-objc.wasm.
//!
//! Node-shape contract (node-types census + a runtime AST probe of 3.0.2;
//! see roadmap decision on 1-2-14-2):
//!
//! * `preproc_include` -> `import` (`system_lib_string` `<Foundation/..>`
//!   or `string_literal` `"Foo.h"`), plus an `imports` ref.
//! * `class_interface` -> `class`, named by the bare `identifier` after
//!   `@interface`. The `superclass` field emits `extends`;
//!   `parameterized_arguments` (`<Proto, Other>`) emits one `implements`
//!   ref per name (mirrors the ObjC branch of TS extractInheritance). A
//!   category `@interface Foo (Bar)` / `@implementation Foo (Bar)` reuses
//!   the class name `Foo`.
//! * `class_implementation` emits NO new node: it looks up the class named
//!   by its first `identifier` in the same file (created by `@interface`)
//!   and attaches its methods, mirroring objcExtractor.visitNode.
//! * `method_definition` -> `method`. The selector joins every `method`
//!   field keyword with `:` (`doThing:withTitle:`), except a unary selector
//!   (`drive`). Leading `+` => class method (is_static), `-` => instance.
//!   `method_declaration` (the `;` form in @interface/@protocol) emits no
//!   node.
//! * `protocol_declaration` -> `protocol` (interfaceKind `protocol`). Its
//!   `protocol_reference_list <P>` emits no edge (TS extractInheritance has
//!   no ObjC-protocol branch). Requirements sit inside
//!   `qualified_protocol_interface_declaration` and are not symbols.
//! * `property_declaration` -> `property` ONLY inside a class frame (TS
//!   gated propertyTypes on isInsideClassLikeNode). Name comes from the
//!   inner `struct_declaration > struct_declarator > … > identifier`.
//! * `message_expression` -> `calls`: the `method` field keywords join into
//!   the selector; the `receiver` field is prefixed `receiver.selector`
//!   unless self/super or a nested message, and a Capitalized receiver also
//!   gets a `references` edge to the class.
//! * `call_expression` (plain C calls) -> `calls` via the `function` field,
//!   same as the C extractor.
//! * C-level `function_definition` (file scope), `struct_specifier` /
//!   `enum_specifier` with bodies (+`enumerator`), and `type_definition`
//!   mirror the C extractor.

use tree_sitter::{Node as SyntaxNode, TreeCursor};

use crate::{push_ref, ExtractedEdge, ExtractedNode, SourceLanguage, UnresolvedRef};

const LANG: &str = "objc";

/// A semantic (non-file) containment frame.
struct Frame {
    id: String,
    name: String,
    /// class / protocol / method / struct / enum / function — only a class
    /// frame makes an in-type `property_declaration` a baseline property.
    kind: String,
}

/// Qualified name built from the open frame names, matching the Swift
/// extractor: a top-level symbol is its bare name, a method is
/// `EnclosingType::selector`.
fn qualified_name(stack: &[Frame], name: &str) -> String {
    let mut parts: Vec<String> = stack.iter().map(|f| f.name.clone()).collect();
    parts.push(name.to_string());
    parts.join("::")
}

fn node_text<'a>(node: SyntaxNode<'a>, source: &'a [u8]) -> Option<String> {
    node.utf8_text(source)
        .ok()
        .map(str::trim)
        .filter(|s| !s.is_empty())
        .map(ToString::to_string)
}

fn named_children_vec<'a>(node: SyntaxNode<'a>) -> Vec<SyntaxNode<'a>> {
    node.named_children(&mut node.walk()).collect()
}

fn first_named_of_kind<'a>(node: SyntaxNode<'a>, kind: &str) -> Option<SyntaxNode<'a>> {
    named_children_vec(node).into_iter().find(|c| c.kind() == kind)
}

/// All children bound to the given field name (a field may repeat, like
/// `message_expression`'s one `method` keyword per selector piece).
fn field_children<'tree>(node: SyntaxNode<'tree>, field: &str) -> Vec<SyntaxNode<'tree>> {
    let mut cursor = node.walk();
    node.children_by_field_name(field, &mut cursor).collect()
}

fn push_contains(edges: &mut Vec<ExtractedEdge>, source: &str, target: &ExtractedNode) {
    edges.push(ExtractedEdge {
        source: source.to_string(),
        target: target.id.clone(),
        kind: "contains".to_string(),
        line: target.start_line,
        col: target.start_column,
    });
}

/// Name of a C declarator subtree: the declared NAME, pruning parameter
/// lists / initializers which only carry argument types and values.
fn c_declarator_name<'a>(node: SyntaxNode<'a>, source: &'a [u8]) -> Option<String> {
    match node.kind() {
        "identifier" | "field_identifier" | "type_identifier" => node_text(node, source),
        "parameter_list" | "argument_list" | "trailing_return_type" => None,
        "init_declarator" => node
            .child_by_field_name("declarator")
            .and_then(|d| c_declarator_name(d, source)),
        _ => {
            let mut last = None;
            for child in node.named_children(&mut node.walk()) {
                if let Some(name) = c_declarator_name(child, source) {
                    last = Some(name);
                }
            }
            last
        }
    }
}

fn include_name<'a>(node: SyntaxNode<'a>, source: &'a [u8]) -> Option<String> {
    named_children_vec(node).into_iter().find_map(|c| {
        if matches!(c.kind(), "system_lib_string" | "string_literal") {
            c.utf8_text(source).ok().map(|raw| {
                raw.trim()
                    .trim_start_matches(['<', '"'])
                    .trim_end_matches(['>', '"'])
                    .to_string()
            })
        } else {
            None
        }
    })
}

/// ObjC method selector from a `method_definition`/`method_declaration`.
///
/// In 3.0.2 the selector keywords are BARE direct `identifier` children
/// (unlike `message_expression`, whose keywords carry the `method:` field):
/// `(method_definition (method_type …) (identifier) (method_parameter …)
/// (identifier) (method_parameter …) (compound_statement …))`. Taking the
/// direct named-child identifiers (named children do NOT recurse, so the
/// argument-name identifier inside each `method_parameter` is excluded)
/// mirrors extractObjcMethodName. With any `method_parameter`, join with `:`
/// (`greet:withTitle:`); a unary selector (`drive`) is a bare identifier.
fn method_selector<'a>(node: SyntaxNode<'a>, source: &'a [u8]) -> Option<String> {
    let mut keywords: Vec<String> = Vec::new();
    let mut has_params = false;
    for child in node.named_children(&mut node.walk()) {
        match child.kind() {
            "identifier" => {
                if let Some(t) = node_text(child, source) {
                    keywords.push(t);
                }
            }
            "method_parameter" => has_params = true,
            _ => {}
        }
    }
    if keywords.is_empty() {
        return None;
    }
    if !has_params {
        Some(keywords.remove(0))
    } else {
        Some(keywords.iter().map(|k| format!("{k}:")).collect())
    }
}

/// Class method (`+`) vs instance method (`-`): the polarity marker is the
/// first child token.
fn method_is_static<'a>(node: SyntaxNode<'a>, source: &'a [u8]) -> bool {
    node.children(&mut node.walk())
        .next()
        .and_then(|tok| tok.utf8_text(source).ok())
        .is_some_and(|t| t.trim_start().starts_with('+'))
}

/// Property name from `property_declaration > struct_declaration >
/// struct_declarator > … > identifier` (extractObjcPropertyName).
fn property_name<'a>(node: SyntaxNode<'a>, source: &'a [u8]) -> Option<String> {
    let struct_decl = first_named_of_kind(node, "struct_declaration")?;
    let declarator = first_named_of_kind(struct_decl, "struct_declarator")?;
    c_declarator_name(declarator, source)
}

/// Plain C `call_expression` callee via the `function` field.
fn c_call_name<'a>(node: SyntaxNode<'a>, source: &'a [u8]) -> Option<String> {
    c_callee(node.child_by_field_name("function")?, source)
}

fn c_callee<'a>(node: SyntaxNode<'a>, source: &'a [u8]) -> Option<String> {
    match node.kind() {
        "identifier" | "field_identifier" => node_text(node, source),
        "field_expression" => node
            .child_by_field_name("field")
            .or_else(|| first_named_of_kind(node, "field_identifier"))
            .and_then(|f| node_text(f, source)),
        "parenthesized_expression" | "pointer_expression" => named_children_vec(node)
            .into_iter()
            .find_map(|c| c_callee(c, source)),
        _ => None,
    }
}

fn is_capitalized(name: &str) -> bool {
    name.chars().next().is_some_and(|ch| ch.is_ascii_uppercase())
}

/// struct/enum typedef detection, mirroring the TS resolveTypeAliasKind and
/// the C extractor's c_typedef_kind.
fn typedef_kind(node: SyntaxNode) -> &'static str {
    for child in named_children_vec(node) {
        if child.kind() == "enum_specifier" && child.child_by_field_name("body").is_some() {
            return "enum";
        }
        if child.kind() == "struct_specifier" && child.child_by_field_name("body").is_some() {
            return "struct";
        }
    }
    "type_alias"
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
    let mut stack: Vec<Frame> = Vec::new();
    let mut cursor = root.walk();
    visit(
        &mut cursor,
        source,
        relative_path,
        file_node_id,
        file_node_id,
        &mut stack,
        nodes,
        edges,
        unresolved_refs,
    )?;
    Ok(())
}

#[allow(clippy::too_many_arguments)]
fn visit(
    cursor: &mut TreeCursor,
    source: &[u8],
    relative_path: &str,
    contains_parent: &str,
    ref_parent: &str,
    stack: &mut Vec<Frame>,
    nodes: &mut Vec<ExtractedNode>,
    edges: &mut Vec<ExtractedEdge>,
    unresolved_refs: &mut Vec<UnresolvedRef>,
) -> Result<(), Box<dyn std::error::Error>> {
    let node = cursor.node();
    let kind = node.kind();

    // ---- imports: children carry no symbols ----
    if kind == "preproc_include" {
        if let Some(name) = include_name(node, source) {
            let import = ExtractedNode::symbol(relative_path, "import", &name, node, LANG);
            push_contains(edges, contains_parent, &import);
            nodes.push(import);
            push_ref(
                unresolved_refs,
                ref_parent,
                &name,
                "imports",
                node,
                relative_path,
                SourceLanguage::Objc,
            );
        }
        return Ok(());
    }

    // ---- class interface ----
    if kind == "class_interface" {
        if let Some(name) = named_children_vec(node)
            .into_iter()
            .find(|c| c.kind() == "identifier")
            .and_then(|c| node_text(c, source))
        {
            let qname = qualified_name(stack, &name);
            let extracted = ExtractedNode::symbol_with_visibility_and_qualified_name(
                relative_path,
                "class",
                &name,
                node,
                LANG,
                None,
                qname,
            );
            let id = extracted.id.clone();
            push_contains(edges, contains_parent, &extracted);
            nodes.push(extracted);

            if let Some(superclass) = node.child_by_field_name("superclass") {
                if let Some(sname) = node_text(superclass, source) {
                    push_ref(
                        unresolved_refs,
                        &id,
                        &sname,
                        "extends",
                        superclass,
                        relative_path,
                        SourceLanguage::Objc,
                    );
                }
            }
            // `@interface Foo <Proto, Other>` — parameterized_arguments holds
            // the conformance list (type_name > type_identifier, or a bare
            // type_identifier). Each becomes an `implements` ref.
            for arglist in named_children_vec(node)
                .into_iter()
                .filter(|c| c.kind() == "parameterized_arguments")
            {
                for child in named_children_vec(arglist) {
                    let target = if child.kind() == "type_name" {
                        first_named_of_kind(child, "type_identifier").unwrap_or(child)
                    } else if matches!(child.kind(), "type_identifier" | "identifier") {
                        child
                    } else {
                        continue;
                    };
                    if let Some(pname) = node_text(target, source) {
                        push_ref(
                            unresolved_refs,
                            &id,
                            &pname,
                            "implements",
                            target,
                            relative_path,
                            SourceLanguage::Objc,
                        );
                    }
                }
            }

            stack.push(Frame {
                id: id.clone(),
                name: name.clone(),
                kind: "class".to_string(),
            });
            for child in node.named_children(&mut node.walk()) {
                let mut cc = child.walk();
                visit(
                    &mut cc, source, relative_path, &id, &id, stack, nodes, edges,
                    unresolved_refs,
                )?;
            }
            stack.pop();
        }
        return Ok(());
    }

    // ---- class implementation: reuse the class created by @interface ----
    if kind == "class_implementation" {
        if let Some(class_name) = named_children_vec(node)
            .into_iter()
            .find(|c| c.kind() == "identifier")
            .and_then(|c| node_text(c, source))
        {
            // objcExtractor.visitNode: reuse the same-file class node; if the
            // @interface is in a header (separate file), fall back to a class
            // node in THIS file so the implementation's methods still attach.
            let existing = nodes.iter().find_map(|n| {
                (n.file_path == relative_path
                    && n.name == class_name
                    && n.kind == "class"
                    && n.language == LANG)
                    .then(|| n.id.clone())
            });
            let id = match existing {
                Some(id) => id,
                None => {
                    let qname = qualified_name(stack, &class_name);
                    let fallback = ExtractedNode::symbol_with_visibility_and_qualified_name(
                        relative_path,
                        "class",
                        &class_name,
                        node,
                        LANG,
                        None,
                        qname,
                    );
                    let fid = fallback.id.clone();
                    push_contains(edges, contains_parent, &fallback);
                    nodes.push(fallback);
                    fid
                }
            };
            stack.push(Frame {
                id: id.clone(),
                name: class_name.clone(),
                kind: "class".to_string(),
            });
            for child in node.named_children(&mut node.walk()) {
                let mut cc = child.walk();
                visit(
                    &mut cc, source, relative_path, &id, &id, stack, nodes, edges,
                    unresolved_refs,
                )?;
            }
            stack.pop();
        }
        return Ok(());
    }

    // ---- protocol ----
    if kind == "protocol_declaration" {
        if let Some(name) = named_children_vec(node)
            .into_iter()
            .find(|c| c.kind() == "identifier")
            .and_then(|c| node_text(c, source))
        {
            let qname = qualified_name(stack, &name);
            let extracted = ExtractedNode::symbol_with_qualified_name(
                relative_path,
                "protocol",
                &name,
                node,
                LANG,
                qname,
            );
            let id = extracted.id.clone();
            push_contains(edges, contains_parent, &extracted);
            nodes.push(extracted);

            // Requirements (method_declaration, property_declaration) are not
            // symbols, but recurse inside a protocol frame so any nested
            // expression calls attribute to the protocol.
            stack.push(Frame {
                id: id.clone(),
                name: name.clone(),
                kind: "protocol".to_string(),
            });
            for child in node.named_children(&mut node.walk()) {
                let mut cc = child.walk();
                visit(
                    &mut cc, source, relative_path, &id, &id, stack, nodes, edges,
                    unresolved_refs,
                )?;
            }
            stack.pop();
        }
        return Ok(());
    }

    // ---- method definition (inside @implementation) ----
    if kind == "method_definition" {
        if let Some(name) = method_selector(node, source) {
            let qname = qualified_name(stack, &name);
            let mut extracted = ExtractedNode::symbol_with_visibility_and_qualified_name(
                relative_path,
                "method",
                &name,
                node,
                LANG,
                None,
                qname,
            );
            extracted.is_static = method_is_static(node, source);
            let id = extracted.id.clone();
            let owner = stack
                .last()
                .filter(|f| matches!(f.kind.as_str(), "class" | "protocol"))
                .map(|f| f.id.clone())
                .unwrap_or_else(|| contains_parent.to_string());
            push_contains(edges, &owner, &extracted);
            nodes.push(extracted);

            if let Some(body) = first_named_of_kind(node, "compound_statement") {
                stack.push(Frame {
                    id: id.clone(),
                    name: name.clone(),
                    kind: "method".to_string(),
                });
                for child in body.named_children(&mut body.walk()) {
                    let mut cc = child.walk();
                    visit(
                        &mut cc, source, relative_path, &id, &id, stack, nodes, edges,
                        unresolved_refs,
                    )?;
                }
                stack.pop();
            }
        }
        return Ok(());
    }

    // method_declaration (the `;` prototype form) is never a baseline symbol.
    if kind == "method_declaration" {
        return Ok(());
    }

    // ---- property declaration, only inside a class frame ----
    if kind == "property_declaration" {
        let in_class = stack.last().is_some_and(|f| f.kind == "class");
        if in_class {
            if let Some(name) = property_name(node, source) {
                let owner = stack
                    .last()
                    .map(|f| f.id.clone())
                    .unwrap_or_else(|| contains_parent.to_string());
                let extracted =
                    ExtractedNode::symbol(relative_path, "property", &name, node, LANG);
                push_contains(edges, &owner, &extracted);
                nodes.push(extracted);
            }
        }
        return Ok(());
    }

    // ---- top-level C function definition ----
    if kind == "function_definition" && stack.is_empty() {
        if let Some(declarator) = node.child_by_field_name("declarator") {
            if let Some(name) = c_declarator_name(declarator, source) {
                let qname = qualified_name(stack, &name);
                let extracted = ExtractedNode::symbol_with_qualified_name(
                    relative_path,
                    "function",
                    &name,
                    node,
                    LANG,
                    qname,
                );
                let id = extracted.id.clone();
                push_contains(edges, contains_parent, &extracted);
                nodes.push(extracted);

                if let Some(body) = first_named_of_kind(node, "compound_statement") {
                    stack.push(Frame {
                        id: id.clone(),
                        name: name.clone(),
                        kind: "function".to_string(),
                    });
                    for child in body.named_children(&mut body.walk()) {
                        let mut cc = child.walk();
                        visit(
                            &mut cc, source, relative_path, &id, &id, stack, nodes, edges,
                            unresolved_refs,
                        )?;
                    }
                    stack.pop();
                }
            }
        }
        return Ok(());
    }

    // ---- struct / enum definitions with bodies (C-level, file scope) ----
    if (kind == "struct_specifier" || kind == "enum_specifier")
        && node.child_by_field_name("body").is_some()
        && stack.is_empty()
    {
        let skind = if kind == "struct_specifier" { "struct" } else { "enum" };
        if let Some(name_node) = node.child_by_field_name("name") {
            if let Some(name) = node_text(name_node, source) {
                let qname = qualified_name(stack, &name);
                let extracted = ExtractedNode::symbol_with_qualified_name(
                    relative_path, skind, &name, node, LANG, qname,
                );
                let id = extracted.id.clone();
                push_contains(edges, contains_parent, &extracted);
                nodes.push(extracted);

                if kind == "enum_specifier" {
                    if let Some(body) = node.child_by_field_name("body") {
                        for enumerator in named_children_vec(body)
                            .into_iter()
                            .filter(|c| c.kind() == "enumerator")
                        {
                            let ename_node = enumerator
                                .child_by_field_name("name")
                                .or_else(|| first_named_of_kind(enumerator, "identifier"));
                            if let Some(ename) = ename_node.and_then(|n| node_text(n, source)) {
                                let em = ExtractedNode::symbol(
                                    relative_path,
                                    "enum_member",
                                    &ename,
                                    enumerator,
                                    LANG,
                                );
                                push_contains(edges, &id, &em);
                                nodes.push(em);
                            }
                        }
                    }
                }
                // Struct fields are not baseline symbols; do not descend.
                return Ok(());
            }
        }
    }

    // ---- typedef ----
    if kind == "type_definition" {
        if let Some(declarator) = node.child_by_field_name("declarator") {
            if let Some(name) = c_declarator_name(declarator, source) {
                let tkind = typedef_kind(node);
                let extracted =
                    ExtractedNode::symbol(relative_path, tkind, &name, node, LANG);
                push_contains(edges, contains_parent, &extracted);
                nodes.push(extracted);
            }
        }
        return Ok(());
    }

    // ---- message expression -> calls ----
    if kind == "message_expression" {
        emit_message_call(
            node,
            source,
            relative_path,
            ref_parent,
            unresolved_refs,
        );
        // Recurse receiver + arguments for nested calls. The `method` field
        // keywords are selectors, not expressions — skip them to avoid
        // treating selector pieces as identifiers.
        let method_nodes: Vec<_> = field_children(node, "method");
        for child in node.named_children(&mut node.walk()) {
            if method_nodes.iter().any(|m| m.id() == child.id()) {
                continue;
            }
            let mut cc = child.walk();
            visit(
                &mut cc, source, relative_path, contains_parent, ref_parent, stack, nodes,
                edges, unresolved_refs,
            )?;
        }
        return Ok(());
    }

    // ---- plain C call expression -> calls ----
    if kind == "call_expression" {
        if let Some(callee) = c_call_name(node, source) {
            push_ref(
                unresolved_refs,
                ref_parent,
                &callee,
                "calls",
                node,
                relative_path,
                SourceLanguage::Objc,
            );
        }
    }

    // ---- default: recurse with unchanged parents ----
    for child in node.named_children(&mut node.walk()) {
        let mut cc = child.walk();
        visit(
            &mut cc, source, relative_path, contains_parent, ref_parent, stack, nodes, edges,
            unresolved_refs,
        )?;
    }
    Ok(())
}

/// Emit the `calls` (and, for a class receiver, `references`) edges for an
/// ObjC `[receiver selector:arg …]` message, mirroring the
/// message_expression branch of the TS call resolver.
fn emit_message_call(
    node: SyntaxNode,
    source: &[u8],
    relative_path: &str,
    ref_parent: &str,
    unresolved_refs: &mut Vec<UnresolvedRef>,
) {
    let mut keywords: Vec<String> = Vec::new();
    for kw in field_children(node, "method") {
        if let Some(t) = node_text(kw, source) {
            keywords.push(t);
        }
    }
    if keywords.is_empty() {
        return;
    }
    // A single keyword can be unary (`[c reset]`) or take one argument
    // (`[c storeImage:k]`); a ':' token distinguishes them.
    let has_colon = node.children(&mut node.walk()).any(|c| c.kind() == ":");
    let method_name = if keywords.len() == 1 && !has_colon {
        keywords.remove(0)
    } else {
        keywords.iter().map(|k| format!("{k}:")).collect::<String>()
    };

    let callee_name = match node.child_by_field_name("receiver") {
        Some(receiver) if receiver.kind() != "message_expression" => {
            match node_text(receiver, source) {
                Some(receiver_name)
                    if receiver_name != "self" && receiver_name != "super" =>
                {
                    // A Capitalized receiver is a class message
                    // (`[SDImageCache sharedCache]`): record the class itself
                    // via a `references` edge in addition to the call.
                    if is_capitalized(&receiver_name)
                        && receiver_name
                            .chars()
                            .all(|ch| ch.is_ascii_alphanumeric() || ch == '_')
                    {
                        push_ref(
                            unresolved_refs,
                            ref_parent,
                            &receiver_name,
                            "references",
                            receiver,
                            relative_path,
                            SourceLanguage::Objc,
                        );
                    }
                    format!("{receiver_name}.{method_name}")
                }
                _ => method_name,
            }
        }
        _ => method_name,
    };

    push_ref(
        unresolved_refs,
        ref_parent,
        &callee_name,
        "calls",
        node,
        relative_path,
        SourceLanguage::Objc,
    );
}