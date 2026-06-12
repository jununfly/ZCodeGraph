use rusqlite::{params, Connection};
use sha2::{Digest, Sha256};
use std::fs;
use std::io;
use std::path::{Path, PathBuf};
use std::time::{Duration, Instant, SystemTime};
use tree_sitter::{Node as SyntaxNode, Parser, TreeCursor};

const SCHEMA_SQL: &str = include_str!("../../../src/db/schema.sql");
const CURRENT_SCHEMA_VERSION: i64 = 4;
const EXTRACTION_VERSION: i64 = 1;

#[derive(Debug, Clone, PartialEq, Eq)]
pub struct IndexRequest {
    pub engine: String,
    pub project_path: String,
    pub index_path: String,
    pub force: bool,
    pub verbose: bool,
}

#[derive(Debug, Clone, PartialEq, Eq)]
pub struct IndexResult {
    pub success: bool,
    pub files_indexed: u32,
    pub files_skipped: u32,
    pub files_errored: u32,
    pub nodes_created: u32,
    pub edges_created: u32,
    pub duration_ms: u128,
    pub errors: Vec<String>,
}

pub fn run_index(request: &IndexRequest) -> IndexResult {
    let started = Instant::now();

    match write_minimal_index(request) {
        Ok(counts) => IndexResult {
            success: true,
            files_indexed: counts.files_indexed,
            files_skipped: 0,
            files_errored: counts.files_errored,
            nodes_created: counts.nodes_created,
            edges_created: counts.edges_created,
            duration_ms: started.elapsed().as_millis(),
            errors: counts.errors,
        },
        Err(err) => {
            return IndexResult {
                success: false,
                files_indexed: 0,
                files_skipped: 0,
                files_errored: 0,
                nodes_created: 0,
                edges_created: 0,
                duration_ms: started.elapsed().as_millis(),
                errors: vec![err.to_string()],
            };
        }
    }
}

#[derive(Debug, Default)]
pub struct WriteCounts {
    pub files_indexed: u32,
    pub files_errored: u32,
    pub nodes_created: u32,
    pub edges_created: u32,
    pub errors: Vec<String>,
}

pub fn write_minimal_index(
    request: &IndexRequest,
) -> Result<WriteCounts, Box<dyn std::error::Error>> {
    let index_path = Path::new(&request.index_path);
    if let Some(parent) = index_path.parent() {
        fs::create_dir_all(parent)?;
    }

    let lock_path = Path::new(&request.project_path)
        .join(".zcodegraph")
        .join("zcodegraph.lock");
    let _lock = ProjectLock::acquire(&lock_path)?;
    sleep_after_lock_for_tests();

    let temp_path = temp_index_path(index_path);
    if temp_path.exists() {
        fs::remove_file(&temp_path)?;
    }

    let write_result = (|| -> Result<WriteCounts, Box<dyn std::error::Error>> {
        let counts = {
            let conn = Connection::open(&temp_path)?;
            conn.pragma_update(None, "journal_mode", "WAL")?;
            conn.pragma_update(None, "foreign_keys", "ON")?;
            conn.execute_batch(SCHEMA_SQL)?;
            stamp_schema_version(&conn)?;
            stamp_metadata(&conn)?;
            index_javascript_files(&conn, Path::new(&request.project_path))?
        };

        replace_active_index(&temp_path, index_path)?;
        cleanup_sqlite_sidecars(&temp_path);
        Ok(counts)
    })();

    if write_result.is_err() {
        cleanup_sqlite_sidecars(&temp_path);
        let _ = fs::remove_file(&temp_path);
    }

    write_result
}

fn sleep_after_lock_for_tests() {
    let Ok(raw) = std::env::var("ZCODEGRAPH_RUST_CORE_TEST_SLEEP_MS") else {
        return;
    };
    let Ok(ms) = raw.parse::<u64>() else {
        return;
    };
    if ms > 0 {
        std::thread::sleep(Duration::from_millis(ms));
    }
}

fn index_javascript_files(
    conn: &Connection,
    project_path: &Path,
) -> Result<WriteCounts, Box<dyn std::error::Error>> {
    let files = collect_supported_files(project_path)?;
    let mut counts = WriteCounts::default();

    for file_path in files {
        let language = SourceLanguage::from_path(&file_path)
            .ok_or_else(|| format!("Unsupported source file: {}", file_path.display()))?;
        let mut parser = Parser::new();
        parser.set_language(&language.tree_sitter_language())?;
        let relative_path = relative_slash_path(project_path, &file_path)?;
        let content = fs::read_to_string(&file_path)?;
        let metadata = fs::metadata(&file_path)?;
        let parsed = parser
            .parse(&content, None)
            .ok_or_else(|| format!("Parser returned no tree for {}", relative_path))?;
        let mut nodes = Vec::new();
        let mut edges = Vec::new();
        let mut unresolved_refs = Vec::new();
        let file_node = ExtractedNode::file(&relative_path, &content, language.codegraph_name());
        let file_node_id = file_node.id.clone();
        nodes.push(file_node);

        if parsed.root_node().has_error() {
            counts.files_errored += 1;
            counts
                .errors
                .push(format!("{}: parse error", relative_path));
        } else {
            extract_top_level_js_symbols(
                parsed.root_node(),
                content.as_bytes(),
                &relative_path,
                language,
                &file_node_id,
                &mut nodes,
                &mut edges,
                &mut unresolved_refs,
            )?;
        }

        let indexed_at = now_ms();
        insert_nodes(conn, &nodes)?;
        insert_edges(conn, &edges)?;
        insert_unresolved_refs(conn, &unresolved_refs)?;
        upsert_file(
            conn,
            &relative_path,
            &content,
            &metadata,
            language.codegraph_name(),
            indexed_at,
            nodes.len() as i64,
        )?;

        counts.files_indexed += 1;
        counts.nodes_created += nodes.len() as u32;
        counts.edges_created += edges.len() as u32;
    }

    Ok(counts)
}

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
enum SourceLanguage {
    JavaScript,
    Jsx,
    TypeScript,
    Tsx,
}

impl SourceLanguage {
    fn from_path(path: &Path) -> Option<Self> {
        match path.extension().and_then(|ext| ext.to_str()) {
            Some("js") => Some(Self::JavaScript),
            Some("jsx") => Some(Self::Jsx),
            Some("ts") => Some(Self::TypeScript),
            Some("tsx") => Some(Self::Tsx),
            _ => None,
        }
    }

    fn codegraph_name(self) -> &'static str {
        match self {
            Self::JavaScript => "javascript",
            Self::Jsx => "jsx",
            Self::TypeScript => "typescript",
            Self::Tsx => "tsx",
        }
    }

    fn tree_sitter_language(self) -> tree_sitter::Language {
        match self {
            Self::JavaScript | Self::Jsx => tree_sitter_javascript::LANGUAGE.into(),
            Self::TypeScript => tree_sitter_typescript::LANGUAGE_TYPESCRIPT.into(),
            Self::Tsx => tree_sitter_typescript::LANGUAGE_TSX.into(),
        }
    }

    fn has_jsx(self) -> bool {
        matches!(self, Self::Jsx | Self::Tsx)
    }
}

fn collect_supported_files(project_path: &Path) -> io::Result<Vec<PathBuf>> {
    fn walk(dir: &Path, out: &mut Vec<PathBuf>) -> io::Result<()> {
        for entry in fs::read_dir(dir)? {
            let entry = entry?;
            let path = entry.path();
            let file_name = entry.file_name();
            let name = file_name.to_string_lossy();
            if entry.file_type()?.is_dir() {
                if matches!(
                    name.as_ref(),
                    ".git" | ".zcodegraph" | "node_modules" | "target" | "dist"
                ) {
                    continue;
                }
                walk(&path, out)?;
            } else if SourceLanguage::from_path(&path).is_some() {
                out.push(path);
            }
        }
        Ok(())
    }

    let mut files = Vec::new();
    walk(project_path, &mut files)?;
    files.sort();
    Ok(files)
}

fn extract_top_level_js_symbols(
    root: SyntaxNode,
    source: &[u8],
    relative_path: &str,
    language: SourceLanguage,
    file_node_id: &str,
    nodes: &mut Vec<ExtractedNode>,
    edges: &mut Vec<ExtractedEdge>,
    unresolved_refs: &mut Vec<UnresolvedRef>,
) -> Result<(), Box<dyn std::error::Error>> {
    let mut cursor = root.walk();
    visit_js_node(
        &mut cursor,
        source,
        relative_path,
        language,
        file_node_id,
        file_node_id,
        nodes,
        edges,
        unresolved_refs,
    )?;
    Ok(())
}

fn visit_js_node(
    cursor: &mut TreeCursor,
    source: &[u8],
    relative_path: &str,
    language: SourceLanguage,
    file_node_id: &str,
    current_from_node_id: &str,
    nodes: &mut Vec<ExtractedNode>,
    edges: &mut Vec<ExtractedEdge>,
    unresolved_refs: &mut Vec<UnresolvedRef>,
) -> Result<(), Box<dyn std::error::Error>> {
    let node = cursor.node();
    let mut child_from_node_id = current_from_node_id.to_string();

    if let Some((kind, name_node)) = extract_named_symbol(node, source, language)? {
        let mut name = name_node.utf8_text(source)?.to_string();
        if matches!(kind, "import" | "export") {
            name = trim_string_literal(&name).to_string();
        }
        let extracted =
            ExtractedNode::symbol(relative_path, kind, &name, node, language.codegraph_name());
        let extracted_id = extracted.id.clone();
        edges.push(ExtractedEdge {
            source: file_node_id.to_string(),
            target: extracted_id.clone(),
            kind: "contains".to_string(),
            line: extracted.start_line,
            col: extracted.start_column,
        });
        nodes.push(extracted);
        child_from_node_id = extracted_id;
    }

    extract_statement_refs(
        node,
        source,
        relative_path,
        language,
        current_from_node_id,
        unresolved_refs,
    )?;

    if cursor.goto_first_child() {
        loop {
            visit_js_node(
                cursor,
                source,
                relative_path,
                language,
                file_node_id,
                &child_from_node_id,
                nodes,
                edges,
                unresolved_refs,
            )?;
            if !cursor.goto_next_sibling() {
                break;
            }
        }
        cursor.goto_parent();
    }

    Ok(())
}

fn extract_named_symbol<'a>(
    node: SyntaxNode<'a>,
    source: &[u8],
    language: SourceLanguage,
) -> Result<Option<(&'static str, SyntaxNode<'a>)>, Box<dyn std::error::Error>> {
    if node.kind() == "function_declaration" || node.kind() == "class_declaration" {
        if let Some(name_node) = node.child_by_field_name("name") {
            let name = name_node.utf8_text(source)?;
            let kind = if language.has_jsx() && is_pascal_case(name) {
                "component"
            } else if node.kind() == "function_declaration" {
                "function"
            } else {
                "class"
            };
            return Ok(Some((kind, name_node)));
        }
    }

    if matches!(node.kind(), "import_statement" | "export_statement") {
        if let Some(name_node) = module_literal_node(node) {
            let kind = if node.kind() == "import_statement" {
                "import"
            } else {
                "export"
            };
            return Ok(Some((kind, name_node)));
        }
    }

    let kind = match node.kind() {
        "interface_declaration" => Some("interface"),
        "type_alias_declaration" => Some("type_alias"),
        "method_definition" => Some("method"),
        "public_field_definition" | "field_definition" => Some("field"),
        _ => None,
    };
    if let Some(kind) = kind {
        if let Some(name_node) = node.child_by_field_name("name") {
            return Ok(Some((kind, name_node)));
        }
    }

    if node.kind() == "lexical_declaration" || node.kind() == "variable_declaration" {
        let is_const = node
            .children(&mut node.walk())
            .any(|child| child.kind() == "const");
        let kind = if is_const { "constant" } else { "variable" };
        for child in node.named_children(&mut node.walk()) {
            if child.kind() == "variable_declarator" {
                if let Some(name_node) = child.child_by_field_name("name") {
                    let name = name_node.utf8_text(source)?;
                    if language.has_jsx() && is_pascal_case(name) {
                        return Ok(Some(("component", name_node)));
                    }
                    return Ok(Some((kind, name_node)));
                }
            }
        }
    }

    Ok(None)
}

fn extract_statement_refs(
    node: SyntaxNode,
    source: &[u8],
    relative_path: &str,
    language: SourceLanguage,
    from_node_id: &str,
    unresolved_refs: &mut Vec<UnresolvedRef>,
) -> Result<(), Box<dyn std::error::Error>> {
    match node.kind() {
        "import_statement" => {
            if let Some(module_node) = module_literal_node(node) {
                let module = trim_string_literal(module_node.utf8_text(source)?).to_string();
                push_ref(
                    unresolved_refs,
                    from_node_id,
                    &module,
                    "imports",
                    node,
                    relative_path,
                    language,
                );
            }
        }
        "export_statement" => {
            if let Some(module_node) = module_literal_node(node) {
                let module = trim_string_literal(module_node.utf8_text(source)?).to_string();
                push_ref(
                    unresolved_refs,
                    from_node_id,
                    &module,
                    "exports",
                    node,
                    relative_path,
                    language,
                );
            }
        }
        "call_expression" | "new_expression" => {
            if let Some(name_node) = call_target_node(node) {
                let reference_name = reference_name(name_node, source)?;
                let reference_kind = if node.kind() == "new_expression" {
                    "instantiates"
                } else {
                    "calls"
                };
                push_ref(
                    unresolved_refs,
                    from_node_id,
                    &reference_name,
                    reference_kind,
                    name_node,
                    relative_path,
                    language,
                );
            }
        }
        "jsx_opening_element" | "jsx_self_closing_element" => {
            if let Some(name_node) = node.child_by_field_name("name") {
                let name = name_node.utf8_text(source)?;
                if is_pascal_case(name) {
                    push_ref(
                        unresolved_refs,
                        from_node_id,
                        name,
                        "references",
                        name_node,
                        relative_path,
                        language,
                    );
                }
            }
        }
        _ => {}
    }

    Ok(())
}

fn module_literal_node(node: SyntaxNode) -> Option<SyntaxNode> {
    if let Some(source) = node.child_by_field_name("source") {
        if matches!(source.kind(), "string" | "string_fragment") {
            return Some(source);
        }
        return string_literal_node(source);
    }

    let mut cursor = node.walk();
    for child in node.children(&mut cursor) {
        if matches!(child.kind(), "string" | "string_fragment") {
            return Some(child);
        }
    }
    None
}

fn string_literal_node(node: SyntaxNode) -> Option<SyntaxNode> {
    let mut cursor = node.walk();
    for child in node.children(&mut cursor) {
        if matches!(child.kind(), "string" | "string_fragment") {
            return Some(child);
        }

        if child.child_count() > 0 {
            if let Some(found) = string_literal_node(child) {
                return Some(found);
            }
        }
    }
    None
}

fn trim_string_literal(raw: &str) -> &str {
    raw.trim().trim_matches(['"', '\'', '`'])
}

fn call_target_node<'a>(node: SyntaxNode<'a>) -> Option<SyntaxNode<'a>> {
    if node.kind() == "new_expression" {
        return node
            .child_by_field_name("constructor")
            .or_else(|| node.named_child(0));
    }

    node.child_by_field_name("function")
        .and_then(leftmost_reference_node)
}

fn leftmost_reference_node(node: SyntaxNode) -> Option<SyntaxNode> {
    match node.kind() {
        "identifier" | "property_identifier" | "member_expression" | "subscript_expression" => {
            Some(node)
        }
        _ => node.named_child(0).and_then(leftmost_reference_node),
    }
}

fn reference_name(node: SyntaxNode, source: &[u8]) -> Result<String, Box<dyn std::error::Error>> {
    if node.kind() == "member_expression" {
        if let Some(property) = node.child_by_field_name("property") {
            return Ok(property.utf8_text(source)?.to_string());
        }
    }
    Ok(node.utf8_text(source)?.to_string())
}

fn push_ref(
    unresolved_refs: &mut Vec<UnresolvedRef>,
    from_node_id: &str,
    reference_name: &str,
    reference_kind: &str,
    node: SyntaxNode,
    relative_path: &str,
    language: SourceLanguage,
) {
    if reference_name.is_empty() {
        return;
    }

    let start = node.start_position();
    unresolved_refs.push(UnresolvedRef {
        from_node_id: from_node_id.to_string(),
        reference_name: reference_name.to_string(),
        reference_kind: reference_kind.to_string(),
        line: (start.row + 1) as i64,
        col: start.column as i64,
        file_path: relative_path.to_string(),
        language: language.codegraph_name().to_string(),
    });
}

fn is_pascal_case(name: &str) -> bool {
    name.chars()
        .next()
        .is_some_and(|ch| ch.is_ascii_uppercase())
}

#[derive(Debug)]
struct ExtractedNode {
    id: String,
    kind: String,
    name: String,
    qualified_name: String,
    file_path: String,
    language: String,
    start_line: i64,
    end_line: i64,
    start_column: i64,
    end_column: i64,
    updated_at: i64,
}

impl ExtractedNode {
    fn file(relative_path: &str, content: &str, language: &str) -> Self {
        let end_line = content.lines().count().max(1) as i64;
        Self {
            id: generate_node_id(relative_path, "file", relative_path, 1),
            kind: "file".to_string(),
            name: relative_path.to_string(),
            qualified_name: relative_path.to_string(),
            file_path: relative_path.to_string(),
            language: language.to_string(),
            start_line: 1,
            end_line,
            start_column: 0,
            end_column: 0,
            updated_at: now_ms(),
        }
    }

    fn symbol(
        relative_path: &str,
        kind: &str,
        name: &str,
        node: SyntaxNode,
        language: &str,
    ) -> Self {
        let start = node.start_position();
        let end = node.end_position();
        Self {
            id: generate_node_id(relative_path, kind, name, (start.row + 1) as i64),
            kind: kind.to_string(),
            name: name.to_string(),
            qualified_name: format!("{}::{}", relative_path, name),
            file_path: relative_path.to_string(),
            language: language.to_string(),
            start_line: (start.row + 1) as i64,
            end_line: (end.row + 1) as i64,
            start_column: start.column as i64,
            end_column: end.column as i64,
            updated_at: now_ms(),
        }
    }
}

#[derive(Debug)]
struct ExtractedEdge {
    source: String,
    target: String,
    kind: String,
    line: i64,
    col: i64,
}

#[derive(Debug)]
struct UnresolvedRef {
    from_node_id: String,
    reference_name: String,
    reference_kind: String,
    line: i64,
    col: i64,
    file_path: String,
    language: String,
}

fn insert_nodes(conn: &Connection, nodes: &[ExtractedNode]) -> rusqlite::Result<()> {
    let mut stmt = conn.prepare(
        "INSERT OR REPLACE INTO nodes (
          id, kind, name, qualified_name, file_path, language,
          start_line, end_line, start_column, end_column,
          docstring, signature, visibility,
          is_exported, is_async, is_static, is_abstract,
          decorators, type_parameters, updated_at
        ) VALUES (
          ?1, ?2, ?3, ?4, ?5, ?6,
          ?7, ?8, ?9, ?10,
          NULL, NULL, NULL,
          0, 0, 0, 0,
          NULL, NULL, ?11
        )",
    )?;

    for node in nodes {
        stmt.execute(params![
            node.id,
            node.kind,
            node.name,
            node.qualified_name,
            node.file_path,
            node.language,
            node.start_line,
            node.end_line,
            node.start_column,
            node.end_column,
            node.updated_at,
        ])?;
    }
    Ok(())
}

fn insert_edges(conn: &Connection, edges: &[ExtractedEdge]) -> rusqlite::Result<()> {
    let mut stmt = conn.prepare(
        "INSERT INTO edges (source, target, kind, metadata, line, col, edgeOrigin)
         VALUES (?1, ?2, ?3, NULL, ?4, ?5, NULL)",
    )?;

    for edge in edges {
        stmt.execute(params![
            edge.source,
            edge.target,
            edge.kind,
            edge.line,
            edge.col
        ])?;
    }
    Ok(())
}

fn insert_unresolved_refs(conn: &Connection, refs: &[UnresolvedRef]) -> rusqlite::Result<()> {
    let mut stmt = conn.prepare(
        "INSERT INTO unresolved_refs (
          from_node_id, reference_name, reference_kind, line, col, candidates, file_path, language
        ) VALUES (?1, ?2, ?3, ?4, ?5, NULL, ?6, ?7)",
    )?;

    for reference in refs {
        stmt.execute(params![
            reference.from_node_id,
            reference.reference_name,
            reference.reference_kind,
            reference.line,
            reference.col,
            reference.file_path,
            reference.language,
        ])?;
    }
    Ok(())
}

fn upsert_file(
    conn: &Connection,
    relative_path: &str,
    content: &str,
    metadata: &fs::Metadata,
    language: &str,
    indexed_at: i64,
    node_count: i64,
) -> rusqlite::Result<()> {
    conn.execute(
        "INSERT INTO files (path, content_hash, language, size, modified_at, indexed_at, node_count, errors)
         VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, NULL)
         ON CONFLICT(path) DO UPDATE SET
           content_hash = excluded.content_hash,
           language = excluded.language,
           size = excluded.size,
           modified_at = excluded.modified_at,
           indexed_at = excluded.indexed_at,
           node_count = excluded.node_count,
           errors = excluded.errors",
        params![
            relative_path,
            sha256_hex(content.as_bytes()),
            language,
            metadata.len() as i64,
            modified_ms(metadata),
            indexed_at,
            node_count,
        ],
    )?;
    Ok(())
}

fn relative_slash_path(root: &Path, path: &Path) -> Result<String, Box<dyn std::error::Error>> {
    Ok(path
        .strip_prefix(root)?
        .to_string_lossy()
        .replace(std::path::MAIN_SEPARATOR, "/"))
}

fn modified_ms(metadata: &fs::Metadata) -> i64 {
    metadata
        .modified()
        .ok()
        .and_then(|time| time.duration_since(SystemTime::UNIX_EPOCH).ok())
        .map(|duration| duration.as_millis() as i64)
        .unwrap_or_else(now_ms)
}

fn generate_node_id(file_path: &str, kind: &str, name: &str, line: i64) -> String {
    let input = format!("{}:{}:{}:{}", file_path, kind, name, line);
    format!("{}:{}", kind, &sha256_hex(input.as_bytes())[..32])
}

fn sha256_hex(bytes: &[u8]) -> String {
    let digest = Sha256::digest(bytes);
    digest.iter().map(|byte| format!("{:02x}", byte)).collect()
}

pub fn result_json(result: &IndexResult) -> String {
    let errors = result
        .errors
        .iter()
        .map(|message| {
            format!(
                "{{\"message\":\"{}\",\"severity\":\"error\"}}",
                escape_json(message)
            )
        })
        .collect::<Vec<_>>()
        .join(",");

    format!(
        "{{\"type\":\"result\",\"success\":{},\"filesIndexed\":{},\"filesSkipped\":{},\"filesErrored\":{},\"nodesCreated\":{},\"edgesCreated\":{},\"errors\":[{}],\"durationMs\":{}}}",
        result.success,
        result.files_indexed,
        result.files_skipped,
        result.files_errored,
        result.nodes_created,
        result.edges_created,
        errors,
        result.duration_ms
    )
}

pub fn progress_json(phase: &str, current: u32, total: u32) -> String {
    format!(
        "{{\"type\":\"progress\",\"phase\":\"{}\",\"current\":{},\"total\":{}}}",
        escape_json(phase),
        current,
        total
    )
}

pub fn error_json(message: &str) -> String {
    format!(
        "{{\"type\":\"error\",\"severity\":\"error\",\"message\":\"{}\"}}",
        escape_json(message)
    )
}

fn stamp_schema_version(conn: &Connection) -> rusqlite::Result<()> {
    conn.execute(
        "INSERT OR IGNORE INTO schema_versions (version, applied_at, description) VALUES (?1, ?2, ?3)",
        params![CURRENT_SCHEMA_VERSION, now_ms(), "Initial schema includes all migrations"],
    )?;
    Ok(())
}

fn stamp_metadata(conn: &Connection) -> rusqlite::Result<()> {
    set_metadata(conn, "indexed_with_engine", "rust")?;
    set_metadata(
        conn,
        "indexed_with_engine_version",
        env!("CARGO_PKG_VERSION"),
    )?;
    set_metadata(conn, "indexed_with_version", env!("CARGO_PKG_VERSION"))?;
    set_metadata(
        conn,
        "indexed_with_extraction_version",
        &EXTRACTION_VERSION.to_string(),
    )?;
    Ok(())
}

fn set_metadata(conn: &Connection, key: &str, value: &str) -> rusqlite::Result<()> {
    conn.execute(
        "INSERT INTO project_metadata (key, value, updated_at) VALUES (?1, ?2, ?3)
         ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at",
        params![key, value, now_ms()],
    )?;
    Ok(())
}

fn replace_active_index(temp_path: &Path, index_path: &Path) -> io::Result<()> {
    let backup_path = backup_index_path(index_path);
    if backup_path.exists() {
        fs::remove_file(&backup_path)?;
    }

    if index_path.exists() {
        fs::rename(index_path, &backup_path)?;
    }

    match fs::rename(temp_path, index_path) {
        Ok(()) => {
            if backup_path.exists() {
                fs::remove_file(&backup_path)?;
            }
            Ok(())
        }
        Err(err) => {
            if backup_path.exists() {
                let _ = fs::rename(&backup_path, index_path);
            }
            Err(err)
        }
    }
}

fn temp_index_path(index_path: &Path) -> PathBuf {
    let file_name = index_path
        .file_name()
        .and_then(|name| name.to_str())
        .unwrap_or("zcodegraph.db");
    index_path.with_file_name(format!("{}.rust-tmp-{}", file_name, std::process::id()))
}

fn backup_index_path(index_path: &Path) -> PathBuf {
    let file_name = index_path
        .file_name()
        .and_then(|name| name.to_str())
        .unwrap_or("zcodegraph.db");
    index_path.with_file_name(format!("{}.rust-backup-{}", file_name, std::process::id()))
}

fn cleanup_sqlite_sidecars(path: &Path) {
    for suffix in ["-wal", "-shm"] {
        let sidecar = PathBuf::from(format!("{}{}", path.display(), suffix));
        let _ = fs::remove_file(sidecar);
    }
}

fn now_ms() -> i64 {
    SystemTime::now()
        .duration_since(SystemTime::UNIX_EPOCH)
        .unwrap_or(Duration::from_secs(0))
        .as_millis() as i64
}

struct ProjectLock {
    path: PathBuf,
}

impl ProjectLock {
    fn acquire(path: &Path) -> io::Result<Self> {
        if let Some(parent) = path.parent() {
            fs::create_dir_all(parent)?;
        }

        match create_lock_file(path) {
            Ok(mut file) => {
                use std::io::Write;
                write!(file, "{}", std::process::id())?;
                Ok(Self {
                    path: path.to_path_buf(),
                })
            }
            Err(err) if err.kind() == io::ErrorKind::AlreadyExists => {
                if remove_stale_lock(path)? {
                    let mut file = create_lock_file(path)?;
                    use std::io::Write;
                    write!(file, "{}", std::process::id())?;
                    return Ok(Self {
                        path: path.to_path_buf(),
                    });
                }

                Err(io::Error::new(
                    io::ErrorKind::AlreadyExists,
                    format!(
                        "CodeGraph database is locked by another process. If this is stale, delete {}",
                        path.display()
                    ),
                ))
            }
            Err(err) => Err(err),
        }
    }
}

fn create_lock_file(path: &Path) -> io::Result<fs::File> {
    fs::OpenOptions::new()
        .write(true)
        .create_new(true)
        .open(path)
}

fn remove_stale_lock(path: &Path) -> io::Result<bool> {
    let Ok(raw) = fs::read_to_string(path) else {
        return Ok(false);
    };
    let Ok(pid) = raw.trim().parse::<u32>() else {
        return Ok(false);
    };
    if pid_is_running(pid) {
        return Ok(false);
    }
    fs::remove_file(path)?;
    Ok(true)
}

#[cfg(unix)]
fn pid_is_running(pid: u32) -> bool {
    let result = unsafe { libc::kill(pid as libc::pid_t, 0) };
    if result == 0 {
        return true;
    }
    std::io::Error::last_os_error()
        .raw_os_error()
        .is_some_and(|code| code != libc::ESRCH)
}

#[cfg(not(unix))]
fn pid_is_running(_pid: u32) -> bool {
    true
}

impl Drop for ProjectLock {
    fn drop(&mut self) {
        let _ = fs::remove_file(&self.path);
    }
}

fn escape_json(input: &str) -> String {
    let mut out = String::with_capacity(input.len());
    for ch in input.chars() {
        match ch {
            '"' => out.push_str("\\\""),
            '\\' => out.push_str("\\\\"),
            '\n' => out.push_str("\\n"),
            '\r' => out.push_str("\\r"),
            '\t' => out.push_str("\\t"),
            c if c.is_control() => out.push_str(&format!("\\u{:04x}", c as u32)),
            c => out.push(c),
        }
    }
    out
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::env;

    fn temp_dir(name: &str) -> PathBuf {
        let dir = env::temp_dir().join(format!(
            "zcodegraph-core-{}-{}",
            name,
            SystemTime::now()
                .duration_since(SystemTime::UNIX_EPOCH)
                .unwrap()
                .as_nanos()
        ));
        fs::create_dir_all(&dir).unwrap();
        dir
    }

    #[test]
    fn emits_machine_readable_progress_json() {
        assert_eq!(
            progress_json("scanning", 0, 1),
            "{\"type\":\"progress\",\"phase\":\"scanning\",\"current\":0,\"total\":1}"
        );
    }

    #[test]
    fn emits_machine_readable_result_json() {
        let result = IndexResult {
            success: true,
            files_indexed: 0,
            files_skipped: 0,
            files_errored: 0,
            nodes_created: 0,
            edges_created: 0,
            duration_ms: 7,
            errors: Vec::new(),
        };

        assert_eq!(
            result_json(&result),
            "{\"type\":\"result\",\"success\":true,\"filesIndexed\":0,\"filesSkipped\":0,\"filesErrored\":0,\"nodesCreated\":0,\"edgesCreated\":0,\"errors\":[],\"durationMs\":7}"
        );
    }

    #[test]
    fn escapes_error_messages_as_json_strings() {
        assert_eq!(
            error_json("bad \"path\"\nnext"),
            "{\"type\":\"error\",\"severity\":\"error\",\"message\":\"bad \\\"path\\\"\\nnext\"}"
        );
    }

    #[test]
    fn project_lock_rejects_a_second_writer() {
        let dir = temp_dir("lock");
        let lock_path = dir.join(".zcodegraph").join("zcodegraph.lock");
        let first = ProjectLock::acquire(&lock_path).unwrap();

        let second = ProjectLock::acquire(&lock_path);
        assert!(second.is_err());

        drop(first);
        assert!(ProjectLock::acquire(&lock_path).is_ok());
        fs::remove_dir_all(dir).unwrap();
    }
}
