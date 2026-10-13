//! Lua baseline extraction (roadmap 1-2-12-2).
//!
//! Mirrors the legacy TS `luaExtractor` (src/extraction/languages/lua.ts) as
//! driven by the shared orchestrator (src/extraction/tree-sitter.ts), over the
//! tree-sitter-lua 0.2.0 grammar (ABI 14, bridged via tree-sitter-language) —
//! pinned in 1-2-12-1.
//!
//! Lua has no classes/structs/interfaces/enums/type aliases — tables are used
//! for everything — so the baseline symbol surface is functions, methods,
//! locals and imports only:
//!
//! * `function_declaration` covers global (`function f`), local
//!   (`local function f`), table (`function t.f()`) and method
//!   (`function t:m()`) forms; the form is distinguished by the `name` field
//!   child, NOT by a separate node type. An `identifier` name (`f`) makes a
//!   `function` with a qualified name stacked over any enclosing function
//!   (`outer::inner`); a `dot_index_expression` (`a.b.c`) or
//!   `method_index_expression` (`M:m`) name makes a `method` whose simple name
//!   is the trailing `field`/`method` and whose qualified name is forced to
//!   `<table>::<name>` (`a.b::c`, `M::deposit`), matching TS extractMethod's
//!   receiverType override. Lua tables carry no class/struct node, so there is
//!   no owner to attach to — the method's `contains` edge comes from the stack
//!   head (file or enclosing function), exactly like TS createNode when the
//!   receiver owner lookup finds no struct/class/enum/trait. Anonymous
//!   `function() … end` is `function_definition`, carries no symbol, and —
//!   when it is a local initializer — is never descended into (the variable
//!   branch prunes its subtree).
//! * `require("x")` / `require "x"` is a bare `function_call` whose `name`
//!   identifier is `require` (Lua has no import statement). It emits an
//!   `import` of the module name plus an `imports` ref, and the subtree is
//!   pruned so it is not double-counted as a call. Module name resolution
//!   mirrors luaExtractor.requireModule: a string require yields the
//!   `string_content` text (`net.http`) or a `string` with `[[…]]`/quotes
//!   stripped; a Roblox/Luau instance path `require(script.Parent.Signal)`
//!   yields the trailing `field`/`method` of the index expression (`Signal`).
//!   A `local x = require(..)` is dug out of the variable initializer
//!   explicitly, because the variable branch prunes that subtree.
//! * every other `function_call` -> `calls`, named by the full text of the
//!   `name` field callee: `print`, `M.greet` (dot kept), `self:add` /
//!   `acct:deposit` (colon kept — the Lua call never enters the orchestrator's
//!   member-expression receiver branch). Arguments are still walked so a
//!   nested call/require in them is captured.
//! * `variable_declaration` wraps an `assignment_statement`
//!   (`variable_list` = names, `expression_list` = values). Each plain
//!   `identifier` name becomes a `variable` node (span on the identifier) with
//!   a `= <initializer>` signature truncated to 100 chars; the whole subtree
//!   is then pruned.

use tree_sitter::{Node as SyntaxNode, TreeCursor};

use crate::{push_ref, ExtractedEdge, ExtractedNode, SourceLanguage, UnresolvedRef};

const LANG: &str = "lua";

/// A semantic containment frame (only functions/methods push frames; the file
/// is the implicit root and is never on the stack). Only the simple name is
/// retained — containment/ref parents are threaded explicitly while walking.
struct Frame {
    /// Simple (unqualified) name, used to stack an inner function's qualified
    /// name (`outer::inner`).
    name: String,
}

/// Qualified name for a plain function: the enclosing frame simple names
/// joined with `::`, then this function's name.
fn qualified_name(stack: &[Frame], name: &str) -> String {
    let mut parts: Vec<String> = stack.iter().map(|f| f.name.clone()).collect();
    parts.push(name.to_string());
    parts.join("::")
}

/// Raw source text of a node (only surrounding whitespace trimmed by
/// [`str::trim`]); `None` if not UTF-8 / empty.
fn node_text<'a>(node: SyntaxNode<'a>, source: &'a [u8]) -> Option<String> {
    node.utf8_text(source)
        .ok()
        .map(str::trim)
        .filter(|s| !s.is_empty())
        .map(ToString::to_string)
}

/// Untrimmed source text, used where the exact callee spelling must survive
/// (the tree-sitter node already excludes insignificant whitespace).
fn raw_text<'a>(node: SyntaxNode<'a>, source: &'a [u8]) -> Option<String> {
    node.utf8_text(source).ok().map(ToString::to_string)
}

fn named_children_vec<'a>(node: SyntaxNode<'a>) -> Vec<SyntaxNode<'a>> {
    node.named_children(&mut node.walk()).collect()
}

fn first_named_of_kind<'a>(node: SyntaxNode<'a>, kind: &str) -> Option<SyntaxNode<'a>> {
    named_children_vec(node).into_iter().find(|c| c.kind() == kind)
}

/// First descendant of a kind via breadth-first search (luaExtractor's
/// findDescendant), or `None`.
fn bfs_descendant<'a>(root: SyntaxNode<'a>, kind: &str) -> Option<SyntaxNode<'a>> {
    let mut queue: Vec<SyntaxNode> = named_children_vec(root);
    while let Some(n) = queue.first().copied() {
        queue.remove(0);
        if n.kind() == kind {
            return Some(n);
        }
        queue.extend(named_children_vec(n));
    }
    None
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

/// A call is a `require` iff its `name` field is a bare `identifier` spelled
/// `require` (a dotted/colon callee like `M.require` is not).
fn is_require_call(node: SyntaxNode, source: &[u8]) -> bool {
    matches!(node.child_by_field_name("name"), Some(name)
        if name.kind() == "identifier" && node_text(name, source).as_deref() == Some("require"))
}

/// Resolve the module name of a `require(...)` call, mirroring
/// luaExtractor.requireModule. Caller has already matched
/// [`is_require_call`].
fn require_module<'a>(node: SyntaxNode<'a>, source: &'a [u8]) -> Option<String> {
    let args = node.child_by_field_name("arguments")?;

    // String require — `string > content: string_content` gives the bare name.
    if let Some(content) = bfs_descendant(args, "string_content") {
        if let Some(name) = node_text(content, source) {
            return Some(name);
        }
    }
    // Fall back to the whole `string`, peeling `[[…]]` then quote delimiters.
    if let Some(string) = bfs_descendant(args, "string") {
        if let Some(raw) = node_text(string, source) {
            let peeled = raw
                .strip_prefix("[[")
                .and_then(|s| s.strip_suffix("]]"))
                .unwrap_or(&raw);
            let peeled = peeled
                .strip_prefix(['"', '\''])
                .and_then(|s| s.strip_suffix(['"', '\'']))
                .unwrap_or(peeled);
            if !peeled.is_empty() {
                return Some(peeled.to_string());
            }
        }
    }

    // Roblox/Luau instance path: `require(script.Parent.Signal)` → "Signal".
    let index = bfs_descendant(args, "dot_index_expression")
        .or_else(|| bfs_descendant(args, "method_index_expression"))?;
    let tail = index
        .child_by_field_name("field")
        .or_else(|| index.child_by_field_name("method"))?;
    node_text(tail, source)
}

/// Emit the `import` node + `imports` ref for one `require` call. Shared by
/// bare calls and the requires dug out of a local initializer.
#[allow(clippy::too_many_arguments)]
fn emit_require(
    call: SyntaxNode,
    source: &[u8],
    relative_path: &str,
    contains_parent: &str,
    ref_parent: &str,
    nodes: &mut Vec<ExtractedNode>,
    edges: &mut Vec<ExtractedEdge>,
    unresolved_refs: &mut Vec<UnresolvedRef>,
) {
    let Some(module) = require_module(call, source) else {
        return;
    };
    let mut import = ExtractedNode::symbol(relative_path, "import", &module, call, LANG);
    if let Some(full) = raw_text(call, source) {
        let sig: String = full.trim().chars().take(100).collect();
        if !sig.is_empty() {
            import.signature = Some(sig);
        }
    }
    push_contains(edges, contains_parent, &import);
    nodes.push(import);
    push_ref(
        unresolved_refs,
        ref_parent,
        &module,
        "imports",
        call,
        relative_path,
        SourceLanguage::Lua,
    );
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

    // ---- function declaration (global/local/table/method) ----
    if kind == "function_declaration" {
        if let Some(name_node) = node.child_by_field_name("name") {
            // (symbol kind, simple name, qualified name) resolved from the
            // shape of the `name` child.
            let resolved: Option<(&str, String, String)> = match name_node.kind() {
                // `function a.b.c()` / `function M:m()` — a table method.
                "dot_index_expression" | "method_index_expression" => {
                    let table = name_node.child_by_field_name("table");
                    let tail = name_node
                        .child_by_field_name("field")
                        .or_else(|| name_node.child_by_field_name("method"));
                    match (table, tail) {
                        (Some(table), Some(tail)) => {
                            match (node_text(table, source), node_text(tail, source)) {
                                (Some(receiver), Some(simple)) => {
                                    let qname = format!("{receiver}::{simple}");
                                    Some(("method", simple, qname))
                                }
                                _ => None,
                            }
                        }
                        _ => None,
                    }
                }
                // `function f()` / `local function f()` — a plain function.
                _ => node_text(name_node, source)
                    .map(|simple| ("function", simple.clone(), qualified_name(stack, &simple))),
            };

            if let Some((symbol_kind, simple, qname)) = resolved {
                let extracted = ExtractedNode::symbol_with_qualified_name(
                    relative_path,
                    symbol_kind,
                    &simple,
                    node,
                    LANG,
                    qname,
                );
                let id = extracted.id.clone();
                push_contains(edges, contains_parent, &extracted);
                nodes.push(extracted);

                // Only the body block is descended; parameters are not refs.
                if let Some(body) = node.child_by_field_name("body") {
                    stack.push(Frame {
                        name: simple.clone(),
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

    // ---- function call: require import, otherwise a calls ref ----
    if kind == "function_call" {
        if is_require_call(node, source) {
            // Claimed as an import; prune the subtree so it is never also a
            // call (luaExtractor.visitNode returns true).
            emit_require(
                node,
                source,
                relative_path,
                contains_parent,
                ref_parent,
                nodes,
                edges,
                unresolved_refs,
            );
            return Ok(());
        }
        // Callee = full text of the `name` field (`print`, `M.greet`,
        // `self:add`). Arguments are still walked afterwards for nested
        // calls/requires.
        if let Some(callee_node) = node.child_by_field_name("name") {
            if let Some(callee) = raw_text(callee_node, source) {
                let callee = callee.trim();
                if !callee.is_empty() {
                    push_ref(
                        unresolved_refs,
                        ref_parent,
                        callee,
                        "calls",
                        node,
                        relative_path,
                        SourceLanguage::Lua,
                    );
                }
            }
        }
    }

    // ---- local variable declaration ----
    if kind == "variable_declaration" {
        let assign = first_named_of_kind(node, "assignment_statement").unwrap_or(node);
        let var_list = first_named_of_kind(assign, "variable_list");
        let expr_list = first_named_of_kind(assign, "expression_list");
        let values = expr_list.map(named_children_vec).unwrap_or_default();

        // Dig top-level `require(..)` initializers out before the subtree is
        // pruned (the Lua variable branch never walks the initializer).
        for value in &values {
            if value.kind() == "function_call" && is_require_call(*value, source) {
                emit_require(
                    *value,
                    source,
                    relative_path,
                    contains_parent,
                    ref_parent,
                    nodes,
                    edges,
                    unresolved_refs,
                );
            }
        }

        // One variable per plain identifier name, positional against the
        // expression list, with a `= <init>` signature capped at 100 chars.
        if let Some(var_list) = var_list {
            let names: Vec<SyntaxNode> = named_children_vec(var_list)
                .into_iter()
                .filter(|c| c.kind() == "identifier")
                .collect();
            for (i, name_node) in names.into_iter().enumerate() {
                let Some(name) = node_text(name_node, source) else {
                    continue;
                };
                let mut variable =
                    ExtractedNode::symbol(relative_path, "variable", &name, name_node, LANG);
                if let Some(value_node) = values.get(i) {
                    if let Some(value) = node_text(*value_node, source) {
                        let init: String = value.chars().take(100).collect();
                        let ellipsis = value.chars().count() >= 100;
                        variable.signature = Some(format!("= {init}{}", if ellipsis { "..." } else { "" }));
                    }
                }
                push_contains(edges, contains_parent, &variable);
                nodes.push(variable);
            }
        }
        // The variable subtree (including any anonymous function initializer)
        // is pruned; its require was emitted above.
        return Ok(());
    }

    // ---- default: recurse with unchanged containment/ref parents ----
    for child in node.named_children(&mut node.walk()) {
        let mut cc = child.walk();
        visit(
            &mut cc, source, relative_path, contains_parent, ref_parent, stack, nodes, edges,
            unresolved_refs,
        )?;
    }
    Ok(())
}
