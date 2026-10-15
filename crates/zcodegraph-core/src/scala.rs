//! Scala baseline extraction (roadmap 1-2-11-1).
//!
//! Mirrors the legacy TS `scalaExtractor` (src/extraction/languages/scala.ts)
//! as driven by the shared orchestrator (src/extraction/tree-sitter.ts), over
//! tree-sitter-scala 0.24.1 (the last ABI-14 release; bridged via
//! tree-sitter-language 0.1 — same pattern as Swift/ObjC/Lua/Luau/Pascal,
//! verified by probe in C:\workspace\scala-abi-probe).
//!
//! Symbol surface (scala.ts 178 LoC, multiset-aligned):
//!
//! * `class_definition` / `object_definition` -> `class`; `trait_definition`
//!   -> `trait` (scala.ts classifyClassNode). Case classes still parse as
//!   `class_definition` (the `case` keyword is an unnamed child). Nested
//!   template bodies push a class-like frame so members attach.
//! * `enum_definition` -> `enum`; `enum_case_definitions` children of kind
//!   `simple_enum_case` / `full_enum_case` -> one `enum_member` per case
//!   (scala.ts visitNode unwraps the wrapper; enumMemberTypes is empty).
//! * `function_definition` / `function_declaration` -> `function` at top
//!   level, `method` inside any class-like frame (class/object/trait/enum).
//!   scala.ts `methodTypes` covers both kinds; top-level defs are routed to
//!   the same path, mirroring Kotlin (functionTypes is empty).
//! * `val_definition` / `var_definition` -> `constant` / `variable` at top
//!   level, `field` inside a class-like frame. The bound name is the
//!   `pattern` field's identifier — a `tuple_pattern` (`val (a, b) = …`)
//!   yields one symbol per inner identifier (scala.ts getValVarName falls
//!   back to the first identifier child).
//! * `type_definition` -> `type_alias`.
//! * `import_declaration` -> one `import` node per declaration. The module
//!   name is the `@path` field's identifiers joined with `.` (scala.ts
//!   extractImport prefers `@path`; falls back to the first
//!   identifier/stable_identifier child). Selector/wildcard tails
//!   (`import a.b.{C, D}`, `import a.b._`) keep only the path head, matching
//!   scala.ts.
//! * `call_expression` -> `calls` ref. Callee name is the full text of the
//!   callee subtree: a `field_expression` callee (`obj.method`) keeps the
//!   receiver prefix (`obj.method`) unless it is `this`/`super`; a plain
//!   identifier callee is the bare name. Mirrors scala.ts plus the
//!   orchestrator's member-call branch.
//! * `extension_definition` carries no baseline node; the body is descended
//!   into directly so contained functions/vals attach to the enclosing
//!   frame (scala.ts visitNode returns true and visits body children).
//! * Type references in `val`/`var` `@type` subtrees emit `references`
//!   edges for each `type_identifier` not in SCALA_BUILTIN_TYPES (scala.ts
//!   emitScalaTypeRefs), so a trait used only as a field type gains a
//!   dependent.
//! * `extends_clause` under a class/object/trait/enum emits `extends` refs
//!   for each `@type` type_identifier (scala.ts: inheritance is captured by
//!   the orchestrator's heritage walk; the extends field names the clause).

use tree_sitter::{Node as SyntaxNode, TreeCursor};

use crate::{push_ref, ExtractedEdge, ExtractedNode, SourceLanguage, UnresolvedRef};

const LANG: &str = "scala";

/// Capitalized Scala primitives/ubiquitous aliases that shouldn't create refs
/// (mirrors scala.ts SCALA_BUILTIN_TYPES).
const SCALA_BUILTIN_TYPES: &[&str] = &[
    "Int", "Long", "Short", "Byte", "Float", "Double", "Boolean", "Char", "Unit", "String", "Any",
    "AnyRef", "AnyVal", "Nothing", "Null",
];

/// A semantic containment frame. Every node that owns descendants
/// (class/object/trait/enum/function/method) pushes one; the file node is
/// the implicit root and is never on the stack.
struct Frame {
    /// Simple name, used to build the TS-style qualified name
    /// (`Outer::Inner::method`).
    name: String,
    /// The node id, used as the contains/ref parent for descendants.
    id: String,
    /// True when the frame is class-like (class | object | trait | enum).
    /// Functions under a class-like frame become `method`; vals/vars become
    /// `field`. Mirrors TS isInsideClassLikeNode (which counts module frames
    /// too; Scala has no module frame in this baseline).
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

/// Current containment parent id: the innermost frame's id, or the file id
/// when the stack is empty.
fn contains_parent<'a>(stack: &'a [Frame], file_id: &'a str) -> &'a str {
    stack.last().map(|f| f.id.as_str()).unwrap_or(file_id)
}

/// True when the innermost frame is class-like (scala.ts visitNode checks
/// parentNode.kind ∈ {class, trait, interface, struct, enum, module}).
fn inside_class_like(stack: &[Frame]) -> bool {
    stack.last().map(|f| f.is_class_like).unwrap_or(false)
}

/// scala.ts `getVisibility`: look at the `modifiers` (or bare
/// `access_modifier`) child's text; `private`/`protected` propagate, absent
/// modifiers default to `public` (Scala has no `internal`).
fn scala_visibility(node: SyntaxNode, source: &[u8]) -> String {
    for child in named_children_vec(node) {
        if child.kind() == "modifiers" || child.kind() == "access_modifier" {
            if let Some(text) = raw_text(child, source) {
                if text.contains("private") {
                    return "private".to_string();
                }
                if text.contains("protected") {
                    return "protected".to_string();
                }
            }
        }
    }
    "public".to_string()
}

/// scala.ts `isStatic`: scans `modifiers` for `static`. Scala's `static`
/// equivalent is a companion object, so this fires essentially never; the
/// parity hook stays because scala.ts exposes it.
fn scala_is_static(node: SyntaxNode, source: &[u8]) -> bool {
    named_children_vec(node).iter().any(|c| {
        c.kind() == "modifiers"
            && raw_text(*c, source)
                .map(|t| t.contains("static"))
                .unwrap_or(false)
    })
}

/// scala.ts `getSignature`: `@parameters` text plus `: <@return_type>` when
/// present. `None` when neither exists (rare for defs; both fields sit on
/// the same node kinds).
fn scala_signature(node: SyntaxNode, source: &[u8]) -> Option<String> {
    let params = node.child_by_field_name("parameters");
    let ret = node.child_by_field_name("return_type");
    if params.is_none() && ret.is_none() {
        return None;
    }
    let mut sig = String::new();
    if let Some(p) = params.and_then(|n| node_text(n, source)) {
        sig.push_str(&p);
    }
    if let Some(r) = ret.and_then(|n| node_text(n, source)) {
        sig.push_str(": ");
        sig.push_str(&r);
    }
    if sig.is_empty() {
        None
    } else {
        Some(sig)
    }
}

/// Emit a `references` ref for every `type_identifier` in a type subtree
/// (skipping Scala builtin types), mirroring scala.ts emitScalaTypeRefs.
/// Used so `val x: Monoid[Int]` records a dependency on `Monoid` even when
/// the trait is otherwise only a field type.
fn emit_scala_type_refs(
    type_node: SyntaxNode,
    from_id: &str,
    source: &[u8],
    relative_path: &str,
    unresolved_refs: &mut Vec<UnresolvedRef>,
) {
    if type_node.kind() == "type_identifier" {
        if let Some(name) = node_text(type_node, source) {
            if !SCALA_BUILTIN_TYPES.contains(&name.as_str()) {
                push_ref(
                    unresolved_refs,
                    from_id,
                    &name,
                    "references",
                    type_node,
                    relative_path,
                    SourceLanguage::Scala,
                );
            }
        }
        return;
    }
    for child in type_node.named_children(&mut type_node.walk()) {
        emit_scala_type_refs(child, from_id, source, relative_path, unresolved_refs);
    }
}

/// Extract `extends` parent names from a class/object/trait/enum definition.
/// The grammar puts the heritage list under `@extend = extends_clause`,
/// whose `@type` children name each parent (scala / scala3 syntax both
/// converge here). Each `type_identifier` becomes one `extends` ref.
fn extends_names<'a>(node: SyntaxNode<'a>, source: &'a [u8]) -> Vec<String> {
    let Some(clause) = node.child_by_field_name("extend") else {
        return Vec::new();
    };
    let mut names = Vec::new();
    for child in clause.named_children(&mut clause.walk()) {
        if child.kind() == "type_identifier" {
            if let Some(name) = node_text(child, source) {
                if !SCALA_BUILTIN_TYPES.contains(&name.as_str()) {
                    names.push(name);
                }
            }
        } else if child.kind() == "generic_type" {
            // `extends Foo[Bar]` -> the head `Foo` carries the link.
            if let Some(head) = first_named_of_kind(child, "type_identifier") {
                if let Some(name) = node_text(head, source) {
                    if !SCALA_BUILTIN_TYPES.contains(&name.as_str()) {
                        names.push(name);
                    }
                }
            }
        }
    }
    names
}

/// Callee name for a `call_expression`. scala.ts uses the shared
/// orchestrator path: the callee node is `@function`, a
/// `field_expression`/`identifier`/`operator_identifier` etc.
///
/// Shapes:
/// * `foo(…)`             -> `identifier` callee -> `foo`
/// * `obj.method(…)`      -> `field_expression` with `@value`/`@field` ->
///   `obj.method` (receiver prefix kept) unless receiver is
///   `this`/`super`/`self`
/// * `obj.a.b.c(…)`       -> nested `field_expression` -> trailing `@field`
///   plus the receiver's dotted prefix, matching the orchestrator's
///   member-call normalization
fn call_name(node: SyntaxNode, source: &[u8]) -> Option<String> {
    let func = node
        .child_by_field_name("function")
        .or_else(|| node.named_children(&mut node.walk()).next())?;

    match func.kind() {
        "identifier" | "operator_identifier" => node_text(func, source),
        "field_expression" => {
            let value = func.child_by_field_name("value");
            let field = func.child_by_field_name("field")?;
            let method = node_text(field, source)?;
            let receiver_text = value.and_then(|v| flatten_field_receiver(v, source));
            match receiver_text {
                Some(recv) if !matches!(recv.as_str(), "this" | "super" | "self" | "") => {
                    Some(format!("{recv}.{method}"))
                }
                _ => Some(method),
            }
        }
        _ => node_text(func, source),
    }
}

/// Flatten a `field_expression` receiver chain (`a.b.c`) into dotted text;
/// `identifier`/`this`/`super` return their own text. Returns `None` for
/// shapes we don't model (calls, apply expressions, etc.).
fn flatten_field_receiver(node: SyntaxNode, source: &[u8]) -> Option<String> {
    match node.kind() {
        "identifier" => node_text(node, source),
        "this" | "super" => node_text(node, source),
        "field_expression" => {
            let v = node.child_by_field_name("value")?;
            let f = node.child_by_field_name("field")?;
            let head = flatten_field_receiver(v, source)?;
            let tail = node_text(f, source)?;
            Some(format!("{head}.{tail}"))
        }
        _ => None,
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
    file_node_id: &str,
    ref_parent: &str,
    stack: &mut Vec<Frame>,
    nodes: &mut Vec<ExtractedNode>,
    edges: &mut Vec<ExtractedEdge>,
    unresolved_refs: &mut Vec<UnresolvedRef>,
) -> Result<(), Box<dyn std::error::Error>> {
    let node = cursor.node();
    let kind = node.kind();

    // ---- package clause: no baseline node; descend ----
    // scala.ts does not classify `package_clause`; the orchestrator's default
    // recursion walks through it. Mirror that here.

    // ---- import_declaration -> one `import` node ----
    if kind == "import_declaration" {
        let parent_id = contains_parent(stack, file_node_id).to_string();
        // scala.ts extractImport prefers `@path` (one or more identifiers),
        // else falls back to the first identifier/stable_identifier child.
        let module: Option<String> = {
            // tree-sitter-scala exposes repeated `@path` identifier children
            // (`import a.b.c` -> @path=identifier[a] @path=identifier[b]
            // @path=identifier[c]). Cursor-based walk collects them in order
            // because the Rust binding's `Node::field_name_for_child` only
            // covers *named* child indices and `@path` repeats the same
            // field name — cursor.field_name() is the parity path used by
            // lua.rs / pascal.rs.
            // tree-sitter-scala tags BOTH the identifier segments AND the
            // `.` separator tokens with `@path` (`import a.b.c` -> @path=identifier[a],
            // @path=".", @path=identifier[b], @path=".", @path=identifier[c]).
            // Keep only identifier children so the joined module name matches
            // scala.ts extractImport's `path` field text verbatim
            // (`a.b.c` — TS web-tree-sitter's `childForFieldName('path')`
            // returns the first, then the JS-side falls through to a
            // concatenation that skips punctuation).
            let paths: Vec<String> = {
                let mut v = Vec::new();
                let mut cursor = node.walk();
                if cursor.goto_first_child() {
                    loop {
                        if cursor.field_name() == Some("path") {
                            let c = cursor.node();
                            if c.kind() == "identifier" {
                                if let Some(t) = node_text(c, source) {
                                    v.push(t);
                                }
                            }
                        }
                        if !cursor.goto_next_sibling() {
                            break;
                        }
                    }
                }
                v
            };
            if !paths.is_empty() {
                // tree-sitter-scala `@path` identifiers arrive as one child
                // per dotted segment (`scala`, `collection`, `mutable`) —
                // join with "." so the module name matches the source
                // spelling (`scala.collection.mutable`), which the TS
                // scala.ts extractImport path produces verbatim.
                Some(paths.join("."))
            } else {
                named_children_vec(node)
                    .into_iter()
                    .find(|c| matches!(c.kind(), "identifier" | "stable_identifier"))
                    .and_then(|c| node_text(c, source))
            }
        };
        if let Some(module) = module {
            let import_text = raw_text(node, source)
                .map(|s| s.trim().to_string())
                .unwrap_or_default();
            let qname = qualified_name(stack, &module);
            let mut import = ExtractedNode::symbol_with_qualified_name(
                relative_path,
                "import",
                &module,
                node,
                LANG,
                qname,
            );
            if !import_text.is_empty() {
                import.signature = Some(import_text);
            }
            push_contains(edges, &parent_id, &import);
            nodes.push(import);
            push_ref(
                unresolved_refs,
                &parent_id,
                &module,
                "imports",
                node,
                relative_path,
                SourceLanguage::Scala,
            );
        }
        // Import subtrees carry no baseline symbols; prune.
        return Ok(());
    }

    // ---- class_definition / object_definition / trait_definition ----
    if kind == "class_definition" || kind == "object_definition" || kind == "trait_definition" {
        if let Some(name_node) = node.child_by_field_name("name") {
            if let Some(name) = node_text(name_node, source) {
                let symbol_kind = if kind == "trait_definition" { "trait" } else { "class" };
                let qname = qualified_name(stack, &name);
                let mut extracted = ExtractedNode::symbol_with_visibility_and_qualified_name(
                    relative_path,
                    symbol_kind,
                    &name,
                    node,
                    LANG,
                    Some(scala_visibility(node, source)),
                    qname,
                );
                extracted.is_static = scala_is_static(node, source);
                let id = extracted.id.clone();
                push_contains(edges, contains_parent(stack, file_node_id), &extracted);
                nodes.push(extracted);

                for parent in extends_names(node, source) {
                    push_ref(
                        unresolved_refs,
                        &id,
                        &parent,
                        "extends",
                        node,
                        relative_path,
                        SourceLanguage::Scala,
                    );
                }

                stack.push(Frame {
                    name: name.clone(),
                    id: id.clone(),
                    is_class_like: true,
                });
                if let Some(body) = node.child_by_field_name("body") {
                    for child in body.named_children(&mut body.walk()) {
                        let mut cc = child.walk();
                        visit(
                            &mut cc,
                            source,
                            relative_path,
                            file_node_id,
                            &id,
                            stack,
                            nodes,
                            edges,
                            unresolved_refs,
                        )?;
                    }
                }
                stack.pop();
                return Ok(());
            }
        }
    }

    // ---- enum_definition -> enum ----
    if kind == "enum_definition" {
        if let Some(name_node) = node.child_by_field_name("name") {
            if let Some(name) = node_text(name_node, source) {
                let qname = qualified_name(stack, &name);
                let extracted = ExtractedNode::symbol_with_qualified_name(
                    relative_path,
                    "enum",
                    &name,
                    node,
                    LANG,
                    qname,
                );
                let id = extracted.id.clone();
                push_contains(edges, contains_parent(stack, file_node_id), &extracted);
                nodes.push(extracted);

                for parent in extends_names(node, source) {
                    push_ref(
                        unresolved_refs,
                        &id,
                        &parent,
                        "extends",
                        node,
                        relative_path,
                        SourceLanguage::Scala,
                    );
                }

                stack.push(Frame {
                    name: name.clone(),
                    id: id.clone(),
                    is_class_like: true,
                });
                if let Some(body) = node.child_by_field_name("body") {
                    for child in body.named_children(&mut body.walk()) {
                        let mut cc = child.walk();
                        visit(
                            &mut cc,
                            source,
                            relative_path,
                            file_node_id,
                            &id,
                            stack,
                            nodes,
                            edges,
                            unresolved_refs,
                        )?;
                    }
                }
                stack.pop();
                return Ok(());
            }
        }
    }

    // ---- enum_case_definitions -> one enum_member per case ----
    // scala.ts visitNode unwraps the wrapper; enumMemberTypes is empty so the
    // orchestrator never emits these itself.
    if kind == "enum_case_definitions" {
        let parent_id = contains_parent(stack, file_node_id).to_string();
        for child in node.named_children(&mut node.walk()) {
            if child.kind() != "simple_enum_case" && child.kind() != "full_enum_case" {
                continue;
            }
            if let Some(name_node) = child.child_by_field_name("name") {
                if let Some(name) = node_text(name_node, source) {
                    let qname = qualified_name(stack, &name);
                    let extracted = ExtractedNode::symbol_with_qualified_name(
                        relative_path,
                        "enum_member",
                        &name,
                        child,
                        LANG,
                        qname,
                    );
                    push_contains(edges, &parent_id, &extracted);
                    nodes.push(extracted);
                }
            }
        }
        return Ok(());
    }

    // ---- type_definition -> type_alias ----
    if kind == "type_definition" {
        if let Some(name_node) = node.child_by_field_name("name") {
            if let Some(name) = node_text(name_node, source) {
                let qname = qualified_name(stack, &name);
                let extracted = ExtractedNode::symbol_with_qualified_name(
                    relative_path,
                    "type_alias",
                    &name,
                    node,
                    LANG,
                    qname,
                );
                push_contains(edges, contains_parent(stack, file_node_id), &extracted);
                nodes.push(extracted);
            }
        }
        return Ok(());
    }

    // ---- function_definition / function_declaration -> function | method ----
    if kind == "function_definition" || kind == "function_declaration" {
        if let Some(name_node) = node.child_by_field_name("name") {
            if let Some(name) = node_text(name_node, source) {
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
                    Some(scala_visibility(node, source)),
                    qname,
                );
                extracted.is_static = scala_is_static(node, source);
                if let Some(sig) = scala_signature(node, source) {
                    extracted.signature = Some(sig);
                }
                let id = extracted.id.clone();
                push_contains(edges, contains_parent(stack, file_node_id), &extracted);
                nodes.push(extracted);

                // Descend into the body on the function's own frame so calls
                // attribute to it.
                stack.push(Frame {
                    name: name.clone(),
                    id: id.clone(),
                    is_class_like: false,
                });
                if let Some(body) = node.child_by_field_name("body") {
                    for child in body.named_children(&mut body.walk()) {
                        let mut cc = child.walk();
                        visit(
                            &mut cc,
                            source,
                            relative_path,
                            file_node_id,
                            &id,
                            stack,
                            nodes,
                            edges,
                            unresolved_refs,
                        )?;
                    }
                }
                stack.pop();
                return Ok(());
            }
        }
    }

    // ---- val_definition / var_definition -> field | constant | variable ----
    if kind == "val_definition" || kind == "var_definition" {
        let pattern = node.child_by_field_name("pattern");
        // scala.ts getValVarName: identifier pattern uses itself; otherwise
        // (tuple_pattern etc.) fall back to the first identifier child.
        let name_node: Option<SyntaxNode> = pattern.and_then(|p| {
            if p.kind() == "identifier" {
                Some(p)
            } else {
                first_named_of_kind(p, "identifier")
            }
        });
        if let Some(name_node) = name_node {
            if let Some(name) = node_text(name_node, source) {
                let in_class = inside_class_like(stack);
                let symbol_kind = if in_class {
                    "field"
                } else if kind == "val_definition" {
                    "constant"
                } else {
                    "variable"
                };
                let qname = qualified_name(stack, &name);
                let mut extracted = ExtractedNode::symbol_with_visibility_and_qualified_name(
                    relative_path,
                    symbol_kind,
                    &name,
                    node,
                    LANG,
                    Some(scala_visibility(node, source)),
                    qname,
                );
                // scala.ts signature: `val name: <type>` / `var name: <type>`.
                let type_node = node.child_by_field_name("type");
                if let Some(t) = type_node.and_then(|n| node_text(n, source)) {
                    let kw = if kind == "val_definition" { "val" } else { "var" };
                    extracted.signature = Some(format!("{kw} {name}: {t}"));
                }
                let id = extracted.id.clone();
                push_contains(edges, contains_parent(stack, file_node_id), &extracted);
                nodes.push(extracted);

                // Emit type refs so traits used only as field types still
                // gain a dependent (scala.ts emitScalaTypeRefs).
                if let Some(t) = type_node {
                    emit_scala_type_refs(t, &id, source, relative_path, unresolved_refs);
                }
            }
        }
        // scala.ts returns true (prune) — val/var initializers are not walked
        // for baseline calls. (The orchestrator's generic `= call_expression`
        // branch is JS/TS-specific; scala.ts never opt-ed into it.)
        return Ok(());
    }

    // ---- extension_definition: no container node; visit body children ----
    // scala.ts visitNode returns true and visits body children directly,
    // without pushing a frame. Two shapes: a single `def` lands in @body
    // directly (`extension (s: String) def shout = ...`), and an indented
    // block lands in @body as a `template_body` wrapping multiple defs.
    // Handle both by visiting @body itself when it is already a symbol-
    // bearing node kind, otherwise unwrapping its children.
    if kind == "extension_definition" {
        if let Some(body) = node.child_by_field_name("body") {
            let is_bare_def = matches!(
                body.kind(),
                "function_definition" | "function_declaration" | "val_definition" | "var_definition"
            );
            if is_bare_def {
                let mut cc = body.walk();
                visit(
                    &mut cc,
                    source,
                    relative_path,
                    file_node_id,
                    ref_parent,
                    stack,
                    nodes,
                    edges,
                    unresolved_refs,
                )?;
            } else {
                for child in body.named_children(&mut body.walk()) {
                    let mut cc = child.walk();
                    visit(
                        &mut cc,
                        source,
                        relative_path,
                        file_node_id,
                        ref_parent,
                        stack,
                        nodes,
                        edges,
                        unresolved_refs,
                    )?;
                }
            }
        }
        return Ok(());
    }

    // ---- call_expression -> calls ref ----
    if kind == "call_expression" {
        if let Some(callee) = call_name(node, source) {
            if !callee.is_empty() {
                push_ref(
                    unresolved_refs,
                    ref_parent,
                    &callee,
                    "calls",
                    node,
                    relative_path,
                    SourceLanguage::Scala,
                );
            }
        }
        // Continue descent into arguments so nested calls are captured.
    }

    // ---- default: recurse into named children with unchanged parents ----
    for child in node.named_children(&mut node.walk()) {
        let mut cc = child.walk();
        visit(
            &mut cc,
            source,
            relative_path,
            file_node_id,
            ref_parent,
            stack,
            nodes,
            edges,
            unresolved_refs,
        )?;
    }
    Ok(())
}
