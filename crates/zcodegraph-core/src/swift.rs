//! Swift baseline extraction (roadmap 1-6-4).
//!
//! Mirrors the legacy TS `swiftExtractor` (src/extraction/languages/swift.ts)
//! as driven by the shared orchestrator (src/extraction/tree-sitter.ts), over
//! tree-sitter-swift grammar 0.6.0 (ABI 14) — the same grammar generation as
//! the production tree-sitter-swift.wasm (tree-sitter-wasms 0.1.13).
//!
//! Node-shape contract (established by an AST census of 0.6.0 and by reading
//! the TS orchestrator; see roadmap decision on 1-6-4-2):
//!
//! * `import_declaration` -> `import`, named by its `identifier`.
//! * `class_declaration` is REUSED by this grammar for class, struct, enum
//!   AND extension. The inner declaration-kind keyword distinguishes them:
//!   `struct` -> `struct`, `enum` -> `enum`, anything else (`class`,
//!   `extension`) -> `class`. This mirrors swiftExtractor.classifyClassNode,
//!   which scans for an inner `struct`/`enum` keyword and otherwise returns
//!   `class` — so an `extension Dog { … }` body produces a class-like node
//!   named `Dog`.
//! * `protocol_declaration` -> `interface`.
//! * `typealias_declaration` -> `type_alias`, named by its `type_identifier`.
//! * `function_declaration` -> `method` when inside a type body, otherwise a
//!   top-level `function`.
//! * `enum_entry` -> one `enum_member` per inner `simple_identifier` (a
//!   single `case a, b` yields two members).
//!
//! Deliberately NOT symbols in the baseline (matches the TS orchestrator):
//! * stored properties (`var x: Int`, `let id: UUID`, `@Published var tag`)
//!   parse as `property_declaration`, which is neither propertyTypes nor (at
//!   the top level) matched by the generic variable fallback (its name is a
//!   `simple_identifier`, not `identifier`/`variable_declarator`). The only
//!   baseline TS effect of an in-type property is the special-case at
//!   tree-sitter.ts:459 that attributes the property wrapper / metatype /
//!   declared-type references to the owning TYPE — framework/Fluent
//!   modelling restored in 1-6-4-5 via the TS-shell finalize pass.
//! * `init_declaration` (not in functionTypes/methodTypes).
//! * `protocol_function_declaration` / `protocol_property_declaration`
//!   (protocol requirements are distinct node kinds matched by no extractor
//!   type list) and `associatedtype_declaration`.
//!
//! References:
//! * `inheritance_specifier > user_type > type_identifier` -> `extends`. The
//!   TS path makes no class-vs-protocol distinction, so superclass, protocol
//!   conformance, struct raw-representability and protocol inheritance all
//!   emit `extends`.
//! * `call_expression` -> `calls`. A bare `simple_identifier` callee is the
//!   call name; a `navigation_expression` callee is `receiver.method`,
//!   dropping the receiver for self/super and for call/nested receivers
//!   (same rule as the Kotlin extractor, whose grammar shares these kinds).
//!
//! Function parameters and return types are UNFIELDLED in 0.6.0 (bare
//! `parameter` / `user_type` children, not `parameter`/`return_type`
//! fields), so the TS extractor's getChildByField-based type-annotation walk
//! finds nothing; the baseline therefore emits no signature type refs.

use tree_sitter::{Node as SyntaxNode, TreeCursor};

use crate::{push_ref, ExtractedEdge, ExtractedNode, SourceLanguage, UnresolvedRef};

const LANG: &str = "swift";

/// A semantic (non-file) containment frame; only the name participates in
/// qualified-name building.
struct Frame {
    name: String,
}

fn node_text<'a>(node: SyntaxNode<'a>, source: &'a [u8]) -> Option<String> {
    node.utf8_text(source)
        .ok()
        .map(str::trim)
        .filter(|s| !s.is_empty())
        .map(ToString::to_string)
}

fn first_named_child<'a>(node: SyntaxNode<'a>, kind: &str) -> Option<SyntaxNode<'a>> {
    node.named_children(&mut node.walk())
        .find(|c| c.kind() == kind)
}

fn named_children_vec<'a>(node: SyntaxNode<'a>) -> Vec<SyntaxNode<'a>> {
    node.named_children(&mut node.walk()).collect()
}

/// Qualified name = every frame name, then the symbol name (mirrors
/// buildQualifiedName, which skips only the file frame).
fn qualified_name(stack: &[Frame], name: &str) -> String {
    let mut parts: Vec<String> = stack.iter().map(|f| f.name.clone()).collect();
    parts.push(name.to_string());
    parts.join("::")
}

/// `class_declaration` classification, mirroring
/// swiftExtractor.classifyClassNode (inner `struct`/`enum` keyword, else
/// class — which also covers `extension`).
fn classify_class(node: SyntaxNode) -> &'static str {
    for child in node.children(&mut node.walk()) {
        match child.kind() {
            "struct" => return "struct",
            "enum" => return "enum",
            _ => {}
        }
    }
    "class"
}

/// The declared-name subtree of a `class_declaration`: a direct
/// `type_identifier` (class/struct/enum) or a `user_type` (extension).
fn class_name<'a>(node: SyntaxNode<'a>, source: &'a [u8]) -> Option<String> {
    named_children_vec(node)
        .into_iter()
        .find(|c| matches!(c.kind(), "type_identifier" | "user_type"))
        .and_then(|n| {
            let t = first_named_child(n, "type_identifier").unwrap_or(n);
            node_text(t, source)
        })
}

/// Visibility for a type/method declaration, mirroring
/// swiftExtractor.getVisibility (read the `modifiers` subtree).
/// fileprivate is reported as `private`; absent modifiers => `internal`.
fn visibility(node: SyntaxNode, source: &[u8]) -> String {
    if let Some(text) = first_named_child(node, "modifiers")
        .and_then(|m| m.utf8_text(source).ok())
    {
        if text.contains("fileprivate") || text.contains("private") {
            return "private".to_string();
        }
        if text.contains("public") || text.contains("open") {
            return "public".to_string();
        }
        if text.contains("internal") {
            return "internal".to_string();
        }
    }
    "internal".to_string()
}

/// Whether a declaration carries a `static`/`class` member modifier,
/// mirroring swiftExtractor.isStatic (scans the modifiers subtree).
fn is_static(node: SyntaxNode, source: &[u8]) -> bool {
    first_named_child(node, "modifiers")
        .and_then(|m| m.utf8_text(source).ok())
        .is_some_and(|text| text.contains("static") || text.contains("class"))
}

/// Each `inheritance_specifier > user_type > type_identifier` name.
fn inheritance_names<'a>(node: SyntaxNode<'a>, source: &'a [u8]) -> Vec<String> {
    named_children_vec(node)
        .into_iter()
        .filter(|c| c.kind() == "inheritance_specifier")
        .filter_map(|spec| {
            first_named_child(spec, "user_type")
                .and_then(|ut| first_named_child(ut, "type_identifier"))
                .and_then(|t| node_text(t, source))
        })
        .collect()
}

/// Callee name for a `call_expression`, sharing the Kotlin grammar's
/// simple_identifier / navigation_expression shapes.
fn call_name(node: SyntaxNode, source: &[u8]) -> Option<String> {
    let func = node.named_children(&mut node.walk()).next()?;

    if func.kind() == "simple_identifier" {
        return node_text(func, source);
    }

    if func.kind() == "navigation_expression" {
        let named = named_children_vec(func);
        let receiver = named.first().copied();
        let method = named
            .iter()
            .find(|c| c.kind() == "navigation_suffix")
            .and_then(|suf| first_named_child(*suf, "simple_identifier"))
            .and_then(|m| node_text(m, source))?;
        let receiver_is_simple = receiver
            .is_some_and(|r| matches!(r.kind(), "simple_identifier" | "identifier"));
        if !receiver_is_simple {
            return Some(method);
        }
        let receiver_text = receiver.and_then(|r| node_text(r, source)).unwrap_or_default();
        const SKIP: [&str; 3] = ["self", "super", ""];
        if SKIP.contains(&receiver_text.trim()) {
            return Some(method);
        }
        return Some(format!("{receiver_text}.{method}"));
    }

    None
}

fn push_contains(
    edges: &mut Vec<ExtractedEdge>,
    source: &str,
    target: &ExtractedNode,
) {
    edges.push(ExtractedEdge {
        source: source.to_string(),
        target: target.id.clone(),
        kind: "contains".to_string(),
        line: target.start_line,
        col: target.start_column,
    });
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
        false,
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
    in_type: bool,
    nodes: &mut Vec<ExtractedNode>,
    edges: &mut Vec<ExtractedEdge>,
    unresolved_refs: &mut Vec<UnresolvedRef>,
) -> Result<(), Box<dyn std::error::Error>> {
    let node = cursor.node();
    let kind = node.kind();

    // ---- imports: children carry no symbols ----
    if kind == "import_declaration" {
        let name = first_named_child(node, "identifier")
            .and_then(|id| {
                first_named_child(id, "simple_identifier")
                    .and_then(|s| node_text(s, source))
                    .or_else(|| node_text(id, source))
            });
        if let Some(name) = name {
            let import = ExtractedNode::symbol(relative_path, "import", &name, node, LANG);
            push_contains(edges, contains_parent, &import);
            nodes.push(import);
            push_ref(
                unresolved_refs,
                contains_parent,
                &name,
                "imports",
                node,
                relative_path,
                SourceLanguage::Swift,
            );
        }
        return Ok(());
    }

    // ---- call expressions: a `calls` ref; keep walking for nested calls ----
    if kind == "call_expression" {
        if let Some(callee) = call_name(node, source) {
            push_ref(
                unresolved_refs,
                ref_parent,
                &callee,
                "calls",
                node,
                relative_path,
                SourceLanguage::Swift,
            );
        }
    }

    // ---- class / struct / enum / extension (all class_declaration) ----
    if kind == "class_declaration" {
        if let Some(name) = class_name(node, source) {
            let symbol_kind = classify_class(node);
            let qname = qualified_name(stack, &name);
            let extracted = ExtractedNode::symbol_with_visibility_and_qualified_name(
                relative_path,
                symbol_kind,
                &name,
                node,
                LANG,
                Some(visibility(node, source)),
                qname,
            );
            let id = extracted.id.clone();
            push_contains(edges, contains_parent, &extracted);
            nodes.push(extracted);

            for parent in inheritance_names(node, source) {
                push_ref(
                    unresolved_refs,
                    &id,
                    &parent,
                    "extends",
                    node,
                    relative_path,
                    SourceLanguage::Swift,
                );
            }

            stack.push(Frame {
                name: name.clone(),
            });
            let body = first_named_child(node, "class_body")
                .or_else(|| first_named_child(node, "enum_class_body"));
            if let Some(body) = body {
                for child in body.named_children(&mut body.walk()) {
                    let mut cc = child.walk();
                    visit(
                        &mut cc,
                        source,
                        relative_path,
                        &id,
                        &id,
                        stack,
                        true,
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

    // ---- protocol (interface) ----
    if kind == "protocol_declaration" {
        if let Some(name) =
            first_named_child(node, "type_identifier").and_then(|t| node_text(t, source))
        {
            let qname = qualified_name(stack, &name);
            let extracted = ExtractedNode::symbol_with_qualified_name(
                relative_path,
                "interface",
                &name,
                node,
                LANG,
                qname,
            );
            let id = extracted.id.clone();
            push_contains(edges, contains_parent, &extracted);
            nodes.push(extracted);

            for parent in inheritance_names(node, source) {
                push_ref(
                    unresolved_refs,
                    &id,
                    &parent,
                    "extends",
                    node,
                    relative_path,
                    SourceLanguage::Swift,
                );
            }

            stack.push(Frame {
                name: name.clone(),
            });
            if let Some(body) = first_named_child(node, "protocol_body") {
                for child in body.named_children(&mut body.walk()) {
                    // Protocol requirements (protocol_function_declaration /
                    // protocol_property_declaration / associatedtype) produce
                    // no baseline nodes; still descend so calls in a defaulted
                    // body attribute to the protocol.
                    let mut cc = child.walk();
                    visit(
                        &mut cc,
                        source,
                        relative_path,
                        &id,
                        &id,
                        stack,
                        true,
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

    // ---- typealias ----
    if kind == "typealias_declaration" {
        if let Some(name) =
            first_named_child(node, "type_identifier").and_then(|t| node_text(t, source))
        {
            let qname = qualified_name(stack, &name);
            let extracted = ExtractedNode::symbol_with_qualified_name(
                relative_path,
                "type_alias",
                &name,
                node,
                LANG,
                qname,
            );
            push_contains(edges, contains_parent, &extracted);
            nodes.push(extracted);
        }
        return Ok(());
    }

    // ---- function / method ----
    if kind == "function_declaration" {
        if let Some(name) = first_named_child(node, "simple_identifier")
            .and_then(|s| node_text(s, source))
        {
            let symbol_kind = if in_type { "method" } else { "function" };
            let qname = qualified_name(stack, &name);
            let mut extracted = ExtractedNode::symbol_with_visibility_and_qualified_name(
                relative_path,
                symbol_kind,
                &name,
                node,
                LANG,
                Some(visibility(node, source)),
                qname,
            );
            extracted.is_static = is_static(node, source);
            let id = extracted.id.clone();
            push_contains(edges, contains_parent, &extracted);
            nodes.push(extracted);

            // Descend into the body on the function's own frame so calls
            // attribute to the method/function. Nested declarations are not a
            // Swift baseline concern.
            if let Some(body) = first_named_child(node, "function_body") {
                stack.push(Frame {
                    name: name.clone(),
                });
                for child in body.named_children(&mut body.walk()) {
                    let mut cc = child.walk();
                    visit(
                        &mut cc,
                        source,
                        relative_path,
                        &id,
                        &id,
                        stack,
                        false,
                        nodes,
                        edges,
                        unresolved_refs,
                    )?;
                }
                stack.pop();
            }
            return Ok(());
        }
    }

    // ---- enum members: one node per inner simple_identifier ----
    if kind == "enum_entry" {
        for id_node in named_children_vec(node)
            .into_iter()
            .filter(|c| c.kind() == "simple_identifier")
        {
            if let Some(name) = node_text(id_node, source) {
                let qname = qualified_name(stack, &name);
                let extracted = ExtractedNode::symbol_with_qualified_name(
                    relative_path,
                    "enum_member",
                    &name,
                    id_node,
                    LANG,
                    qname,
                );
                push_contains(edges, contains_parent, &extracted);
                nodes.push(extracted);
            }
        }
        // enum_type_parameters (associated values) hold types but the TS
        // baseline emits no refs for them; do not descend into the entry.
        return Ok(());
    }

    // ---- default: recurse into named children with unchanged parents ----
    //
    // Covers, among others, the VALUE of a `property_declaration` (a local or
    // top-level `let x = Foo()`): the TS orchestrator does not skip children
    // for Swift properties, so initializer calls are walked and attributed to
    // the enclosing function/type/file — even though the property itself is no
    // baseline node. Collect children first because a recursive visit must not
    // share the caller's cursor position.
    for child in node.named_children(&mut node.walk()) {
        let mut child_cursor = child.walk();
        visit(
            &mut child_cursor,
            source,
            relative_path,
            contains_parent,
            ref_parent,
            stack,
            in_type,
            nodes,
            edges,
            unresolved_refs,
        )?;
    }

    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;

    fn parse(source: &str) -> tree_sitter::Tree {
        let mut parser = tree_sitter::Parser::new();
        parser
            .set_language(&tree_sitter_swift::LANGUAGE.into())
            .expect("tree-sitter-swift ABI bridges into tree-sitter 0.24");
        parser.parse(source, None).expect("parse")
    }

    fn count_errors(node: SyntaxNode) -> usize {
        let mut total = if node.is_error() || node.is_missing() { 1 } else { 0 };
        let mut cursor = node.walk();
        for child in node.children(&mut cursor) {
            total += count_errors(child);
        }
        total
    }

    /// 1-6-4-1 grammar/ABI gate retained: `LANGUAGE.into()` loads under
    /// tree-sitter 0.24 and a modern Swift sample parses with zero ERRORs.
    #[test]
    fn swift_grammar_bridges_abi14_and_parses_swift5_sample_without_errors() {
        let source = r#"
import Foundation
import Vapor

protocol Repository {
    associatedtype Element
    func find(_ id: UUID) async throws -> Element?
}

struct User: Codable, Identifiable {
    let id: UUID
    var name: String
}

enum AppError: Error {
    case notFound
    case invalid(String)
}

final class UserService {
    private var users: [UUID: User] = [:]

    func get(_ id: UUID) async throws -> User {
        guard let user = users[id] else { throw AppError.notFound }
        return user
    }
}

extension UserService {
    func add(_ user: User) {
        users[user.id] = user
    }
}

final class UserController {
    func show(req: Request) async throws -> User {
        let id = try req.parameters.require("id", as: UUID.self)
        return try await UserService().get(id)
    }
}
"#;
        assert_eq!(count_errors(parse(source).root_node()), 0);
    }
}
