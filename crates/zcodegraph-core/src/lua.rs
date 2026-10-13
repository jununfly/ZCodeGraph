//! Lua baseline extraction (roadmap 1-2-12).
//!
//! Roadmap 1-2-12-1 wires grammar + dispatch only: the tree-sitter-lua 0.2.0
//! grammar (ABI 14, bridged via tree-sitter-language) parses `.lua` files and
//! routes here with zero parse-gap file drops. The baseline Frame-name-stack
//! visitor lands in 1-2-12-2 and mirrors the legacy TS `luaExtractor`
//! (src/extraction/languages/lua.ts):
//!
//! * `function_declaration` -> function (global `function f`, local
//!   `local function f`) or method/table-function (`function t.f()` /
//!   `function t:m()`); the form is distinguished by the `name` child
//!   (identifier / dot_index_expression / method_index_expression), not by a
//!   separate node type. Anonymous `function() … end` is `function_definition`
//!   and carries no symbol (it is captured by its enclosing variable).
//! * there are no classes/structs/interfaces/enums/type aliases — tables are
//!   used for everything.
//! * `require("x")` / `require "x"` (a bare `function_call` whose `name`
//!   identifier is `require`) -> `import` of the string content, plus an
//!   `imports` ref; `require(script.Parent.Signal)` (Luau instance path) -> the
//!   trailing field. Lua has no import statement.
//! * every other `function_call` -> `calls`.
//! * `variable_declaration` wraps an `assignment_statement`; its initializer
//!   subtree is skipped by the variable branch, so a `local x = require(..)`
//!   is dug out explicitly to emit the import.

use tree_sitter::Node as SyntaxNode;

use crate::{ExtractedEdge, ExtractedNode, UnresolvedRef};

#[allow(dead_code)]
const LANG: &str = "lua";

/// Roadmap 1-2-12-1 grammar/dispatch wiring. Parsing + the file node are owned
/// by the orchestrator; the baseline symbol visitor is added in 1-2-12-2, so
/// this currently walks nothing and emits no nodes.
pub(crate) fn extract(
    root: SyntaxNode,
    _source: &[u8],
    _relative_path: &str,
    _file_node_id: &str,
    _nodes: &mut Vec<ExtractedNode>,
    _edges: &mut Vec<ExtractedEdge>,
    _unresolved_refs: &mut Vec<UnresolvedRef>,
) -> Result<(), Box<dyn std::error::Error>> {
    // Touch the root so the signature is stable when 1-2-12-2 adds the walker.
    debug_assert!(root.kind() == "chunk" || !root.kind().is_empty());
    Ok(())
}
