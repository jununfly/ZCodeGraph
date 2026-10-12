//! Swift baseline extraction (roadmap 1-6-4).
//!
//! 1-6-4-1: grammar wiring only. The tree-sitter-swift crate (alex-pinkus)
//! is pinned to =0.6.0 — the last ABI-14 release, the same grammar
//! generation as the production tree-sitter-swift.wasm (tree-sitter-wasms
//! 0.1.13). Every 0.7.x is ABI 15 and rejected by tree-sitter 0.24.
//! `LANGUAGE.into()` bridges via tree-sitter-language 0.1 exactly like the
//! git-pinned tree-sitter-kotlin grammar. This skeleton parses and verifies
//! the tree but emits no symbols yet; the baseline visitor lands in 1-6-4-2.
//!
//! Deliberately NOT handled here (kept on the TS side via the 1-6-2-4
//! finalize pattern in 1-6-4-5):
//! * swiftUI / UIKit / Vapor framework resolver `.extract` (component nodes,
//!   `@main` App class, UIViewController/UIView subclasses, Vapor routes).
//! * `@Siblings(through: Pivot.self)` property-wrapper metatype references
//!   emitted by the TS orchestrator's shared tree-sitter pass.
//! * the swift-objc bridge resolver and callback-synthesizer closure
//!   collection — both are resolve / DB consumers and stay engine-agnostic.

use tree_sitter::Node as SyntaxNode;

use crate::{ExtractedEdge, ExtractedNode, UnresolvedRef};

pub(crate) fn extract(
    root: SyntaxNode,
    _source: &[u8],
    _relative_path: &str,
    _file_node_id: &str,
    _nodes: &mut Vec<ExtractedNode>,
    _edges: &mut Vec<ExtractedEdge>,
    _unresolved_refs: &mut Vec<UnresolvedRef>,
) -> Result<(), Box<dyn std::error::Error>> {
    // 1-6-4-1: grammar wiring only. The tree has already been parsed by the
    // caller (the ABI gate); emit no symbols. The baseline visitor lands in
    // 1-6-4-2. `root` is named but unread in this phase.
    let _ = root;
    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;

    fn parse_errors(source: &str) -> usize {
        let mut parser = tree_sitter::Parser::new();
        parser
            .set_language(&tree_sitter_swift::LANGUAGE.into())
            .expect("tree-sitter-swift ABI bridges into tree-sitter 0.24");
        let tree = parser.parse(source, None).expect("parse");
        fn count(node: SyntaxNode) -> usize {
            let mut total = if node.is_error() || node.is_missing() { 1 } else { 0 };
            let mut cursor = node.walk();
            for child in node.children(&mut cursor) {
                total += count(child);
            }
            total
        }
        count(tree.root_node())
    }

    /// 1-6-4-1 grammar/ABI gate: `LANGUAGE.into()` loads under tree-sitter
    /// 0.24 and a representative Swift 5 sample exercising the constructs the
    /// baseline visitor will walk (class/struct/enum/protocol/extension,
    /// generics, property wrappers, guards/if-let, closures, async/throws)
    /// parses with zero ERROR nodes.
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
        assert_eq!(parse_errors(source), 0);
    }
}
