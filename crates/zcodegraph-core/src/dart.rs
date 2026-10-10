//! Dart baseline extraction (roadmap 1-2-9).
//!
//! Mirrors the legacy TS `dartExtractor` (src/extraction/languages/dart.ts)
//! and the orchestrator's Dart-specific branches over tree-sitter-dart
//! grammar c1222f5 (ABI 14), the last ABI-14 commit of
//! UserNobody14/tree-sitter-dart. That grammar is the exact source the TS
//! side ships as tree-sitter-dart.wasm (tree-sitter-wasms 0.1.13): an AST
//! multiset comparison was a byte-for-byte match with 0 ERRORs on both a
//! representative sample and a Dart 3 (sealed class / records / patterns)
//! sample. See the tree-sitter-dart dependency comment in Cargo.toml.
//!
//! Symbols (1-2-9-1), mirroring the TS declarative extractor:
//! * `class_definition` / `mixin_declaration` / `extension_declaration` ->
//!   `class` (the TS extractor lists mixin/extension under
//!   extraClassNodeTypes and extractClass always emits kind 'class').
//! * `enum_declaration` -> `enum`; each `enum_constant` -> `enum_member`.
//! * `type_alias` (`typedef X = ...`) -> `type_alias`.
//! * top-level `function_signature` -> `function`.
//! * `method_signature` inside a class/mixin/extension/enum body ->
//!   `method`. Its real signature is an inner child (function_signature /
//!   getter_signature / setter_signature / factory_constructor_signature);
//!   the `function_body` is a following SIBLING of the method_signature, so
//!   the node span is extended over it.
//!
//! Deliberately NOT symbols (matches TS):
//! * fields (`final Database _db;`, `static int counter;`) — Dart declares no
//!   fieldTypes/variableTypes, and the declaration lives in a `declaration`
//!   wrapper that no extractor branch matches.
//! * generative constructors (`UserService(this._db);`) parse as a
//!   `declaration` > `constructor_signature` (NOT a `method_signature`), so no
//!   method node is emitted. Only `factory` constructors parse as
//!   `method_signature` and become methods.
//! * a factory's name is the FIRST inner identifier (`factory User.create()`
//!   -> `User`), exactly the TS extractName method_signature rule.
//!
//! References/calls (extends/with/implements, selector calls, static-member
//! value reads, parameter/return type refs, import refs) are added in
//! 1-2-9-2.

use tree_sitter::Node as SyntaxNode;

use crate::{push_ref, ExtractedEdge, ExtractedNode, SourceLanguage, UnresolvedRef};

const LANG: &str = "dart";

/// Mirrors the TS extractor's shared BUILTIN_TYPES set (the Dart path reuses
/// the same cross-language set, not a Dart-specific one). A `type_identifier`
/// leaf whose text is in this set emits no `references` ref. Note `String` is
/// present (added for Scala) but `num`/`List`/`Map`/`Future`/`Iterable`/
/// `dynamic` are not, so those DO surface as refs — reproduced verbatim.
const BUILTIN_TYPES: &[&str] = &[
    // JS/TS
    "string", "number", "boolean", "void", "null", "undefined", "never", "any", "unknown",
    "object", "symbol", "bigint", "true", "false",
    // Rust
    "str", "bool", "i8", "i16", "i32", "i64", "i128", "isize", "u8", "u16", "u32", "u64",
    "u128", "usize", "f32", "f64", "char",
    // Java/C#
    "int", "long", "short", "byte", "float", "double",
    // Go
    "int8", "int16", "int32", "int64", "uint8", "uint16", "uint32", "uint64", "float32",
    "float64", "complex64", "complex128", "rune", "error",
    // Scala (capitalized primitives + aliases)
    "Int", "Long", "Short", "Byte", "Float", "Double", "Boolean", "Char", "Unit", "String",
    "Any", "AnyRef", "AnyVal", "Nothing", "Null",
];

/// Inner signature node kinds that carry a method's real name/params/return.
const INNER_SIGNATURES: &[&str] = &[
    "function_signature",
    "getter_signature",
    "setter_signature",
    "constructor_signature",
    "factory_constructor_signature",
];

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

fn named_children<'a>(node: SyntaxNode<'a>) -> Vec<SyntaxNode<'a>> {
    node.named_children(&mut node.walk()).collect()
}

fn node_text<'a>(node: SyntaxNode<'a>, source: &'a [u8]) -> Option<String> {
    node.utf8_text(source)
        .ok()
        .map(str::trim)
        .filter(|s| !s.is_empty())
        .map(ToString::to_string)
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

/// Dart visibility for class/enum/extension/function/method declarations.
/// Mirrors dartExtractor.getVisibility, which ALWAYS returns a value (never
/// undefined) for these node kinds: a leading underscore is library-private,
/// everything else is `public`. NOTE: do not use this for a `mixin_declaration`
/// (the TS hook reads the `name` field, which a mixin's identifier lacks, so it
/// always sees `null` and returns `public`, even for `mixin _X`), nor for a
/// type_alias / enum_member / import (the TS createNode call for those passes
/// NO visibility, so the column stays NULL).
fn declaration_visibility(name: &str) -> Option<String> {
    if name.starts_with('_') {
        Some("private".to_string())
    } else {
        Some("public".to_string())
    }
}

/// The inner signature of a `method_signature` (the named child that actually
/// holds the name/params/return type).
fn inner_signature<'a>(node: SyntaxNode<'a>) -> Option<SyntaxNode<'a>> {
    named_children(node)
        .into_iter()
        .find(|c| INNER_SIGNATURES.contains(&c.kind()))
}

/// Method name for a `method_signature`: the first `identifier` named child of
/// the inner signature (mirrors extractName's method_signature branch). For a
/// factory this is the class-name identifier (`factory User.create()` ->
/// `User`).
fn method_name<'a>(node: SyntaxNode<'a>, source: &'a [u8]) -> Option<String> {
    let sig = inner_signature(node)?;
    named_children(sig)
        .into_iter()
        .find(|c| c.kind() == "identifier")
        .and_then(|id| node_text(id, source))
}

/// Whether a method_signature has a direct `static` keyword child (mirrors
/// dartExtractor.isStatic).
fn is_static_method(node: SyntaxNode) -> bool {
    node.children(&mut node.walk()).any(|c| c.kind() == "static")
}

/// Method visibility, mirroring dartExtractor.getVisibility's method_signature
/// branch: it only inspects an inner function/getter/setter signature for the
/// name identifier. A `factory_constructor_signature` is NOT in that list, so a
/// factory's nameNode stays null and the hook always returns `public` (even for
/// `factory _Private()`). For the three regular signatures the underscore rule
/// applies.
fn method_visibility(node: SyntaxNode, name: &str) -> Option<String> {
    let regular = inner_signature(node).map(|sig| {
        matches!(
            sig.kind(),
            "function_signature" | "getter_signature" | "setter_signature"
        )
    }).unwrap_or(false);
    if regular {
        declaration_visibility(name)
    } else {
        Some("public".to_string())
    }
}

/// The `function_body` sibling that follows a function/method signature.
/// Dart models the body as a sibling, not a field/child of the signature.
fn sibling_function_body<'a>(node: SyntaxNode<'a>) -> Option<SyntaxNode<'a>> {
    let next = node.next_named_sibling()?;
    if next.kind() == "function_body" {
        Some(next)
    } else {
        None
    }
}

/// Extend a function/method node's span over its sibling function body so it
/// covers multi-line bodies (mirrors createNode's resolveBody endLine guard).
fn extend_span_over_body(mut symbol: ExtractedNode, body: Option<SyntaxNode>) -> ExtractedNode {
    if let Some(body) = body {
        let body_end = body.end_position().row as i64 + 1;
        if body_end > symbol.end_line {
            symbol.end_line = body_end;
            symbol.end_column = body.end_position().column as i64;
        }
    }
    symbol
}

/// Name for a class-like declaration (class_definition/mixin/extension): the
/// `name` field identifier. A `mixin_declaration`'s name identifier carries NO
/// field in this grammar (`mixin Loggable on Base` -> plain `identifier`
/// named child), so fall back to the first identifier named child.
fn class_like_name<'a>(node: SyntaxNode<'a>, source: &'a [u8]) -> Option<String> {
    if let Some(name) = node
        .child_by_field_name("name")
        .and_then(|n| node_text(n, source))
    {
        return Some(name);
    }
    if node.kind() == "mixin_declaration" {
        return named_children(node)
            .into_iter()
            .find(|c| c.kind() == "identifier")
            .and_then(|n| node_text(n, source));
    }
    None
}

/// Name for a `typedef` type_alias: the first `type_identifier` named child
/// (the alias name precedes the `=`).
fn type_alias_name<'a>(node: SyntaxNode<'a>, source: &'a [u8]) -> Option<String> {
    named_children(node)
        .into_iter()
        .find(|c| c.kind() == "type_identifier")
        .and_then(|n| node_text(n, source))
}

/// The quoted URI string of an import_or_export node, mirroring
/// dartExtractor.extractImport for both `library_import`
/// (import_specification > configurable_uri > uri > string_literal) and
/// `library_export` (configurable_uri is a direct named child).
fn import_uri<'a>(node: SyntaxNode<'a>, source: &'a [u8]) -> Option<String> {
    let named = named_children(node);
    let library_import = named.iter().copied().find(|c| c.kind() == "library_import");
    let library_export = named.iter().copied().find(|c| c.kind() == "library_export");

    let configurable = if let Some(li) = library_import {
        let spec = named_children(li)
            .into_iter()
            .find(|c| c.kind() == "import_specification")?;
        named_children(spec)
            .into_iter()
            .find(|c| c.kind() == "configurable_uri")
    } else if let Some(le) = library_export {
        named_children(le)
            .into_iter()
            .find(|c| c.kind() == "configurable_uri")
    } else {
        None
    }?;

    let uri = named_children(configurable)
        .into_iter()
        .find(|c| c.kind() == "uri")?;
    let literal = named_children(uri)
        .into_iter()
        .find(|c| c.kind() == "string_literal")?;
    let raw = literal.utf8_text(source).ok()?.trim();
    let unquoted = raw
        .strip_prefix('\'')
        .or_else(|| raw.strip_prefix('"'))
        .and_then(|s| s.strip_suffix('\'').or_else(|| s.strip_suffix('"')))
        .unwrap_or(raw);
    if unquoted.is_empty() {
        None
    } else {
        Some(unquoted.to_string())
    }
}

/// Whether a type name is filtered out as a cross-language built-in (mirrors
/// the TS extractor's BUILTIN_TYPES membership test).
fn is_builtin_type(name: &str) -> bool {
    BUILTIN_TYPES.contains(&name)
}

/// A capitalized simple identifier `^[A-Z][A-Za-z0-9_]*$` (the
/// extractStaticMemberRef receiver gate for `Enum.value` / `Colors.red`).
fn is_capitalized(name: &str) -> bool {
    let mut chars = name.chars();
    match chars.next() {
        Some(first) if first.is_ascii_uppercase() => {
            name.chars().all(|c| c.is_ascii_alphanumeric() || c == '_')
        }
        _ => false,
    }
}

/// Walk a subtree and emit a `references` ref for every non-built-in
/// `type_identifier` leaf. Mirrors extractTypeRefsFromSubtree: parameter
/// NAMES and method names are `identifier` (not `type_identifier`) and never
/// surface; generic/union wrappers simply recurse.
fn emit_type_refs(
    node: SyntaxNode,
    from_id: &str,
    relative_path: &str,
    source: &[u8],
    unresolved_refs: &mut Vec<UnresolvedRef>,
) {
    if node.kind() == "type_identifier" {
        if let Some(name) = node_text(node, source) {
            if !is_builtin_type(&name) {
                push_ref(
                    unresolved_refs,
                    from_id,
                    &name,
                    "references",
                    node,
                    relative_path,
                    SourceLanguage::Dart,
                );
            }
        }
        return; // type_identifier is a leaf
    }
    for child in named_children(node) {
        emit_type_refs(child, from_id, relative_path, source, unresolved_refs);
    }
}

/// Inheritance refs for a class-like node. Mirrors the Dart branches in
/// extractInheritance:
/// * `superclass` field — a direct `type_identifier` child -> `extends`;
///   each type_identifier inside a `mixins` child -> `implements`.
/// * `interfaces` field (`implements …`) — each type_identifier -> `implements`.
/// A mixin's `on Base` constraint and an extension's `on String` clause are
/// BARE type_identifiers (not superclass/interfaces clauses) and match no
/// branch, so they intentionally emit nothing.
fn emit_inheritance_refs(
    node: SyntaxNode,
    class_id: &str,
    relative_path: &str,
    source: &[u8],
    unresolved_refs: &mut Vec<UnresolvedRef>,
) {
    if let Some(superclass) = node.child_by_field_name("superclass") {
        for child in named_children(superclass) {
            match child.kind() {
                "mixins" => {
                    for m in named_children(child) {
                        if m.kind() == "type_identifier" {
                            if let Some(name) = node_text(m, source) {
                                push_ref(
                                    unresolved_refs,
                                    class_id,
                                    &name,
                                    "implements",
                                    m,
                                    relative_path,
                                    SourceLanguage::Dart,
                                );
                            }
                        }
                    }
                }
                "type_identifier" => {
                    if let Some(name) = node_text(child, source) {
                        push_ref(
                            unresolved_refs,
                            class_id,
                            &name,
                            "extends",
                            child,
                            relative_path,
                            SourceLanguage::Dart,
                        );
                    }
                }
                _ => {}
            }
        }
    }

    if let Some(interfaces) = node.child_by_field_name("interfaces") {
        for child in named_children(interfaces) {
            if child.kind() == "type_identifier" {
                if let Some(name) = node_text(child, source) {
                    push_ref(
                        unresolved_refs,
                        class_id,
                        &name,
                        "implements",
                        child,
                        relative_path,
                        SourceLanguage::Dart,
                    );
                }
            }
        }
    }
}

/// Resolve the callee name for a Dart call `selector` node (a selector whose
/// named children include an `argument_part`), mirroring
/// dartExtractor.extractBareCall. Returns the name to emit a `calls` ref for,
/// or None. Each call-bearing selector is visited independently, so chained
/// calls may emit multiple refs.
fn bare_call_name(selector: SyntaxNode, source: &[u8]) -> Option<String> {
    let has_args = named_children(selector)
        .iter()
        .any(|c| c.kind() == "argument_part");
    if !has_args {
        return None;
    }
    let prev = selector.prev_named_sibling()?;
    match prev.kind() {
        // runApp(...), MyApp(...), User('x') — the bare identifier is callee.
        "identifier" => node_text(prev, source),
        // Navigator.push(...), obj.method(...): prev is the `.method` selector.
        "selector" => {
            let accessor = named_children(prev).into_iter().find(|c| {
                c.kind() == "unconditional_assignable_selector"
                    || c.kind() == "conditional_assignable_selector"
            })?;
            let method = named_children(accessor)
                .into_iter()
                .find(|c| c.kind() == "identifier")?;
            let method_text = node_text(method, source)?;
            // Include receiver for the first call in a chain whose receiver is
            // a direct identifier (`Navigator.push`); deeper links report the
            // method name only.
            if let Some(accessor_prev) = prev.prev_named_sibling() {
                if accessor_prev.kind() == "identifier" {
                    if let Some(recv) = node_text(accessor_prev, source) {
                        return Some(format!("{recv}.{method_text}"));
                    }
                }
            }
            Some(method_text)
        }
        // super.method(...), this.method(...): prev is the bare `.method`
        // accessor itself.
        "unconditional_assignable_selector" | "conditional_assignable_selector" => {
            let method = named_children(prev)
                .into_iter()
                .find(|c| c.kind() == "identifier")?;
            node_text(method, source)
        }
        _ => None,
    }
}

/// Callee name for `new Foo(...)` / `new Foo.named(...)`. tree-sitter-dart
/// models new_expression with a `type_identifier` (+ optional named
/// constructor `identifier`) and an `arguments` child. Mirrors extractBareCall's
/// new_expression branch.
fn new_call_name(node: SyntaxNode, source: &[u8]) -> Option<String> {
    let type_id = named_children(node)
        .into_iter()
        .find(|c| c.kind() == "type_identifier")
        .and_then(|n| node_text(n, source))?;
    Some(type_id)
}

/// Callee name for `const T(...)` / `const T.named(...)` (const_object_
/// expression): `type_identifier` + optional `identifier` -> `T.name`.
fn const_call_name(node: SyntaxNode, source: &[u8]) -> Option<String> {
    let type_id = named_children(node)
        .into_iter()
        .find(|c| c.kind() == "type_identifier")
        .and_then(|n| node_text(n, source))?;
    let name = named_children(node)
        .into_iter()
        .find(|c| c.kind() == "identifier")
        .and_then(|n| node_text(n, source));
    match name {
        Some(named) => Some(format!("{type_id}.{named}")),
        None => Some(type_id),
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

    for child in named_children(root) {
        walk_decl(
            child,
            source,
            relative_path,
            &mut stack,
            nodes,
            edges,
            unresolved_refs,
        )?;
    }
    Ok(())
}

#[allow(clippy::too_many_arguments)]
fn walk_decl(
    node: SyntaxNode,
    source: &[u8],
    relative_path: &str,
    stack: &mut Vec<Frame>,
    nodes: &mut Vec<ExtractedNode>,
    edges: &mut Vec<ExtractedEdge>,
    unresolved_refs: &mut Vec<UnresolvedRef>,
) -> Result<(), Box<dyn std::error::Error>> {
    let kind = node.kind();
    let parent_id = stack[stack.len() - 1].id.clone();

    // ---- expression refs: selector calls / value reads / new / const ------
    // Mirrors the TS body walker, which runs extractBareCall then
    // extractStaticMemberRef against every visited node, attributing the ref
    // to the current stack top (the enclosing method/function, or the file).
    // These nodes fall through to generic descent afterwards so nested calls
    // inside arguments are still visited.
    if kind == "selector" {
        let has_args = named_children(node)
            .iter()
            .any(|c| c.kind() == "argument_part");
        if has_args {
            if let Some(name) = bare_call_name(node, source) {
                push_ref(
                    unresolved_refs,
                    &parent_id,
                    &name,
                    "calls",
                    node,
                    relative_path,
                    SourceLanguage::Dart,
                );
            }
        } else if let Some(prev) = node.prev_named_sibling() {
            // Value-read selector (no args) with a capitalized identifier
            // receiver: `Enum.value`, `Colors.red`, `C.STATIC`.
            if prev.kind() == "identifier" {
                if let Some(recv) = node_text(prev, source) {
                    if is_capitalized(&recv) {
                        push_ref(
                            unresolved_refs,
                            &parent_id,
                            &recv,
                            "references",
                            prev,
                            relative_path,
                            SourceLanguage::Dart,
                        );
                    }
                }
            }
        }
    } else if kind == "new_expression" {
        if let Some(name) = new_call_name(node, source) {
            push_ref(
                unresolved_refs,
                &parent_id,
                &name,
                "calls",
                node,
                relative_path,
                SourceLanguage::Dart,
            );
        }
    } else if kind == "const_object_expression" {
        if let Some(name) = const_call_name(node, source) {
            push_ref(
                unresolved_refs,
                &parent_id,
                &name,
                "calls",
                node,
                relative_path,
                SourceLanguage::Dart,
            );
        }
    }

    // ---- import_or_export -> import node (no frame) -----------------------
    if kind == "import_or_export" {
        if let Some(module_name) = import_uri(node, source) {
            let qn = qualified_name(stack, &module_name);
            let import = ExtractedNode::symbol_with_visibility_and_qualified_name(
                relative_path,
                "import",
                &module_name,
                node,
                LANG,
                None,
                qn,
            );
            let id = import.id.clone();
            edges.push(contains_edge(&parent_id, &id, node));
            nodes.push(import);
            // `imports` unresolved ref from the import node, mirroring the TS
            // extractImport hook (relative imports later resolve file->file;
            // dart:/package: URIs stay unresolved by design).
            push_ref(
                unresolved_refs,
                &id,
                &module_name,
                "imports",
                node,
                relative_path,
                SourceLanguage::Dart,
            );
        }
        return Ok(());
    }

    // ---- enum_declaration -> enum frame -----------------------------------
    if kind == "enum_declaration" {
        if let Some(name) = class_like_name(node, source) {
            let qn = qualified_name(stack, &name);
            let extracted = ExtractedNode::symbol_with_visibility_and_qualified_name(
                relative_path,
                "enum",
                &name,
                node,
                LANG,
                declaration_visibility(&name),
                qn,
            );
            let id = extracted.id.clone();
            edges.push(contains_edge(&parent_id, &id, node));
            nodes.push(extracted);
            stack.push(Frame {
                id: id.clone(),
                name: name.clone(),
                kind: "enum",
            });
            // enum members and any enhanced-enum members live in enum_body
            // (the `body` field); fall back to named children.
            let body = node
                .child_by_field_name("body")
                .filter(|b| b.kind() == "enum_body");
            let members: Vec<SyntaxNode> = match body {
                Some(b) => named_children(b),
                None => named_children(node),
            };
            for child in members {
                if child.kind() == "enum_constant" {
                    if let Some(mname) = child
                        .child_by_field_name("name")
                        .and_then(|n| node_text(n, source))
                    {
                        let member = ExtractedNode::symbol_with_visibility_and_qualified_name(
                            relative_path,
                            "enum_member",
                            &mname,
                            child,
                            LANG,
                            None,
                            qualified_name(stack, &mname),
                        );
                        let mid = member.id.clone();
                        edges.push(contains_edge(&id, &mid, child));
                        nodes.push(member);
                    }
                } else {
                    // Enhanced-enum methods / nested declarations.
                    walk_decl(
                        child,
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
            return Ok(());
        }
    }

    // ---- class_definition / mixin_declaration / extension_declaration ----
    if kind == "class_definition"
        || kind == "mixin_declaration"
        || kind == "extension_declaration"
    {
        let name = class_like_name(node, source);
        // An unnamed declaration (an `extension on T {}` without a name) yields
        // no class node in TS (createNode rejects an empty name) and its body is
        // NOT visited — so its members are invisible. Skip the whole subtree.
        let Some(name) = name else {
            return Ok(());
        };
        {
            let qn = qualified_name(stack, &name);
            // A mixin's name has no `name` field, so the TS getVisibility hook
            // always reads null and yields `public`, even for `mixin _X`.
            // class_definition / extension_declaration follow the underscore
            // rule (private vs public).
            let visibility = if kind == "mixin_declaration" {
                Some("public".to_string())
            } else {
                declaration_visibility(&name)
            };
            let extracted = ExtractedNode::symbol_with_visibility_and_qualified_name(
                relative_path,
                "class",
                &name,
                node,
                LANG,
                visibility,
                qn,
            );
            let id = extracted.id.clone();
            edges.push(contains_edge(&parent_id, &id, node));
            nodes.push(extracted);
            stack.push(Frame {
                id: id.clone(),
                name: name.clone(),
                kind: "class",
            });

            // extends / with-mixins / implements refs. Only a class_definition
            // carries superclass/interfaces fields; a mixin's `on T` and an
            // extension's `on T` are bare type_identifiers that emit nothing.
            if kind == "class_definition" {
                emit_inheritance_refs(node, &id, relative_path, source, unresolved_refs);
            }

            // class_definition / mixin use a class_body child; extension uses
            // extension_body. resolveBody prefers the body field then scans for
            // either body kind.
            let body = node.child_by_field_name("body").or_else(|| {
                named_children(node)
                    .into_iter()
                    .find(|c| c.kind() == "class_body" || c.kind() == "extension_body")
            });
            if let Some(body) = body {
                for child in named_children(body) {
                    walk_decl(
                        child,
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
            return Ok(());
        }
    }

    // ---- typedef type_alias -----------------------------------------------
    if kind == "type_alias" {
        if let Some(name) = type_alias_name(node, source) {
            let qn = qualified_name(stack, &name);
            let alias = ExtractedNode::symbol_with_visibility_and_qualified_name(
                relative_path,
                "type_alias",
                &name,
                node,
                LANG,
                None,
                qn,
            );
            let id = alias.id.clone();
            edges.push(contains_edge(&parent_id, &id, node));
            nodes.push(alias);
            // Type refs from the alias RHS are added in 1-2-9-2.
            return Ok(());
        }
    }

    // ---- top-level function_signature -> function ------------------------
    // A function body is the following function_body sibling; only a
    // signature at file/module scope (NOT inside a class-like frame) is a
    // function. method_signature inside a body is handled below.
    if kind == "function_signature" && !class_like_frame_active(stack) {
        if let Some(name) = node
            .child_by_field_name("name")
            .and_then(|n| node_text(n, source))
        {
            let qn = qualified_name(stack, &name);
            let func = ExtractedNode::symbol_with_visibility_and_qualified_name(
                relative_path,
                "function",
                &name,
                node,
                LANG,
                declaration_visibility(&name),
                qn,
            );
            let func = extend_span_over_body(func, sibling_function_body(node));
            let id = func.id.clone();
            edges.push(contains_edge(&parent_id, &id, node));
            nodes.push(func);
            stack.push(Frame {
                id: id.clone(),
                name: name.clone(),
                kind: "function",
            });
            // Parameter/return type refs (a top-level signature IS the inner
            // signature; the Dart type-annotation branch walks it directly).
            emit_type_refs(node, &id, relative_path, source, unresolved_refs);
            if let Some(body) = sibling_function_body(node) {
                for child in named_children(body) {
                    walk_decl(
                        child,
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
            return Ok(());
        }
    }

    // ---- method_signature -> method (class/mixin/extension/enum body) -----
    if kind == "method_signature" {
        if let Some(name) = method_name(node, source) {
            let qn = qualified_name(stack, &name);
            let is_static = is_static_method(node);
            let mut method = ExtractedNode::symbol_with_visibility_and_qualified_name(
                relative_path,
                "method",
                &name,
                node,
                LANG,
                method_visibility(node, &name),
                qn,
            );
            method.is_static = is_static;
            method = extend_span_over_body(method, sibling_function_body(node));
            let id = method.id.clone();
            edges.push(contains_edge(&parent_id, &id, node));
            nodes.push(method);
            stack.push(Frame {
                id: id.clone(),
                name: name.clone(),
                kind: "method",
            });
            // Parameter/return type refs: a method_signature wraps the real
            // inner signature (where params/return type live); walk it, falling
            // back to the node itself (mirrors the TS Dart type-annotation
            // branch).
            let sig = inner_signature(node).unwrap_or(node);
            emit_type_refs(sig, &id, relative_path, source, unresolved_refs);
            if let Some(body) = sibling_function_body(node) {
                for child in named_children(body) {
                    walk_decl(
                        child,
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
            return Ok(());
        }
    }

    // ---- generic descent ---------------------------------------------------
    // `declaration` wrappers (fields, generative constructors) yield no
    // symbol, but their subtrees may contain expressions that matter in later
    // reference passes; for 1-2-9-1 symbols-only they simply descend.
    for child in named_children(node) {
        walk_decl(
            child,
            source,
            relative_path,
            stack,
            nodes,
            edges,
            unresolved_refs,
        )?;
    }
    Ok(())
}

/// Whether the nearest enclosing frame is a class-like declaration (mirrors
/// TS isInsideClassLikeNode; file and method frames do not count).
fn class_like_frame_active(stack: &[Frame]) -> bool {
    stack.iter().rev().any(|f| f.is_class_like())
}

#[cfg(test)]
mod tests {
    use super::*;
    use tree_sitter::Parser;

    fn extract_all(
        path: &str,
        code: &str,
    ) -> (
        Vec<ExtractedNode>,
        Vec<ExtractedEdge>,
        Vec<UnresolvedRef>,
    ) {
        let mut parser = Parser::new();
        parser.set_language(&tree_sitter_dart::language()).unwrap();
        let tree = parser.parse(code, None).unwrap();
        assert!(!tree.root_node().has_error(), "fixture must parse cleanly:\n{code}");
        let file = ExtractedNode::file(path, code, LANG);
        let file_id = file.id.clone();
        let mut nodes = vec![file];
        let mut edges = Vec::new();
        let mut refs = Vec::new();
        extract(
            tree.root_node(),
            code.as_bytes(),
            path,
            &file_id,
            &mut nodes,
            &mut edges,
            &mut refs,
        )
        .unwrap();
        (nodes, edges, refs)
    }

    fn kinds<'a>(nodes: &'a [ExtractedNode], kind: &str) -> Vec<&'a ExtractedNode> {
        nodes.iter().filter(|n| n.kind == kind).collect()
    }

    fn names_of<'a>(nodes: &'a [ExtractedNode], kind: &str) -> Vec<&'a str> {
        nodes
            .iter()
            .filter(|n| n.kind == kind)
            .map(|n| n.name.as_str())
            .collect()
    }

    fn find<'a>(nodes: &'a [ExtractedNode], kind: &str, name: &str) -> &'a ExtractedNode {
        nodes
            .iter()
            .find(|n| n.kind == kind && n.name == name)
            .unwrap_or_else(|| panic!("{kind} named {name:?}"))
    }

    /// All reference names of a kind (with multiplicity, in emission order).
    fn refs_of<'a>(refs: &'a [UnresolvedRef], kind: &str) -> Vec<&'a str> {
        refs.iter()
            .filter(|r| r.reference_kind == kind)
            .map(|r| r.reference_name.as_str())
            .collect()
    }

    /// Reference names of a kind attributed to a specific source node.
    fn refs_from<'a>(
        refs: &'a [UnresolvedRef],
        kind: &str,
        from_id: &str,
    ) -> Vec<&'a str> {
        refs.iter()
            .filter(|r| r.reference_kind == kind && r.from_node_id == from_id)
            .map(|r| r.reference_name.as_str())
            .collect()
    }

    #[test]
    fn classifies_class_mixin_extension_enum_alias_function() {
        let code = "\
enum Status { active, inactive, pending }

typedef StringMap = Map<String, String>;

mixin Loggable on Base {
  void log(String message) {}
}

extension StringExt on String {
  bool get isBlank => trim().isEmpty;
  set shadow(String v) {}
}

class UserService extends Repository with Loggable implements Disposable {
  final Database _db;
  static int counter = 0;

  UserService(this._db);
  factory UserService.create(Database db) => UserService(db);

  Future<User> findById(String id) async {
    return await _db.query(id);
  }

  static void doWork() {}
}

void topLevelFunction(String name) {
  print(name);
}
";
        let (nodes, _edges, _refs) = extract_all("lib/sample.dart", code);

        // Top-level classification.
        assert_eq!(names_of(&nodes, "enum"), ["Status"]);
        assert_eq!(names_of(&nodes, "type_alias"), ["StringMap"]);
        assert_eq!(
            names_of(&nodes, "class"),
            ["Loggable", "StringExt", "UserService"]
        );
        assert_eq!(names_of(&nodes, "function"), ["topLevelFunction"]);

        // Enum members keep source order.
        assert_eq!(
            names_of(&nodes, "enum_member"),
            ["active", "inactive", "pending"]
        );

        // Methods: getter/setter/factory/static/private all become methods.
        // The generative constructor `UserService(this._db)` yields NO method;
        // the factory is named after the class-name identifier `UserService`.
        let methods = kinds(&nodes, "method");
        let method_names: Vec<&str> = methods.iter().map(|m| m.name.as_str()).collect();
        for expected in ["log", "isBlank", "shadow", "UserService", "findById", "doWork"] {
            assert!(method_names.contains(&expected), "method {expected} present: {method_names:?}");
        }
        // Fields are never symbols in Dart.
        assert!(names_of(&nodes, "field").is_empty());
        assert!(names_of(&nodes, "variable").is_empty());
    }

    #[test]
    fn factory_named_after_class_identifier_and_qualifies_through_class() {
        let code = "\
class User {
  User();
  factory User.create(int x) => User();
}
";
        let (nodes, _edges, _refs) = extract_all("factory.dart", code);
        // Exactly one method (the factory), named by the FIRST inner identifier
        // (the class name `User`), matching TS extractName. The `.create`
        // identifier and the generative ctor produce no nodes.
        let methods = kinds(&nodes, "method");
        assert_eq!(methods.len(), 1);
        assert_eq!(methods[0].name, "User");
        assert_eq!(methods[0].qualified_name, "User::User");
    }

    #[test]
    fn redirecting_factory_is_not_a_symbol() {
        // `factory User.named() = _Base;` parses as a declaration-wrapped
        // redirecting_factory_constructor_signature (NOT a method_signature),
        // so neither TS nor Rust emits a method.
        let code = "\
class User {
  factory User.named() = _Base;
}
";
        let (nodes, _edges, _refs) = extract_all("redirect.dart", code);
        assert!(kinds(&nodes, "method").is_empty());
    }

    #[test]
    fn visibility_matches_ts_hook() {
        let code = "\
mixin _PrivateMixin {
  void m() {}
}

mixin PublicMixin {}

typedef _Hidden = int;
typedef Visible = int;

enum _PrivateEnum { a, b }

class C {
  void regular() {}
  void _secret() {}
  static void _staticSecret() {}
  factory C._factory() => C();
  int get _prop => 1;
}

void _topPrivate() {}
void topPublic() {}
";
        let (nodes, _edges, _refs) = extract_all("vis.dart", code);

        // class/enum/function: underscore -> private, else public.
        assert_eq!(find(&nodes, "class", "PublicMixin").visibility.as_deref(), Some("public"));
        assert_eq!(find(&nodes, "class", "C").visibility.as_deref(), Some("public"));
        assert_eq!(find(&nodes, "function", "topPublic").visibility.as_deref(), Some("public"));
        assert_eq!(find(&nodes, "function", "_topPrivate").visibility.as_deref(), Some("private"));
        assert_eq!(find(&nodes, "enum", "_PrivateEnum").visibility.as_deref(), Some("private"));

        // A mixin's name has no `name` field, so the TS hook always reads null
        // and yields `public`, even for an underscore mixin.
        assert_eq!(
            find(&nodes, "class", "_PrivateMixin").visibility.as_deref(),
            Some("public")
        );

        // type_alias and enum_member carry NO visibility (createNode passes none).
        assert_eq!(find(&nodes, "type_alias", "_Hidden").visibility, None);
        assert_eq!(find(&nodes, "type_alias", "Visible").visibility, None);
        for m in kinds(&nodes, "enum_member") {
            assert_eq!(m.visibility, None);
        }

        // Methods: regular underscore rule for function/getter/setter sigs;
        // a factory is ALWAYS public (its inner sig is not in getVisibility's
        // recognized set).
        assert_eq!(find(&nodes, "method", "regular").visibility.as_deref(), Some("public"));
        assert_eq!(find(&nodes, "method", "_secret").visibility.as_deref(), Some("private"));
        assert_eq!(find(&nodes, "method", "_staticSecret").visibility.as_deref(), Some("private"));
        assert_eq!(find(&nodes, "method", "_prop").visibility.as_deref(), Some("private"));
        // factory method is named after the class identifier `C`.
        assert_eq!(find(&nodes, "method", "C").visibility.as_deref(), Some("public"));
    }

    #[test]
    fn static_method_flag() {
        let code = "\
class C {
  static void doWork() {}
  void instance() {}
}
";
        let (nodes, _edges, _refs) = extract_all("stat.dart", code);
        assert!(find(&nodes, "method", "doWork").is_static);
        assert!(!find(&nodes, "method", "instance").is_static);
    }

    #[test]
    fn unnamed_extension_is_skipped_entirely() {
        // `extension on String {}` with no name creates no class node and its
        // body is NOT visited, so its members are invisible (TS createNode
        // rejects an empty name and skips the subtree).
        let code = "\
extension on String {
  bool get hidden => true;
  void alsoHidden() {}
}

extension Named on String {
  bool get shown => true;
}
";
        let (nodes, _edges, _refs) = extract_all("ext.dart", code);
        let classes = kinds(&nodes, "class");
        assert_eq!(classes.len(), 1);
        assert_eq!(classes[0].name, "Named");
        assert_eq!(names_of(&nodes, "method"), ["shown"]);
    }

    #[test]
    fn imports_and_exports_become_import_nodes() {
        let code = "\
import 'dart:async';
import 'package:flutter/material.dart';
import 'models.dart' as models;
export 'src/foo.dart';
";
        let (nodes, _edges, _refs) = extract_all("imp.dart", code);
        assert_eq!(
            names_of(&nodes, "import"),
            [
                "dart:async",
                "package:flutter/material.dart",
                "models.dart",
                "src/foo.dart"
            ]
        );
    }

    #[test]
    fn function_and_method_spans_cover_sibling_body() {
        let code = "\
class C {
  void multi() {
    doThing();
  }

  void short() {}
}

void top() {
  return;
}
";
        let (nodes, _edges, _refs) = extract_all("span.dart", code);
        // method_signature on line 2, function_body spans lines 2-4.
        let multi = find(&nodes, "method", "multi");
        assert_eq!(multi.start_line, 2);
        assert_eq!(multi.end_line, 4);
        // Top-level function signature L9, body L9-11.
        let top = find(&nodes, "function", "top");
        assert_eq!(top.start_line, 9);
        assert_eq!(top.end_line, 11);
    }

    #[test]
    fn import_refs_fire_from_import_nodes() {
        let code = "\
import 'dart:async';
import 'models.dart' as models;
export 'src/foo.dart';
";
        let (_nodes, _edges, refs) = extract_all("imp.dart", code);
        let imports = refs_of(&refs, "imports");
        assert_eq!(imports, ["dart:async", "models.dart", "src/foo.dart"]);
        // Each import ref originates from its own import node id.
        for r in refs.iter().filter(|r| r.reference_kind == "imports") {
            let owner = _nodes.iter().find(|n| n.id == r.from_node_id);
            assert_eq!(owner.map(|n| n.kind.as_str()), Some("import"));
        }
    }

    #[test]
    fn extends_mixins_and_implements_refs() {
        let code = "\
class C extends Base with MixA, MixB implements Iface {
}
";
        let (nodes, _edges, refs) = extract_all("inh.dart", code);
        let c = find(&nodes, "class", "C");
        assert_eq!(refs_from(&refs, "extends", &c.id), ["Base"]);
        let mut implements = refs_from(&refs, "implements", &c.id);
        implements.sort();
        assert_eq!(implements, ["Iface", "MixA", "MixB"]);
    }

    #[test]
    fn mixin_on_constraint_and_extension_on_emit_no_inheritance_refs() {
        // A mixin's `on Base` and an extension's `on String` are bare
        // type_identifiers (not superclass/interfaces clauses); the TS
        // extractInheritance clause loop never matches them.
        let code = "\
mixin Loggable on Base {}

extension X on String {}
";
        let (nodes, _edges, refs) = extract_all("on.dart", code);
        assert!(refs_of(&refs, "extends").is_empty());
        assert!(refs_of(&refs, "implements").is_empty());
        // No stray type refs either (these positions are not walked as type
        // annotations).
        let x = find(&nodes, "class", "X");
        assert!(refs_from(&refs, "references", &x.id).is_empty());
    }

    #[test]
    fn selector_calls_cover_simple_chain_and_super_shapes() {
        let code = "\
class C {
  void m() {
    runApp(MyApp());
    Navigator.push(context, route);
    thing.sub();
    super.cleanup();
  }
}
";
        let (nodes, _edges, refs) = extract_all("calls.dart", code);
        let m = find(&nodes, "method", "m");
        let mut calls = refs_from(&refs, "calls", &m.id);
        calls.sort();
        // runApp(...) -> runApp; MyApp() -> MyApp; Navigator.push(...) /
        // thing.sub() both have a direct-identifier receiver, so the accessor
        // path returns receiver.method (no capitalization check here — that
        // gate is only for static-member value reads); super.cleanup() ->
        // cleanup.
        assert_eq!(calls, ["MyApp", "Navigator.push", "cleanup", "runApp", "thing.sub"]);
    }

    #[test]
    fn new_and_const_calls_use_type_names() {
        let code = "\
class C {
  void m() {
    final a = new User.named(1);
    final b = new Plain();
    final c = const EdgeInsets.all(8.0);
    final d = const SizedBox();
  }
}
";
        let (nodes, _edges, refs) = extract_all("nc.dart", code);
        let m = find(&nodes, "method", "m");
        let mut calls = refs_from(&refs, "calls", &m.id);
        calls.sort();
        // TS new_expression returns ONLY the type_identifier (it does not
        // append the named constructor), so `new User.named(1)` -> `User`.
        // const_object_expression returns type + name -> `EdgeInsets.all`.
        assert_eq!(
            calls,
            ["EdgeInsets.all", "Plain", "SizedBox", "User"]
        );
    }

    #[test]
    fn static_member_value_reads_reference_capitalized_receiver() {
        let code = "\
enum Color { red, green }

class C {
  void m() {
    plain(Color.red);
    palette(Colors.blue);
    lower(obj.field);
  }
}
void plain(Object? x) {}
";
        let (nodes, _edges, refs) = extract_all("statics.dart", code);
        let m = find(&nodes, "method", "m");
        // No-arg value reads on a Capitalized receiver -> references.
        let value_reads = refs_from(&refs, "references", &m.id);
        assert!(value_reads.contains(&"Color"), "Color value read: {value_reads:?}");
        assert!(value_reads.contains(&"Colors"), "Colors value read: {value_reads:?}");
        // A lowercase receiver (obj.field) is excluded.
        assert!(!value_reads.contains(&"obj"));
    }

    #[test]
    fn capitalized_static_call_emits_both_call_and_receiver_read() {
        // `Enum.ctor()`: the arg-bearing `()` selector emits a `calls` ref via
        // the accessor path (receiver is a direct identifier -> `Enum.ctor`),
        // while the preceding no-arg `.ctor` selector independently matches
        // the capitalized-receiver value-read gate -> `references` Enum. This
        // mirrors the TS body walker visiting both selector nodes.
        let code = "\
class C {
  void m() {
    factory(Enum2.ctor());
  }
}
void factory(Object? x) {}
";
        let (nodes, _edges, refs) = extract_all("callform.dart", code);
        let m = find(&nodes, "method", "m");
        assert!(refs_from(&refs, "calls", &m.id).contains(&"Enum2.ctor"));
        assert!(refs_from(&refs, "references", &m.id).contains(&"Enum2"));
    }

    #[test]
    fn method_signature_type_refs_filter_builtins() {
        let code = "\
class C {
  Future<User> findById(String id, int count, bool flag) {}
}
";
        let (nodes, _edges, refs) = extract_all("types.dart", code);
        let m = find(&nodes, "method", "findById");
        let type_refs = refs_from(&refs, "references", &m.id);
        // Future/User surface; String/int/bool are BUILTIN and are dropped.
        assert!(type_refs.contains(&"Future"), "{type_refs:?}");
        assert!(type_refs.contains(&"User"), "{type_refs:?}");
        for builtin in ["String", "int", "bool"] {
            assert!(!type_refs.contains(&builtin), "{builtin} should be filtered");
        }
        // Parameter NAMES never surface as refs.
        assert!(!type_refs.contains(&"id"));
        assert!(!type_refs.contains(&"count"));
        assert!(!type_refs.contains(&"flag"));
    }

    #[test]
    fn top_level_function_signature_type_refs() {
        let code = "Future<Order> load(OrderId id) {\n  return Future.value();\n}\n";
        let (nodes, _edges, refs) = extract_all("fn.dart", code);
        let f = find(&nodes, "function", "load");
        let type_refs = refs_from(&refs, "references", &f.id);
        assert!(type_refs.contains(&"Future"), "{type_refs:?}");
        assert!(type_refs.contains(&"Order"), "{type_refs:?}");
        assert!(type_refs.contains(&"OrderId"), "{type_refs:?}");
    }

    #[test]
    fn typedef_rhs_emits_no_type_refs() {
        // Dart's type_alias RHS (`function_type`) carries no `value` field, so
        // the TS extractTypeAlias getChildByField('value') misses it and emits
        // nothing. Reproduce that exactly (no RHS refs).
        let code = "\
typedef MyList = List<int>;
typedef StringMap = Map<String, String>;
";
        let (_nodes, _edges, refs) = extract_all("alias.dart", code);
        assert!(refs_of(&refs, "references").is_empty(), "{:?}", refs);
    }
}

