//! Pascal/Delphi baseline extraction (roadmap 1-2-10-1).
//!
//! Mirrors the legacy TS pascal surface: `src/extraction/languages/pascal.ts`
//! (declarative LanguageExtractor) plus the Pascal-specific walker arms in
//! `src/extraction/tree-sitter.ts::visitPascalNode` / `extractPascal*` /
//! `visitPascalBlock`. Grammar is Isopod/tree-sitter-pascal 0.10.2 (ABI 14
//! via tree-sitter-language 0.1), the same upstream the production
//! `tree-sitter-pascal.wasm` ships from.
//!
//! Coverage (node kinds + edges), locked against the TS reference:
//!
//! * `unit` / `program` / `library` -> `module` node, named by the leading
//!   `moduleName` (fallback: basename without extension). Children are
//!   visited with the module on the frame stack so descendants see it as
//!   their containment/ref parent (TS visitPascalNode unit branch +
//!   createNode's nodeStack side effect).
//! * `declUses` -> one `import` node per `moduleName` child, signature =
//!   full uses-clause text; one `imports` ref per moduleName with parent =
//!   top of stack (TS extractPascalUses).
//! * `declType` -> dispatch by inner kind (TS extractPascalDeclType):
//!   - inner `declClass` (covers `class`, `record`, `packed record`,
//!     generic classes — the grammar emits `declClass` for all of these)
//!     -> `class` node, plus `extends`/`implements` refs from the parent's
//!     `typeref` children (i==0 -> extends, else implements — TS
//!     extractPascalInheritance). Records have no typerefs, so the call
//!     is a no-op for them. Generic class names arrive as the raw text
//!     of the `genericTpl` name-field node (`TList<T>`), matching TS.
//!     `declHelper` (class helpers) falls through to the type_alias
//!     fallback exactly like TS (pascal.ts has no declHelper arm).
//!   - inner `declIntf` -> `interface` node.
//!   - inner `type > declEnum` -> `enum` node; each `declEnumValue`
//!     child yields an `enum_member` node.
//!   - otherwise -> `type_alias` node.
//! * `declConsts` / bare `declConst` -> `constant` node, signature =
//!   text of the `defaultValue` child (TS extractPascalConst).
//! * `declTypes` / `declVars` / `declSection` / `interface` /
//!   `implementation` -> pure containers, recurse into children.
//! * `declVar` (under `declVars`) -> `variable` node.
//! * `declProp` -> `property` node with visibility from the enclosing
//!   `declSection`.
//! * `declField` -> `field` node with visibility from the enclosing
//!   `declSection`.
//! * `declProc` (a procedure/function/constructor/destructor header) ->
//!   `function` when the nearest frame is NOT class-like, `method` when
//!   it is — matching the TS dispatcher's `functionTypes`/`methodTypes`
//!   arm + `isInsideClassLikeNode`. Signature is `<args>: <typeref>` per
//!   pascal.ts::getSignature; visibility from the enclosing declSection
//!   keyword; `is_static = true` when a `kClass` child is present
//!   (Delphi `class procedure` / `class function`). The declProc has no
//!   body child (the body lives on the paired defProc in the
//!   implementation section), so no body recursion happens here.
//! * `defProc` (the implementation body, paired with a declProc) does
//!   NOT create a new node (TS extractPascalDefProc): the matching
//!   declaration is located by name in a pre-built method index (full
//!   dotted name `TMyClass.Create` first, then short name `Create`),
//!   and the body block is visited with that declaration as the
//!   call-parent so `exprCall`s inside hang off the right method. If
//!   no match is found, the body is walked with the current
//!   containment parent.
//! * `exprCall` -> `calls` ref with the dotted/identifier callee name
//!   (TS extractPascalCall). Children are recursed so nested exprCalls
//!   inside `exprArgs` are picked up (TS visitPascalBlock).
//!
//! Qualified-name shape: `module::class::method` — file path is NOT
//! included, matching TS `buildQualifiedName` (semantic hierarchy only).
//! Frame names are pushed for `module`, `class`, `interface`, `enum`
//! (enum members take the enum's name as their nearest frame), and any
//! function/method (which currently has no body recursion, but the frame
//! is kept for parity with future nested-procedure support — Pascal
//! allows nested procedures, and the TS nodeStack side effect already
//! pushes one even though extractFunction's body visit is a no-op).
//!
//! Parse-error tolerance: Pascal stays OUT of `tolerates_parse_errors`
//! (roadmap 1-2-10-2 gates this on real corpora, the same Lua/Luau
//! pattern). The Isopod grammar covers Delphi + FPC dialects incl.
//! generics, RTTI attributes, anonymous procs and inline assembler, so
//! the modern-corpus drift class that hit Dart is not expected.

use std::collections::HashMap;

use tree_sitter::{Node as SyntaxNode, TreeCursor};

use crate::{push_ref, ExtractedEdge, ExtractedNode, SourceLanguage, UnresolvedRef};

const LANG: &str = "pascal";

/// A semantic containment frame. Every node that owns descendants
/// (module/class/interface/enum/function/method) pushes one; the file node
/// is the implicit root and is never on the stack.
struct Frame {
    /// Simple name, used to build the TS-style qualified name
    /// (`module::class::method`).
    name: String,
    /// The node id, used as the contains/ref parent for descendants.
    id: String,
    /// True when the frame is class-like (module | class | interface |
    /// enum). Free functions sit under the file or module frame; methods
    /// sit under a class-like frame. Mirrors TS `isInsideClassLikeNode`.
    is_class_like: bool,
}

fn node_text<'a>(node: SyntaxNode<'a>, source: &'a [u8]) -> Option<String> {
    node.utf8_text(source)
        .ok()
        .map(str::trim)
        .filter(|s| !s.is_empty())
        .map(ToString::to_string)
}

fn raw_text<'a>(node: SyntaxNode<'a>, source: &'a [u8]) -> Option<String> {
    node.utf8_text(source).ok().map(ToString::to_string)
}

fn named_children_vec<'a>(node: SyntaxNode<'a>) -> Vec<SyntaxNode<'a>> {
    node.named_children(&mut node.walk()).collect()
}

fn first_named_of_kind<'a>(node: SyntaxNode<'a>, kind: &str) -> Option<SyntaxNode<'a>> {
    named_children_vec(node).into_iter().find(|c| c.kind() == kind)
}

/// TS `buildQualifiedName`: the `::`-joined names of every non-file frame
/// on the stack, plus this node's name. Empty stack -> just the name.
fn qualified_name(stack: &[Frame], name: &str) -> String {
    let mut parts: Vec<&str> = stack.iter().map(|f| f.name.as_str()).collect();
    parts.push(name);
    parts.join("::")
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

/// pascal.ts `getSignature`: the `args` field text plus `: <typeref>` when
/// a named `typeref` sibling follows. Returns `None` when neither exists.
fn pascal_signature(node: SyntaxNode, source: &[u8]) -> Option<String> {
    let args = node.child_by_field_name("args");
    let return_type = named_children_vec(node)
        .into_iter()
        .find(|c| c.kind() == "typeref");
    if args.is_none() && return_type.is_none() {
        return None;
    }
    let mut sig = String::new();
    if let Some(a) = args {
        if let Some(t) = node_text(a, source) {
            sig.push_str(&t);
        }
    }
    if let Some(rt) = return_type {
        if let Some(t) = node_text(rt, source) {
            sig.push_str(": ");
            sig.push_str(&t);
        }
    }
    if sig.is_empty() {
        None
    } else {
        Some(sig)
    }
}

/// pascal.ts `getVisibility`: walk up the ancestor chain looking for a
/// `declSection` whose leading keyword child is one of
/// `kPublic`/`kPublished` -> public, `kPrivate` -> private, `kProtected`
/// -> protected. `None` when no enclosing declSection carries a marker.
fn pascal_visibility(mut node: SyntaxNode) -> Option<String> {
    while let Some(parent) = node.parent() {
        if parent.kind() == "declSection" {
            for i in 0..parent.child_count() {
                if let Some(child) = parent.child(i) {
                    match child.kind() {
                        "kPublic" | "kPublished" => return Some("public".to_string()),
                        "kPrivate" => return Some("private".to_string()),
                        "kProtected" => return Some("protected".to_string()),
                        _ => {}
                    }
                }
            }
        }
        node = parent;
    }
    None
}

/// pascal.ts `isStatic`: true when the node has a `kClass` child (Delphi
/// `class procedure T.Foo`, `class function T.Bar`, `class var`, etc.).
fn pascal_is_static(node: SyntaxNode) -> bool {
    (0..node.child_count()).any(|i| {
        node.child(i)
            .map(|c| c.kind() == "kClass")
            .unwrap_or(false)
    })
}

/// TS extractPascalInheritance: emit `extends`/`implements` refs from the
/// declClass's `typeref` children (i==0 -> extends, else implements).
/// Records have no typerefs, so this is a no-op for them.
fn push_inheritance_refs(
    decl_class: SyntaxNode,
    class_id: &str,
    source: &[u8],
    relative_path: &str,
    unresolved_refs: &mut Vec<UnresolvedRef>,
) {
    for (i, typeref) in named_children_vec(decl_class)
        .into_iter()
        .filter(|c| c.kind() == "typeref")
        .enumerate()
    {
        if let Some(name) = node_text(typeref, source) {
            let kind = if i == 0 { "extends" } else { "implements" };
            push_ref(
                unresolved_refs,
                class_id,
                &name,
                kind,
                typeref,
                relative_path,
                SourceLanguage::Pascal,
            );
        }
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
    let mut stack: Vec<Frame> = Vec::new();
    // Method index for defProc call-parent resolution. Built lazily on
    // first defProc so include-style files without implementations do no
    // extra work.
    let mut method_index: Option<HashMap<String, String>> = None;
    let mut cursor = root.walk();
    visit(
        &mut cursor,
        source,
        relative_path,
        file_node_id,
        file_node_id,
        &mut stack,
        &mut method_index,
        nodes,
        edges,
        unresolved_refs,
    )?;
    Ok(())
}

/// Build the TS `methodIndex`: maps lowercased names -> node id. Entries
/// keyed by (a) the function/method simple name, (b) each dotted suffix of
/// a method's `qualified_name` split on `::` (so `Module.Class.Method` and
/// `Class.Method` both resolve). First-seen wins for collisions, matching
/// TS.
fn build_method_index(nodes: &[ExtractedNode], relative_path: &str) -> HashMap<String, String> {
    let mut index: HashMap<String, String> = HashMap::new();
    for n in nodes {
        if n.file_path != relative_path {
            continue;
        }
        if n.kind != "method" && n.kind != "function" {
            continue;
        }
        let key = n.name.to_lowercase();
        index.entry(key).or_insert_with(|| n.id.clone());
        if n.kind == "method" {
            let parts: Vec<&str> = n.qualified_name.split("::").collect();
            if parts.len() >= 2 {
                for i in 0..parts.len() - 1 {
                    let scoped = parts[i..].join(".").to_lowercase();
                    index.entry(scoped).or_insert_with(|| n.id.clone());
                }
            }
        }
    }
    index
}

/// Current containment parent id: the innermost frame's id, or the file id
/// when the stack is empty.
fn contains_parent<'a>(stack: &'a [Frame], file_id: &'a str) -> &'a str {
    stack.last().map(|f| f.id.as_str()).unwrap_or(file_id)
}

/// True when the innermost frame is class-like (TS `isInsideClassLikeNode`
/// checks only the top of stack — TS treats `module` as class-like).
fn inside_class_like(stack: &[Frame]) -> bool {
    stack.last().map(|f| f.is_class_like).unwrap_or(false)
}

#[allow(clippy::too_many_arguments)]
fn visit(
    cursor: &mut TreeCursor,
    source: &[u8],
    relative_path: &str,
    file_node_id: &str,
    ref_parent: &str,
    stack: &mut Vec<Frame>,
    method_index: &mut Option<HashMap<String, String>>,
    nodes: &mut Vec<ExtractedNode>,
    edges: &mut Vec<ExtractedEdge>,
    unresolved_refs: &mut Vec<UnresolvedRef>,
) -> Result<(), Box<dyn std::error::Error>> {
    let node = cursor.node();
    let kind = node.kind();

    // ---- unit / program / library -> module node ----
    if kind == "unit" || kind == "program" || kind == "library" {
        let module_name_node = first_named_of_kind(node, "moduleName");
        let name = module_name_node
            .and_then(|n| node_text(n, source))
            .unwrap_or_else(|| {
                // Fallback to basename-without-extension, matching TS.
                std::path::Path::new(relative_path)
                    .file_stem()
                    .and_then(|s| s.to_str())
                    .unwrap_or(relative_path)
                    .to_string()
            });
        let qname = qualified_name(stack, &name);
        let module = ExtractedNode::symbol_with_qualified_name(
            relative_path,
            "module",
            &name,
            node,
            LANG,
            qname,
        );
        let module_id = module.id.clone();
        let module_name_owned = module.name.clone();
        let parent_id = contains_parent(stack, file_node_id).to_string();
        push_contains(edges, &parent_id, &module);
        nodes.push(module);
        stack.push(Frame {
            name: module_name_owned,
            id: module_id,
            is_class_like: true,
        });
        for child in node.named_children(&mut node.walk()) {
            let mut cc = child.walk();
            let ref_parent_now = stack.last().unwrap().id.clone();
            visit(
                &mut cc,
                source,
                relative_path,
                file_node_id,
                &ref_parent_now,
                stack,
                method_index,
                nodes,
                edges,
                unresolved_refs,
            )?;
        }
        stack.pop();
        return Ok(());
    }

    // ---- declType: class | interface | enum | type_alias ----
    if kind == "declType" {
        let Some(name_node) = node.child_by_field_name("name") else {
            return Ok(());
        };
        let Some(name) = node_text(name_node, source) else {
            return Ok(());
        };
        let decl_class = first_named_of_kind(node, "declClass");
        let decl_intf = first_named_of_kind(node, "declIntf");
        let type_child = first_named_of_kind(node, "type");
        let parent_id = contains_parent(stack, file_node_id).to_string();

        if let Some(decl_class) = decl_class {
            let qname = qualified_name(stack, &name);
            let class_node = ExtractedNode::symbol_with_qualified_name(
                relative_path,
                "class",
                &name,
                node,
                LANG,
                qname,
            );
            let class_id = class_node.id.clone();
            let class_name = class_node.name.clone();
            push_contains(edges, &parent_id, &class_node);
            nodes.push(class_node);
            push_inheritance_refs(decl_class, &class_id, source, relative_path, unresolved_refs);
            stack.push(Frame {
                name: class_name,
                id: class_id.clone(),
                is_class_like: true,
            });
            for child in decl_class.named_children(&mut decl_class.walk()) {
                let mut cc = child.walk();
                let ref_parent_now = stack.last().unwrap().id.clone();
                visit(
                    &mut cc,
                    source,
                    relative_path,
                    file_node_id,
                    &ref_parent_now,
                    stack,
                    method_index,
                    nodes,
                    edges,
                    unresolved_refs,
                )?;
            }
            stack.pop();
        } else if let Some(decl_intf) = decl_intf {
            let qname = qualified_name(stack, &name);
            let intf_node = ExtractedNode::symbol_with_qualified_name(
                relative_path,
                "interface",
                &name,
                node,
                LANG,
                qname,
            );
            let intf_id = intf_node.id.clone();
            let intf_name = intf_node.name.clone();
            push_contains(edges, &parent_id, &intf_node);
            nodes.push(intf_node);
            stack.push(Frame {
                name: intf_name,
                id: intf_id.clone(),
                is_class_like: true,
            });
            for child in decl_intf.named_children(&mut decl_intf.walk()) {
                let mut cc = child.walk();
                let ref_parent_now = stack.last().unwrap().id.clone();
                visit(
                    &mut cc,
                    source,
                    relative_path,
                    file_node_id,
                    &ref_parent_now,
                    stack,
                    method_index,
                    nodes,
                    edges,
                    unresolved_refs,
                )?;
            }
            stack.pop();
        } else if let Some(type_child) = type_child {
            let decl_enum = first_named_of_kind(type_child, "declEnum");
            if let Some(decl_enum) = decl_enum {
                let qname = qualified_name(stack, &name);
                let enum_node = ExtractedNode::symbol_with_qualified_name(
                    relative_path,
                    "enum",
                    &name,
                    node,
                    LANG,
                    qname,
                );
                let enum_id = enum_node.id.clone();
                push_contains(edges, &parent_id, &enum_node);
                nodes.push(enum_node);
                // Enum members do not push a frame in TS — they are leaves.
                for child in decl_enum.named_children(&mut decl_enum.walk()) {
                    if child.kind() != "declEnumValue" {
                        continue;
                    }
                    if let Some(member_name_node) = child.child_by_field_name("name") {
                        if let Some(member_name) = node_text(member_name_node, source) {
                            // TS enum_member qualifiedName uses the enum's
                            // name as the only prefix; frame stack at this
                            // point is still the outer scope, so qualify
                            // against the enum explicitly.
                            let member_qname = {
                                let mut parts: Vec<&str> =
                                    stack.iter().map(|f| f.name.as_str()).collect();
                                parts.push(&name);
                                parts.push(&member_name);
                                parts.join("::")
                            };
                            let member = ExtractedNode::symbol_with_qualified_name(
                                relative_path,
                                "enum_member",
                                &member_name,
                                child,
                                LANG,
                                member_qname,
                            );
                            push_contains(edges, &enum_id, &member);
                            nodes.push(member);
                        }
                    }
                }
            } else {
                // Simple type alias: `type TFoo = string` / `= Integer`.
                let qname = qualified_name(stack, &name);
                let alias = ExtractedNode::symbol_with_qualified_name(
                    relative_path,
                    "type_alias",
                    &name,
                    node,
                    LANG,
                    qname,
                );
                push_contains(edges, &parent_id, &alias);
                nodes.push(alias);
            }
        } else {
            // Fallback: forward declaration or simple alias (TS default).
            let qname = qualified_name(stack, &name);
            let alias = ExtractedNode::symbol_with_qualified_name(
                relative_path,
                "type_alias",
                &name,
                node,
                LANG,
                qname,
            );
            push_contains(edges, &parent_id, &alias);
            nodes.push(alias);
        }
        return Ok(());
    }

    // ---- declUses -> import nodes + imports refs ----
    if kind == "declUses" {
        let import_text = raw_text(node, source)
            .map(|s| s.trim().to_string())
            .unwrap_or_default();
        let parent_id = contains_parent(stack, file_node_id).to_string();
        for child in node.named_children(&mut node.walk()) {
            if child.kind() != "moduleName" {
                continue;
            }
            let Some(unit_name) = node_text(child, source) else {
                continue;
            };
            let qname = qualified_name(stack, &unit_name);
            let mut import = ExtractedNode::symbol_with_qualified_name(
                relative_path,
                "import",
                &unit_name,
                child,
                LANG,
                qname,
            );
            if !import_text.is_empty() {
                import.signature = Some(import_text.clone());
            }
            push_contains(edges, &parent_id, &import);
            nodes.push(import);
            push_ref(
                unresolved_refs,
                &parent_id,
                &unit_name,
                "imports",
                child,
                relative_path,
                SourceLanguage::Pascal,
            );
        }
        return Ok(());
    }

    // ---- declConsts / bare declConst -> constant ----
    if kind == "declConsts" {
        let parent_id = contains_parent(stack, file_node_id).to_string();
        for child in node.named_children(&mut node.walk()) {
            if child.kind() != "declConst" {
                continue;
            }
            emit_constant(child, source, relative_path, stack, &parent_id, nodes, edges);
        }
        return Ok(());
    }
    if kind == "declConst" {
        let parent_id = contains_parent(stack, file_node_id).to_string();
        emit_constant(node, source, relative_path, stack, &parent_id, nodes, edges);
        return Ok(());
    }

    // ---- declVars -> variable nodes ----
    if kind == "declVars" {
        let parent_id = contains_parent(stack, file_node_id).to_string();
        for child in node.named_children(&mut node.walk()) {
            if child.kind() != "declVar" {
                continue;
            }
            if let Some(name_node) = child.child_by_field_name("name") {
                if let Some(name) = node_text(name_node, source) {
                    let qname = qualified_name(stack, &name);
                    let var = ExtractedNode::symbol_with_qualified_name(
                        relative_path,
                        "variable",
                        &name,
                        child,
                        LANG,
                        qname,
                    );
                    push_contains(edges, &parent_id, &var);
                    nodes.push(var);
                }
            }
        }
        return Ok(());
    }

    // ---- declProp -> property node ----
    if kind == "declProp" {
        if let Some(name_node) = node.child_by_field_name("name") {
            if let Some(name) = node_text(name_node, source) {
                let visibility = pascal_visibility(node);
                let qname = qualified_name(stack, &name);
                let prop = ExtractedNode::symbol_with_visibility_and_qualified_name(
                    relative_path,
                    "property",
                    &name,
                    node,
                    LANG,
                    visibility,
                    qname,
                );
                let parent_id = contains_parent(stack, file_node_id).to_string();
                push_contains(edges, &parent_id, &prop);
                nodes.push(prop);
            }
        }
        return Ok(());
    }

    // ---- declField -> field node ----
    if kind == "declField" {
        if let Some(name_node) = node.child_by_field_name("name") {
            if let Some(name) = node_text(name_node, source) {
                let visibility = pascal_visibility(node);
                let qname = qualified_name(stack, &name);
                let field = ExtractedNode::symbol_with_visibility_and_qualified_name(
                    relative_path,
                    "field",
                    &name,
                    node,
                    LANG,
                    visibility,
                    qname,
                );
                let parent_id = contains_parent(stack, file_node_id).to_string();
                push_contains(edges, &parent_id, &field);
                nodes.push(field);
            }
        }
        return Ok(());
    }

    // ---- declProc: function (free) or method (inside class-like) ----
    // The declProc has NO body child (its body lives on the paired defProc
    // in the implementation section), so the TS extractFunction/extractMethod
    // body-visit is a no-op. We only create the node + signature/visibility/
    // is_static metadata.
    if kind == "declProc" {
        let Some(name_node) = node.child_by_field_name("name") else {
            return Ok(());
        };
        let Some(name) = node_text(name_node, source) else {
            return Ok(());
        };
        let visibility = pascal_visibility(node);
        let signature = pascal_signature(node, source);
        let is_static = pascal_is_static(node);
        let symbol_kind = if inside_class_like(stack) {
            "method"
        } else {
            "function"
        };
        let qname = qualified_name(stack, &name);
        let mut extracted = ExtractedNode::symbol_with_visibility_and_qualified_name(
            relative_path,
            symbol_kind,
            &name,
            node,
            LANG,
            visibility,
            qname,
        );
        extracted.signature = signature;
        extracted.is_static = is_static;
        let parent_id = contains_parent(stack, file_node_id).to_string();
        push_contains(edges, &parent_id, &extracted);
        nodes.push(extracted);
        // declProc carries no body; no children are visited.
        return Ok(());
    }

    // ---- defProc: implementation body. No new node; calls hang off the
    // matching declaration (TS extractPascalDefProc). ----
    if kind == "defProc" {
        // Build the method index lazily on first defProc.
        if method_index.is_none() {
            *method_index = Some(build_method_index(nodes, relative_path));
        }
        let decl_proc = first_named_of_kind(node, "declProc");
        let call_parent: String = (|| {
            let decl = decl_proc?;
            let name_node = decl.child_by_field_name("name")?;
            let full_name = node_text(name_node, source)?;
            let short_name = full_name
                .rsplit('.')
                .next()
                .unwrap_or(&full_name)
                .to_string();
            let full_key = full_name.to_lowercase();
            let short_key = short_name.to_lowercase();
            let index = method_index.as_ref().unwrap();
            index
                .get(&full_key)
                .or_else(|| index.get(&short_key))
                .cloned()
        })()
        .unwrap_or_else(|| ref_parent.to_string());

        if let Some(block) = first_named_of_kind(node, "block") {
            // No frame push: the defProc itself creates no node, and TS
            // visitPascalBlock uses the resolved call_parent directly.
            for child in block.named_children(&mut block.walk()) {
                let mut cc = child.walk();
                visit(
                    &mut cc,
                    source,
                    relative_path,
                    file_node_id,
                    &call_parent,
                    stack,
                    method_index,
                    nodes,
                    edges,
                    unresolved_refs,
                )?;
            }
        }
        return Ok(());
    }

    // ---- exprCall: emit a calls ref; recurse for nested calls ----
    if kind == "exprCall" {
        if let Some(first) = node.named_child(0) {
            let callee: Option<String> = match first.kind() {
                "exprDot" => {
                    let identifiers: Vec<String> = named_children_vec(first)
                        .into_iter()
                        .filter(|c| c.kind() == "identifier")
                        .filter_map(|c| node_text(c, source))
                        .collect();
                    if identifiers.is_empty() {
                        None
                    } else {
                        Some(identifiers.join("."))
                    }
                }
                "identifier" => node_text(first, source),
                _ => None,
            };
            if let Some(callee) = callee {
                if !callee.is_empty() {
                    push_ref(
                        unresolved_refs,
                        ref_parent,
                        &callee,
                        "calls",
                        node,
                        relative_path,
                        SourceLanguage::Pascal,
                    );
                }
            }
        }
        // Recurse into all children (incl. exprArgs) for nested exprCalls,
        // mirroring TS visitPascalBlock.
        for child in node.named_children(&mut node.walk()) {
            let mut cc = child.walk();
            visit(
                &mut cc,
                source,
                relative_path,
                file_node_id,
                ref_parent,
                stack,
                method_index,
                nodes,
                edges,
                unresolved_refs,
            )?;
        }
        return Ok(());
    }

    // ---- default: recurse with unchanged parents ----
    // Covers containers the TS visitPascalNode also explicitly recurses
    // through (`interface`/`implementation`/`declSection`/`declTypes`/
    // `block`), plus anything else without a dedicated arm.
    for child in node.named_children(&mut node.walk()) {
        let mut cc = child.walk();
        visit(
            &mut cc,
            source,
            relative_path,
            file_node_id,
            ref_parent,
            stack,
            method_index,
            nodes,
            edges,
            unresolved_refs,
        )?;
    }
    Ok(())
}

/// TS extractPascalConst: a `constant` node whose signature is the
/// `defaultValue` child text.
fn emit_constant(
    node: SyntaxNode,
    source: &[u8],
    relative_path: &str,
    stack: &[Frame],
    contains_parent: &str,
    nodes: &mut Vec<ExtractedNode>,
    edges: &mut Vec<ExtractedEdge>,
) {
    let Some(name_node) = node.child_by_field_name("name") else {
        return;
    };
    let Some(name) = node_text(name_node, source) else {
        return;
    };
    let default_value = first_named_of_kind(node, "defaultValue")
        .and_then(|dv| node_text(dv, source));
    let qname = qualified_name(stack, &name);
    let mut constant = ExtractedNode::symbol_with_qualified_name(
        relative_path,
        "constant",
        &name,
        node,
        LANG,
        qname,
    );
    constant.signature = default_value;
    push_contains(edges, contains_parent, &constant);
    nodes.push(constant);
}
