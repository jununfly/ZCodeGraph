//! PHP baseline extraction (roadmap 1-2-5).
//!
//! Mirrors the legacy TS phpExtractor (src/extraction/languages/php.ts) and
//! the orchestrator's generic node-stack semantics over tree-sitter-php
//! 0.23.11 (ABI 14, `LANGUAGE_PHP` — the full grammar, inline HTML included).
//!
//! 1-2-5-1 emits SYMBOL NODES + `contains` edges — functions/methods,
//! class/trait/interface/enum (+ enum cases), properties, constants, the
//! file-level namespace, and `use` imports (single, grouped, function/const).
//! 1-2-5-2 adds the unresolved references: calls (free/member/scoped),
//! instantiates, extends/implements (incl. in-class trait `use`), parameter
//! and return type hints, static-member value reads, and the `use FQN`
//! imports dependency edge. The TS ownership cutover stays in 1-2-5-4.
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

use crate::{push_ref, ExtractedEdge, ExtractedNode, SourceLanguage, UnresolvedRef};

const LANG: &str = "php";

/// Receiver names that don't aid cross-file resolution (mirrors the TS
/// orchestrator's SKIP_RECEIVERS for member/scoped calls).
const SKIP_RECEIVERS: &[&str] = &["self", "this", "cls", "super", "parent", "static"];

/// PHP pseudo-types / keywords that name no project symbol (mirrors
/// PHP_PSEUDO_TYPES in the TS orchestrator). Scalar primitives parse as
/// `primitive_type` and are skipped structurally.
fn is_pseudo_type(name: &str) -> bool {
    matches!(
        name,
        "self" | "static" | "parent" | "mixed" | "object" | "iterable" | "callable" | "void"
            | "null" | "false" | "true" | "never" | "array" | "int" | "float" | "string" | "bool"
    )
}

/// The trailing simple name of a PHP type subtree: a `qualified_name` ends in
/// a direct `name` child (`\App\Domain\Result` -> `Result`), while a bare
/// `name` is itself. Returns the leaf text and its node (the ref anchor).
fn type_leaf<'a>(node: SyntaxNode<'a>, source: &'a [u8]) -> Option<(String, SyntaxNode<'a>)> {
    match node.kind() {
        "name" => node_text(node, source).map(|t| (t, node)),
        "qualified_name" => node
            .named_children(&mut node.walk())
            .filter(|c| c.kind() == "name")
            .last()
            .and_then(|leaf| node_text(leaf, source).map(|t| (t, leaf))),
        _ => None,
    }
}

/// Walk a subtree KNOWN to be in a PHP type position, emitting a `references`
/// ref per resolvable class/interface name (mirrors walkPhpTypePosition):
/// `name` -> the name (modulo pseudo-types), `qualified_name` -> its trailing
/// leaf, `primitive_type` -> nothing, wrapper nodes (named/optional/union/
/// intersection/DNF) -> recurse.
fn emit_php_type_refs(
    node: SyntaxNode,
    source: &[u8],
    from_id: &str,
    relative_path: &str,
    unresolved_refs: &mut Vec<UnresolvedRef>,
) {
    match node.kind() {
        "primitive_type" => {}
        "name" => {
            if let Some(name) = node_text(node, source) {
                if !is_pseudo_type(&name) {
                    push_ref(
                        unresolved_refs,
                        from_id,
                        &name,
                        "references",
                        node,
                        relative_path,
                        SourceLanguage::Php,
                    );
                }
            }
        }
        "qualified_name" => {
            if let Some((leaf, at)) = type_leaf(node, source) {
                if !is_pseudo_type(&leaf) {
                    push_ref(
                        unresolved_refs,
                        from_id,
                        &leaf,
                        "references",
                        at,
                        relative_path,
                        SourceLanguage::Php,
                    );
                }
            }
        }
        _ => {
            for child in node.named_children(&mut node.walk()) {
                emit_php_type_refs(child, source, from_id, relative_path, unresolved_refs);
            }
        }
    }
}

/// Emit parameter + return type-hint refs for a function/method declaration.
/// Mirrors extractPhpTypeRefs: each parameter's `type` field and the
/// `return_type` field, walked ONLY as type positions (a `variable_name`
/// can never leak).
fn emit_declaration_type_hints(
    decl: SyntaxNode,
    source: &[u8],
    from_id: &str,
    relative_path: &str,
    unresolved_refs: &mut Vec<UnresolvedRef>,
) {
    if let Some(params) = decl
        .named_children(&mut decl.walk())
        .find(|c| c.kind() == "formal_parameters")
    {
        for param in params.named_children(&mut params.walk()) {
            // simple_parameter / property_promotion_parameter / variadic_parameter
            if let Some(ty) = param.child_by_field_name("type") {
                emit_php_type_refs(ty, source, from_id, relative_path, unresolved_refs);
            }
        }
    }
    if let Some(return_type) = decl.child_by_field_name("return_type") {
        emit_php_type_refs(
            return_type,
            source,
            from_id,
            relative_path,
            unresolved_refs,
        );
    }
}

/// Convert a PHP `use` FQN (`Foo\Bar\Baz`) to the stored `Foo\Bar::Baz`
/// imports reference. A global-namespace class (no backslash) emits nothing —
/// it already matches by simple name (mirrors pushPhpUseRef).
fn push_php_use_ref(
    fqn: &str,
    from_id: &str,
    anchor: SyntaxNode,
    relative_path: &str,
    unresolved_refs: &mut Vec<UnresolvedRef>,
) {
    let clean = fqn.trim_start_matches('\\');
    if let Some(idx) = clean.rfind('\\') {
        let reference_name = format!("{}::{}", &clean[..idx], &clean[idx + 1..]);
        push_ref(
            unresolved_refs,
            from_id,
            &reference_name,
            "imports",
            anchor,
            relative_path,
            SourceLanguage::Php,
        );
    }
}

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

/// Nearest class-like frame (class/trait/interface/enum).
fn class_like_owner(stack: &[Frame]) -> Option<&str> {
    stack
        .iter()
        .rev()
        .find(|f| matches!(f.kind, "class" | "trait" | "interface" | "enum"))
        .map(|f| f.id.as_str())
}

/// The id that owns calls/refs inside a body: the method/function frame when
/// present, otherwise the enclosing class-like (property initializers),
/// otherwise the file (top-level code). Mirrors the TS nodeStack head.
fn ref_owner<'a>(stack: &'a [Frame]) -> &'a str {
    for f in stack.iter().rev() {
        if matches!(f.kind, "method" | "function") {
            return &f.id;
        }
    }
    for f in stack.iter().rev() {
        if matches!(f.kind, "class" | "trait" | "interface" | "enum") {
            return &f.id;
        }
    }
    &stack[0].id
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
    let kind = node.kind();
    let parent_id = stack
        .last()
        .map(|f| f.id.clone())
        .unwrap_or_default();

    // ---- namespace_use_declaration -> import node(s) + imports ref --------
    // Single: `use App\Services\UserService;` / `use function X\f;` /
    //         `use Mockery as m;`. Grouped: `use App\Models\{User, Profile};`
    //         -> one import per clause. Each namespaced import also emits an
    //         `imports` ref (`App\Models::User`) so an imported-but-DI-injected
    //         contract records a cross-file dependency (emitPhpUseRefs).
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
                    // TS anchors the grouped ref on the whole declaration.
                    push_php_use_ref(
                        &import_name,
                        &parent_id,
                        node,
                        relative_path,
                        unresolved_refs,
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
                // TS anchors the single ref on the whole declaration.
                push_php_use_ref(&import_name, &parent_id, node, relative_path, unresolved_refs);
            }
        }
        return Ok(());
    }

    // ---- in-class trait use: `use T1, T2;` -> implements refs -------------
    // A class-body `use_declaration` lists consumed traits (the names are
    // direct `name`/`qualified_name` children). The file-level `use X;`
    // import is the namespace_use_declaration handled above.
    if kind == "use_declaration" {
        if let Some(owner_id) = class_like_owner(stack) {
            for name_node in node
                .named_children(&mut node.walk())
                .filter(|c| matches!(c.kind(), "name" | "qualified_name"))
            {
                // A qualified trait name matches on its trailing simple name.
                let resolved = type_leaf(name_node, source)
                    .or_else(|| node_text(name_node, source).map(|t| (t, name_node)));
                if let Some((rname, at)) = resolved {
                    push_ref(
                        unresolved_refs,
                        owner_id,
                        rname.trim_start_matches('\\'),
                        "implements",
                        at,
                        relative_path,
                        SourceLanguage::Php,
                    );
                }
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

            // Inheritance: `base_clause` (`extends X`; an interface's
            // `extends A, B` uses the same node) -> extends refs;
            // `class_interface_clause` (`implements I, J`; an enum's
            // `implements \BackedEnum` too) -> implements refs. Targets are
            // bare `name` or `qualified_name` children; match the leaf.
            for clause in node
                .named_children(&mut node.walk())
                .filter(|c| matches!(c.kind(), "base_clause" | "class_interface_clause"))
            {
                let ref_kind = if clause.kind() == "base_clause" {
                    "extends"
                } else {
                    "implements"
                };
                for target in clause
                    .named_children(&mut clause.walk())
                    .filter(|c| matches!(c.kind(), "name" | "qualified_name"))
                {
                    if let Some((rname, at)) = type_leaf(target, source) {
                        push_ref(
                            unresolved_refs,
                            &id,
                            rname.trim_start_matches('\\'),
                            ref_kind,
                            at,
                            relative_path,
                            SourceLanguage::Php,
                        );
                    }
                }
            }

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

            // Parameter + return type hints -> references (constructor
            // property-promotion params included; pseudo/primitive types
            // filtered). Mirrors extractPhpTypeRefs on the declaration.
            emit_declaration_type_hints(
                node,
                source,
                &id,
                relative_path,
                unresolved_refs,
            );

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

    // ---- expression-level refs: calls / instantiates / static reads -------
    match kind {
        // Bare free-function call: `helper($id)` — the `function` field is a
        // `name` (or a `qualified_name` for `\ns\f()`; keep its text, mirroring
        // the TS generic callee path).
        "function_call_expression" => {
            if let Some(callee) = node.child_by_field_name("function") {
                if let Some(name) = node_text(callee, source) {
                    push_ref(
                        unresolved_refs,
                        ref_owner(stack),
                        &name,
                        "calls",
                        node,
                        relative_path,
                        SourceLanguage::Php,
                    );
                }
            }
        }
        // `$receiver->method()` / `$this->logger->log()` — object + name.
        // The receiver text keeps PHP's chain shape (`$this->logger` -> the
        // leading `$` is stripped); self/this/static/parent collapse to the
        // bare method. Mirrors extractCall's member-call branch.
        "member_call_expression" => {
            if let Some(method_node) = node.child_by_field_name("name") {
                if let Some(method) = node_text(method_node, source) {
                    let callee = node
                        .child_by_field_name("object")
                        .and_then(|o| node_text(o, source))
                        .map(|recv| {
                            let recv = recv.trim_start_matches('$');
                            if SKIP_RECEIVERS.contains(&recv) {
                                method.clone()
                            } else {
                                format!("{recv}.{method}")
                            }
                        })
                        .unwrap_or(method);
                    push_ref(
                        unresolved_refs,
                        ref_owner(stack),
                        &callee,
                        "calls",
                        node,
                        relative_path,
                        SourceLanguage::Php,
                    );
                }
            }
        }
        // `ClassName::method()` / `self::f()` — scope + name.
        "scoped_call_expression" => {
            if let Some(method_node) = node.child_by_field_name("name") {
                if let Some(method) = node_text(method_node, source) {
                    let callee = node
                        .child_by_field_name("scope")
                        .and_then(|s| node_text(s, source))
                        .map(|scope| {
                            let scope = scope.trim_start_matches('$');
                            if SKIP_RECEIVERS.contains(&scope) {
                                method.clone()
                            } else {
                                format!("{scope}.{method}")
                            }
                        })
                        .unwrap_or(method);
                    push_ref(
                        unresolved_refs,
                        ref_owner(stack),
                        &callee,
                        "calls",
                        node,
                        relative_path,
                        SourceLanguage::Php,
                    );
                }
            }
        }
        // `new User()` / `new \App\Domain\Result()` — instantiates the class.
        // The class is the first named child (a `name` or `qualified_name`);
        // TS keeps the qualified text verbatim (no backslash stripping), so
        // mirror that exactly.
        "object_creation_expression" => {
            if let Some(ctor) = node.named_children(&mut node.walk()).next() {
                if let Some(class_name) = node_text(ctor, source) {
                    push_ref(
                        unresolved_refs,
                        ref_owner(stack),
                        class_name.trim(),
                        "instantiates",
                        ctor,
                        relative_path,
                        SourceLanguage::Php,
                    );
                }
            }
        }
        // Static-member VALUE reads: `Status::ACTIVE`, `User::class`,
        // `Config::$driver`. Emit a references ref to a capitalized simple
        // receiver (types are capitalized by PHP convention). A scoped CALL
        // (`User::find()`) parses as scoped_call_expression, not these nodes,
        // but guard the parent anyway.
        "class_constant_access_expression" | "scoped_property_access_expression" => {
            let parent_is_call = node
                .parent()
                .map(|p| p.kind() == "scoped_call_expression")
                .unwrap_or(false);
            if !parent_is_call {
                let receiver = node
                    .child_by_field_name("scope")
                    .or_else(|| node.named_children(&mut node.walk()).next());
                if let Some(recv) = receiver {
                    if matches!(recv.kind(), "name") {
                        if let Some(text) = node_text(recv, source) {
                            if text
                                .chars()
                                .next()
                                .map(|c| c.is_ascii_uppercase())
                                .unwrap_or(false)
                            {
                                push_ref(
                                    unresolved_refs,
                                    ref_owner(stack),
                                    &text,
                                    "references",
                                    recv,
                                    relative_path,
                                    SourceLanguage::Php,
                                );
                            }
                        }
                    }
                }
            }
        }
        _ => {}
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

    fn extract_all(
        code: &str,
    ) -> (
        Vec<ExtractedNode>,
        Vec<ExtractedEdge>,
        Vec<UnresolvedRef>,
    ) {
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
        (nodes, edges, refs)
    }

    fn extract_nodes(code: &str) -> (Vec<ExtractedNode>, Vec<ExtractedEdge>) {
        let (nodes, edges, _refs) = extract_all(code);
        (nodes, edges)
    }

    /// Collect reference names for a given reference kind, sorted.
    fn ref_names(refs: &[UnresolvedRef], kind: &str) -> Vec<String> {
        let mut out: Vec<String> = refs
            .iter()
            .filter(|r| r.reference_kind == kind)
            .map(|r| r.reference_name.clone())
            .collect();
        out.sort();
        out
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

    #[test]
    fn emits_imports_extends_implements_and_trait_use_refs() {
        let code = [
            "<?php",
            "namespace App\\Http;",
            "",
            "use App\\Models\\User;",
            "use App\\Contracts\\Logger as LogContract;",
            "use App\\Models\\{Profile, Post};",
            "",
            "class UserController extends BaseController implements \\Countable, LogContract",
            "{",
            "    use HasTimestamps, SoftDeletes;",
            "}",
            "",
        ]
        .join("\n");
        let (_nodes, _edges, refs) = extract_all(&code);

        // imports refs use the `NS::leaf` stored shape; global names (no
        // backslash) emit nothing, aliases keep the RHS qualified name.
        assert_eq!(
            ref_names(&refs, "imports"),
            vec![
                "App\\Contracts::Logger",
                "App\\Models::Post",
                "App\\Models::Profile",
                "App\\Models::User",
            ]
        );
        assert_eq!(
            ref_names(&refs, "extends"),
            vec!["BaseController".to_string()]
        );
        // A qualified `\Countable` target matches its trailing leaf.
        assert_eq!(
            ref_names(&refs, "implements"),
            vec![
                "Countable".to_string(),
                "HasTimestamps".to_string(),
                "LogContract".to_string(),
                "SoftDeletes".to_string(),
            ]
        );
    }

    #[test]
    fn emits_calls_instantiates_and_static_value_reads() {
        let code = [
            "<?php",
            "namespace App\\Http;",
            "",
            "class UserController",
            "{",
            "    public function show(string $id): User",
            "    {",
            "        $u = new User();",
            "        helper($id);",
            "        $this->logger->log($id);",
            "        User::find($id);",
            "        $x = Status::ACTIVE;",
            "        $y = User::class;",
            "        $z = Config::\x24driver;",
            "        self::internal();",
            "        return $u;",
            "    }",
            "}",
            "",
        ]
        .join("\n");
        let (_nodes, _edges, refs) = extract_all(&code);

        assert_eq!(
            ref_names(&refs, "instantiates"),
            vec!["User".to_string()]
        );

        let calls = ref_names(&refs, "calls");
        // free fn, scoped static call, self:: collapses to bare method, member
        // call carries the receiver chain text.
        assert!(calls.contains(&"helper".to_string()), "calls: {calls:?}");
        assert!(calls.contains(&"User.find".to_string()), "calls: {calls:?}");
        assert!(calls.contains(&"internal".to_string()), "calls: {calls:?}");
        assert!(
            calls.iter().any(|c| c.ends_with(".log")),
            "member call ends .log: {calls:?}"
        );

        let references = ref_names(&refs, "references");
        // return type User + static value reads Status / User(::class) / Config.
        assert!(references.contains(&"User".to_string()), "refs: {references:?}");
        assert!(references.contains(&"Status".to_string()), "refs: {references:?}");
        assert!(references.contains(&"Config".to_string()), "refs: {references:?}");
        // `string` primitive parameter emits nothing; `User::find` is a CALL,
        // so no duplicate static-read ref on that line.
        assert!(!references.contains(&"string".to_string()));
    }

    #[test]
    fn emits_type_hint_refs_filtering_pseudo_and_primitive_types() {
        let code = [
            "<?php",
            "namespace App;",
            "",
            "class C",
            "{",
            "    public function f(int $a, mixed $b, self $c, static $d, Logger $e, ?Optional $g, A|B $h): ?\\App\\Domain\\Result",
            "    {}",
            "}",
            "",
        ]
        .join("\n");
        let (_nodes, _edges, refs) = extract_all(&code);
        let references = ref_names(&refs, "references");
        assert_eq!(
            references,
            vec![
                "A".to_string(),
                "B".to_string(),
                "Logger".to_string(),
                "Optional".to_string(),
                "Result".to_string(),
            ],
            "only class hints; int/mixed/self/static and the qualified return leaf"
        );
    }

    #[test]
    fn interface_extends_and_enum_implements_emit_refs() {
        let code = [
            "<?php",
            "namespace App;",
            "",
            "interface Repository extends \\Countable, BaseIface {}",
            "enum Suit: string implements \\BackedEnum { case Hearts = 'H'; }",
            "",
        ]
        .join("\n");
        let (_nodes, _edges, refs) = extract_all(&code);
        assert_eq!(
            ref_names(&refs, "extends"),
            vec!["BaseIface".to_string(), "Countable".to_string()]
        );
        assert_eq!(
            ref_names(&refs, "implements"),
            vec!["BackedEnum".to_string()]
        );
    }
}
