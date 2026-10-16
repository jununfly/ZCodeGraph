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

/// Vapor group-var → path-prefix table for one file. Built on the fly while
/// walking: `let todos = app.grouped("todos")` and closure-form
/// `app.group("admin") { admin in … }` both register here so later
/// `todos.get(use: …)` joins the prefix. Mirrors TS vaporResolver.
type VaporGroupPrefixes = std::collections::HashMap<String, String>;

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

/// Attribute names on a declaration's `modifiers` child
/// (`@main`, `@StateObject`, …) — leaf `type_identifier` of each `attribute`.
fn attribute_names(node: SyntaxNode, source: &[u8]) -> Vec<String> {
    let Some(modifiers) = first_named_child(node, "modifiers") else {
        return Vec::new();
    };
    named_children_vec(modifiers)
        .into_iter()
        .filter(|c| c.kind() == "attribute")
        .filter_map(|attr| {
            first_named_child(attr, "user_type")
                .and_then(|ut| first_named_child(ut, "type_identifier"))
                .or_else(|| first_named_child(attr, "type_identifier"))
                .and_then(|t| node_text(t, source))
        })
        .collect()
}

/// HTTP verb method names Vapor's `RoutesBuilder` exposes, paired with the
/// canonical method recorded on the route node.
const VAPOR_ROUTE_METHODS: [&str; 7] = ["get", "post", "put", "patch", "delete", "head", "options"];

/// Text of the first `line_str_text` descendant (a `"..."` string's content).
fn first_line_str_text(node: SyntaxNode, source: &[u8]) -> Option<String> {
    if node.kind() == "line_str_text" {
        return node_text(node, source);
    }
    for child in named_children_vec(node) {
        if let Some(s) = first_line_str_text(child, source) {
            return Some(s);
        }
    }
    None
}

/// First descendant (depth-first) of `node` with the given kind.
fn first_descendant_of_kind<'a>(node: SyntaxNode<'a>, kind: &str) -> Option<SyntaxNode<'a>> {
    for child in named_children_vec(node) {
        if child.kind() == kind {
            return Some(child);
        }
        if let Some(found) = first_descendant_of_kind(child, kind) {
            return Some(found);
        }
    }
    None
}

/// Receiver identifier of a `call_expression`'s `navigation_expression` target
/// (`todos.get(...)` -> `todos`). Returns None for non-simple targets.
fn call_receiver_ident(node: SyntaxNode, source: &[u8]) -> Option<String> {
    let nav = node
        .named_children(&mut node.walk())
        .find(|c| c.kind() == "navigation_expression")?;
    let target = first_named_child(nav, "simple_identifier")?;
    node_text(target, source)
}

/// The `value_arguments` child of a call's `call_suffix`.
fn call_value_arguments<'a>(node: SyntaxNode<'a>) -> Option<SyntaxNode<'a>> {
    node.named_children(&mut node.walk())
        .find(|c| c.kind() == "call_suffix")
        .and_then(|suffix| first_named_child(suffix, "value_arguments"))
}

/// The `use:`-labelled argument value's last dotted identifier
/// (`use: index` / `use: self.editUserHandler` -> tail ident).
fn use_label_handler(node: SyntaxNode, source: &[u8]) -> Option<String> {
    let args = call_value_arguments(node)?;
    for arg in named_children_vec(args) {
        if arg.kind() != "value_argument" {
            continue;
        }
        let is_use_label = first_named_child(arg, "value_argument_label")
            .and_then(|label| first_named_child(label, "simple_identifier"))
            .and_then(|id| node_text(id, source))
            .is_some_and(|t| t == "use");
        if !is_use_label {
            continue;
        }
        // Value: simple_identifier (`index`) or navigation_expression
        // (`self.editUserHandler`) — take the leaf identifier.
        let text = arg.utf8_text(source).ok()?;
        let tail = text
            .rsplit(['.', ':', ' '])
            .find(|s| !s.is_empty() && s.chars().all(|c| c.is_ascii_alphanumeric() || c == '_'));
        if let Some(tail) = tail {
            if tail.chars().next().is_some_and(|c| c.is_ascii_alphabetic() || c == '_') {
                return Some(tail.to_string());
            }
        }
    }
    None
}

/// Push a `route` node + file-level contains edge + route -> handler
/// `references` ref (mirrors TS vaporResolver route emission).
#[allow(clippy::too_many_arguments)]
fn push_vapor_route(
    method: &str,
    path: &str,
    at: SyntaxNode,
    relative_path: &str,
    file_node_id: &str,
    handler: Option<String>,
    nodes: &mut Vec<ExtractedNode>,
    edges: &mut Vec<ExtractedEdge>,
    unresolved_refs: &mut Vec<UnresolvedRef>,
) {
    let route_name = format!("{} {}", method, path);
    let route_node = ExtractedNode::symbol(relative_path, "route", &route_name, at, LANG);
    let route_id = route_node.id.clone();
    edges.push(ExtractedEdge {
        source: file_node_id.to_string(),
        target: route_id.clone(),
        kind: "contains".to_string(),
        line: route_node.start_line,
        col: route_node.start_column,
    });
    nodes.push(route_node);
    if let Some(handler) = handler {
        push_ref(
            unresolved_refs,
            &route_id,
            &handler,
            "references",
            at,
            relative_path,
            SourceLanguage::Swift,
        );
    }
}

/// Method name of a Vapor route call (`todos.get(use: …)` -> `get`), gated on
/// the presence of a `use:`-labelled argument so `Environment.get("X")` and
/// `req.parameters.get("X")` are NOT routes (TS parity).
fn vapor_route_method(node: SyntaxNode, source: &[u8]) -> Option<String> {
    use_label_handler(node, source)?; // gate: must carry `use:`
    let nav = node
        .named_children(&mut node.walk())
        .find(|c| c.kind() == "navigation_expression")?;
    let method = nav
        .named_children(&mut nav.walk())
        .find(|c| c.kind() == "navigation_suffix")
        .and_then(|suf| first_named_child(suf, "simple_identifier"))
        .and_then(|id| node_text(id, source))?;
    if VAPOR_ROUTE_METHODS.contains(&method.as_str()) {
        Some(method)
    } else {
        None
    }
}

/// String segments before `use:` in a route call's argument list, each
/// prefixed with `/` and concatenated (`app.get("a", "b", …)` -> `/a/b`).
/// Non-string segments (`BlogUser.parameter`, `:id` written as a bare
/// string is still a string; `User.parameter` nav exprs) are skipped —
/// only literal string segments contribute (TS parity: its regex collected
/// every `"..."` in the pre-use argument text).
fn vapor_route_segments(node: SyntaxNode, source: &[u8]) -> String {
    let Some(args) = call_value_arguments(node) else {
        return String::new();
    };
    let mut out = String::new();
    for arg in named_children_vec(args) {
        if arg.kind() != "value_argument" {
            continue;
        }
        // Stop at the `use:` label — path segments precede it.
        let is_use_label = first_named_child(arg, "value_argument_label")
            .and_then(|label| first_named_child(label, "simple_identifier"))
            .and_then(|id| node_text(id, source))
            .is_some_and(|t| t == "use");
        if is_use_label {
            break;
        }
        if let Some(seg) = first_line_str_text(arg, source) {
            out.push('/');
            out.push_str(&seg);
        }
    }
    out
}

/// Join a group prefix and the call's own segments; empty => `/`
/// (mirrors TS `(groupPrefix.get(receiver) ?? '') + segJoin('') || '/'`).
fn join_swift_path(prefix: &str, segs: &str) -> String {
    let joined = format!("{}{}", prefix, segs);
    if joined.is_empty() {
        "/".to_string()
    } else {
        joined
    }
}

/// `let x = recv.grouped("a", "b")` — register x's prefix. recv may itself
/// be a known group var (nested groups join).
fn vapor_grouped_let(
    node: SyntaxNode,
    source: &[u8],
    groups: &VaporGroupPrefixes,
) -> Option<(String, String)> {
    // pattern-bound variable name
    let var = first_named_child(node, "pattern")
        .and_then(|p| first_named_child(p, "simple_identifier"))
        .and_then(|id| node_text(id, source))?;
    // initializer call
    let call = node
        .named_children(&mut node.walk())
        .find(|c| c.kind() == "call_expression")?;
    let method = call
        .named_children(&mut call.walk())
        .find(|c| c.kind() == "navigation_expression")
        .and_then(|nav| {
            nav.named_children(&mut nav.walk())
                .find(|c| c.kind() == "navigation_suffix")
                .and_then(|suf| first_named_child(suf, "simple_identifier"))
                .and_then(|id| node_text(id, source))
        })?;
    if method != "grouped" {
        return None;
    }
    let receiver = call_receiver_ident(call, source).unwrap_or_default();
    let base = groups.get(&receiver).cloned().unwrap_or_default();
    let segs = vapor_route_segments_all_strings(call, source);
    Some((var, format!("{}{}", base, segs)))
}

/// All string segments of a call's value_arguments (no use:-label stop) —
/// used for `grouped("a", "b")` argument collection.
fn vapor_route_segments_all_strings(node: SyntaxNode, source: &[u8]) -> String {
    let Some(args) = call_value_arguments(node) else {
        return String::new();
    };
    let mut out = String::new();
    for arg in named_children_vec(args) {
        if arg.kind() != "value_argument" {
            continue;
        }
        if let Some(seg) = first_line_str_text(arg, source) {
            out.push('/');
            out.push_str(&seg);
        }
    }
    out
}

/// Closure-form group: `recv.group("a") { x in … }` -> (x, prefix).
fn vapor_closure_group(
    node: SyntaxNode,
    source: &[u8],
    groups: &VaporGroupPrefixes,
) -> Option<(String, String)> {
    let nav = node
        .named_children(&mut node.walk())
        .find(|c| c.kind() == "navigation_expression")?;
    let method = nav
        .named_children(&mut nav.walk())
        .find(|c| c.kind() == "navigation_suffix")
        .and_then(|suf| first_named_child(suf, "simple_identifier"))
        .and_then(|id| node_text(id, source))?;
    if method != "group" {
        return None;
    }
    // Closure parameter: `call_suffix > lambda_literal >
    // lambda_function_type > lambda_function_type_parameters >
    // lambda_parameter > simple_identifier` — descend generically.
    let lambda = node
        .named_children(&mut node.walk())
        .find(|c| c.kind() == "call_suffix")
        .and_then(|suffix| first_named_child(suffix, "lambda_literal"))?;
    let param = first_descendant_of_kind(lambda, "lambda_parameter")
        .and_then(|lp| first_named_child(lp, "simple_identifier"))
        .and_then(|id| node_text(id, source))?;
    let receiver = call_receiver_ident(node, source).unwrap_or_default();
    let base = groups.get(&receiver).cloned().unwrap_or_default();
    let segs = vapor_route_segments_all_strings(node, source);
    Some((param, format!("{}{}", base, segs)))
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
    let mut vapor_groups: VaporGroupPrefixes = VaporGroupPrefixes::new();
    let mut cursor = root.walk();
    visit(
        &mut cursor,
        source,
        relative_path,
        file_node_id,
        file_node_id,
        &mut stack,
        false,
        file_node_id,
        &mut vapor_groups,
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
    file_node_id: &str,
    vapor_groups: &mut VaporGroupPrefixes,
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

        // ---- 1-4-1-19 Vapor: `receiver.METHOD([segs,] use: handler)` ----
        // and the group-prefix producers `let x = recv.grouped("…")` /
        // `recv.group("…") { x in … }`. `use:` discriminates a real route
        // from Environment.get("X")/req.parameters.get("X") (TS parity).
        if let Some(method) = vapor_route_method(node, source) {
            let receiver = call_receiver_ident(node, source);
            let prefix = receiver
                .as_deref()
                .and_then(|r| vapor_groups.get(r))
                .cloned()
                .unwrap_or_default();
            let segs = vapor_route_segments(node, source);
            let route_path = join_swift_path(&prefix, &segs);
            let handler = use_label_handler(node, source);
            push_vapor_route(
                &method.to_uppercase(),
                &route_path,
                node,
                relative_path,
                file_node_id,
                handler,
                nodes,
                edges,
                unresolved_refs,
            );
        }
        // Closure-form group: `recv.group("…") { x in … }` — register the
        // closure parameter's prefix, then KEEP WALKING (the body holds the
        // actual route calls, visited below by the default descent).
        if let Some((param, prefix)) = vapor_closure_group(node, source, vapor_groups) {
            vapor_groups.insert(param, prefix);
        }
    }

    // ---- property declarations: `let x = recv.grouped("…")` registers a ----
    // ---- Vapor group prefix; the declaration itself is no baseline node. ----
    if kind == "property_declaration" {
        if let Some((var, prefix)) = vapor_grouped_let(node, source, vapor_groups) {
            vapor_groups.insert(var, prefix);
        }
        // fall through to the default descent (initializer calls get calls refs)
    }

    // ---- class / struct / enum / extension (all class_declaration) ----
    if kind == "class_declaration" {
        if let Some(name) = class_name(node, source) {
            let symbol_kind = classify_class(node);

            // ---- 1-4-1-17 SwiftUI: `struct V: View` -> `component`; ----
            // ---- `@main struct A: App` -> `class` (app entry point).   ----
            // Rust emits a SECOND, framework-typed node for the same source
            // span (baseline struct/class node above is untouched), mirroring
            // the TS swiftUIResolver's dedicated node kinds. Owned by the
            // FILE frame (stack-bottom), like every framework route node.
            if symbol_kind == "struct" {
                let inherits = inheritance_names(node, source);
                let attrs = attribute_names(node, source);
                if inherits.iter().any(|p| p == "View") {
                    let view_node =
                        ExtractedNode::symbol(relative_path, "component", &name, node, LANG);
                    edges.push(ExtractedEdge {
                        source: file_node_id.to_string(),
                        target: view_node.id.clone(),
                        kind: "contains".to_string(),
                        line: view_node.start_line,
                        col: view_node.start_column,
                    });
                    nodes.push(view_node);
                }
                if attrs.iter().any(|a| a == "main") && inherits.iter().any(|p| p == "App") {
                    let app_node = ExtractedNode::symbol(relative_path, "class", &name, node, LANG);
                    edges.push(ExtractedEdge {
                        source: file_node_id.to_string(),
                        target: app_node.id.clone(),
                        kind: "contains".to_string(),
                        line: app_node.start_line,
                        col: app_node.start_column,
                    });
                    nodes.push(app_node);
                }
            }

            // ---- 1-4-1-18 UIKit: `class C: …UIViewController` /         ----
            // ---- `class V: …UIView` (framework class nodes).            ----
            if symbol_kind == "class" {
                let inherits = inheritance_names(node, source);
                let framework_kind = if inherits.iter().any(|p| p == "UIViewController") {
                    Some("viewcontroller")
                } else if inherits.iter().any(|p| p == "UIView") {
                    Some("uiview")
                } else {
                    None
                };
                if let Some(_tag) = framework_kind {
                    let fw_node = ExtractedNode::symbol(relative_path, "class", &name, node, LANG);
                    edges.push(ExtractedEdge {
                        source: file_node_id.to_string(),
                        target: fw_node.id.clone(),
                        kind: "contains".to_string(),
                        line: fw_node.start_line,
                        col: fw_node.start_column,
                    });
                    nodes.push(fw_node);
                }
            }

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
                        file_node_id,
                        vapor_groups,
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
                        file_node_id,
                        vapor_groups,
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
                        file_node_id,
                        vapor_groups,
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
            file_node_id,
            vapor_groups,
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

    #[test]
    fn swiftui_view_struct_emits_component_node() {
        let src = r#"
import SwiftUI
struct ContentView: View {
    var body: some View { Text("hi") }
}
struct ListRow: View {
    var body: some View { Text("row") }
}
"#;
        let (nodes, _edges, _refs) = run_extract(src);
        let mut components: Vec<String> = nodes
            .iter()
            .filter(|n| n.kind == "component")
            .map(|n| n.name.clone())
            .collect();
        components.sort();
        assert_eq!(components, vec!["ContentView".to_string(), "ListRow".to_string()]);
        // Baseline struct nodes still exist alongside the framework nodes.
        assert!(nodes.iter().any(|n| n.kind == "struct" && n.name == "ContentView"));
    }

    #[test]
    fn swiftui_main_app_struct_emits_app_class_node() {
        let src = r#"
import SwiftUI
@main
struct MyApp: App {
    var body: some Scene { WindowGroup { ContentView() } }
}
"#;
        let (nodes, _edges, _refs) = run_extract(src);
        // One baseline `struct` node plus one framework `class` node (the
        // @main App entry point) sharing the name MyApp.
        let my_app: Vec<&ExtractedNode> = nodes.iter().filter(|n| n.name == "MyApp").collect();
        let kinds: Vec<&str> = my_app.iter().map(|n| n.kind.as_str()).collect();
        assert!(kinds.contains(&"struct"));
        assert!(kinds.contains(&"class"));
    }

    #[test]
    fn uikit_viewcontroller_and_uiview_emit_framework_class_nodes() {
        let src = r#"
import UIKit
class HomeViewController: UIViewController {
    override func viewDidLoad() { super.viewDidLoad() }
}
class BadgeView: UIView {
    override func layoutSubviews() { super.layoutSubviews() }
}
class PlainService {
    func run() {}
}
"#;
        let (nodes, _edges, _refs) = run_extract(src);
        let framework_classes: Vec<&ExtractedNode> = nodes
            .iter()
            .filter(|n| n.kind == "class")
            .collect();
        let names: Vec<&str> = framework_classes.iter().map(|n| n.name.as_str()).collect();
        assert!(names.contains(&"HomeViewController"));
        assert!(names.contains(&"BadgeView"));
        // Each framework class appears TWICE (baseline + framework node).
        assert_eq!(names.iter().filter(|n| **n == "HomeViewController").count(), 2);
        assert_eq!(names.iter().filter(|n| **n == "BadgeView").count(), 2);
        // Plain classes stay single.
        assert_eq!(names.iter().filter(|n| **n == "PlainService").count(), 1);
    }

    #[test]
    fn vapor_grouped_and_plain_routes_join_prefixes() {
        let src = r#"
import Vapor
func routes(_ app: Application) throws {
    let todos = app.grouped("todos")
    todos.get(use: index)
    todos.post(use: create)
    todos.group(":todoID") { todo in
        todo.delete(use: delete)
    }
    app.get("health", use: healthCheck)
    router.get("users", "edit", use: self.editUserHandler)
}
"#;
        let (nodes, _edges, refs) = run_extract(src);
        let mut routes: Vec<String> = nodes
            .iter()
            .filter(|n| n.kind == "route")
            .map(|n| n.name.clone())
            .collect();
        routes.sort();
        assert_eq!(
            routes,
            vec![
                "DELETE /todos/:todoID".to_string(),
                "GET /health".to_string(),
                "GET /todos".to_string(),
                "GET /users/edit".to_string(),
                "POST /todos".to_string(),
            ]
        );
        let handler_refs: Vec<&str> = refs
            .iter()
            .filter(|r| r.reference_kind == "references")
            .map(|r| r.reference_name.as_str())
            .collect();
        assert!(handler_refs.contains(&"index"));
        assert!(handler_refs.contains(&"create"));
        assert!(handler_refs.contains(&"delete"));
        assert!(handler_refs.contains(&"healthCheck"));
        // Dotted handler (`self.editUserHandler`) resolves to its tail ident.
        assert!(handler_refs.contains(&"editUserHandler"));
    }

    #[test]
    fn vapor_use_label_gates_real_routes_from_lookalikes() {
        let src = r#"
import Vapor
func boot(_ app: Application) throws {
    let host = Environment.get("DATABASE_HOST") ?? "localhost"
    app.get("real", use: listUsers)
}
"#;
        let (nodes, _edges, refs) = run_extract(src);
        let routes: Vec<String> = nodes
            .iter()
            .filter(|n| n.kind == "route")
            .map(|n| n.name.clone())
            .collect();
        assert_eq!(routes, vec!["GET /real".to_string()]);
        assert!(refs
            .iter()
            .any(|r| r.reference_kind == "references" && r.reference_name == "listUsers"));
    }

    fn run_extract(src: &str) -> (Vec<ExtractedNode>, Vec<ExtractedEdge>, Vec<UnresolvedRef>) {
        let tree = parse(src);
        let mut nodes = Vec::new();
        let mut edges = Vec::new();
        let mut refs = Vec::new();
        extract(
            tree.root_node(),
            src.as_bytes(),
            "Sources/App/routes.swift",
            "file:test",
            &mut nodes,
            &mut edges,
            &mut refs,
        )
        .unwrap();
        (nodes, edges, refs)
    }
}
