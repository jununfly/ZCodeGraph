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

use crate::{ExtractedEdge, ExtractedNode, UnresolvedRef};

const LANG: &str = "dart";

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
            // imports ref is added in 1-2-9-2.
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

            // Inheritance (extends/with/implements), type refs and decorators
            // are added in 1-2-9-2.
            nodes.push(extracted);
            stack.push(Frame {
                id: id.clone(),
                name: name.clone(),
                kind: "class",
            });

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
            // Parameter/return type refs added in 1-2-9-2.
            nodes.push(method);
            stack.push(Frame {
                id: id.clone(),
                name: name.clone(),
                kind: "method",
            });
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
}

