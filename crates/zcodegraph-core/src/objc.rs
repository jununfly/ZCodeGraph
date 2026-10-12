//! Objective-C baseline extraction (roadmap 1-2-14).
//!
//! Mirrors the legacy TS `objcExtractor` (src/extraction/languages/objc.ts)
//! as driven by the shared orchestrator (src/extraction/tree-sitter.ts), over
//! the tree-sitter-objc 3.0.2 grammar (ABI 14, bridged via
//! tree-sitter-language like tree-sitter-swift 0.6.0) — the same grammar
//! generation family as the production tree-sitter-objc.wasm.
//!
//! Roadmap 1-2-14-1 ships the parse/dispatch plumbing only. The baseline
//! visitor (class_interface / class_implementation reuse, selector-named
//! methods `doThing:with:`, protocol_declaration, property_declaration,
//! message_expression calls, preproc_include) lands in 1-2-14-2. This stub
//! therefore accepts the parse tree and emits no symbols; the file node is
//! created by the shared pipeline and a successful parse (no parse gap) is
//! the gate asserted by the grammar-wiring test.

use tree_sitter::Node as SyntaxNode;

use crate::{ExtractedEdge, ExtractedNode, UnresolvedRef};

const LANG: &str = "objc";

/// Roadmap 1-2-14-1 grammar-wiring entry point.
///
/// The parameters mirror `swift::extract` so 1-2-14-2 only fills the body;
/// the unused prefixes are allowed until the visitor lands.
#[allow(clippy::too_many_arguments)]
pub(crate) fn extract(
    _root: SyntaxNode,
    _source: &[u8],
    _relative_path: &str,
    _file_node_id: &str,
    _nodes: &mut Vec<ExtractedNode>,
    _edges: &mut Vec<ExtractedEdge>,
    _unresolved_refs: &mut Vec<UnresolvedRef>,
) -> Result<(), Box<dyn std::error::Error>> {
    // Baseline visitor is roadmap 1-2-14-2.
    let _ = LANG;
    Ok(())
}
