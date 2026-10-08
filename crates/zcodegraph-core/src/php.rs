//! PHP baseline extraction (roadmap 1-2-5).
//!
//! Mirrors the legacy TS phpExtractor (src/extraction/languages/php.ts) and
//! the orchestrator's generic node-stack semantics over tree-sitter-php
//! 0.23.11 (ABI 14, `LANGUAGE_PHP` — the full grammar, inline HTML included).
//!
//! Scope split: 1-2-5-1 emits SYMBOL NODES + `contains` edges only —
//! functions/methods, class/trait/interface/enum (+ enum cases), properties,
//! constants, the file-level namespace, and `use` imports (single, grouped,
//! function/const). Unresolved references (calls, instantiates,
//! extends/implements, type hints, static-member reads, import/trait-use
//! dependency edges) arrive in 1-2-5-2.
//!
//! The semantic stack mirrors the TS orchestrator: a `file` frame at the
//! bottom (excluded from qualified names), then the file-level namespace
//! frame, then class-like / function / method frames. The PHP file-level
//! namespace is `namespace App\Http;` (a SEMICOLON form with no body); the
//! braced `namespace App\Http { ... }` form is deliberately not captured as a
//! frame (TS extractPackage skips it), so its declarations stay top-level.
//!
//! Node-kind note: the TS extractor models a PHP namespace as kind
//! `namespace`; every other migrated Rust language models the equivalent
//! package as kind `module` (C# namespaces included). PHP follows the Rust
//! side convention (`module`), matching the C# cutover contract.
//!
//! Laravel routes and Drupal hooks/routes stay in the TypeScript shell
//! (resolution/frameworks/laravel.ts, drupal.ts), back-filled after the
//! ownership cutover (1-2-5-4), exactly like the C#/ASP.NET split.

use tree_sitter::Node as SyntaxNode;

use crate::{ExtractedEdge, ExtractedNode, UnresolvedRef};

const LANG: &str = "php";

/// A semantic-scope frame. The `file` frame sits at the bottom and is excluded
/// from qualified names (mirrors the TS nodeStack, which skips kind==='file').
struct Frame {
    id: String,
    name: String,
    kind: &'static str,
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

fn node_text<'a>(node: SyntaxNode<'a>, source: &'a [u8]) -> Option<String> {
    node.utf8_text(source)
        .ok()
        .map(str::trim)
        .filter(|s| !s.is_empty())
        .map(ToString::to_string)
}

fn field_text<'a>(node: SyntaxNode<'a>, field: &str, source: &'a [u8]) -> Option<String> {
    node.child_by_field_name(field)
        .and_then(|n| node_text(n, source))
}

/// PHP visibility: read the direct `visibility_modifier` child; PHP defaults
/// to public (mirrors phpExtractor.getVisibility).
fn visibility(node: SyntaxNode, source: &[u8]) -> Option<String> {
    node.children(&mut node.walk())
        .find(|c| c.kind() == "visibility_modifier")
        .and_then(|c| node_text(c, source))
        .or_else(|| Some("public".to_string()))
}

fn is_static(node: SyntaxNode) -> bool {
    node.children(&mut node.walk())
        .any(|c| c.kind() == "static_modifier")
}

/// File-level namespace (`namespace App\Http;`): has a `name` and NO `body`.
/// The braced form carries a `compound_statement` body and is excluded.
fn file_level_namespace(root: SyntaxNode) -> Option<SyntaxNode> {
    root.named_children(&mut root.walk()).find(|c| {
        c.kind() == "namespace_definition"
            && c.child_by_field_name("name").is_some()
            && c.child_by_field_name("body").is_none()
    })
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
    let _ = unresolved_refs; // populated in 1-2-5-2
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

    // The file-level namespace wraps every sibling declaration (TS
    // extractFilePackage finds the first packageTypes child and holds that
    // frame across the whole walk).
    if let Some(ns) = file_level_namespace(root) {
        if let Some(pkg) = field_text(ns, "name", source) {
            let module = ExtractedNode::symbol_with_qualified_name(
                relative_path,
                "module",
                &pkg,
                ns,
                LANG,
                qualified_name(&stack, &pkg),
            );
            let module_id = module.id.clone();
            edges.push(contains_edge(file_node_id, &module_id, ns));
            nodes.push(module);
            stack.push(Frame {
                id: module_id,
                name: pkg,
                kind: "module",
            });
            for child in root.named_children(&mut root.walk()) {
                walk(child, source, relative_path, &mut stack, nodes, edges,
                    unresolved_refs)?;
            }
            stack.pop();
            return Ok(());
        }
    }

    walk(root, source, relative_path, &mut stack, nodes, edges, unresolved_refs)?;
    Ok(())
}

#[allow(clippy::too_many_arguments)]
fn walk(
    node: SyntaxNode,
    source: &[u8],
    relative_path: &str,
    stack: &mut Vec<Frame>,
    nodes: &mut Vec<ExtractedNode>,
    edges: &mut Vec<ExtractedEdge>,
    unresolved_refs: &mut Vec<UnresolvedRef>,
) -> Result<(), Box<dyn std::error::Error>> {
    let _ = unresolved_refs; // populated in 1-2-5-2
    let kind = node.kind();
    let parent_id = stack
        .last()
        .map(|f| f.id.clone())
        .unwrap_or_default();

    // ---- namespace_use_declaration -> import node(s) ----------------------
    // Single: `use App\Services\UserService;` / `use function X\f;` /
    //         `use Mockery as m;`. Grouped: `use App\Models\{User, Profile};`
    //         -> one import per clause.
    if kind == "namespace_use_declaration" {
        let group = node
            .named_children(&mut node.walk())
            .find(|c| c.kind() == "namespace_use_group");
        if let Some(group) = group {
            // Prefix namespace_name is optional (`use \{A, B};`).
            let prefix = node
                .named_children(&mut node.walk())
                .find(|c| c.kind() == "namespace_name")
                .and_then(|n| node_text(n, source));
            for clause in group.named_children(&mut group.walk()).filter(|c| {
                matches!(
                    c.kind(),
                    "namespace_use_clause" | "namespace_use_group_clause"
                )
            }) {
                if let Some(import_name) = grouped_clause_name(clause, source, prefix.as_deref()) {
                    push_import(
                        relative_path,
                        clause,
                        &import_name,
                        &parent_id,
                        stack,
                        nodes,
                        edges,
                    );
                }
            }
        } else if let Some(clause) = node
            .named_children(&mut node.walk())
            .find(|c| c.kind() == "namespace_use_clause")
        {
            if let Some(import_name) = single_clause_name(clause, source) {
                push_import(
                    relative_path,
                    clause,
                    &import_name,
                    &parent_id,
                    stack,
                    nodes,
                    edges,
                );
            }
        }
        return Ok(());
    }

    // The file-level namespace node was handled once at extract() entry.
    if kind == "namespace_definition"
        && node.child_by_field_name("body").is_none()
        && node.child_by_field_name("name").is_some()
    {
        return Ok(());
    }

    // ---- const_declaration -> one `constant` per const_element -----------
    // phpExtractor.visitNode handles this for BOTH global and class constants;
    // the const_element anchors the node span/id.
    if kind == "const_declaration" {
        for elem in node
            .named_children(&mut node.walk())
            .filter(|c| c.kind() == "const_element")
        {
            if let Some(name) = elem
                .named_children(&mut elem.walk())
                .find(|c| c.kind() == "name")
                .and_then(|n| node_text(n, source))
            {
                // TS phpExtractor.visitNode emits class/global constants via
                // ctx.createNode with NO visibility, so mirror that exactly.
                let sym = ExtractedNode::symbol_with_qualified_name(
                    relative_path,
                    "constant",
                    &name,
                    elem,
                    LANG,
                    qualified_name(stack, &name),
                );
                let id = sym.id.clone();
                edges.push(contains_edge(&parent_id, &id, elem));
                nodes.push(sym);
            }
        }
        return Ok(());
    }

    // ---- property_declaration -> one `field` per property_element --------
    // `private UserService $userService;` / `public static int $count = 0;`.
    // The name is the inner `name` under variable_name (the `$` is anonymous).
    if kind == "property_declaration" {
        let vis = visibility(node, source);
        let is_static = is_static(node);
        for elem in node
            .named_children(&mut node.walk())
            .filter(|c| c.kind() == "property_element")
        {
            let name_node = elem
                .child_by_field_name("name")
                .filter(|n| n.kind() == "variable_name")
                .and_then(|vn| {
                    vn.named_children(&mut vn.walk()).find(|c| c.kind() == "name")
                })
                .or_else(|| {
                    elem.named_children(&mut elem.walk())
                        .find(|c| c.kind() == "variable_name")
                        .and_then(|vn| {
                            vn.named_children(&mut vn.walk()).find(|c| c.kind() == "name")
                        })
                });
            if let Some(name) = name_node.and_then(|n| node_text(n, source)) {
                let mut field = ExtractedNode::symbol_with_visibility_and_qualified_name(
                    relative_path,
                    "field",
                    &name,
                    elem,
                    LANG,
                    vis.clone(),
                    qualified_name(stack, &name),
                );
                field.is_static = is_static;
                let id = field.id.clone();
                edges.push(contains_edge(&parent_id, &id, elem));
                nodes.push(field);
            }
        }
        // Initializers are pure expressions (deps arrive in 1-2-5-2); property
        // hooks (PHP 8.4 `{ get; set; }`) carry no symbols.
        return Ok(());
    }

    // ---- enum_case -> enum_member ----------------------------------------
    if kind == "enum_case" {
        if let Some(name) = field_text(node, "name", source) {
            let sym = ExtractedNode::symbol_with_qualified_name(
                relative_path,
                "enum_member",
                &name,
                node,
                LANG,
                qualified_name(stack, &name),
            );
            let id = sym.id.clone();
            edges.push(contains_edge(&parent_id, &id, node));
            nodes.push(sym);
        }
        return Ok(());
    }

    // ---- class-like declarations -----------------------------------------
    let class_like = match kind {
        "class_declaration" => Some("class"),
        "trait_declaration" => Some("trait"),
        "interface_declaration" => Some("interface"),
        "enum_declaration" => Some("enum"),
        _ => None,
    };
    if let Some(sym_kind) = class_like {
        if let Some(name) = field_text(node, "name", source) {
            // phpExtractor.getVisibility defaults EVERYTHING to public, and
            // extractClass/extractEnum pass it through, so class/trait/
            // interface/enum all carry visibility='public'.
            let extracted = ExtractedNode::symbol_with_visibility_and_qualified_name(
                relative_path,
                sym_kind,
                &name,
                node,
                LANG,
                visibility(node, source),
                qualified_name(stack, &name),
            );
            let id = extracted.id.clone();
            edges.push(contains_edge(&parent_id, &id, node));
            nodes.push(extracted);
            stack.push(Frame {
                id: id.clone(),
                name: name.clone(),
                kind: sym_kind,
            });
            for child in node.named_children(&mut node.walk()) {
                walk(child, source, relative_path, stack, nodes, edges, unresolved_refs)?;
            }
            stack.pop();
            return Ok(());
        }
    }

    // ---- function / method -----------------------------------------------
    // The grammar distinguishes them by node kind (a nested function
    // definition inside a method body is genuinely a free function), so no
    // stack test is needed.
    if kind == "function_definition" || kind == "method_declaration" {
        if let Some(name) = field_text(node, "name", source) {
            let sym_kind = if kind == "method_declaration" { "method" } else { "function" };
            let mut sym = ExtractedNode::symbol_with_visibility_and_qualified_name(
                relative_path,
                sym_kind,
                &name,
                node,
                LANG,
                visibility(node, source),
                qualified_name(stack, &name),
            );
            sym.is_static = is_static(node);
            let id = sym.id.clone();
            edges.push(contains_edge(&parent_id, &id, node));
            nodes.push(sym);
            stack.push(Frame {
                id: id.clone(),
                name: name.clone(),
                kind: sym_kind,
            });
            for child in node.named_children(&mut node.walk()) {
                walk(child, source, relative_path, stack, nodes, edges, unresolved_refs)?;
            }
            stack.pop();
            return Ok(());
        }
    }

    // ---- generic descent --------------------------------------------------
    for child in node.named_children(&mut node.walk()) {
        walk(child, source, relative_path, stack, nodes, edges, unresolved_refs)?;
    }
    Ok(())
}

fn push_import(
    relative_path: &str,
    anchor: SyntaxNode,
    import_name: &str,
    parent_id: &str,
    stack: &[Frame],
    nodes: &mut Vec<ExtractedNode>,
    edges: &mut Vec<ExtractedEdge>,
) {
    // Anchor each import on its own clause (grouped clauses can share a line);
    // the distinct name also distinguishes ids.
    let import = ExtractedNode::symbol_with_qualified_name(
        relative_path,
        "import",
        import_name,
        anchor,
        LANG,
        qualified_name(stack, import_name),
    );
    let id = import.id.clone();
    edges.push(contains_edge(parent_id, &id, anchor));
    nodes.push(import);
}

/// Single `use X\Y\Z;` clause: prefer the `qualified_name`, else a bare `name`
/// (`use Mockery;`). An `alias` field (`use X as Y;`) does not change the
/// imported module name (mirrors phpExtractor.extractImport).
fn single_clause_name(clause: SyntaxNode, source: &[u8]) -> Option<String> {
    clause
        .named_children(&mut clause.walk())
        .find(|c| c.kind() == "qualified_name")
        .and_then(|n| node_text(n, source))
        .or_else(|| {
            clause
                .named_children(&mut clause.walk())
                .find(|c| c.kind() == "name")
                .and_then(|n| node_text(n, source))
        })
}

/// Grouped-clause leaf: the clause inside `use Prefix\{A, B};` carries only a
/// bare `name` (optionally a nested `namespace_name`); prepend the prefix to
/// form the fully-qualified import name (mirrors TS grouped-import handling).
fn grouped_clause_name(
    clause: SyntaxNode,
    source: &[u8],
    prefix: Option<&str>,
) -> Option<String> {
    let leaf = clause
        .named_children(&mut clause.walk())
        .find(|c| c.kind() == "namespace_name")
        .and_then(|n| node_text(n, source))
        .or_else(|| {
            clause
                .named_children(&mut clause.walk())
                .find(|c| c.kind() == "name")
                .and_then(|n| node_text(n, source))
        })?;
    Some(match prefix {
        Some(prefix) if !prefix.is_empty() => format!("{prefix}\\{}", leaf.trim_start_matches('\\')),
        _ => leaf,
    })
}
#[cfg(test)]
mod tests {
    use super::*;
    use tree_sitter::Parser;

    fn extract_nodes(code: &str) -> (Vec<ExtractedNode>, Vec<ExtractedEdge>) {
        let mut parser = Parser::new();
        parser.set_language(&tree_sitter_php::LANGUAGE_PHP.into()).unwrap();
        let tree = parser.parse(code, None).unwrap();
        assert!(!tree.root_node().has_error(), "fixture must parse cleanly");
        let file = ExtractedNode::file("src/Demo.php", code, LANG);
        let file_id = file.id.clone();
        let mut nodes = vec![file];
        let mut edges = Vec::new();
        let mut refs = Vec::new();
        extract(
            tree.root_node(),
            code.as_bytes(),
            "src/Demo.php",
            &file_id,
            &mut nodes,
            &mut edges,
            &mut refs,
        )
        .unwrap();
        (nodes, edges)
    }

    fn kinds<'a>(nodes: &'a [ExtractedNode], kind: &str) -> Vec<&'a ExtractedNode> {
        nodes.iter().filter(|n| n.kind == kind).collect()
    }

    #[test]
    fn file_level_namespace_wraps_and_qualifies_symbols() {
        let code = [
            "<?php",
            "namespace App\\Http;",
            "",
            "class UserController",
            "{",
            "    private UserService $userService;",
            "    public const STATUS_OK = 1;",
            "",
            "    public function __construct(UserService $userService) {}",
            "    public function show(string $id): User {}",
            "}",
            "",
        ].join("\n");
        let (nodes, _edges) = extract_nodes(&code);

        let module = kinds(&nodes, "module");
        assert_eq!(module.len(), 1);
        assert_eq!(module[0].name, "App\\Http");

        let class = kinds(&nodes, "class");
        assert_eq!(class.len(), 1);
        assert_eq!(class[0].name, "UserController");
        assert_eq!(class[0].qualified_name, "App\\Http::UserController");

        let field = kinds(&nodes, "field");
        assert_eq!(field.len(), 1, "one property");
        assert_eq!(field[0].name, "userService");
        assert_eq!(field[0].visibility.as_deref(), Some("private"));

        let constant = kinds(&nodes, "constant");
        assert_eq!(constant.len(), 1, "class const");
        assert_eq!(constant[0].name, "STATUS_OK");
        assert_eq!(
            constant[0].qualified_name,
            "App\\Http::UserController::STATUS_OK"
        );

        let methods: Vec<_> = kinds(&nodes, "method")
            .iter()
            .map(|m| m.name.clone())
            .collect();
        assert_eq!(methods, vec!["__construct", "show"]);
        let show = kinds(&nodes, "method")
            .into_iter()
            .find(|m| m.name == "show")
            .unwrap();
        assert_eq!(show.qualified_name, "App\\Http::UserController::show");
        assert_eq!(show.visibility.as_deref(), Some("public"));
    }

    #[test]
    fn trait_interface_enum_enum_case_and_top_level_symbols() {
        let code = [
            "<?php",
            "namespace App\\Domain;",
            "",
            "interface Cacheable { public function getKey(): string; }",
            "trait HasTimestamps { public function touch(): void {} }",
            "enum Suit: string implements \\BackedEnum { case Hearts = 'H'; case Spades = 'S'; }",
            "",
            "function make() {}",
            "const FOO = 1;",
            "",
        ].join("\n");
        let (nodes, _edges) = extract_nodes(&code);

        assert_eq!(kinds(&nodes, "interface").len(), 1);
        assert_eq!(kinds(&nodes, "trait").len(), 1);
        let en = kinds(&nodes, "enum");
        assert_eq!(en.len(), 1);
        assert_eq!(en[0].qualified_name, "App\\Domain::Suit");
        let cases: Vec<_> = kinds(&nodes, "enum_member")
            .iter()
            .map(|c| c.name.clone())
            .collect();
        assert_eq!(cases, vec!["Hearts", "Spades"]);

        let fns = kinds(&nodes, "function");
        assert_eq!(fns.len(), 1);
        assert_eq!(fns[0].name, "make");
        assert_eq!(fns[0].qualified_name, "App\\Domain::make");

        // Global `const FOO = 1;` at namespace scope.
        assert_eq!(
            kinds(&nodes, "constant").iter().filter(|c| c.name == "FOO").count(),
            1
        );

        // Bodyless interface method still extracted.
        assert!(kinds(&nodes, "method").iter().any(|m| m.name == "getKey"));
        assert!(kinds(&nodes, "method").iter().any(|m| m.name == "touch"));
    }

    #[test]
    fn imports_single_aliased_function_and_grouped() {
        let code = [
            "<?php",
            "use App\\Services\\UserService;",
            "use Mockery as m;",
            "use function Illuminate\\Support\\env;",
            "use App\\Models\\{User, Profile};",
            "",
            "class C {}",
            "",
        ].join("\n");
        let (nodes, _edges) = extract_nodes(&code);
        let imports: Vec<_> = kinds(&nodes, "import")
            .iter()
            .map(|n| n.name.clone())
            .collect();
        assert_eq!(
            imports,
            vec![
                "App\\Services\\UserService",
                "Mockery",
                "Illuminate\\Support\\env",
                "App\\Models\\User",
                "App\\Models\\Profile",
            ]
        );
    }

    #[test]
    fn braced_namespace_is_not_a_frame() {
        // TS extractPackage skips braced namespaces; symbols stay top-level.
        let code = "<?php\nnamespace App\\Http { class A {} }\n";
        let (nodes, _edges) = extract_nodes(code);
        assert_eq!(kinds(&nodes, "module").len(), 0);
        let class = kinds(&nodes, "class");
        assert_eq!(class.len(), 1);
        assert_eq!(class[0].qualified_name, "A");
    }

    #[test]
    fn no_namespace_symbols_are_top_level_and_public_by_default() {
        let code = "<?php\nfunction helper() {}\nclass Plain { function implicitVis() {} }\n";
        let (nodes, _edges) = extract_nodes(code);
        assert_eq!(kinds(&nodes, "module").len(), 0);
        let method = kinds(&nodes, "method");
        assert_eq!(method[0].name, "implicitVis");
        assert_eq!(method[0].visibility.as_deref(), Some("public"));
    }

    #[test]
    fn drupal_extensions_map_to_php() {
        use crate::SourceLanguage;
        use std::path::Path;
        for ext in ["php", "module", "install", "theme", "inc"] {
            assert_eq!(
                SourceLanguage::from_path(Path::new(&format!("x.{ext}"))),
                Some(SourceLanguage::Php),
                "{ext} must classify as PHP"
            );
        }
    }
}
