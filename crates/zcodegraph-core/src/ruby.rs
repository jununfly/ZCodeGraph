//! Ruby baseline extraction (roadmap 1-2-6).
//!
//! Mirrors the legacy TS `rubyExtractor` (src/extraction/languages/ruby.ts)
//! and the orchestrator's two visitor contexts over tree-sitter-ruby 0.23.1
//! (ABI 14, the same grammar the TS side ships as tree-sitter-ruby.wasm via
//! tree-sitter-wasms 0.1.11).
//!
//! The TS walker has TWO distinct contexts, and keeping them separate here is
//! load-bearing:
//!
//! * declaration context (`visitNode`) — program / class / module bodies. It
//!   creates symbol nodes, turns `require`/`require_relative` calls into
//!   import nodes, and special-cases the `include`/`extend`/`prepend` mixin
//!   calls into `implements` refs. Ordinary method calls at this level emit
//!   NOTHING (Rails macros like `has_many` / `validates` are deliberately
//!   invisible here; routes/models stay in the TS Rails shell).
//! * method-body context (`visitFunctionBody`) — only this context emits
//!   `calls` refs (and the Ruby-specific bare-call identifiers). Locals and
//!   assignments create no nodes.
//!
//! Symbols: `module`, `class`, `method`/`singleton_method` (a `def` becomes a
//! `method` when its enclosing frame is a class/module, otherwise a
//! `function`), top-level identifier `assignment` -> `variable`, and `import`
//! for requires. Instance variables (`@x`), class variables (`@@x`) and
//! constants (`MAX = 1`) create no nodes — the TS ruby assignment branch only
//! accepts an `identifier` LHS, and the assignment dispatcher is gated to
//! non-class-like scope.
//!
//! Call naming exactly mirrors `extractCall`'s generic fallback: a Ruby `call`
//! has no `function` field, so the callee is its first NAMED child — the
//! receiver (`User.new` -> `User`, `u.save` -> `u`, `A::B.new` -> `A::B`) for
//! receiver calls, or the method identifier for bare calls (`puts` / `helper`).
//! There is deliberately no `receiver.method` dotted shape for Ruby.
//!
//! Rails routes (`get ... to: 'ctrl#action'`, `resources`) and the Rails
//! convention resolution (model/controller/helper/service) stay in the
//! TypeScript shell (resolution/frameworks/ruby.ts), back-filled after the
//! ownership cutover (1-2-6-4), exactly like the PHP/C# split.

use tree_sitter::Node as SyntaxNode;

use crate::{push_ref, ExtractedEdge, ExtractedNode, SourceLanguage, UnresolvedRef};

const LANG: &str = "ruby";

/// Statement-container parents under which a bare `identifier` is a method call
/// (mirrors rubyExtractor.extractBareCall BLOCK_PARENTS).
const BARE_CALL_PARENTS: &[&str] = &[
    "body_statement",
    "then",
    "else",
    "do",
    "begin",
    "rescue",
    "ensure",
    "when",
];

/// Bare keywords/literals that name no method.
const BARE_SKIP: &[&str] = &[
    "true",
    "false",
    "nil",
    "self",
    "super",
    "__FILE__",
    "__LINE__",
    "__dir__",
];

struct Frame {
    id: String,
    name: String,
    kind: &'static str,
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

fn named_children<'a>(node: SyntaxNode<'a>) -> Vec<SyntaxNode<'a>> {
    node.named_children(&mut node.walk()).collect()
}

/// Ruby visibility: scan named siblings immediately preceding the def for a
/// bare `private` / `protected` / `public` call; the nearest one wins
/// (mirrors rubyExtractor.getVisibility, which returns on the first match).
fn visibility(node: SyntaxNode, source: &[u8]) -> Option<String> {
    let mut sibling = node.prev_named_sibling();
    while let Some(sib) = sibling {
        if sib.kind() == "call" {
            if let Some(method) = sib.child_by_field_name("method") {
                if let Some(text) = node_text(method, source) {
                    match text.as_str() {
                        "private" => return Some("private".to_string()),
                        "protected" => return Some("protected".to_string()),
                        "public" => return Some("public".to_string()),
                        _ => {}
                    }
                }
            }
        }
        sibling = sib.prev_named_sibling();
    }
    Some("public".to_string())
}

/// The argument_list of a `call` (field or the matching named child).
fn argument_list<'a>(call: SyntaxNode<'a>) -> Option<SyntaxNode<'a>> {
    call.child_by_field_name("arguments")
        .or_else(|| named_children(call).into_iter().find(|c| c.kind() == "argument_list"))
}

/// The `string_content` text of a call's first string argument
/// (`require "x"` / `require_relative "x"`), mirroring rubyExtractor.extractImport.
fn require_string<'a>(call: SyntaxNode<'a>, source: &'a [u8]) -> Option<(String, String)> {
    let method = call.child_by_field_name("method")?;
    let mname = node_text(method, source)?;
    if mname != "require" && mname != "require_relative" {
        return None;
    }
    let args = argument_list(call)?;
    let string = named_children(args).into_iter().find(|c| c.kind() == "string")?;
    let content = named_children(string)
        .into_iter()
        .find(|c| c.kind() == "string_content")?;
    let raw = node_text(content, source)?;
    Some((mname, raw))
}

/// POSIX-style path normalize (mirrors path.posix.normalize in
/// emitRubyRequireRefs): resolve `.` / `..` lexically on `/` segments.
fn posix_normalize(input: &str) -> String {
    let trailing = input.ends_with('/');
    let mut out: Vec<&str> = Vec::new();
    for seg in input.split('/') {
        match seg {
            "" | "." => {}
            ".." => {
                if !out.is_empty() && out[out.len() - 1] != ".." {
                    out.pop();
                } else {
                    out.push("..");
                }
            }
            other => out.push(other),
        }
    }
    let mut result = out.join("/");
    if input.starts_with('/') {
        result = format!("/{result}");
    }
    if trailing && !result.ends_with('/') {
        result.push('/');
    }
    if result.is_empty() {
        ".".to_string()
    } else {
        result
    }
}

/// The file-path-shaped `imports` ref emitted by emitRubyRequireRefs.
/// `require_relative` resolves against the requiring file's directory;
/// `require` keeps the load-path text verbatim. A bare gem/stdlib name (no
/// `/`) names no in-repo file and emits nothing.
fn require_file_ref_name(mname: &str, raw: &str, relative_path: &str) -> Option<String> {
    let joined: String = if mname == "require_relative" {
        let dir = match relative_path.rfind('/') {
            Some(idx) => &relative_path[..idx],
            None => "",
        };
        if dir.is_empty() {
            raw.to_string()
        } else {
            format!("{dir}/{raw}")
        }
    } else {
        raw.to_string()
    };
    let ref_path = if mname == "require_relative" {
        posix_normalize(&joined)
    } else {
        joined
    };
    if !ref_path.contains('/') {
        return None;
    }
    Some(if ref_path.ends_with(".rb") {
        ref_path
    } else {
        format!("{ref_path}.rb")
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
    let normalized_path = relative_path.replace('\\', "/");
    let mut stack: Vec<Frame> = vec![Frame {
        id: file_node_id.to_string(),
        name: file_name,
        kind: "file",
    }];

    for child in named_children(root) {
        walk_decl(
            child,
            source,
            &normalized_path,
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
    let parent_id = stack.last().map(|f| f.id.clone()).unwrap_or_default();

    // ---- module -----------------------------------------------------------
    if kind == "module" {
        if let Some(name) = node.child_by_field_name("name").and_then(|n| node_text(n, source)) {
            let module = ExtractedNode::symbol_with_visibility_and_qualified_name(
                relative_path,
                "module",
                &name,
                node,
                LANG,
                Some("public".to_string()),
                qualified_name(stack, &name),
            );
            let id = module.id.clone();
            edges.push(contains_edge(&parent_id, &id, node));
            nodes.push(module);
            stack.push(Frame { id: id.clone(), name, kind: "module" });
            if let Some(body) = node.child_by_field_name("body") {
                for child in named_children(body) {
                    walk_decl(child, source, relative_path, stack, nodes, edges, unresolved_refs)?;
                }
            }
            stack.pop();
            return Ok(());
        }
    }

    // ---- class (with a single `superclass` -> extends) --------------------
    if kind == "class" {
        if let Some(name) = node.child_by_field_name("name").and_then(|n| node_text(n, source)) {
            let class = ExtractedNode::symbol_with_visibility_and_qualified_name(
                relative_path,
                "class",
                &name,
                node,
                LANG,
                Some("public".to_string()),
                qualified_name(stack, &name),
            );
            let id = class.id.clone();
            edges.push(contains_edge(&parent_id, &id, node));

            if let Some(super_node) = node
                .child_by_field_name("superclass")
                .and_then(|s| named_children(s).into_iter().next())
            {
                if let Some(super_name) = node_text(super_node, source) {
                    push_ref(
                        unresolved_refs,
                        &id,
                        &super_name,
                        "extends",
                        super_node,
                        relative_path,
                        SourceLanguage::Ruby,
                    );
                }
            }

            nodes.push(class);
            stack.push(Frame { id: id.clone(), name, kind: "class" });
            if let Some(body) = node.child_by_field_name("body") {
                for child in named_children(body) {
                    walk_decl(child, source, relative_path, stack, nodes, edges, unresolved_refs)?;
                }
            }
            stack.pop();
            return Ok(());
        }
    }

    // ---- def / def self.x -------------------------------------------------
    if kind == "method" || kind == "singleton_method" {
        extract_def(node, source, relative_path, stack, nodes, edges, unresolved_refs)?;
        return Ok(());
    }

    // ---- calls at declaration scope: require imports or mixin includes ----
    if kind == "call" {
        let no_receiver = node.child_by_field_name("receiver").is_none();
        let mixin = node
            .child_by_field_name("method")
            .and_then(|m| node_text(m, source))
            .filter(|m| m == "include" || m == "extend" || m == "prepend")
            .is_some();

        if no_receiver && mixin {
            // `include Mod[, Other]` inside a class/module body -> implements
            // refs to each constant/scope_resolution argument. This call is
            // consumed (it never becomes a `calls` ref).
            if let Some(args) = argument_list(node) {
                for arg in named_children(args) {
                    if arg.kind() == "constant" || arg.kind() == "scope_resolution" {
                        if let Some(mod_name) = node_text(arg, source) {
                            push_ref(
                                unresolved_refs,
                                &parent_id,
                                &mod_name,
                                "implements",
                                arg,
                                relative_path,
                                SourceLanguage::Ruby,
                            );
                        }
                    }
                }
            }
            return Ok(());
        }

        if let Some((mname, raw)) = require_string(node, source) {
            // The import node (name = the raw require string).
            let import = ExtractedNode::symbol_with_qualified_name(
                relative_path,
                "import",
                &raw,
                node,
                LANG,
                qualified_name(stack, &raw),
            );
            let import_id = import.id.clone();
            edges.push(contains_edge(&parent_id, &import_id, node));
            nodes.push(import);

            // Generic extractImport ref (name = raw require string).
            push_ref(
                unresolved_refs,
                &parent_id,
                &raw,
                "imports",
                node,
                relative_path,
                SourceLanguage::Ruby,
            );

            // File-path-shaped require ref (load path / require_relative).
            if let Some(file_ref) = require_file_ref_name(&mname, &raw, relative_path) {
                push_ref(
                    unresolved_refs,
                    &parent_id,
                    &file_ref,
                    "imports",
                    node,
                    relative_path,
                    SourceLanguage::Ruby,
                );
            }
            return Ok(());
        }

        // Any other declaration-scope call (Rails macros, attr_reader, private)
        // emits no call ref; descend so nested calls/structures are seen.
        for child in named_children(node) {
            walk_decl(child, source, relative_path, stack, nodes, edges, unresolved_refs)?;
        }
        return Ok(());
    }

    // ---- top-level identifier assignment -> variable ---------------------
    // Only an identifier LHS at FILE scope (not inside a class/module frame)
    // creates a node. Constants (`MAX = 1`), instance vars (`@x = 1`) and
    // class vars (`@@x = 1`) create nothing, mirroring the ruby assignment
    // branch (LHS must be `identifier`) gated by !isInsideClassLikeNode.
    if kind == "assignment" {
        let at_file_scope = stack.len() == 1 && stack[0].kind == "file";
        if at_file_scope {
            if let Some(left) = node.child_by_field_name("left") {
                if left.kind() == "identifier" {
                    if let Some(name) = node_text(left, source) {
                        let var = ExtractedNode::symbol_with_visibility_and_qualified_name(
                            relative_path,
                            "variable",
                            &name,
                            node,
                            LANG,
                            None,
                            qualified_name(stack, &name),
                        );
                        let id = var.id.clone();
                        edges.push(contains_edge(&parent_id, &id, node));
                        nodes.push(var);
                    }
                }
            }
        }
        // Initializers at every scope still carry calls (top-level constants
        // are a common registry pattern); walk the RHS as a method body.
        if let Some(right) = node.child_by_field_name("right") {
            walk_body(right, source, relative_path, stack, unresolved_refs)?;
        }
        return Ok(());
    }

    // ---- generic declaration descent --------------------------------------
    for child in named_children(node) {
        walk_decl(child, source, relative_path, stack, nodes, edges, unresolved_refs)?;
    }
    Ok(())
}

#[allow(clippy::too_many_arguments)]
fn extract_def(
    node: SyntaxNode,
    source: &[u8],
    relative_path: &str,
    stack: &mut Vec<Frame>,
    nodes: &mut Vec<ExtractedNode>,
    edges: &mut Vec<ExtractedEdge>,
    unresolved_refs: &mut Vec<UnresolvedRef>,
) -> Result<(), Box<dyn std::error::Error>> {
    let parent_id = stack.last().map(|f| f.id.clone()).unwrap_or_default();
    let name = field_text(node, "name", source);
    let name = match name {
        Some(n) => n,
        None => return Ok(()),
    };

    // A def is a `method` only when enclosed by a class/module frame (module
    // counts as class-like, mirroring isInsideClassLikeNode); otherwise it is a
    // free `function` (file scope, or a def nested in an odd location).
    let inside_class_like = stack
        .iter()
        .rev()
        .any(|f| matches!(f.kind, "class" | "module"));
    let sym_kind = if inside_class_like { "method" } else { "function" };

    let vis = visibility(node, source);
    let sym = ExtractedNode::symbol_with_visibility_and_qualified_name(
        relative_path,
        sym_kind,
        &name,
        node,
        LANG,
        vis,
        qualified_name(stack, &name),
    );
    let id = sym.id.clone();
    edges.push(contains_edge(&parent_id, &id, node));
    nodes.push(sym);

    stack.push(Frame {
        id: id.clone(),
        name: name.clone(),
        kind: if inside_class_like { "method" } else { "function" },
    });
    // Method bodies are the ONLY context that emits `calls` refs. Parameters
    // are expressions too (default values), so walk the whole node — the
    // parameter identifiers never match the bare-call parent set and calls in
    // defaults are captured, matching visitFunctionBody(body) plus default-arg
    // handling through the traversed body.
    if let Some(body) = node.child_by_field_name("body") {
        walk_body(body, source, relative_path, stack, unresolved_refs)?;
    }
    stack.pop();
    Ok(())
}

/// Method-body reference extraction (mirrors visitFunctionBody for Ruby):
/// `call` nodes become `calls` refs and statement-level bare identifiers
/// become `calls` refs. Nested defs/classes/modules are NOT created here —
/// Ruby disallows nesting a `def`/class inside a method in a way the grammar
/// models as such declarations; any such structure is only walked for the
/// calls it contains. Locals and assignments create no nodes.
#[allow(clippy::too_many_arguments)]
fn walk_body(
    node: SyntaxNode,
    source: &[u8],
    relative_path: &str,
    stack: &[Frame],
    unresolved_refs: &mut Vec<UnresolvedRef>,
) -> Result<(), Box<dyn std::error::Error>> {
    let kind = node.kind();
    let owner = body_owner(stack);

    if kind == "call" {
        if let Some(callee) = call_callee(node, source) {
            push_ref(
                unresolved_refs,
                owner,
                &callee,
                "calls",
                node,
                relative_path,
                SourceLanguage::Ruby,
            );
        }
    } else if kind == "identifier" {
        // Bare statement-level method call (no parens/receiver).
        let parent_is_statement = node
            .parent()
            .map(|p| BARE_CALL_PARENTS.contains(&p.kind()))
            .unwrap_or(false);
        if parent_is_statement {
            if let Some(name) = node_text(node, source) {
                let is_keyword = BARE_SKIP.contains(&name.as_str());
                let is_constant = name
                    .chars()
                    .next()
                    .map(|c| c.is_ascii_uppercase())
                    .unwrap_or(false);
                if !is_keyword && !is_constant {
                    push_ref(
                        unresolved_refs,
                        owner,
                        &name,
                        "calls",
                        node,
                        relative_path,
                        SourceLanguage::Ruby,
                    );
                }
            }
        }
    }

    for child in named_children(node) {
        walk_body(child, source, relative_path, stack, unresolved_refs)?;
    }
    Ok(())
}

/// The id that owns calls inside a method body: the innermost method/function
/// frame, else the file (mirrors nodeStack head while visiting a body).
fn body_owner(stack: &[Frame]) -> &str {
    for f in stack.iter().rev() {
        if matches!(f.kind, "method" | "function") {
            return &f.id;
        }
    }
    &stack[0].id
}

/// Resolve a Ruby `call` node's callee text exactly like `extractCall`'s
/// generic fallback: `func = getChildByField(node, "function") || node.namedChild(0)`.
/// A Ruby call has no `function` field, so the callee is its first NAMED
/// child — the receiver when one exists (`User.new` -> `User`, `u.save` ->
/// `u`, `A::B.new` -> `A::B`, `self.foo` -> `self`), otherwise the method
/// identifier for a bare call (`puts hi` -> `puts`). Ruby receivers are never
/// `member_expression`/`field_expression` nodes, so none of the dotted-receiver
/// unwrapping in the TS generic branch applies; the text is used verbatim.
fn call_callee(node: SyntaxNode, source: &[u8]) -> Option<String> {
    named_children(node)
        .into_iter()
        .next()
        .and_then(|func| node_text(func, source))
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
        parser.set_language(&tree_sitter_ruby::LANGUAGE.into()).unwrap();
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

    fn find_kind<'a>(
        nodes: &'a [ExtractedNode],
        kind: &str,
        name: &str,
    ) -> &'a ExtractedNode {
        nodes
            .iter()
            .find(|n| n.kind == kind && n.name == name)
            .unwrap_or_else(|| panic!("{kind} named {name}"))
    }

    fn ref_names(refs: &[UnresolvedRef], kind: &str) -> Vec<String> {
        let mut out: Vec<String> = refs
            .iter()
            .filter(|r| r.reference_kind == kind)
            .map(|r| r.reference_name.clone())
            .collect();
        out.sort();
        out
    }

    #[test]
    fn nested_modules_qualify_classes_and_methods() {
        let code = "\
module Discourse
  module Auth
    class AuthProvider
      def authenticate(params)
        validate(params)
      end
    end
  end
end
";
        let (nodes, _edges, _refs) = extract_all("lib/auth.rb", code);

        let discourse = find_kind(&nodes, "module", "Discourse");
        assert_eq!(discourse.qualified_name, "Discourse");
        let auth = find_kind(&nodes, "module", "Auth");
        assert_eq!(auth.qualified_name, "Discourse::Auth");

        let provider = find_kind(&nodes, "class", "AuthProvider");
        assert_eq!(provider.qualified_name, "Discourse::Auth::AuthProvider");

        let method = find_kind(&nodes, "method", "authenticate");
        assert_eq!(
            method.qualified_name,
            "Discourse::Auth::AuthProvider::authenticate"
        );
    }

    #[test]
    fn singleton_methods_are_methods_and_shed_receiver() {
        let code = "\
module Cached
  def self.disable
    @enabled = false
  end

  def perform_increment!(key, count)
    write_cache!(key, count)
  end
end
";
        let (nodes, _edges, _refs) = extract_all("concerns/cached_counting.rb", code);

        let disable = find_kind(&nodes, "method", "disable");
        assert_eq!(disable.qualified_name, "Cached::disable");
        let perform = find_kind(&nodes, "method", "perform_increment!");
        assert_eq!(perform.qualified_name, "Cached::perform_increment!");
    }

    #[test]
    fn top_level_def_is_a_function() {
        let code = "def rake_helper\n  do_thing\nend\n";
        let (nodes, _edges, _refs) = extract_all("Rakefile.rb", code);
        assert_eq!(kinds(&nodes, "method").len(), 0);
        let fns = kinds(&nodes, "function");
        assert_eq!(fns.len(), 1);
        assert_eq!(fns[0].name, "rake_helper");
    }

    #[test]
    fn requires_become_imports_plus_raw_and_file_refs() {
        let code = "\
require 'json'
require 'active_support/core_ext/string'
require_relative 'fetcher'
";
        // Mirrors the e2e case: lib/app/boot.rb requires its sibling fetcher.
        let (nodes, _edges, refs) = extract_all("lib/app/boot.rb", code);
        let imports: Vec<String> = kinds(&nodes, "import")
            .iter()
            .map(|n| n.name.clone())
            .collect();
        assert_eq!(
            imports,
            vec![
                "json".to_string(),
                "active_support/core_ext/string".to_string(),
                "fetcher".to_string(),
            ]
        );
        // Raw import refs for all three; the bare 'json' has no path ref.
        let raw = ref_names(&refs, "imports");
        assert!(raw.contains(&"json".to_string()), "{raw:?}");
        assert!(raw.contains(&"active_support/core_ext/string".to_string()), "{raw:?}");
        assert!(
            raw.contains(&"active_support/core_ext/string.rb".to_string()),
            "load-path require gets .rb suffix: {raw:?}"
        );
        // require_relative 'fetcher' from lib/app/ -> lib/app/fetcher.rb.
        assert!(
            raw.contains(&"lib/app/fetcher.rb".to_string()),
            "relative require resolves against the file's dir: {raw:?}"
        );
        assert!(!raw.iter().any(|r| r == "json.rb"), "bare gem require emits no file ref");
        // Raw import node names ('json', 'fetcher') have no `.rb` file-ref twin.
        assert!(!raw.iter().any(|r| r == "fetcher.rb"), "no slash -> no file ref");
    }

    #[test]
    fn non_require_call_is_not_an_import() {
        let code = "puts 'hello'\n";
        let (nodes, _edges, _refs) = extract_all("app.rb", code);
        assert_eq!(kinds(&nodes, "import").len(), 0);
    }

    #[test]
    fn mixin_calls_emit_implements_and_no_call_ref() {
        let code = "\
class Model
  include Trackable
  prepend Cacheable
  extend Loggable
end
";
        let (_nodes, _edges, refs) = extract_all("lib/model.rb", code);
        let mut implements = ref_names(&refs, "implements");
        implements.sort();
        assert_eq!(
            implements,
            vec![
                "Cacheable".to_string(),
                "Loggable".to_string(),
                "Trackable".to_string(),
            ]
        );
        // The include/extend/prepend calls are consumed — no calls refs.
        assert_eq!(ref_names(&refs, "calls").len(), 0);
    }

    #[test]
    fn superclass_emits_extends() {
        let code = "class ArticlesController < ApplicationController\nend\n";
        let (_nodes, _edges, refs) = extract_all("app/controllers/articles_controller.rb", code);
        assert_eq!(
            ref_names(&refs, "extends"),
            vec!["ApplicationController".to_string()]
        );
    }


    #[test]
    fn method_body_calls_use_receiver_text_and_bare_names() {
        let code = "\
class Worker
  def run(id)
    u = User.new
    u.authenticate
    User.count
    App::Config.new
    helper(id)
    reset
  end
end
";
        let (_nodes, _edges, refs) = extract_all("app/worker.rb", code);
        let calls = ref_names(&refs, "calls");
        // Receiver calls collapse to the RECEIVER text (first named child).
        assert!(calls.contains(&"User".to_string()), "User.new/User.count -> User: {calls:?}");
        assert!(calls.contains(&"u".to_string()), "u.authenticate -> u: {calls:?}");
        assert!(calls.contains(&"App::Config".to_string()), "App::Config.new: {calls:?}");
        // Parenthesised bare call (method field, first named child).
        assert!(calls.contains(&"helper".to_string()), "helper(id): {calls:?}");
        // Statement-level bare call (no parens).
        assert!(calls.contains(&"reset".to_string()), "bare reset: {calls:?}");
        // Local assignment LHS `u` is not a call (its parent is assignment).
        assert!(!calls.iter().any(|c| c == "id"), "param id is not a call");
    }

    #[test]
    fn bare_skips_keywords_and_constants() {
        let code = "\
class C
  def f
    self
    true
    nil
    User
    actual_call
  end
end
";
        let (_nodes, _edges, refs) = extract_all("c.rb", code);
        let calls = ref_names(&refs, "calls");
        assert!(calls.contains(&"actual_call".to_string()), "{calls:?}");
        for skipped in ["self", "true", "nil", "User"] {
            assert!(!calls.contains(&skipped.to_string()), "{skipped} must be skipped: {calls:?}");
        }
    }

    #[test]
    fn visibility_tracks_preceding_private_call() {
        // TS getVisibility scans previous NAMED siblings for a bare `call`
        // whose method is private/protected/public. The declaration-style
        // `private :secret_key` is such a call (a bare `private` on its own
        // line parses as an `identifier`, so it is NOT detected — a known TS
        // edge faithfully preserved here).
        let code = "\
class C
  def public_method
    1
  end

  private :secret_key

  def secret_key
    2
  end
end
";
        let (nodes, _edges, _refs) = extract_all("c.rb", code);
        let methods = kinds(&nodes, "method");
        let public_method = methods.iter().find(|m| m.name == "public_method").unwrap();
        assert_eq!(public_method.visibility.as_deref(), Some("public"));
        let secret = methods.iter().find(|m| m.name == "secret_key").unwrap();
        assert_eq!(secret.visibility.as_deref(), Some("private"));
    }

    #[test]
    fn top_level_identifier_assignment_is_a_variable_only_at_file_scope() {
        let code = "\
TOP = 1
top_var = 2

module M
  inside_var = 3

  def f
    local_var = 4
  end
end
";
        let (nodes, _edges, _refs) = extract_all("script.rb", code);
        let variables: Vec<&str> = kinds(&nodes, "variable").iter().map(|v| v.name.as_str()).collect();
        // Only the file-scope identifier LHS becomes a node. The constant TOP,
        // the module-scope identifier, and the method local do not.
        assert_eq!(variables, vec!["top_var"]);
        assert_eq!(kinds(&nodes, "constant").len(), 0);
    }

    #[test]
    fn scoped_module_name_is_a_single_flat_frame() {
        // `module Foo::Bar` names one frame with text `Foo::Bar` (the TS
        // visitNode reads the name field, a scope_resolution, verbatim).
        let code = "\
module Foo::Bar
  def baz
    other
  end
end
";
        let (nodes, _edges, _refs) = extract_all("x.rb", code);
        let module = kinds(&nodes, "module");
        assert_eq!(module.len(), 1);
        assert_eq!(module[0].name, "Foo::Bar");
        let method = kinds(&nodes, "method");
        assert_eq!(method[0].qualified_name, "Foo::Bar::baz");
    }

    #[test]
    fn extensions_map_to_ruby() {
        use crate::SourceLanguage;
        use std::path::Path;
        assert_eq!(
            SourceLanguage::from_path(Path::new("x.rb")),
            Some(SourceLanguage::Ruby)
        );
        assert_eq!(
            SourceLanguage::from_path(Path::new("Rakefile.rb")),
            Some(SourceLanguage::Ruby)
        );
        assert_eq!(
            SourceLanguage::from_path(Path::new("tasks/deploy.rake")),
            Some(SourceLanguage::Ruby)
        );
    }
}
