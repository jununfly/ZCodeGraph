//! Luau baseline extraction (roadmap 1-2-13).
//!
//! Mirrors the legacy TS `luauExtractor` (src/extraction/languages/luau.ts),
//! which extends `luaExtractor` unchanged for the Lua-parity surface and adds
//! the Luau type-system pieces, over the tree-sitter-luau 1.2.0 grammar
//! (ABI 14, bridged via tree-sitter-language) — wired in 1-2-13-1.
//!
//! The grammar keeps every Lua node name and field label the `lua` extractor
//! relies on (runtime SEXP-probed in 1-2-13-1): `chunk` root,
//! `function_declaration` with the three-state `name` field
//! (identifier / dot_index_expression / method_index_expression),
//! `variable_declaration` > `assignment_statement` > `variable_list` +
//! `expression_list`, and `function_call` with `name`/`arguments` fields.
//! Luau adds:
//!
//! * `type_definition` (`type X = …` / `export type X = …`) -> `type_alias`.
//!   The `export` keyword leads the node text (there is no separate export
//!   node), matching TS luauExtractor.isExported's `export ` prefix slice.
//! * typed parameters (`parameter` > identifier + type node) and a return
//!   type (the anonymous type node between `parameters` and `body`) enrich
//!   function/method signatures, matching TS luauExtractor.getSignature.
//! * `generic_type_list`, `update_statement` (`+=` …) and `if_expression`
//!   are Luau-only syntax; the first two carry no baseline symbols.
//!
//! 1-2-13-1 is grammar/dispatch wiring only: this extractor walks nothing.
//! The baseline visitor (Lua-parity multiset + type_alias nodes + typed
//! signatures) lands in 1-2-13-2, reusing the lua.rs walker shape.
//!
//! NOTE: Luau has no Lua 5.3 bitwise operators (`&`, `|`, `<<`, `>>`, `~`);
//! files mixing them parse with ERROR nodes. Luau source is Lua-5.1-derived
//! plus gradual typing, so such files are not valid Luau — like Go/Java/Lua
//! this language is NOT in `tolerates_parse_errors` unless the real-corpus
//! gate in 1-2-13-3 proves otherwise.

use tree_sitter::Node as SyntaxNode;

use crate::{ExtractedEdge, ExtractedNode, UnresolvedRef};

/// Walk nothing yet — 1-2-13-1 wires grammar/dispatch only (see module docs).
/// The signature matches every other language extractor so the dispatch site
/// in lib.rs stays uniform; the baseline visitor arrives in 1-2-13-2.
pub(crate) fn extract(
    _root: SyntaxNode,
    _source: &[u8],
    _relative_path: &str,
    _file_node_id: &str,
    _nodes: &mut Vec<ExtractedNode>,
    _edges: &mut Vec<ExtractedEdge>,
    _unresolved_refs: &mut Vec<UnresolvedRef>,
) -> Result<(), Box<dyn std::error::Error>> {
    Ok(())
}
