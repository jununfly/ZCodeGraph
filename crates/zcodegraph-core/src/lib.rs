use rusqlite::{params, Connection};
use serde::{Deserialize, Serialize};
use serde_json::Value;
use sha2::{Digest, Sha256};
use std::borrow::Cow;
use std::collections::{BTreeMap, HashMap, HashSet};
use std::fs;
use std::io;
use std::path::{Path, PathBuf};
use std::time::{Duration, Instant, SystemTime};
use tree_sitter::{Node as SyntaxNode, Parser, TreeCursor};

#[cfg(feature = "dhat")]
#[global_allocator]
static ALLOCATOR: dhat::Alloc = dhat::Alloc;

const SCHEMA_SQL: &str = include_str!("../../../src/db/schema.sql");
const CURRENT_SCHEMA_VERSION: i64 = 4;
const EXTRACTION_VERSION: i64 = 1;
const IMPORT_FALLBACK_SAMPLE_PER_BUCKET_CAP: usize = 100;
const IMPORT_FALLBACK_SAMPLE_TOTAL_CAP: usize = 2000;
const ESM_OVERLOAD_IMPLEMENTATION_RESOLVED_BY: &str =
    "rust-esm-named-import-export-overload-implementation";
const ESM_VALUE_TOKEN_INTERFACE_RESOLVED_BY: &str = "rust-esm-value-token-interface";

#[cfg(feature = "dhat")]
pub type HeapProfilerGuard = dhat::Profiler;

#[cfg(not(feature = "dhat"))]
pub type HeapProfilerGuard = ();

#[cfg(feature = "dhat")]
pub fn start_heap_profiler(project_path: &str) -> Result<Option<HeapProfilerGuard>, String> {
    match std::env::var("ZCODEGRAPH_PROFILING") {
        Ok(value) if value == "heap" => {
            let experiment_id =
                std::env::var("ZCODEGRAPH_EXPERIMENT_ID").unwrap_or_else(|_| "manual".to_string());
            let report_path = Path::new(project_path)
                .join(".workbuddy")
                .join("profiling")
                .join(experiment_id)
                .join("dhat-heap.json");
            if let Some(parent) = report_path.parent() {
                fs::create_dir_all(parent)
                    .map_err(|err| format!("failed to create heap profiling directory: {}", err))?;
            }
            Ok(Some(
                dhat::Profiler::builder()
                    .file_name(report_path.to_string_lossy().as_ref())
                    .build(),
            ))
        }
        Ok(value) if value.trim().is_empty() => Ok(None),
        Ok(value) => Err(format!(
            "unsupported profiling mode: {}. Supported modes: heap",
            value
        )),
        Err(std::env::VarError::NotPresent) => Ok(None),
        Err(err) => Err(format!("failed to read ZCODEGRAPH_PROFILING: {}", err)),
    }
}

#[cfg(not(feature = "dhat"))]
pub fn start_heap_profiler(_project_path: &str) -> Result<Option<HeapProfilerGuard>, String> {
    match std::env::var("ZCODEGRAPH_PROFILING") {
        Ok(value) if value == "heap" => {
            Err("heap profiling requires building zcodegraph-core with --features dhat".to_string())
        }
        Ok(value) if value.trim().is_empty() => Ok(None),
        Ok(value) => Err(format!(
            "unsupported profiling mode: {}. Supported modes: heap",
            value
        )),
        Err(std::env::VarError::NotPresent) => Ok(None),
        Err(err) => Err(format!("failed to read ZCODEGRAPH_PROFILING: {}", err)),
    }
}

#[derive(Debug, Clone, PartialEq, Eq)]
pub struct IndexRequest {
    pub engine: String,
    pub project_path: String,
    pub index_path: String,
    pub force: bool,
    pub verbose: bool,
    pub graph_work_profile: GraphWorkProfile,
    pub sqlite_write_mode: SqliteWriteMode,
    pub parse_walker_diagnostics: bool,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum GraphWorkProfile {
    Full,
    MatchedTsJs,
}

impl Default for GraphWorkProfile {
    fn default() -> Self {
        GraphWorkProfile::Full
    }
}

impl GraphWorkProfile {
    pub fn parse(value: &str) -> Result<Self, String> {
        match value {
            "full" => Ok(GraphWorkProfile::Full),
            "matched-ts-js" => Ok(GraphWorkProfile::MatchedTsJs),
            other => Err(format!(
                "unsupported graph work profile: {}. Supported profiles: full, matched-ts-js",
                other
            )),
        }
    }

    fn features(self) -> GraphWorkFeatures {
        match self {
            GraphWorkProfile::Full => GraphWorkFeatures {
                component_detection: true,
                constant_extraction: true,
                field_extraction: true,
                export_extraction: true,
                aggressive_call_extraction: true,
            },
            GraphWorkProfile::MatchedTsJs => GraphWorkFeatures {
                component_detection: false,
                constant_extraction: false,
                field_extraction: false,
                export_extraction: false,
                aggressive_call_extraction: false,
            },
        }
    }
}

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum SqliteWriteMode {
    Disk,
    FinalFlush,
    MemoryFinalFlush,
}

impl Default for SqliteWriteMode {
    fn default() -> Self {
        SqliteWriteMode::FinalFlush
    }
}

impl SqliteWriteMode {
    pub fn parse(value: &str) -> Result<Self, String> {
        match value {
            "disk" => Ok(SqliteWriteMode::Disk),
            "final-flush" => Ok(SqliteWriteMode::FinalFlush),
            "memory-final-flush" => Ok(SqliteWriteMode::MemoryFinalFlush),
            other => Err(format!(
                "unsupported SQLite write mode: {}. Supported modes: disk, final-flush, memory-final-flush",
                other
            )),
        }
    }
}

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
struct GraphWorkFeatures {
    component_detection: bool,
    constant_extraction: bool,
    field_extraction: bool,
    export_extraction: bool,
    aggressive_call_extraction: bool,
}

#[derive(Debug, Clone, PartialEq, Eq)]
pub struct IndexError {
    pub message: String,
    pub file_path: Option<String>,
    pub language: Option<String>,
    pub severity: String,
    pub code: Option<String>,
    pub written_by_rust: Option<bool>,
}

impl IndexError {
    fn system(message: String) -> Self {
        Self {
            message,
            file_path: None,
            language: None,
            severity: "error".to_string(),
            code: None,
            written_by_rust: None,
        }
    }

    fn rust_owned_parse_gap(file_path: String, language: String) -> Self {
        Self {
            message: "parse error".to_string(),
            file_path: Some(file_path),
            language: Some(language),
            severity: "warning".to_string(),
            code: Some("rust-owned-parse-gap".to_string()),
            written_by_rust: Some(false),
        }
    }
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
    pub profile: IndexProfile,
    pub errors: Vec<IndexError>,
}

#[derive(Debug, Clone, Default, PartialEq, Eq)]
pub struct IndexProfile {
    pub source_scan_ms: u128,
    pub parse_extraction_ms: u128,
    pub parse_source_read_ms: u128,
    pub parse_normalization_ms: u128,
    pub parse_parser_setup_ms: u128,
    pub parse_tree_sitter_ms: u128,
    pub parse_ast_extraction_ms: u128,
    pub parse_error_handling_ms: u128,
    pub parse_by_language: BTreeMap<String, ParseLanguageProfile>,
    pub parse_ast_walker: BTreeMap<String, ParseAstWalkerProfile>,
    pub sqlite_write_ms: u128,
    pub import_path_alias_resolution_ms: u128,
    pub import_path_alias_resolved_refs: u32,
    pub import_path_alias_fallback_refs: u32,
    pub import_path_alias_binding_fallback_refs: u32,
    pub import_path_alias_unsupported_fallback_refs: u32,
    pub import_path_alias_unresolved_fallback_refs: u32,
    pub import_path_alias_relative_resolved_refs: u32,
    pub import_path_alias_tsconfig_resolved_refs: u32,
    pub import_path_alias_conventional_alias_resolved_refs: u32,
    pub import_path_alias_workspace_resolved_refs: u32,
    pub import_path_alias_root_dirs_resolved_refs: u32,
    pub import_path_alias_package_self_name_resolved_refs: u32,
    pub import_path_alias_package_imports_resolved_refs: u32,
    pub import_path_alias_relative_fallback_refs: u32,
    pub import_path_alias_tsconfig_fallback_refs: u32,
    pub import_path_alias_conventional_alias_fallback_refs: u32,
    pub import_path_alias_workspace_fallback_refs: u32,
    pub import_path_alias_root_dirs_fallback_refs: u32,
    pub import_path_alias_package_self_name_fallback_refs: u32,
    pub import_path_alias_package_imports_fallback_refs: u32,
    pub import_path_alias_package_self_name_outcome_counts: BTreeMap<String, u32>,
    pub import_path_alias_package_imports_outcome_counts: BTreeMap<String, u32>,
    pub import_path_alias_fallback_sample_counts: BTreeMap<String, u32>,
    pub import_path_alias_fallback_samples: Vec<ImportFallbackSample>,
    pub import_path_alias_fallback_sample_cap: ImportFallbackSampleCap,
    pub local_exact_reference_resolution_ms: u128,
    pub local_exact_reference_resolved_refs: u32,
    pub local_exact_reference_fallback_refs: u32,
    pub esm_named_import_export_resolution_ms: u128,
    pub esm_named_import_export_resolved_refs: u32,
    pub esm_named_import_export_fallback_refs: u32,
    pub esm_one_hop_reexport_resolved_refs: u32,
    pub esm_named_import_export_overload_implementation_resolved_refs: u32,
    pub esm_named_import_export_fallback_sample_counts: BTreeMap<String, u32>,
    pub esm_named_import_export_fallback_samples: Vec<EsmNamedFallbackSample>,
    pub esm_named_import_export_fallback_sample_cap: ImportFallbackSampleCap,
    pub esm_named_import_export_edge_write_attempted_refs: u32,
    pub esm_named_import_export_edge_write_written_refs: u32,
    pub esm_named_import_export_edge_write_skipped_refs: u32,
    pub esm_named_import_export_edge_write_skipped_counts: BTreeMap<String, u32>,
    pub esm_named_import_export_edge_write_skipped_samples: Vec<EsmNamedFallbackSample>,
    pub esm_named_import_export_edge_write_skipped_sample_cap: ImportFallbackSampleCap,
    pub module_resolution_shadow_decision_refs: u32,
    pub module_resolution_shadow_decision_counts: BTreeMap<String, u32>,
    pub module_resolution_shadow_parity_counts: BTreeMap<String, u32>,
    pub module_resolution_declaration_target_relationship_counts: BTreeMap<String, u32>,
    pub module_resolution_declaration_runtime_pairing_decision_counts: BTreeMap<String, u32>,
    pub module_resolution_shadow_samples: Vec<ModuleResolutionDecisionRecord>,
    pub module_resolution_shadow_sample_cap: ImportFallbackSampleCap,
    pub module_resolution_effective_mode_source: String,
    pub module_resolution_guarded_edge_write_attempted_refs: u32,
    pub module_resolution_guarded_edge_write_written_refs: u32,
    pub module_resolution_guarded_edge_write_skipped_refs: u32,
    pub module_resolution_guarded_edge_write_skipped_counts: BTreeMap<String, u32>,
    pub module_resolution_declaration_runtime_edge_write_attempted_refs: u32,
    pub module_resolution_declaration_runtime_edge_write_written_refs: u32,
    pub module_resolution_declaration_runtime_edge_write_skipped_refs: u32,
    pub module_resolution_declaration_runtime_edge_write_skipped_counts: BTreeMap<String, u32>,
}

#[derive(Debug, Clone, Default, PartialEq, Eq)]
pub struct ParseAstWalkerProfile {
    pub visits: u32,
    pub named_symbol_checks: u32,
    pub statement_ref_checks: u32,
    pub child_traversals: u32,
}

#[derive(Debug, Clone, Default, PartialEq, Eq)]
pub struct ParseLanguageProfile {
    pub files: u32,
    pub parse_extraction_ms: u128,
    pub source_read_ms: u128,
    pub normalization_ms: u128,
    pub parser_setup_ms: u128,
    pub tree_sitter_ms: u128,
    pub ast_extraction_ms: u128,
    pub error_handling_ms: u128,
}

impl IndexProfile {
    fn parse_language_entry(&mut self, language: &str) -> &mut ParseLanguageProfile {
        self.parse_by_language
            .entry(language.to_string())
            .or_default()
    }

    fn add_parse_language_file(&mut self, language: &str, ms: u128) {
        let entry = self.parse_language_entry(language);
        entry.files += 1;
        entry.parse_extraction_ms += ms;
    }

    fn add_parse_language_source_read(&mut self, language: &str, ms: u128) {
        self.parse_language_entry(language).source_read_ms += ms;
    }

    fn add_parse_language_normalization(&mut self, language: &str, ms: u128) {
        self.parse_language_entry(language).normalization_ms += ms;
    }

    fn add_parse_language_parser_setup(&mut self, language: &str, ms: u128) {
        self.parse_language_entry(language).parser_setup_ms += ms;
    }

    fn add_parse_language_tree_sitter(&mut self, language: &str, ms: u128) {
        self.parse_language_entry(language).tree_sitter_ms += ms;
    }

    fn add_parse_language_ast_extraction(&mut self, language: &str, ms: u128) {
        self.parse_language_entry(language).ast_extraction_ms += ms;
    }

    fn add_parse_language_error_handling(&mut self, language: &str, ms: u128) {
        self.parse_language_entry(language).error_handling_ms += ms;
    }
}

#[derive(Debug, Clone, Default, PartialEq, Eq)]
pub struct ImportFallbackSample {
    pub source_kind: String,
    pub reason: String,
    pub reference_name: String,
    pub file_path: String,
    pub language: String,
    pub line: i64,
    pub col: i64,
    pub target_kind: Option<String>,
    pub target_extension: Option<String>,
}

#[derive(Debug, Clone, Default, PartialEq, Eq)]
pub struct EsmNamedFallbackSample {
    pub reason: String,
    pub reference_name: String,
    pub reference_kind: String,
    pub file_path: String,
    pub language: String,
    pub line: i64,
    pub col: i64,
    pub target_file_path: Option<String>,
    pub candidate_kind: Option<String>,
    pub candidate_count: Option<usize>,
    pub resolved_by_attempt: Option<String>,
    pub candidate_line_ranges: Option<Vec<CandidateDeclarationDiagnostic>>,
}

#[derive(Debug, Clone, Default, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ModuleResolutionCompilerOptionsSummary {
    pub module_resolution: Option<String>,
    pub module_resolution_source: Option<String>,
    pub module: Option<String>,
    pub base_url: Option<String>,
    pub paths: BTreeMap<String, Vec<String>>,
    pub root_dirs: Vec<String>,
    pub custom_conditions: Vec<String>,
    pub allow_js: Option<bool>,
    pub resolve_json_module: Option<bool>,
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ModuleResolutionRequest {
    pub specifier: String,
    pub source_file: String,
    pub language: String,
    pub import_kind: String,
    pub nearest_config_path: Option<String>,
    pub compiler_options: ModuleResolutionCompilerOptionsSummary,
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ModuleResolutionDecisionRecord {
    pub specifier: String,
    pub source_file: String,
    pub module_resolution_mode: String,
    pub module_resolution_mode_source: String,
    pub resolved_kind: String,
    pub resolved_path: Option<String>,
    pub is_external_library_import: bool,
    pub failed_lookup_category: Option<String>,
    pub condition_set: Vec<String>,
    pub matched_condition: Option<String>,
    pub parity_status: String,
    pub fallback_reason: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none", default)]
    pub declaration_target_relationship: Option<DeclarationTargetRelationshipDiagnostic>,
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct DeclarationTargetRelationshipDiagnostic {
    pub target_kind: String,
    pub runtime_sibling_status: String,
    pub runtime_sibling_candidates: Vec<String>,
    pub candidate_count: usize,
    pub truncated: bool,
    #[serde(skip_serializing_if = "Option::is_none", default)]
    pub pairing_decision: Option<DeclarationRuntimePairingDecision>,
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct DeclarationRuntimePairingDecision {
    pub status: String,
    #[serde(skip_serializing_if = "Option::is_none", default)]
    pub runtime_target: Option<String>,
    pub reason: String,
}

#[derive(Debug, Clone, Default, PartialEq, Eq)]
pub struct CandidateDeclarationDiagnostic {
    pub kind: String,
    pub start_line: i64,
    pub end_line: i64,
    pub has_body: Option<bool>,
    pub declaration_form: Option<String>,
    pub metadata_source: String,
}

#[derive(Debug, Clone, PartialEq, Eq)]
pub struct ImportFallbackSampleCap {
    pub per_bucket: usize,
    pub total: usize,
    pub truncated: bool,
}

impl Default for ImportFallbackSampleCap {
    fn default() -> Self {
        Self {
            per_bucket: IMPORT_FALLBACK_SAMPLE_PER_BUCKET_CAP,
            total: IMPORT_FALLBACK_SAMPLE_TOTAL_CAP,
            truncated: false,
        }
    }
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
            profile: counts.profile,
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
                profile: IndexProfile::default(),
                errors: vec![IndexError::system(err.to_string())],
            };
        }
    }
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
struct NameMatcherBatchRequest {
    version: u8,
    #[serde(default)]
    candidate_table: std::collections::HashMap<String, NodeFact>,
    references: Vec<NameMatcherReference>,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
struct NameMatcherReference {
    key: String,
    #[serde(rename = "ref")]
    ref_data: UnresolvedReferenceFact,
    #[serde(default)]
    candidates: NameMatcherCandidateSet,
    #[serde(default)]
    candidate_ids: Option<NameMatcherCandidateIdSet>,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
struct UnresolvedReferenceFact {
    reference_name: String,
    reference_kind: String,
    file_path: String,
    language: String,
    line: u32,
}

#[derive(Debug, Default, Deserialize)]
#[serde(rename_all = "camelCase")]
struct NameMatcherCandidateSet {
    by_name: Vec<NodeFact>,
    by_qualified_name: Vec<NodeFact>,
    by_leaf_name: Vec<NodeFact>,
    by_lower_name: Vec<NodeFact>,
    by_file_name: Vec<NodeFact>,
    class_candidates: Vec<NodeFact>,
    capitalized_class_candidates: Vec<NodeFact>,
    method_candidates: Vec<NodeFact>,
    nodes_in_files: std::collections::HashMap<String, Vec<NodeFact>>,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
struct NameMatcherCandidateIdSet {
    by_name: Vec<String>,
    by_qualified_name: Vec<String>,
    by_leaf_name: Vec<String>,
    by_lower_name: Vec<String>,
    by_file_name: Vec<String>,
    class_candidates: Vec<String>,
    capitalized_class_candidates: Vec<String>,
    method_candidates: Vec<String>,
    nodes_in_files: std::collections::HashMap<String, Vec<String>>,
}

#[derive(Debug, Clone, Deserialize)]
#[serde(rename_all = "camelCase")]
struct NodeFact {
    id: String,
    kind: String,
    name: String,
    qualified_name: String,
    file_path: String,
    language: String,
    start_line: u32,
    is_exported: Option<bool>,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
struct NameMatcherBatchResponse {
    r#type: &'static str,
    version: u8,
    decisions: Vec<NameMatcherDecision>,
    diagnostics: NameMatcherDiagnostics,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
struct NameMatcherDecision {
    key: String,
    target_node_id: Option<String>,
    confidence: f64,
    resolved_by: Option<&'static str>,
    fallback_reason: Option<&'static str>,
}

#[derive(Debug, Default, Serialize)]
#[serde(rename_all = "camelCase")]
struct NameMatcherDiagnostics {
    rust_matcher_ms: u128,
    rust_matcher_startup_ms: u128,
    rust_matcher_eligible_refs: usize,
    rust_matcher_handled_refs: usize,
    rust_matcher_fallback_refs: usize,
    rust_matcher_semantic_mismatch_refs: usize,
    rust_matcher_fallback_reasons: std::collections::BTreeMap<String, usize>,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
struct CandidateProducerRequest {
    version: u8,
    index_path: String,
    lookups: Vec<CandidateProducerLookup>,
}

#[derive(Debug, Deserialize)]
#[serde(
    tag = "kind",
    rename_all = "PascalCase",
    rename_all_fields = "camelCase"
)]
enum CandidateProducerLookup {
    ExactName { name: String },
    LowerName { lower_name: String },
    QualifiedName { qualified_name: String },
    FileNodes { file_path: String },
    KnownNamePresence { name: String },
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
struct CandidateProducerResponse {
    r#type: &'static str,
    version: u8,
    results: Vec<CandidateProducerResult>,
    diagnostics: CandidateProducerDiagnostics,
}

#[derive(Debug, Serialize)]
#[serde(
    tag = "kind",
    rename_all = "PascalCase",
    rename_all_fields = "camelCase"
)]
enum CandidateProducerResult {
    ExactName {
        name: String,
        candidate_ids: Vec<String>,
    },
    LowerName {
        lower_name: String,
        candidate_ids: Vec<String>,
    },
    QualifiedName {
        qualified_name: String,
        candidate_ids: Vec<String>,
    },
    FileNodes {
        file_path: String,
        candidate_ids: Vec<String>,
    },
    KnownNamePresence {
        name: String,
        present: bool,
    },
}

#[derive(Debug, Default, Serialize)]
#[serde(rename_all = "camelCase")]
struct CandidateProducerDiagnostics {
    producer_ms: u128,
    lookup_count: usize,
    exact_name_count: usize,
    lower_name_count: usize,
    qualified_name_count: usize,
    file_nodes_count: usize,
    known_name_presence_count: usize,
    candidate_count: usize,
}

pub fn candidate_producer_json(input: &str) -> Result<String, String> {
    let started = Instant::now();
    let request: CandidateProducerRequest = serde_json::from_str(input)
        .map_err(|err| format!("invalid produce-candidates request: {}", err))?;
    if request.version != 1 {
        return Err(format!(
            "unsupported produce-candidates request version: {}",
            request.version
        ));
    }

    let conn = Connection::open(&request.index_path)
        .map_err(|err| format!("failed to open candidate producer index: {}", err))?;
    conn.pragma_update(None, "query_only", "ON")
        .map_err(|err| format!("failed to configure candidate producer index: {}", err))?;

    let mut exact_stmt = conn
        .prepare("SELECT id FROM nodes WHERE name = ?1 ORDER BY rowid")
        .map_err(|err| format!("failed to prepare exact-name lookup: {}", err))?;
    let mut lower_stmt = conn
        .prepare("SELECT id FROM nodes WHERE lower(name) = ?1 ORDER BY rowid")
        .map_err(|err| format!("failed to prepare lower-name lookup: {}", err))?;
    let mut qualified_stmt = conn
        .prepare("SELECT id FROM nodes WHERE qualified_name = ?1 ORDER BY rowid")
        .map_err(|err| format!("failed to prepare qualified-name lookup: {}", err))?;
    let mut file_nodes_stmt = conn
        .prepare("SELECT id FROM nodes WHERE file_path = ?1 ORDER BY rowid")
        .map_err(|err| format!("failed to prepare file-nodes lookup: {}", err))?;
    let mut presence_stmt = conn
        .prepare("SELECT 1 FROM nodes WHERE name = ?1 LIMIT 1")
        .map_err(|err| format!("failed to prepare known-name lookup: {}", err))?;

    let mut diagnostics = CandidateProducerDiagnostics {
        lookup_count: request.lookups.len(),
        ..CandidateProducerDiagnostics::default()
    };
    let mut results = Vec::with_capacity(request.lookups.len());

    for lookup in request.lookups {
        match lookup {
            CandidateProducerLookup::ExactName { name } => {
                diagnostics.exact_name_count += 1;
                let candidate_ids = exact_stmt
                    .query_map(params![name], |row| row.get::<_, String>(0))
                    .map_err(|err| format!("failed to query exact-name candidates: {}", err))?
                    .collect::<rusqlite::Result<Vec<_>>>()
                    .map_err(|err| format!("failed to read exact-name candidates: {}", err))?;
                diagnostics.candidate_count += candidate_ids.len();
                results.push(CandidateProducerResult::ExactName {
                    name,
                    candidate_ids,
                });
            }
            CandidateProducerLookup::LowerName { lower_name } => {
                diagnostics.lower_name_count += 1;
                let candidate_ids = lower_stmt
                    .query_map(params![lower_name], |row| row.get::<_, String>(0))
                    .map_err(|err| format!("failed to query lower-name candidates: {}", err))?
                    .collect::<rusqlite::Result<Vec<_>>>()
                    .map_err(|err| format!("failed to read lower-name candidates: {}", err))?;
                diagnostics.candidate_count += candidate_ids.len();
                results.push(CandidateProducerResult::LowerName {
                    lower_name,
                    candidate_ids,
                });
            }
            CandidateProducerLookup::QualifiedName { qualified_name } => {
                diagnostics.qualified_name_count += 1;
                let candidate_ids = qualified_stmt
                    .query_map(params![qualified_name], |row| row.get::<_, String>(0))
                    .map_err(|err| format!("failed to query qualified-name candidates: {}", err))?
                    .collect::<rusqlite::Result<Vec<_>>>()
                    .map_err(|err| format!("failed to read qualified-name candidates: {}", err))?;
                diagnostics.candidate_count += candidate_ids.len();
                results.push(CandidateProducerResult::QualifiedName {
                    qualified_name,
                    candidate_ids,
                });
            }
            CandidateProducerLookup::FileNodes { file_path } => {
                diagnostics.file_nodes_count += 1;
                let candidate_ids = file_nodes_stmt
                    .query_map(params![file_path], |row| row.get::<_, String>(0))
                    .map_err(|err| format!("failed to query file-nodes candidates: {}", err))?
                    .collect::<rusqlite::Result<Vec<_>>>()
                    .map_err(|err| format!("failed to read file-nodes candidates: {}", err))?;
                diagnostics.candidate_count += candidate_ids.len();
                results.push(CandidateProducerResult::FileNodes {
                    file_path,
                    candidate_ids,
                });
            }
            CandidateProducerLookup::KnownNamePresence { name } => {
                diagnostics.known_name_presence_count += 1;
                let present = presence_stmt
                    .exists(params![name])
                    .map_err(|err| format!("failed to query known-name presence: {}", err))?;
                results.push(CandidateProducerResult::KnownNamePresence { name, present });
            }
        }
    }

    diagnostics.producer_ms = started.elapsed().as_millis();

    serde_json::to_string(&CandidateProducerResponse {
        r#type: "candidate_producer_result",
        version: 1,
        results,
        diagnostics,
    })
    .map_err(|err| format!("failed to encode candidate producer response: {}", err))
}

pub fn match_name_json(input: &str) -> Result<String, String> {
    let started = Instant::now();
    let mut request: NameMatcherBatchRequest = serde_json::from_str(input)
        .map_err(|err| format!("invalid match-name request: {}", err))?;
    if request.version != 1 {
        return Err(format!(
            "unsupported match-name request version: {}",
            request.version
        ));
    }
    materialize_candidate_tables(&mut request)?;

    let mut diagnostics = NameMatcherDiagnostics {
        rust_matcher_eligible_refs: request.references.len(),
        ..NameMatcherDiagnostics::default()
    };
    let mut decisions = Vec::with_capacity(request.references.len());
    for reference in &request.references {
        match match_reference_fact(reference) {
            Some(decision) => {
                diagnostics.rust_matcher_handled_refs += 1;
                decisions.push(decision);
            }
            None => {
                let fallback_reason = fallback_reason(reference);
                diagnostics.rust_matcher_fallback_refs += 1;
                *diagnostics
                    .rust_matcher_fallback_reasons
                    .entry(fallback_reason.to_string())
                    .or_insert(0) += 1;
                decisions.push(NameMatcherDecision {
                    key: reference.key.clone(),
                    target_node_id: None,
                    confidence: 0.0,
                    resolved_by: None,
                    fallback_reason: Some(fallback_reason),
                });
            }
        }
    }
    diagnostics.rust_matcher_ms = started.elapsed().as_millis();

    serde_json::to_string(&NameMatcherBatchResponse {
        r#type: "name_match_result",
        version: 1,
        decisions,
        diagnostics,
    })
    .map_err(|err| format!("failed to encode match-name response: {}", err))
}

fn materialize_candidate_tables(request: &mut NameMatcherBatchRequest) -> Result<(), String> {
    if request.candidate_table.is_empty() {
        return Ok(());
    }
    for reference in &mut request.references {
        let Some(candidate_ids) = reference.candidate_ids.as_ref() else {
            continue;
        };
        reference.candidates = candidate_ids.materialize(&request.candidate_table)?;
    }
    Ok(())
}

impl NameMatcherCandidateIdSet {
    fn materialize(
        &self,
        table: &std::collections::HashMap<String, NodeFact>,
    ) -> Result<NameMatcherCandidateSet, String> {
        let nodes = |ids: &[String]| -> Result<Vec<NodeFact>, String> {
            ids.iter()
                .map(|id| {
                    table
                        .get(id)
                        .cloned()
                        .ok_or_else(|| format!("candidate id not found in table: {}", id))
                })
                .collect()
        };

        let mut nodes_in_files = std::collections::HashMap::new();
        for (file_path, ids) in &self.nodes_in_files {
            nodes_in_files.insert(file_path.clone(), nodes(ids)?);
        }

        Ok(NameMatcherCandidateSet {
            by_name: nodes(&self.by_name)?,
            by_qualified_name: nodes(&self.by_qualified_name)?,
            by_leaf_name: nodes(&self.by_leaf_name)?,
            by_lower_name: nodes(&self.by_lower_name)?,
            by_file_name: nodes(&self.by_file_name)?,
            class_candidates: nodes(&self.class_candidates)?,
            capitalized_class_candidates: nodes(&self.capitalized_class_candidates)?,
            method_candidates: nodes(&self.method_candidates)?,
            nodes_in_files,
        })
    }
}

fn fallback_reason(reference: &NameMatcherReference) -> &'static str {
    if reference.ref_data.reference_name.trim().is_empty() {
        return "unsupported-reference-shape";
    }
    if !matches!(
        reference.ref_data.reference_kind.as_str(),
        "calls" | "references" | "imports" | "instantiates" | "decorates"
    ) {
        return "outside-matcher-boundary";
    }
    if candidate_fact_count(&reference.candidates) == 0 {
        return "missing-candidate-facts";
    }
    "rust-unresolved"
}

fn candidate_fact_count(candidates: &NameMatcherCandidateSet) -> usize {
    candidates.by_name.len()
        + candidates.by_qualified_name.len()
        + candidates.by_leaf_name.len()
        + candidates.by_lower_name.len()
        + candidates.by_file_name.len()
        + candidates.class_candidates.len()
        + candidates.capitalized_class_candidates.len()
        + candidates.method_candidates.len()
        + candidates
            .nodes_in_files
            .values()
            .map(Vec::len)
            .sum::<usize>()
}

fn match_reference_fact(reference: &NameMatcherReference) -> Option<NameMatcherDecision> {
    match_by_file_path(reference)
        .or_else(|| match_by_qualified_name(reference))
        .or_else(|| match_method_call(reference))
        .or_else(|| match_by_exact_name(reference))
        .or_else(|| match_fuzzy(reference))
}

fn match_by_file_path(reference: &NameMatcherReference) -> Option<NameMatcherDecision> {
    let name = reference.ref_data.reference_name.as_str();
    if !name.contains('/') && !looks_like_short_extension(name) {
        return None;
    }
    let file_name = name.rsplit('/').next()?;
    let file_nodes: Vec<&NodeFact> = reference
        .candidates
        .by_file_name
        .iter()
        .filter(|node| node.kind == "file" && node.name == file_name)
        .collect();
    if file_nodes.is_empty() {
        return None;
    }
    if let Some(node) = file_nodes
        .iter()
        .copied()
        .find(|node| node.qualified_name == name || node.file_path == name)
    {
        return Some(decision(reference, node, 0.95, "file-path"));
    }
    let suffix_matches: Vec<&NodeFact> = file_nodes
        .iter()
        .copied()
        .filter(|node| node.qualified_name.ends_with(name) || node.file_path.ends_with(name))
        .collect();
    if !suffix_matches.is_empty() {
        let best = pick_closest_file_node(&suffix_matches, &reference.ref_data);
        return Some(decision(reference, best, 0.85, "file-path"));
    }
    if file_nodes.len() == 1 {
        return Some(decision(reference, file_nodes[0], 0.7, "file-path"));
    }
    None
}

fn match_by_qualified_name(reference: &NameMatcherReference) -> Option<NameMatcherDecision> {
    let name = reference.ref_data.reference_name.as_str();
    if !name.contains("::") && !name.contains('.') {
        return None;
    }
    if reference.candidates.by_qualified_name.len() == 1 {
        return Some(decision(
            reference,
            &reference.candidates.by_qualified_name[0],
            0.95,
            "qualified-name",
        ));
    }
    let candidate = reference
        .candidates
        .by_leaf_name
        .iter()
        .find(|node| node.qualified_name.ends_with(name))?;
    Some(decision(reference, candidate, 0.85, "qualified-name"))
}

fn match_method_call(reference: &NameMatcherReference) -> Option<NameMatcherDecision> {
    let (receiver, method_name) = parse_method_reference(&reference.ref_data.reference_name)?;
    for class_node in &reference.candidates.class_candidates {
        if !is_class_like(class_node) || class_node.language != reference.ref_data.language {
            continue;
        }
        let Some(nodes_in_file) = reference
            .candidates
            .nodes_in_files
            .get(&class_node.file_path)
        else {
            continue;
        };
        if let Some(method_node) = nodes_in_file.iter().find(|node| {
            matches!(node.kind.as_str(), "method" | "function")
                && node.name == method_name
                && node.qualified_name.contains(&class_node.name)
        }) {
            return Some(decision(reference, method_node, 0.85, "qualified-name"));
        }
    }

    let capitalized = capitalize_first(receiver);
    if capitalized != receiver {
        for class_node in &reference.candidates.capitalized_class_candidates {
            if !is_class_like(class_node) || class_node.language != reference.ref_data.language {
                continue;
            }
            let Some(nodes_in_file) = reference
                .candidates
                .nodes_in_files
                .get(&class_node.file_path)
            else {
                continue;
            };
            if let Some(method_node) = nodes_in_file.iter().find(|node| {
                matches!(node.kind.as_str(), "method" | "function")
                    && node.name == method_name
                    && node.qualified_name.contains(&class_node.name)
            }) {
                return Some(decision(reference, method_node, 0.8, "instance-method"));
            }
        }
    }

    let methods: Vec<&NodeFact> = reference
        .candidates
        .method_candidates
        .iter()
        .filter(|node| node.kind == "method" && node.name == method_name)
        .collect();
    let same_language: Vec<&NodeFact> = methods
        .iter()
        .copied()
        .filter(|node| node.language == reference.ref_data.language)
        .collect();
    let target_methods = if same_language.is_empty() {
        methods
    } else {
        same_language
    };
    if target_methods.len() == 1 && target_methods[0].language == reference.ref_data.language {
        return Some(decision(
            reference,
            target_methods[0],
            0.7,
            "instance-method",
        ));
    }
    if target_methods.len() > 1 {
        let receiver_words = split_camel_case(receiver);
        let mut best: Option<&NodeFact> = None;
        let mut best_score = 0;
        for method in target_methods {
            let class_words = split_camel_case(&method.qualified_name);
            let mut score = receiver_words
                .iter()
                .filter(|word| {
                    class_words
                        .iter()
                        .any(|class_word| class_word.eq_ignore_ascii_case(word))
                })
                .count() as i32;
            if method.language == reference.ref_data.language {
                score += 1;
            }
            if score > best_score {
                best_score = score;
                best = Some(method);
            }
        }
        if best_score >= 2 {
            return best.map(|node| decision(reference, node, 0.65, "instance-method"));
        }
    }
    None
}

fn match_by_exact_name(reference: &NameMatcherReference) -> Option<NameMatcherDecision> {
    let candidates = apply_language_gate(&reference.candidates.by_name, &reference.ref_data);
    if candidates.is_empty() {
        return None;
    }
    if candidates.len() == 1 {
        let confidence = if candidates[0].language == reference.ref_data.language {
            0.9
        } else {
            0.5
        };
        return Some(decision(
            reference,
            candidates[0],
            confidence,
            "exact-match",
        ));
    }
    let best = find_best_match(&reference.ref_data, &candidates)?;
    let proximity = compute_path_proximity(&reference.ref_data.file_path, &best.file_path);
    let confidence = if proximity >= 30 { 0.7 } else { 0.4 };
    Some(decision(reference, best, confidence, "exact-match"))
}

fn match_fuzzy(reference: &NameMatcherReference) -> Option<NameMatcherDecision> {
    let callable: Vec<&NodeFact> = reference
        .candidates
        .by_lower_name
        .iter()
        .filter(|node| matches!(node.kind.as_str(), "function" | "method" | "class"))
        .collect();
    let gated = apply_language_gate_refs(&callable, &reference.ref_data);
    let same_language: Vec<&NodeFact> = gated
        .iter()
        .copied()
        .filter(|node| node.language == reference.ref_data.language)
        .collect();
    let final_candidates = if same_language.is_empty() {
        gated
    } else {
        same_language
    };
    if final_candidates.len() != 1 {
        return None;
    }
    let confidence = if final_candidates[0].language == reference.ref_data.language {
        0.5
    } else {
        0.3
    };
    Some(decision(
        reference,
        final_candidates[0],
        confidence,
        "fuzzy",
    ))
}

fn decision(
    reference: &NameMatcherReference,
    node: &NodeFact,
    confidence: f64,
    resolved_by: &'static str,
) -> NameMatcherDecision {
    NameMatcherDecision {
        key: reference.key.clone(),
        target_node_id: Some(node.id.clone()),
        confidence,
        resolved_by: Some(resolved_by),
        fallback_reason: None,
    }
}

fn apply_language_gate<'a>(
    candidates: &'a [NodeFact],
    reference: &UnresolvedReferenceFact,
) -> Vec<&'a NodeFact> {
    let refs: Vec<&NodeFact> = candidates.iter().collect();
    apply_language_gate_refs(&refs, reference)
}

fn apply_language_gate_refs<'a>(
    candidates: &[&'a NodeFact],
    reference: &UnresolvedReferenceFact,
) -> Vec<&'a NodeFact> {
    if reference.reference_kind == "references" {
        return candidates
            .iter()
            .copied()
            .filter(|node| same_language_family(&node.language, &reference.language))
            .collect();
    }
    if reference.reference_kind == "imports" {
        return candidates
            .iter()
            .copied()
            .filter(|node| !crosses_known_family(&node.language, &reference.language))
            .collect();
    }
    candidates.to_vec()
}

fn find_best_match<'a>(
    reference: &UnresolvedReferenceFact,
    candidates: &[&'a NodeFact],
) -> Option<&'a NodeFact> {
    let mut best: Option<&NodeFact> = None;
    let mut best_score = f64::NEG_INFINITY;
    for candidate in candidates {
        let mut score = 0.0;
        if candidate.file_path == reference.file_path {
            score += 100.0;
        }
        score += compute_path_proximity(&reference.file_path, &candidate.file_path) as f64;
        if candidate.language == reference.language {
            score += 50.0;
        } else {
            score -= 80.0;
        }
        if reference.reference_kind == "calls"
            && matches!(candidate.kind.as_str(), "function" | "method")
        {
            score += 25.0;
        }
        if reference.reference_kind == "instantiates" && is_class_like(candidate) {
            score += 25.0;
        }
        if reference.reference_kind == "decorates" {
            if matches!(candidate.kind.as_str(), "function" | "method") {
                score += 25.0;
            } else if matches!(candidate.kind.as_str(), "class" | "interface") {
                score += 15.0;
            }
        }
        if candidate.is_exported.unwrap_or(false) {
            score += 10.0;
        }
        if candidate.file_path == reference.file_path {
            let distance = candidate.start_line.abs_diff(reference.line) as f64;
            score += 0.0_f64.max(20.0 - distance / 10.0);
        }
        if score > best_score {
            best_score = score;
            best = Some(candidate);
        }
    }
    best
}

fn pick_closest_file_node<'a>(
    candidates: &[&'a NodeFact],
    reference: &UnresolvedReferenceFact,
) -> &'a NodeFact {
    let reference_dir = dir_of(&reference.file_path);
    let same_dir: Vec<&NodeFact> = candidates
        .iter()
        .copied()
        .filter(|node| dir_of(&node.file_path) == reference_dir)
        .collect();
    let pool = if same_dir.is_empty() {
        candidates.to_vec()
    } else {
        same_dir
    };
    let mut best = pool[0];
    let mut best_score = i32::MIN;
    for candidate in pool {
        let mut score = compute_path_proximity(&reference.file_path, &candidate.file_path) as i32;
        if same_language_family(&candidate.language, &reference.language) {
            score += 5;
        }
        if score > best_score {
            best_score = score;
            best = candidate;
        }
    }
    best
}

fn same_language_family(a: &str, b: &str) -> bool {
    a == b || language_family(a).is_some_and(|family| Some(family) == language_family(b))
}

fn crosses_known_family(a: &str, b: &str) -> bool {
    language_family(a).is_some() && language_family(b).is_some() && !same_language_family(a, b)
}

fn language_family(language: &str) -> Option<&'static str> {
    match language {
        "java" | "kotlin" | "scala" => Some("jvm"),
        "swift" | "objc" => Some("apple"),
        "typescript" | "tsx" | "javascript" | "jsx" => Some("web"),
        "c" | "cpp" => Some("c"),
        "csharp" | "razor" => Some("dotnet"),
        _ => None,
    }
}

fn compute_path_proximity(a: &str, b: &str) -> u32 {
    let a_parts: Vec<&str> = a
        .rsplit_once('/')
        .map(|(dir, _)| dir)
        .unwrap_or("")
        .split('/')
        .collect();
    let b_parts: Vec<&str> = b
        .rsplit_once('/')
        .map(|(dir, _)| dir)
        .unwrap_or("")
        .split('/')
        .collect();
    let shared = a_parts
        .iter()
        .zip(b_parts.iter())
        .take_while(|(left, right)| left == right)
        .count() as u32;
    (shared * 15).min(80)
}

fn is_class_like(node: &NodeFact) -> bool {
    matches!(node.kind.as_str(), "class" | "struct" | "interface")
}

fn looks_like_short_extension(value: &str) -> bool {
    let Some((_, extension)) = value.rsplit_once('.') else {
        return false;
    };
    !extension.is_empty()
        && extension.len() <= 4
        && extension
            .chars()
            .next()
            .is_some_and(|ch| ch.is_ascii_alphabetic())
        && extension.chars().all(|ch| ch.is_ascii_alphanumeric())
}

fn parse_method_reference(value: &str) -> Option<(&str, &str)> {
    if let Some((receiver, method)) = value.rsplit_once("::") {
        if !receiver.is_empty()
            && !method.is_empty()
            && !receiver.contains("::")
            && !method.contains("::")
        {
            return Some((receiver, method));
        }
    }
    if let Some((receiver, method)) = value.rsplit_once('.') {
        if !receiver.is_empty() && !method.is_empty() {
            return Some((receiver, method));
        }
    }
    None
}

fn split_camel_case(value: &str) -> Vec<String> {
    let mut words = Vec::new();
    let mut current = String::new();
    let mut previous_lower = false;
    for ch in value.chars() {
        if !(ch.is_ascii_alphanumeric()) {
            if current.len() > 1 {
                words.push(current.clone());
            }
            current.clear();
            previous_lower = false;
            continue;
        }
        if ch.is_ascii_uppercase() && previous_lower && current.len() > 1 {
            words.push(current.clone());
            current.clear();
        }
        previous_lower = ch.is_ascii_lowercase();
        current.push(ch);
    }
    if current.len() > 1 {
        words.push(current);
    }
    words
}

fn capitalize_first(value: &str) -> String {
    let mut chars = value.chars();
    let Some(first) = chars.next() else {
        return String::new();
    };
    first.to_uppercase().collect::<String>() + chars.as_str()
}

fn dir_of(value: &str) -> &str {
    value.rsplit_once('/').map(|(dir, _)| dir).unwrap_or("")
}

#[derive(Debug, Default)]
pub struct WriteCounts {
    pub files_indexed: u32,
    pub files_errored: u32,
    pub nodes_created: u32,
    pub edges_created: u32,
    pub profile: IndexProfile,
    pub errors: Vec<IndexError>,
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
        let counts = write_temp_index(request, &temp_path)?;

        let replace_started = Instant::now();
        replace_active_index(&temp_path, index_path)?;
        let mut counts = counts;
        counts.profile.sqlite_write_ms += replace_started.elapsed().as_millis();
        cleanup_sqlite_sidecars(&temp_path);
        Ok(counts)
    })();

    if write_result.is_err() {
        cleanup_sqlite_sidecars(&temp_path);
        let _ = fs::remove_file(&temp_path);
    }

    write_result
}

fn write_temp_index(
    request: &IndexRequest,
    temp_path: &Path,
) -> Result<WriteCounts, Box<dyn std::error::Error>> {
    match request.sqlite_write_mode {
        SqliteWriteMode::Disk | SqliteWriteMode::FinalFlush => {
            let mut conn = Connection::open(temp_path)?;
            if request.sqlite_write_mode == SqliteWriteMode::FinalFlush {
                configure_final_flush_staging_connection(&conn)?;
            }
            let mut counts = write_index_to_connection(&mut conn, request)?;
            if request.sqlite_write_mode == SqliteWriteMode::FinalFlush {
                let finalize_started = Instant::now();
                configure_index_connection(&conn)?;
                counts.profile.sqlite_write_ms += finalize_started.elapsed().as_millis();
            }
            Ok(counts)
        }
        SqliteWriteMode::MemoryFinalFlush => {
            let mut conn = Connection::open_in_memory()?;
            let mut counts = write_index_to_connection(&mut conn, request)?;
            let flush_started = Instant::now();
            if temp_path.exists() {
                fs::remove_file(temp_path)?;
            }
            let escaped_path = temp_path.to_string_lossy().replace('\'', "''");
            conn.execute_batch(&format!("VACUUM main INTO '{}'", escaped_path))?;
            counts.profile.sqlite_write_ms += flush_started.elapsed().as_millis();
            Ok(counts)
        }
    }
}

fn write_index_to_connection(
    conn: &mut Connection,
    request: &IndexRequest,
) -> Result<WriteCounts, Box<dyn std::error::Error>> {
    let sqlite_setup_started = Instant::now();
    configure_index_connection(conn)?;
    conn.execute_batch(SCHEMA_SQL)?;
    stamp_schema_version(conn)?;
    stamp_metadata(conn)?;
    suspend_node_fts_triggers_for_bulk_write(conn)?;
    let sqlite_setup_ms = sqlite_setup_started.elapsed().as_millis();
    let mut counts = index_javascript_files(
        conn,
        Path::new(&request.project_path),
        request.graph_work_profile.features(),
        request.parse_walker_diagnostics,
    )?;
    counts.profile.sqlite_write_ms += sqlite_setup_ms;
    let fts_rebuild_started = Instant::now();
    rebuild_node_fts_after_bulk_write(conn)?;
    counts.profile.sqlite_write_ms += fts_rebuild_started.elapsed().as_millis();
    let module_resolution_shadow =
        build_module_resolution_shadow_diagnostics(conn, Path::new(&request.project_path))?;
    counts.profile.module_resolution_shadow_decision_refs = module_resolution_shadow.decision_refs;
    counts.profile.module_resolution_shadow_decision_counts =
        module_resolution_shadow.decision_counts;
    counts.profile.module_resolution_shadow_parity_counts = module_resolution_shadow.parity_counts;
    counts
        .profile
        .module_resolution_declaration_target_relationship_counts =
        module_resolution_shadow.declaration_target_relationship_counts;
    counts
        .profile
        .module_resolution_declaration_runtime_pairing_decision_counts =
        module_resolution_shadow.declaration_runtime_pairing_decision_counts;
    counts.profile.module_resolution_shadow_samples = module_resolution_shadow.samples;
    counts.profile.module_resolution_shadow_sample_cap = ImportFallbackSampleCap {
        per_bucket: IMPORT_FALLBACK_SAMPLE_PER_BUCKET_CAP,
        total: IMPORT_FALLBACK_SAMPLE_TOTAL_CAP,
        truncated: module_resolution_shadow.samples_truncated,
    };
    counts.profile.module_resolution_effective_mode_source =
        module_resolution_shadow.effective_mode_source;
    let import_resolution_started = Instant::now();
    let import_stats = resolve_js_ts_file_imports(conn, Path::new(&request.project_path))?;
    counts.profile.import_path_alias_resolution_ms =
        import_resolution_started.elapsed().as_millis();
    counts.profile.import_path_alias_resolved_refs = import_stats.resolved_refs;
    counts.profile.import_path_alias_fallback_refs = import_stats.fallback_refs();
    counts.profile.import_path_alias_binding_fallback_refs = import_stats.binding_fallback_refs;
    counts.profile.import_path_alias_unsupported_fallback_refs =
        import_stats.unsupported_fallback_refs;
    counts.profile.import_path_alias_unresolved_fallback_refs =
        import_stats.unresolved_fallback_refs;
    counts.profile.import_path_alias_relative_resolved_refs = import_stats.relative_resolved_refs;
    counts.profile.import_path_alias_tsconfig_resolved_refs = import_stats.tsconfig_resolved_refs;
    counts
        .profile
        .import_path_alias_conventional_alias_resolved_refs =
        import_stats.conventional_alias_resolved_refs;
    counts.profile.import_path_alias_workspace_resolved_refs = import_stats.workspace_resolved_refs;
    counts.profile.import_path_alias_root_dirs_resolved_refs = import_stats.root_dirs_resolved_refs;
    counts
        .profile
        .import_path_alias_package_self_name_resolved_refs =
        import_stats.package_self_name_resolved_refs;
    counts
        .profile
        .import_path_alias_package_imports_resolved_refs =
        import_stats.package_imports_resolved_refs;
    counts.profile.import_path_alias_relative_fallback_refs = import_stats.relative_fallback_refs;
    counts.profile.import_path_alias_tsconfig_fallback_refs = import_stats.tsconfig_fallback_refs;
    counts
        .profile
        .import_path_alias_conventional_alias_fallback_refs =
        import_stats.conventional_alias_fallback_refs;
    counts.profile.import_path_alias_workspace_fallback_refs = import_stats.workspace_fallback_refs;
    counts.profile.import_path_alias_root_dirs_fallback_refs = import_stats.root_dirs_fallback_refs;
    counts
        .profile
        .import_path_alias_package_self_name_fallback_refs =
        import_stats.package_self_name_fallback_refs;
    counts
        .profile
        .import_path_alias_package_imports_fallback_refs =
        import_stats.package_imports_fallback_refs;
    counts
        .profile
        .import_path_alias_package_self_name_outcome_counts =
        import_stats.package_self_name_outcome_counts;
    counts
        .profile
        .import_path_alias_package_imports_outcome_counts =
        import_stats.package_imports_outcome_counts;
    counts.profile.import_path_alias_fallback_sample_counts = import_stats.fallback_sample_counts;
    counts.profile.import_path_alias_fallback_samples = import_stats.fallback_samples;
    counts.profile.import_path_alias_fallback_sample_cap = ImportFallbackSampleCap {
        per_bucket: IMPORT_FALLBACK_SAMPLE_PER_BUCKET_CAP,
        total: IMPORT_FALLBACK_SAMPLE_TOTAL_CAP,
        truncated: import_stats.fallback_samples_truncated,
    };
    counts
        .profile
        .module_resolution_guarded_edge_write_attempted_refs =
        import_stats.guarded_edge_write_attempted_refs;
    counts
        .profile
        .module_resolution_guarded_edge_write_written_refs =
        import_stats.guarded_edge_write_written_refs;
    counts
        .profile
        .module_resolution_guarded_edge_write_skipped_refs =
        import_stats.guarded_edge_write_skipped_refs;
    counts
        .profile
        .module_resolution_guarded_edge_write_skipped_counts =
        import_stats.guarded_edge_write_skipped_counts;
    counts
        .profile
        .module_resolution_declaration_runtime_edge_write_attempted_refs =
        import_stats.declaration_runtime_edge_write_attempted_refs;
    counts
        .profile
        .module_resolution_declaration_runtime_edge_write_written_refs =
        import_stats.declaration_runtime_edge_write_written_refs;
    counts
        .profile
        .module_resolution_declaration_runtime_edge_write_skipped_refs =
        import_stats.declaration_runtime_edge_write_skipped_refs;
    counts
        .profile
        .module_resolution_declaration_runtime_edge_write_skipped_counts =
        import_stats.declaration_runtime_edge_write_skipped_counts;
    counts.edges_created += import_stats.edges_created;
    let esm_named_started = Instant::now();
    let esm_named_stats =
        resolve_esm_named_import_export_refs(conn, Path::new(&request.project_path))?;
    counts.profile.esm_named_import_export_resolution_ms = esm_named_started.elapsed().as_millis();
    counts.profile.esm_named_import_export_resolved_refs = esm_named_stats.resolved_refs;
    counts.profile.esm_named_import_export_fallback_refs = esm_named_stats.fallback_refs;
    counts.profile.esm_one_hop_reexport_resolved_refs = esm_named_stats.reexport_resolved_refs;
    counts
        .profile
        .esm_named_import_export_overload_implementation_resolved_refs =
        esm_named_stats.overload_implementation_resolved_refs;
    counts
        .profile
        .esm_named_import_export_fallback_sample_counts = esm_named_stats.fallback_sample_counts;
    counts.profile.esm_named_import_export_fallback_samples = esm_named_stats.fallback_samples;
    counts.profile.esm_named_import_export_fallback_sample_cap = ImportFallbackSampleCap {
        per_bucket: IMPORT_FALLBACK_SAMPLE_PER_BUCKET_CAP,
        total: IMPORT_FALLBACK_SAMPLE_TOTAL_CAP,
        truncated: esm_named_stats.fallback_samples_truncated,
    };
    counts
        .profile
        .esm_named_import_export_edge_write_attempted_refs =
        esm_named_stats.edge_write_attempted_refs;
    counts
        .profile
        .esm_named_import_export_edge_write_written_refs = esm_named_stats.edge_write_written_refs;
    counts
        .profile
        .esm_named_import_export_edge_write_skipped_refs = esm_named_stats.edge_write_skipped_refs;
    counts
        .profile
        .esm_named_import_export_edge_write_skipped_counts =
        esm_named_stats.edge_write_skipped_counts;
    counts
        .profile
        .esm_named_import_export_edge_write_skipped_samples =
        esm_named_stats.edge_write_skipped_samples;
    counts
        .profile
        .esm_named_import_export_edge_write_skipped_sample_cap = ImportFallbackSampleCap {
        per_bucket: IMPORT_FALLBACK_SAMPLE_PER_BUCKET_CAP,
        total: IMPORT_FALLBACK_SAMPLE_TOTAL_CAP,
        truncated: esm_named_stats.edge_write_skipped_samples_truncated,
    };
    counts.edges_created += esm_named_stats.edges_created;
    let local_reference_started = Instant::now();
    let local_reference_stats = resolve_same_file_exact_callable_refs(conn)?;
    counts.profile.local_exact_reference_resolution_ms =
        local_reference_started.elapsed().as_millis();
    counts.profile.local_exact_reference_resolved_refs = local_reference_stats.resolved_refs;
    counts.profile.local_exact_reference_fallback_refs = local_reference_stats.fallback_refs;
    counts.edges_created += local_reference_stats.edges_created;
    Ok(counts)
}

#[derive(Debug, Default)]
struct ImportResolutionStats {
    resolved_refs: u32,
    edges_created: u32,
    binding_fallback_refs: u32,
    unsupported_fallback_refs: u32,
    unresolved_fallback_refs: u32,
    relative_resolved_refs: u32,
    tsconfig_resolved_refs: u32,
    conventional_alias_resolved_refs: u32,
    workspace_resolved_refs: u32,
    root_dirs_resolved_refs: u32,
    package_self_name_resolved_refs: u32,
    package_imports_resolved_refs: u32,
    relative_fallback_refs: u32,
    tsconfig_fallback_refs: u32,
    conventional_alias_fallback_refs: u32,
    workspace_fallback_refs: u32,
    root_dirs_fallback_refs: u32,
    package_self_name_fallback_refs: u32,
    package_imports_fallback_refs: u32,
    package_self_name_outcome_counts: BTreeMap<String, u32>,
    package_imports_outcome_counts: BTreeMap<String, u32>,
    fallback_sample_counts: BTreeMap<String, u32>,
    fallback_samples: Vec<ImportFallbackSample>,
    fallback_bucket_sample_counts: HashMap<String, usize>,
    fallback_samples_truncated: bool,
    guarded_edge_write_attempted_refs: u32,
    guarded_edge_write_written_refs: u32,
    guarded_edge_write_skipped_refs: u32,
    guarded_edge_write_skipped_counts: BTreeMap<String, u32>,
    declaration_runtime_edge_write_attempted_refs: u32,
    declaration_runtime_edge_write_written_refs: u32,
    declaration_runtime_edge_write_skipped_refs: u32,
    declaration_runtime_edge_write_skipped_counts: BTreeMap<String, u32>,
}

#[derive(Debug, Default)]
struct ModuleResolutionShadowDiagnostics {
    decision_refs: u32,
    decision_counts: BTreeMap<String, u32>,
    parity_counts: BTreeMap<String, u32>,
    declaration_target_relationship_counts: BTreeMap<String, u32>,
    declaration_runtime_pairing_decision_counts: BTreeMap<String, u32>,
    samples: Vec<ModuleResolutionDecisionRecord>,
    sample_bucket_counts: HashMap<String, usize>,
    samples_truncated: bool,
    effective_mode_source: String,
}

impl ModuleResolutionShadowDiagnostics {
    fn record(&mut self, decision: ModuleResolutionDecisionRecord) {
        self.decision_refs += 1;
        *self
            .decision_counts
            .entry(decision.resolved_kind.clone())
            .or_insert(0) += 1;
        *self
            .parity_counts
            .entry(decision.parity_status.clone())
            .or_insert(0) += 1;
        if let Some(relationship) = &decision.declaration_target_relationship {
            *self
                .declaration_target_relationship_counts
                .entry(relationship.runtime_sibling_status.clone())
                .or_insert(0) += 1;
            if let Some(pairing_decision) = &relationship.pairing_decision {
                *self
                    .declaration_runtime_pairing_decision_counts
                    .entry(pairing_decision.status.clone())
                    .or_insert(0) += 1;
            }
        }

        let bucket_count = *self
            .sample_bucket_counts
            .get(&decision.resolved_kind)
            .unwrap_or(&0);
        if bucket_count >= IMPORT_FALLBACK_SAMPLE_PER_BUCKET_CAP
            || self.samples.len() >= IMPORT_FALLBACK_SAMPLE_TOTAL_CAP
        {
            self.samples_truncated = true;
            return;
        }
        self.sample_bucket_counts
            .insert(decision.resolved_kind.clone(), bucket_count + 1);
        self.samples.push(decision);
    }
}

impl ImportResolutionStats {
    fn record_guarded_edge_write(&mut self, decision: &GuardedModuleResolutionEdgeWrite) {
        self.guarded_edge_write_attempted_refs += 1;
        match decision {
            GuardedModuleResolutionEdgeWrite::Write { .. } => {
                self.guarded_edge_write_written_refs += 1;
            }
            GuardedModuleResolutionEdgeWrite::Skip { reason } => {
                self.guarded_edge_write_skipped_refs += 1;
                *self
                    .guarded_edge_write_skipped_counts
                    .entry((*reason).to_string())
                    .or_insert(0) += 1;
            }
        }
    }

    fn record_declaration_runtime_edge_write(&mut self, decision: &DeclarationRuntimeEdgeWrite) {
        self.declaration_runtime_edge_write_attempted_refs += 1;
        match decision {
            DeclarationRuntimeEdgeWrite::Rewrite { .. } => {
                self.declaration_runtime_edge_write_written_refs += 1;
            }
            DeclarationRuntimeEdgeWrite::KeepDeclaration { reason } => {
                self.declaration_runtime_edge_write_skipped_refs += 1;
                *self
                    .declaration_runtime_edge_write_skipped_counts
                    .entry((*reason).to_string())
                    .or_insert(0) += 1;
            }
        }
    }

    fn fallback_refs(&self) -> u32 {
        self.binding_fallback_refs + self.unsupported_fallback_refs + self.unresolved_fallback_refs
    }

    fn record_fallback_sample(
        &mut self,
        source_kind: &str,
        reason: &str,
        reference: &ImportRefRow,
    ) {
        self.record_fallback_sample_with_target(source_kind, reason, reference, None);
    }

    fn record_fallback_sample_with_target(
        &mut self,
        source_kind: &str,
        reason: &str,
        reference: &ImportRefRow,
        target_file_path: Option<&str>,
    ) {
        let bucket = format!("{}/{}", source_kind, reason);
        *self
            .fallback_sample_counts
            .entry(bucket.clone())
            .or_insert(0) += 1;

        let bucket_count = *self
            .fallback_bucket_sample_counts
            .get(&bucket)
            .unwrap_or(&0);
        if bucket_count >= IMPORT_FALLBACK_SAMPLE_PER_BUCKET_CAP
            || self.fallback_samples.len() >= IMPORT_FALLBACK_SAMPLE_TOTAL_CAP
        {
            self.fallback_samples_truncated = true;
            return;
        }

        self.fallback_bucket_sample_counts
            .insert(bucket, bucket_count + 1);
        self.fallback_samples.push(ImportFallbackSample {
            source_kind: source_kind.to_string(),
            reason: reason.to_string(),
            reference_name: reference.reference_name.clone(),
            file_path: reference.file_path.clone(),
            language: reference.language.clone(),
            line: reference.line,
            col: reference.col,
            target_kind: target_file_path.and_then(classify_import_target_kind),
            target_extension: target_file_path.and_then(import_target_extension),
        });
    }
}

#[derive(Debug)]
struct ImportRefRow {
    id: i64,
    from_node_id: String,
    reference_name: String,
    line: i64,
    col: i64,
    file_path: String,
    language: String,
}

#[derive(Debug, Default)]
struct LocalReferenceStats {
    resolved_refs: u32,
    edges_created: u32,
    fallback_refs: u32,
}

#[derive(Debug, Default)]
struct EsmNamedImportExportStats {
    resolved_refs: u32,
    edges_created: u32,
    fallback_refs: u32,
    reexport_resolved_refs: u32,
    overload_implementation_resolved_refs: u32,
    fallback_sample_counts: BTreeMap<String, u32>,
    fallback_samples: Vec<EsmNamedFallbackSample>,
    fallback_bucket_sample_counts: HashMap<String, usize>,
    fallback_samples_truncated: bool,
    edge_write_attempted_refs: u32,
    edge_write_written_refs: u32,
    edge_write_skipped_refs: u32,
    edge_write_skipped_counts: BTreeMap<String, u32>,
    edge_write_skipped_samples: Vec<EsmNamedFallbackSample>,
    edge_write_skipped_bucket_sample_counts: HashMap<String, usize>,
    edge_write_skipped_samples_truncated: bool,
}

impl EsmNamedImportExportStats {
    fn record_fallback_sample(
        &mut self,
        reason: &str,
        reference: &ImportRefRow,
        target_file_path: Option<&str>,
        candidate_count: Option<usize>,
        resolved_by_attempt: Option<&str>,
        candidate_line_ranges: Option<Vec<CandidateDeclarationDiagnostic>>,
    ) {
        self.fallback_refs += 1;
        *self
            .fallback_sample_counts
            .entry(reason.to_string())
            .or_insert(0) += 1;

        let bucket_count = *self.fallback_bucket_sample_counts.get(reason).unwrap_or(&0);
        if bucket_count >= IMPORT_FALLBACK_SAMPLE_PER_BUCKET_CAP
            || self.fallback_samples.len() >= IMPORT_FALLBACK_SAMPLE_TOTAL_CAP
        {
            self.fallback_samples_truncated = true;
            return;
        }

        self.fallback_bucket_sample_counts
            .insert(reason.to_string(), bucket_count + 1);
        self.fallback_samples.push(EsmNamedFallbackSample {
            reason: reason.to_string(),
            reference_name: reference.reference_name.clone(),
            reference_kind: "imports".to_string(),
            file_path: reference.file_path.clone(),
            language: reference.language.clone(),
            line: reference.line,
            col: reference.col,
            target_file_path: target_file_path.map(str::to_string),
            candidate_kind: None,
            candidate_count,
            resolved_by_attempt: resolved_by_attempt.map(str::to_string),
            candidate_line_ranges,
        });
    }

    fn record_edge_write_decision(
        &mut self,
        decision: &GuardedEsmNamedSymbolEdgeWrite,
        reference: &ImportRefRow,
        target_file_path: Option<&str>,
        candidate_kind: Option<&str>,
        candidate_count: Option<usize>,
    ) {
        self.edge_write_attempted_refs += 1;
        match decision {
            GuardedEsmNamedSymbolEdgeWrite::Write => {
                self.edge_write_written_refs += 1;
            }
            GuardedEsmNamedSymbolEdgeWrite::Skip { reason } => {
                self.edge_write_skipped_refs += 1;
                *self
                    .edge_write_skipped_counts
                    .entry((*reason).to_string())
                    .or_insert(0) += 1;

                let bucket_count = *self
                    .edge_write_skipped_bucket_sample_counts
                    .get(*reason)
                    .unwrap_or(&0);
                if bucket_count >= IMPORT_FALLBACK_SAMPLE_PER_BUCKET_CAP
                    || self.edge_write_skipped_samples.len() >= IMPORT_FALLBACK_SAMPLE_TOTAL_CAP
                {
                    self.edge_write_skipped_samples_truncated = true;
                    return;
                }
                self.edge_write_skipped_bucket_sample_counts
                    .insert((*reason).to_string(), bucket_count + 1);
                self.edge_write_skipped_samples
                    .push(EsmNamedFallbackSample {
                        reason: (*reason).to_string(),
                        reference_name: reference.reference_name.clone(),
                        reference_kind: "imports".to_string(),
                        file_path: reference.file_path.clone(),
                        language: reference.language.clone(),
                        line: reference.line,
                        col: reference.col,
                        target_file_path: target_file_path.map(str::to_string),
                        candidate_kind: candidate_kind.map(str::to_string),
                        candidate_count,
                        resolved_by_attempt: None,
                        candidate_line_ranges: None,
                    });
            }
        }
    }
}

#[derive(Debug)]
struct FileImportEdgeRow {
    target_file_path: String,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
enum ImportTargetSourceKind {
    Relative,
    TsconfigPaths,
    ConventionalAlias,
    WorkspacePackage,
    RootDirs,
    PackageSelfName,
    PackageImports,
}

#[derive(Debug)]
enum GuardedModuleResolutionEdgeWrite {
    Write { target_node_id: String },
    Skip { reason: &'static str },
}

#[derive(Debug)]
enum DeclarationRuntimeEdgeWrite {
    Rewrite { runtime_target_file_path: String },
    KeepDeclaration { reason: &'static str },
}

#[derive(Debug, PartialEq, Eq)]
enum GuardedEsmNamedSymbolEdgeWrite {
    Write,
    Skip { reason: &'static str },
}

impl ImportResolutionStats {
    fn record_package_self_name_outcome(&mut self, outcome: &'static str) {
        *self
            .package_self_name_outcome_counts
            .entry(outcome.to_string())
            .or_insert(0) += 1;
    }

    fn record_package_imports_outcome(&mut self, outcome: &'static str) {
        *self
            .package_imports_outcome_counts
            .entry(outcome.to_string())
            .or_insert(0) += 1;
    }

    fn record_resolved_source(&mut self, source: ImportTargetSourceKind) {
        match source {
            ImportTargetSourceKind::Relative => self.relative_resolved_refs += 1,
            ImportTargetSourceKind::TsconfigPaths => self.tsconfig_resolved_refs += 1,
            ImportTargetSourceKind::ConventionalAlias => self.conventional_alias_resolved_refs += 1,
            ImportTargetSourceKind::WorkspacePackage => self.workspace_resolved_refs += 1,
            ImportTargetSourceKind::RootDirs => self.root_dirs_resolved_refs += 1,
            ImportTargetSourceKind::PackageSelfName => self.package_self_name_resolved_refs += 1,
            ImportTargetSourceKind::PackageImports => self.package_imports_resolved_refs += 1,
        }
    }

    fn record_unresolved_source(&mut self, source: ImportTargetSourceKind) {
        self.unresolved_fallback_refs += 1;
        match source {
            ImportTargetSourceKind::Relative => self.relative_fallback_refs += 1,
            ImportTargetSourceKind::TsconfigPaths => self.tsconfig_fallback_refs += 1,
            ImportTargetSourceKind::ConventionalAlias => self.conventional_alias_fallback_refs += 1,
            ImportTargetSourceKind::WorkspacePackage => self.workspace_fallback_refs += 1,
            ImportTargetSourceKind::RootDirs => self.root_dirs_fallback_refs += 1,
            ImportTargetSourceKind::PackageSelfName => self.package_self_name_fallback_refs += 1,
            ImportTargetSourceKind::PackageImports => self.package_imports_fallback_refs += 1,
        }
    }
}

impl ImportTargetSourceKind {
    fn as_profile_source_kind(self) -> &'static str {
        match self {
            ImportTargetSourceKind::Relative => "relative",
            ImportTargetSourceKind::TsconfigPaths => "tsconfigPaths",
            ImportTargetSourceKind::ConventionalAlias => "conventionalAlias",
            ImportTargetSourceKind::WorkspacePackage => "workspacePackage",
            ImportTargetSourceKind::RootDirs => "rootDirs",
            ImportTargetSourceKind::PackageSelfName => "packageSelfName",
            ImportTargetSourceKind::PackageImports => "packageImports",
        }
    }

    fn target_not_found_reason(self) -> &'static str {
        match self {
            ImportTargetSourceKind::Relative => "target-not-found",
            ImportTargetSourceKind::TsconfigPaths => "tsconfig-path-target-not-found",
            ImportTargetSourceKind::ConventionalAlias => "conventional-alias-target-not-found",
            ImportTargetSourceKind::WorkspacePackage => "workspace-package-target-not-found",
            ImportTargetSourceKind::RootDirs => "root-dirs-target-not-found",
            ImportTargetSourceKind::PackageSelfName => "missingTarget",
            ImportTargetSourceKind::PackageImports => "importsMissingTarget",
        }
    }
}

#[derive(Debug)]
struct SymbolCandidateRow {
    id: String,
    kind: String,
    name: String,
    start_line: i64,
    end_line: i64,
    resolved_by: &'static str,
}

#[derive(Debug)]
struct ExportedSymbolCandidateLookup {
    candidates: Vec<SymbolCandidateRow>,
    fallback_reason: &'static str,
    resolved_by_attempt: &'static str,
}

#[derive(Debug)]
struct LocalRefRow {
    id: i64,
    from_node_id: String,
    reference_name: String,
    reference_kind: String,
    line: i64,
    col: i64,
    file_path: String,
    language: String,
}

#[derive(Debug)]
struct ImportTargetResolution {
    source: ImportTargetSourceKind,
    target: Option<String>,
    outcomes: Vec<&'static str>,
    condition_set: Vec<String>,
    matched_condition: Option<String>,
}

impl ImportTargetResolution {
    fn new(
        source: ImportTargetSourceKind,
        target: Option<String>,
        outcomes: Vec<&'static str>,
    ) -> Self {
        Self {
            source,
            target,
            outcomes,
            condition_set: Vec::new(),
            matched_condition: None,
        }
    }

    fn package_map(
        source: ImportTargetSourceKind,
        target: Option<String>,
        outcomes: Vec<&'static str>,
        condition_set: Vec<String>,
        matched_condition: Option<String>,
    ) -> Self {
        Self {
            source,
            target,
            outcomes,
            condition_set,
            matched_condition,
        }
    }
}

#[derive(Debug, Default)]
struct TsPathAliases {
    patterns: Vec<TsPathAliasPattern>,
    root_dirs: Vec<PathBuf>,
    module_resolution_mode: String,
    module_resolution_mode_source: String,
    custom_conditions: Vec<String>,
}

#[derive(Debug)]
struct TsPathAliasPattern {
    prefix: String,
    suffix: String,
    targets: Vec<TsPathAliasTarget>,
}

#[derive(Debug)]
struct TsPathAliasTarget {
    base_path: PathBuf,
    prefix: String,
    suffix: String,
}

#[derive(Debug, Default)]
struct WorkspacePackages {
    by_name: HashMap<String, String>,
}

#[derive(Debug, Default)]
struct RepoLocalPackageNames {
    by_name: HashMap<String, Vec<RepoLocalPackage>>,
    packages: Vec<RepoLocalPackage>,
}

#[derive(Debug, Clone)]
struct RepoLocalPackage {
    dir: String,
    exports: Option<Value>,
    imports: Option<Value>,
}

impl WorkspacePackages {
    fn resolve_import<'a>(&'a self, specifier: &'a str) -> Option<PathBuf> {
        let mut best: Option<&str> = None;
        for name in self.by_name.keys() {
            if specifier == name || specifier.starts_with(&format!("{}/", name)) {
                if best.map_or(true, |current| name.len() > current.len()) {
                    best = Some(name);
                }
            }
        }
        let best_name = best?;
        let dir = self.by_name.get(best_name)?;
        let subpath = &specifier[best_name.len()..];
        Some(Path::new(dir).join(subpath.trim_start_matches('/')))
    }
}

impl RepoLocalPackageNames {
    fn nearest_package_for_file(&self, file_path: &str) -> Option<&RepoLocalPackage> {
        let mut best: Option<&RepoLocalPackage> = None;
        for package in &self.packages {
            if package.dir.is_empty()
                || file_path == package.dir
                || file_path.starts_with(&format!("{}/", package.dir))
            {
                if best.map_or(true, |current| package.dir.len() > current.dir.len()) {
                    best = Some(package);
                }
            }
        }
        best
    }

    fn resolve_package_import(
        &self,
        from_file_path: &str,
        specifier: &str,
        module_resolution_mode: &str,
        condition_context: &PackageConditionContext,
    ) -> PackageImportsResolution {
        if !specifier.starts_with('#') {
            return PackageImportsResolution::NotPackageImport;
        }
        if module_resolution_mode == "classic" {
            return PackageImportsResolution::Unsupported(
                "moduleResolutionClassicPackageMapsUnsupported",
            );
        }
        let Some(package) = self.nearest_package_for_file(from_file_path) else {
            return PackageImportsResolution::MissingPackageBoundary;
        };
        let Some(imports) = &package.imports else {
            return PackageImportsResolution::MissingImportsMap;
        };
        match resolve_package_imports_map(
            imports,
            specifier,
            module_resolution_mode,
            condition_context,
        ) {
            PackageImportsMapResolution::Resolved(target) => {
                let resolved_target = Path::new(&package.dir).join(&target.target);
                if !path_stays_within_package(&resolved_target, &package.dir) {
                    return PackageImportsResolution::Unsupported("importsTargetEscapesPackage");
                }
                PackageImportsResolution::Matched {
                    target: resolved_target,
                    outcomes: vec!["importsResolved"],
                    condition_set: target.condition_set,
                    matched_condition: target.matched_condition,
                }
            }
            PackageImportsMapResolution::Missing => {
                PackageImportsResolution::Unsupported("importsMissing")
            }
            PackageImportsMapResolution::Unsupported(reason) => {
                PackageImportsResolution::Unsupported(reason)
            }
        }
    }

    fn resolve_import(
        &self,
        specifier: &str,
        module_resolution_mode: &str,
        condition_context: &PackageConditionContext,
    ) -> PackageSelfNameResolution {
        let Some(best_name) = self.best_name_match(specifier) else {
            return PackageSelfNameResolution::MissingPackageName;
        };
        let Some(packages) = self.by_name.get(best_name) else {
            return PackageSelfNameResolution::MissingPackageName;
        };
        if packages.len() != 1 {
            return PackageSelfNameResolution::AmbiguousName;
        }
        let package = &packages[0];
        let subpath = specifier[best_name.len()..].trim_start_matches('/');
        let fallback_target = package_root_fallback_target(&package.dir, subpath);
        if let Some(exports) = &package.exports {
            if module_resolution_mode == "classic" {
                return PackageSelfNameResolution::UnsupportedExports(
                    "moduleResolutionClassicPackageMapsUnsupported",
                );
            }
            match resolve_simple_package_exports(
                exports,
                subpath,
                module_resolution_mode,
                condition_context,
            ) {
                PackageExportsResolution::Resolved(target) => {
                    return PackageSelfNameResolution::Matched {
                        target: Path::new(&package.dir).join(target.target),
                        outcomes: vec!["exportsResolved"],
                        condition_set: target.condition_set,
                        matched_condition: target.matched_condition,
                    };
                }
                PackageExportsResolution::Missing => {
                    return PackageSelfNameResolution::Matched {
                        target: fallback_target,
                        outcomes: vec!["exportsMissing", "rootFallbackResolved"],
                        condition_set: Vec::new(),
                        matched_condition: None,
                    };
                }
                PackageExportsResolution::Unsupported(reason) => {
                    return PackageSelfNameResolution::UnsupportedExports(reason);
                }
            }
        }

        PackageSelfNameResolution::Matched {
            target: fallback_target,
            outcomes: vec![if subpath.is_empty() {
                "resolvedRootIndex"
            } else {
                "resolvedSubpath"
            }],
            condition_set: Vec::new(),
            matched_condition: None,
        }
    }

    fn best_name_match<'a>(&'a self, specifier: &str) -> Option<&'a str> {
        let mut best: Option<&str> = None;
        for name in self.by_name.keys() {
            if specifier == name || specifier.starts_with(&format!("{}/", name)) {
                if best.map_or(true, |current| name.len() > current.len()) {
                    best = Some(name);
                }
            }
        }
        best
    }

    fn shares_known_scope(&self, specifier: &str) -> bool {
        let Some((scope, _rest)) = specifier.strip_prefix('@').and_then(|s| s.split_once('/'))
        else {
            return false;
        };
        let expected_prefix = format!("@{}/", scope);
        self.by_name
            .keys()
            .any(|name| name.starts_with(&expected_prefix))
    }
}

#[derive(Debug)]
enum PackageSelfNameResolution {
    Matched {
        target: PathBuf,
        outcomes: Vec<&'static str>,
        condition_set: Vec<String>,
        matched_condition: Option<String>,
    },
    AmbiguousName,
    MissingPackageName,
    UnsupportedExports(&'static str),
}

#[derive(Debug)]
enum PackageImportsResolution {
    Matched {
        target: PathBuf,
        outcomes: Vec<&'static str>,
        condition_set: Vec<String>,
        matched_condition: Option<String>,
    },
    MissingPackageBoundary,
    MissingImportsMap,
    NotPackageImport,
    Unsupported(&'static str),
}

#[derive(Debug)]
enum PackageExportsResolution {
    Resolved(PackageMapResolvedTarget),
    Missing,
    Unsupported(&'static str),
}

#[derive(Debug)]
enum PackageImportsMapResolution {
    Resolved(PackageMapResolvedTarget),
    Missing,
    Unsupported(&'static str),
}

#[derive(Debug, Clone)]
struct PackageMapResolvedTarget {
    target: PathBuf,
    condition_set: Vec<String>,
    matched_condition: Option<String>,
}

#[derive(Debug, Clone)]
struct PackageConditionContext {
    runtime_condition: &'static str,
    custom_conditions: Vec<String>,
}

impl PackageConditionContext {
    fn new(runtime_condition: &'static str, custom_conditions: Vec<String>) -> Self {
        Self {
            runtime_condition,
            custom_conditions,
        }
    }

    fn effective_conditions(&self, module_resolution_mode: &str) -> Vec<String> {
        if module_resolution_mode == "classic" {
            return Vec::new();
        }
        let mut conditions = Vec::new();
        push_unique_condition(&mut conditions, "types");
        push_unique_condition(&mut conditions, self.runtime_condition);
        push_unique_condition(&mut conditions, "node");
        for condition in &self.custom_conditions {
            push_unique_condition(&mut conditions, condition);
        }
        push_unique_condition(&mut conditions, "default");
        conditions
    }
}

fn push_unique_condition(conditions: &mut Vec<String>, condition: &str) {
    if !condition.is_empty() && !conditions.iter().any(|existing| existing == condition) {
        conditions.push(condition.to_string());
    }
}

#[derive(Debug, PartialEq, Eq)]
enum RootDirsResolution {
    Resolved(String),
    TargetNotFound,
    ConfigOutOfScope,
    NotConfigured,
}

fn resolve_js_ts_file_imports(
    conn: &Connection,
    project_path: &Path,
) -> Result<ImportResolutionStats, Box<dyn std::error::Error>> {
    let aliases = load_ts_path_aliases(project_path);
    let workspace_packages = load_workspace_packages(project_path);
    let package_self_names = load_repo_local_package_names(project_path);
    let refs = load_import_refs(conn)?;
    let mut stats = ImportResolutionStats::default();
    let mut resolved_ids = Vec::new();
    let mut file_content_cache = HashMap::new();

    for reference in refs {
        if !matches!(
            reference.language.as_str(),
            "javascript" | "jsx" | "typescript" | "tsx"
        ) {
            continue;
        }

        let specifier = reference.reference_name.as_str();
        let condition_context = package_condition_context_for_reference(
            project_path,
            &aliases,
            &reference,
            &mut file_content_cache,
        );
        let target = if let Some(resolution) = resolve_import_target(
            project_path,
            &aliases,
            &workspace_packages,
            &package_self_names,
            &reference.file_path,
            specifier,
            &condition_context,
        ) {
            (resolution.source, resolution.target, resolution.outcomes)
        } else if aliases.matches(specifier) {
            (ImportTargetSourceKind::TsconfigPaths, None, Vec::new())
        } else if matches_conventional_alias(specifier).is_some() {
            (ImportTargetSourceKind::ConventionalAlias, None, Vec::new())
        } else if workspace_packages.resolve_import(specifier).is_some() {
            (ImportTargetSourceKind::WorkspacePackage, None, Vec::new())
        } else if specifier.starts_with('#') {
            match package_self_names.resolve_package_import(
                &reference.file_path,
                specifier,
                &aliases.module_resolution_mode,
                &condition_context,
            ) {
                PackageImportsResolution::MissingPackageBoundary => (
                    ImportTargetSourceKind::PackageImports,
                    None,
                    vec!["importsMissingPackageBoundary"],
                ),
                PackageImportsResolution::MissingImportsMap => (
                    ImportTargetSourceKind::PackageImports,
                    None,
                    vec!["importsMissingMap"],
                ),
                PackageImportsResolution::Unsupported(reason) => {
                    (ImportTargetSourceKind::PackageImports, None, vec![reason])
                }
                PackageImportsResolution::NotPackageImport => {
                    unreachable!("specifier starts with #")
                }
                PackageImportsResolution::Matched { .. } => {
                    unreachable!("package imports matches are returned by resolve_import_target")
                }
            }
        } else {
            match package_self_names.resolve_import(
                specifier,
                &aliases.module_resolution_mode,
                &condition_context,
            ) {
                PackageSelfNameResolution::AmbiguousName => (
                    ImportTargetSourceKind::PackageSelfName,
                    None,
                    vec!["ambiguousName"],
                ),
                PackageSelfNameResolution::UnsupportedExports(reason) => {
                    (ImportTargetSourceKind::PackageSelfName, None, vec![reason])
                }
                PackageSelfNameResolution::MissingPackageName
                    if looks_like_imported_binding(specifier) =>
                {
                    stats.binding_fallback_refs += 1;
                    stats.record_fallback_sample(
                        "binding",
                        "binding-level-symbol-disambiguation",
                        &reference,
                    );
                    continue;
                }
                PackageSelfNameResolution::MissingPackageName
                    if package_self_names.shares_known_scope(specifier) =>
                {
                    (
                        ImportTargetSourceKind::PackageSelfName,
                        None,
                        vec!["missingPackageName"],
                    )
                }
                PackageSelfNameResolution::MissingPackageName => {
                    stats.unsupported_fallback_refs += 1;
                    stats.record_fallback_sample(
                        "unsupported",
                        "unsupported-import-form",
                        &reference,
                    );
                    continue;
                }
                PackageSelfNameResolution::Matched { .. } => {
                    unreachable!("package self-name matches are returned by resolve_import_target")
                }
            }
        };

        if target.0 == ImportTargetSourceKind::PackageSelfName {
            for outcome in &target.2 {
                stats.record_package_self_name_outcome(outcome);
            }
        }
        if target.0 == ImportTargetSourceKind::PackageImports {
            for outcome in &target.2 {
                stats.record_package_imports_outcome(outcome);
            }
        }

        let target_file_path = target.1.clone();
        let effective_target_file_path = if let Some(declaration_runtime_decision) =
            declaration_runtime_edge_write_decision(
                conn,
                project_path,
                &reference.file_path,
                target_file_path.as_deref(),
            )? {
            stats.record_declaration_runtime_edge_write(&declaration_runtime_decision);
            match declaration_runtime_decision {
                DeclarationRuntimeEdgeWrite::Rewrite {
                    runtime_target_file_path,
                } => Some(runtime_target_file_path),
                DeclarationRuntimeEdgeWrite::KeepDeclaration { .. } => target_file_path.clone(),
            }
        } else {
            target_file_path.clone()
        };
        let guard_decision = guarded_module_resolution_edge_write_decision(
            conn,
            target.0,
            effective_target_file_path.clone(),
            &target.2,
        )?;
        stats.record_guarded_edge_write(&guard_decision);
        match guard_decision {
            GuardedModuleResolutionEdgeWrite::Write { target_node_id } => {
                if insert_rust_import_edge(conn, &reference, &target_node_id)? {
                    stats.edges_created += 1;
                }
                stats.resolved_refs += 1;
                stats.record_resolved_source(target.0);
                resolved_ids.push(reference.id);
            }
            GuardedModuleResolutionEdgeWrite::Skip { reason } => {
                stats.record_unresolved_source(target.0);
                stats.record_fallback_sample_with_target(
                    target.0.as_profile_source_kind(),
                    reason,
                    &reference,
                    effective_target_file_path.as_deref(),
                );
            }
        }
    }

    delete_resolved_import_refs(conn, &resolved_ids)?;
    Ok(stats)
}

fn package_condition_context_for_reference(
    project_path: &Path,
    aliases: &TsPathAliases,
    reference: &ImportRefRow,
    cache: &mut HashMap<String, String>,
) -> PackageConditionContext {
    let runtime_condition =
        import_line_text(project_path, &reference.file_path, reference.line, cache)
            .and_then(module_reference_runtime_condition)
            .unwrap_or("import");
    PackageConditionContext::new(runtime_condition, aliases.custom_conditions.clone())
}

fn module_reference_runtime_condition(line_text: &str) -> Option<&'static str> {
    let trimmed = line_text.trim_start();
    if trimmed.starts_with("import ") || trimmed.starts_with("export ") {
        return Some("import");
    }
    if require_call_module_specifier(trimmed).is_some() {
        return Some("require");
    }
    None
}

fn build_module_resolution_shadow_diagnostics(
    conn: &Connection,
    project_path: &Path,
) -> Result<ModuleResolutionShadowDiagnostics, Box<dyn std::error::Error>> {
    let aliases = load_ts_path_aliases(project_path);
    let workspace_packages = load_workspace_packages(project_path);
    let package_self_names = load_repo_local_package_names(project_path);
    let module_resolution_mode = aliases.module_resolution_mode.clone();
    let module_resolution_mode_source = aliases.module_resolution_mode_source.clone();
    let refs = load_import_refs(conn)?;
    let mut diagnostics = ModuleResolutionShadowDiagnostics {
        effective_mode_source: module_resolution_mode_source.clone(),
        ..ModuleResolutionShadowDiagnostics::default()
    };
    let mut file_content_cache = HashMap::new();

    for reference in refs {
        if !matches!(
            reference.language.as_str(),
            "javascript" | "jsx" | "typescript" | "tsx"
        ) {
            continue;
        }

        let line_specifier = import_line_text(
            project_path,
            &reference.file_path,
            reference.line,
            &mut file_content_cache,
        )
        .and_then(import_line_module_specifier);
        if line_specifier.is_none() && looks_like_imported_binding(&reference.reference_name) {
            continue;
        }
        let specifier = line_specifier.unwrap_or_else(|| reference.reference_name.clone());

        let condition_context = package_condition_context_for_reference(
            project_path,
            &aliases,
            &reference,
            &mut file_content_cache,
        );
        let decision = classify_module_resolution_shadow_decision(
            project_path,
            &aliases,
            &workspace_packages,
            &package_self_names,
            &reference,
            &specifier,
            &condition_context,
        );
        let declaration_target_relationship = declaration_target_relationship_diagnostic(
            project_path,
            &reference.file_path,
            decision.resolved_path.as_deref(),
        );

        diagnostics.record(ModuleResolutionDecisionRecord {
            specifier,
            source_file: reference.file_path,
            module_resolution_mode: module_resolution_mode.clone(),
            module_resolution_mode_source: module_resolution_mode_source.clone(),
            resolved_kind: decision.resolved_kind,
            declaration_target_relationship,
            resolved_path: decision.resolved_path,
            is_external_library_import: matches!(
                decision.failed_lookup_category.as_deref(),
                Some("node-runtime-builtin") | Some("package-or-runtime-import")
            ),
            failed_lookup_category: decision.failed_lookup_category,
            condition_set: decision.condition_set,
            matched_condition: decision.matched_condition,
            parity_status: "unknown".to_string(),
            fallback_reason: decision.fallback_reason,
        });
    }

    Ok(diagnostics)
}

#[derive(Debug)]
struct ModuleResolutionShadowDecision {
    resolved_kind: String,
    resolved_path: Option<String>,
    failed_lookup_category: Option<String>,
    fallback_reason: Option<String>,
    condition_set: Vec<String>,
    matched_condition: Option<String>,
}

impl ModuleResolutionShadowDecision {
    fn new(
        resolved_kind: &str,
        resolved_path: Option<String>,
        failed_lookup_category: Option<String>,
        fallback_reason: Option<String>,
        condition_context: &PackageConditionContext,
        module_resolution_mode: &str,
    ) -> Self {
        Self {
            resolved_kind: resolved_kind.to_string(),
            resolved_path,
            failed_lookup_category,
            fallback_reason,
            condition_set: condition_context.effective_conditions(module_resolution_mode),
            matched_condition: None,
        }
    }

    fn with_condition_match(mut self, matched_condition: Option<String>) -> Self {
        self.matched_condition = matched_condition;
        self
    }
}

fn classify_module_resolution_shadow_decision(
    project_path: &Path,
    aliases: &TsPathAliases,
    workspace_packages: &WorkspacePackages,
    package_self_names: &RepoLocalPackageNames,
    reference: &ImportRefRow,
    specifier: &str,
    condition_context: &PackageConditionContext,
) -> ModuleResolutionShadowDecision {
    if let Some(resolution) = resolve_import_target(
        project_path,
        aliases,
        workspace_packages,
        package_self_names,
        &reference.file_path,
        specifier,
        condition_context,
    ) {
        let kind = resolution.source.as_profile_source_kind();
        if let Some(target_path) = resolution.target {
            return ModuleResolutionShadowDecision {
                resolved_kind: kind.to_string(),
                resolved_path: Some(target_path),
                failed_lookup_category: None,
                fallback_reason: None,
                condition_set: resolution.condition_set,
                matched_condition: resolution.matched_condition,
            };
        }
        return ModuleResolutionShadowDecision {
            resolved_kind: kind.to_string(),
            resolved_path: None,
            failed_lookup_category: Some(
                resolution
                    .outcomes
                    .first()
                    .copied()
                    .unwrap_or_else(|| resolution.source.target_not_found_reason())
                    .to_string(),
            ),
            fallback_reason: Some("rust-shadow-could-not-resolve-file-target".to_string()),
            condition_set: resolution.condition_set,
            matched_condition: resolution.matched_condition,
        };
    }

    if aliases.matches(specifier) {
        return ModuleResolutionShadowDecision::new(
            "tsconfigPaths",
            None,
            Some("tsconfig-path-target-not-found".to_string()),
            Some("rust-shadow-could-not-resolve-tsconfig-path-target".to_string()),
            condition_context,
            &aliases.module_resolution_mode,
        );
    }
    if matches_conventional_alias(specifier).is_some() {
        return ModuleResolutionShadowDecision::new(
            "conventionalAlias",
            None,
            Some("conventional-alias-target-not-found".to_string()),
            Some("rust-shadow-could-not-resolve-conventional-alias-target".to_string()),
            condition_context,
            &aliases.module_resolution_mode,
        );
    }
    if workspace_packages.resolve_import(specifier).is_some() {
        return ModuleResolutionShadowDecision::new(
            "workspacePackage",
            None,
            Some("workspace-package-target-not-found".to_string()),
            Some("rust-shadow-could-not-resolve-workspace-package-target".to_string()),
            condition_context,
            &aliases.module_resolution_mode,
        );
    }
    if specifier.starts_with('#') {
        return match package_self_names.resolve_package_import(
            &reference.file_path,
            specifier,
            &aliases.module_resolution_mode,
            condition_context,
        ) {
            PackageImportsResolution::MissingPackageBoundary => {
                ModuleResolutionShadowDecision::new(
                    "packageImports",
                    None,
                    Some("importsMissingPackageBoundary".to_string()),
                    Some("rust-shadow-missing-package-boundary-for-package-import".to_string()),
                    condition_context,
                    &aliases.module_resolution_mode,
                )
            }
            PackageImportsResolution::MissingImportsMap => ModuleResolutionShadowDecision::new(
                "packageImports",
                None,
                Some("importsMissingMap".to_string()),
                Some("rust-shadow-missing-package-imports-map".to_string()),
                condition_context,
                &aliases.module_resolution_mode,
            ),
            PackageImportsResolution::Unsupported(reason) => ModuleResolutionShadowDecision::new(
                "packageImports",
                None,
                Some(reason.to_string()),
                Some("rust-shadow-unsupported-package-imports".to_string()),
                condition_context,
                &aliases.module_resolution_mode,
            ),
            PackageImportsResolution::Matched {
                matched_condition, ..
            } => ModuleResolutionShadowDecision::new(
                "packageImports",
                None,
                Some("importsMissingTarget".to_string()),
                Some("rust-shadow-could-not-resolve-package-import-target".to_string()),
                condition_context,
                &aliases.module_resolution_mode,
            )
            .with_condition_match(matched_condition),
            PackageImportsResolution::NotPackageImport => ModuleResolutionShadowDecision::new(
                "packageImports",
                None,
                Some("importsMissingTarget".to_string()),
                Some("rust-shadow-could-not-resolve-package-import-target".to_string()),
                condition_context,
                &aliases.module_resolution_mode,
            ),
        };
    }
    match package_self_names.resolve_import(
        specifier,
        &aliases.module_resolution_mode,
        condition_context,
    ) {
        PackageSelfNameResolution::AmbiguousName => {
            return ModuleResolutionShadowDecision::new(
                "packageSelfName",
                None,
                Some("ambiguousName".to_string()),
                Some("rust-shadow-ambiguous-package-self-name".to_string()),
                condition_context,
                &aliases.module_resolution_mode,
            );
        }
        PackageSelfNameResolution::UnsupportedExports(reason) => {
            return ModuleResolutionShadowDecision::new(
                "packageSelfName",
                None,
                Some(reason.to_string()),
                Some("rust-shadow-unsupported-package-exports".to_string()),
                condition_context,
                &aliases.module_resolution_mode,
            );
        }
        PackageSelfNameResolution::MissingPackageName
            if package_self_names.shares_known_scope(specifier) =>
        {
            return ModuleResolutionShadowDecision::new(
                "packageSelfName",
                None,
                Some("missingPackageName".to_string()),
                Some("rust-shadow-missing-package-self-name".to_string()),
                condition_context,
                &aliases.module_resolution_mode,
            );
        }
        PackageSelfNameResolution::MissingPackageName
        | PackageSelfNameResolution::Matched { .. } => {}
    }
    if is_node_runtime_builtin(specifier) {
        return ModuleResolutionShadowDecision::new(
            "nodeRuntimeBuiltin",
            None,
            Some("node-runtime-builtin".to_string()),
            None,
            condition_context,
            &aliases.module_resolution_mode,
        );
    }
    if is_package_like_specifier(specifier) {
        return ModuleResolutionShadowDecision::new(
            "packageOrRuntime",
            None,
            Some("package-or-runtime-import".to_string()),
            Some("rust-shadow-does-not-expand-node-modules".to_string()),
            condition_context,
            &aliases.module_resolution_mode,
        );
    }
    if looks_like_imported_binding(specifier) {
        return ModuleResolutionShadowDecision::new(
            "binding",
            None,
            Some("binding-level-symbol-disambiguation".to_string()),
            Some("rust-shadow-observed-binding-reference-not-module-specifier".to_string()),
            condition_context,
            &aliases.module_resolution_mode,
        );
    }

    ModuleResolutionShadowDecision::new(
        "unsupported",
        None,
        Some("unsupported-import-form".to_string()),
        Some("rust-shadow-unsupported-import-form".to_string()),
        condition_context,
        &aliases.module_resolution_mode,
    )
}

fn load_import_refs(conn: &Connection) -> rusqlite::Result<Vec<ImportRefRow>> {
    let mut stmt = conn.prepare(
        "SELECT id, from_node_id, reference_name, line, col, file_path, language
         FROM unresolved_refs
         WHERE reference_kind = 'imports'
         ORDER BY id",
    )?;
    let rows = stmt.query_map([], |row| {
        Ok(ImportRefRow {
            id: row.get(0)?,
            from_node_id: row.get(1)?,
            reference_name: row.get(2)?,
            line: row.get(3)?,
            col: row.get(4)?,
            file_path: row.get(5)?,
            language: row.get(6)?,
        })
    })?;

    rows.collect()
}

fn is_relative_import_specifier(specifier: &str) -> bool {
    specifier.starts_with("./") || specifier.starts_with("../")
}

fn looks_like_imported_binding(specifier: &str) -> bool {
    let mut chars = specifier.chars();
    let Some(first) = chars.next() else {
        return false;
    };
    (first == '_' || first == '$' || first.is_ascii_alphabetic())
        && chars.all(|ch| ch == '_' || ch == '$' || ch.is_ascii_alphanumeric())
}

fn is_package_like_specifier(specifier: &str) -> bool {
    !specifier.is_empty()
        && !is_relative_import_specifier(specifier)
        && !specifier.starts_with('/')
        && !specifier.contains('\\')
}

fn is_node_runtime_builtin(specifier: &str) -> bool {
    let bare = specifier.strip_prefix("node:").unwrap_or(specifier);
    matches!(
        bare,
        "assert"
            | "async_hooks"
            | "buffer"
            | "child_process"
            | "cluster"
            | "console"
            | "constants"
            | "crypto"
            | "dgram"
            | "diagnostics_channel"
            | "dns"
            | "domain"
            | "events"
            | "fs"
            | "http"
            | "http2"
            | "https"
            | "inspector"
            | "module"
            | "net"
            | "os"
            | "path"
            | "perf_hooks"
            | "process"
            | "punycode"
            | "querystring"
            | "readline"
            | "repl"
            | "stream"
            | "string_decoder"
            | "timers"
            | "tls"
            | "trace_events"
            | "tty"
            | "url"
            | "util"
            | "v8"
            | "vm"
            | "wasi"
            | "worker_threads"
            | "zlib"
    )
}

impl TsPathAliases {
    fn matches(&self, specifier: &str) -> bool {
        self.patterns
            .iter()
            .any(|pattern| pattern.matches(specifier).is_some())
    }
}

impl TsPathAliasPattern {
    fn matches<'a>(&self, specifier: &'a str) -> Option<&'a str> {
        if !specifier.starts_with(&self.prefix) || !specifier.ends_with(&self.suffix) {
            return None;
        }
        let start = self.prefix.len();
        let end = specifier.len().saturating_sub(self.suffix.len());
        if start > end {
            return None;
        }
        Some(&specifier[start..end])
    }
}

fn load_ts_path_aliases(project_path: &Path) -> TsPathAliases {
    load_resolved_ts_config(project_path).aliases
}

#[derive(Debug, Default)]
struct ResolvedTsConfig {
    aliases: TsPathAliases,
}

#[derive(Debug, Clone)]
struct ConfigString {
    value: String,
    config_dir: PathBuf,
}

#[derive(Debug, Clone)]
struct ConfigPathTarget {
    value: String,
    config_dir: PathBuf,
    base_url: String,
}

#[derive(Debug, Clone, Default)]
struct MergedTsConfig {
    module_resolution: Option<String>,
    module: Option<String>,
    base_url: Option<ConfigString>,
    paths: Option<BTreeMap<String, Vec<ConfigPathTarget>>>,
    root_dirs: Option<Vec<ConfigString>>,
    custom_conditions: Option<Vec<String>>,
    allow_js: Option<bool>,
    resolve_json_module: Option<bool>,
}

fn load_resolved_ts_config(project_path: &Path) -> ResolvedTsConfig {
    for config_name in ["tsconfig.json", "jsconfig.json"] {
        let config_path = project_path.join(config_name);
        if let Some(merged) = load_merged_ts_config(project_path, &config_path) {
            return resolved_ts_config_from_merged(project_path, merged);
        }
    }
    resolved_ts_config_from_merged(project_path, MergedTsConfig::default())
}

fn load_merged_ts_config(project_path: &Path, config_path: &Path) -> Option<MergedTsConfig> {
    let mut visiting = HashSet::new();
    load_merged_ts_config_inner(project_path, config_path, &mut visiting, 0)
}

fn load_merged_ts_config_inner(
    project_path: &Path,
    config_path: &Path,
    visiting: &mut HashSet<PathBuf>,
    depth: u8,
) -> Option<MergedTsConfig> {
    if depth > 8 {
        return None;
    }
    let config_path = config_path.to_path_buf();
    if !config_path.is_file() {
        return None;
    }
    let visit_key = fs::canonicalize(&config_path).unwrap_or_else(|_| config_path.clone());
    if !visiting.insert(visit_key.clone()) {
        return None;
    }

    let content = fs::read_to_string(&config_path).ok()?;
    let parsed: Value = serde_json::from_str(&content).ok()?;
    let config_dir = config_path.parent().unwrap_or(project_path);
    let mut merged = parsed
        .get("extends")
        .and_then(Value::as_str)
        .and_then(|extends_value| {
            resolve_repo_local_extends_path(project_path, config_dir, extends_value)
        })
        .and_then(|extends_path| {
            load_merged_ts_config_inner(project_path, &extends_path, visiting, depth + 1)
        })
        .unwrap_or_default();

    let current = parse_current_ts_config_options(config_dir, &parsed);
    merge_ts_config_options(&mut merged, current);
    visiting.remove(&visit_key);
    Some(merged)
}

fn resolve_repo_local_extends_path(
    project_path: &Path,
    config_dir: &Path,
    extends_value: &str,
) -> Option<PathBuf> {
    let raw_path = Path::new(extends_value);
    let base = if raw_path.is_absolute() {
        raw_path.to_path_buf()
    } else if extends_value.starts_with('.') {
        config_dir.join(raw_path)
    } else {
        return None;
    };
    let project_root = fs::canonicalize(project_path).ok()?;
    for candidate in extends_path_candidates(&base) {
        let Ok(canonical_candidate) = fs::canonicalize(&candidate) else {
            continue;
        };
        if canonical_candidate.starts_with(&project_root) && canonical_candidate.is_file() {
            return Some(canonical_candidate);
        }
    }
    None
}

fn extends_path_candidates(base: &Path) -> Vec<PathBuf> {
    let mut candidates = vec![base.to_path_buf()];
    if base.extension().and_then(|extension| extension.to_str()) != Some("json") {
        candidates.push(PathBuf::from(format!("{}.json", base.to_string_lossy())));
    }
    if base.extension().is_none() {
        candidates.push(base.join("tsconfig.json"));
    }
    candidates
}

fn parse_current_ts_config_options(config_dir: &Path, parsed: &Value) -> MergedTsConfig {
    let Some(compiler_options) = parsed.get("compilerOptions") else {
        return MergedTsConfig::default();
    };
    let local_base_url = compiler_options
        .get("baseUrl")
        .and_then(Value::as_str)
        .unwrap_or(".")
        .to_string();
    let paths = compiler_options
        .get("paths")
        .and_then(Value::as_object)
        .map(|raw_paths| {
            raw_paths
                .iter()
                .map(|(key, raw_targets)| {
                    let targets = raw_targets
                        .as_array()
                        .into_iter()
                        .flatten()
                        .filter_map(Value::as_str)
                        .map(|target| ConfigPathTarget {
                            value: target.to_string(),
                            config_dir: config_dir.to_path_buf(),
                            base_url: local_base_url.clone(),
                        })
                        .collect::<Vec<_>>();
                    (key.clone(), targets)
                })
                .collect::<BTreeMap<_, _>>()
        });
    let root_dirs = compiler_options
        .get("rootDirs")
        .and_then(Value::as_array)
        .map(|raw_root_dirs| {
            raw_root_dirs
                .iter()
                .filter_map(Value::as_str)
                .map(|root_dir| ConfigString {
                    value: root_dir.to_string(),
                    config_dir: config_dir.to_path_buf(),
                })
                .collect::<Vec<_>>()
        });
    let custom_conditions = compiler_options
        .get("customConditions")
        .and_then(Value::as_array)
        .map(|raw_conditions| {
            raw_conditions
                .iter()
                .filter_map(Value::as_str)
                .filter(|condition| !condition.is_empty())
                .map(str::to_string)
                .collect::<Vec<_>>()
        });

    MergedTsConfig {
        module_resolution: compiler_options
            .get("moduleResolution")
            .and_then(Value::as_str)
            .map(normalize_module_resolution_mode),
        module: compiler_options
            .get("module")
            .and_then(Value::as_str)
            .map(str::to_string),
        base_url: compiler_options
            .get("baseUrl")
            .and_then(Value::as_str)
            .map(|base_url| ConfigString {
                value: base_url.to_string(),
                config_dir: config_dir.to_path_buf(),
            }),
        paths,
        root_dirs,
        custom_conditions,
        allow_js: compiler_options.get("allowJs").and_then(Value::as_bool),
        resolve_json_module: compiler_options
            .get("resolveJsonModule")
            .and_then(Value::as_bool),
    }
}

fn merge_ts_config_options(base: &mut MergedTsConfig, current: MergedTsConfig) {
    if current.module_resolution.is_some() {
        base.module_resolution = current.module_resolution;
    }
    if current.module.is_some() {
        base.module = current.module;
    }
    if current.base_url.is_some() {
        base.base_url = current.base_url;
    }
    if current.paths.is_some() {
        base.paths = current.paths;
    }
    if current.root_dirs.is_some() {
        base.root_dirs = current.root_dirs;
    }
    if current.custom_conditions.is_some() {
        base.custom_conditions = current.custom_conditions;
    }
    if current.allow_js.is_some() {
        base.allow_js = current.allow_js;
    }
    if current.resolve_json_module.is_some() {
        base.resolve_json_module = current.resolve_json_module;
    }
}

fn resolved_ts_config_from_merged(
    _project_path: &Path,
    merged: MergedTsConfig,
) -> ResolvedTsConfig {
    let module_resolution_source = if merged.module_resolution.is_some() {
        "explicit"
    } else {
        "defaulted"
    }
    .to_string();
    let module_resolution = merged
        .module_resolution
        .clone()
        .unwrap_or_else(|| default_module_resolution_mode(merged.module.as_deref()));
    let root_dirs = merged
        .root_dirs
        .clone()
        .unwrap_or_default()
        .into_iter()
        .map(|root_dir| root_dir.config_dir.join(root_dir.value))
        .collect::<Vec<_>>();
    let patterns = merged
        .paths
        .clone()
        .unwrap_or_default()
        .into_iter()
        .filter_map(|(alias, raw_targets)| {
            let targets = raw_targets
                .into_iter()
                .filter_map(|target| {
                    let (prefix, suffix) = split_alias_pattern(&target.value)?;
                    Some(TsPathAliasTarget {
                        base_path: target.config_dir.join(target.base_url),
                        prefix,
                        suffix,
                    })
                })
                .collect::<Vec<_>>();
            if targets.is_empty() {
                return None;
            }
            let (prefix, suffix) = split_alias_pattern(&alias)?;
            Some(TsPathAliasPattern {
                prefix,
                suffix,
                targets,
            })
        })
        .collect::<Vec<_>>();
    ResolvedTsConfig {
        aliases: TsPathAliases {
            patterns,
            root_dirs,
            module_resolution_mode: module_resolution.clone(),
            module_resolution_mode_source: module_resolution_source.clone(),
            custom_conditions: merged.custom_conditions.clone().unwrap_or_default(),
        },
    }
}

fn normalize_module_resolution_mode(mode: &str) -> String {
    match mode.to_ascii_lowercase().as_str() {
        "node" | "node10" => "node10".to_string(),
        "node16" => "node16".to_string(),
        "nodenext" => "nodenext".to_string(),
        "bundler" => "bundler".to_string(),
        "classic" => "classic".to_string(),
        other => other.to_string(),
    }
}

fn default_module_resolution_mode(module: Option<&str>) -> String {
    match module.map(|value| value.to_ascii_lowercase()) {
        Some(value) if value == "node16" => "node16".to_string(),
        Some(value) if value == "nodenext" => "nodenext".to_string(),
        _ => "node10".to_string(),
    }
}

fn split_alias_pattern(pattern: &str) -> Option<(String, String)> {
    match pattern.split_once('*') {
        Some((prefix, suffix)) => Some((prefix.to_string(), suffix.to_string())),
        None => Some((pattern.to_string(), String::new())),
    }
}

fn load_workspace_packages(project_path: &Path) -> WorkspacePackages {
    let mut packages = WorkspacePackages::default();
    for pattern in read_workspace_globs(project_path) {
        for dir in expand_workspace_glob(project_path, &pattern) {
            let package_json = project_path.join(&dir).join("package.json");
            let Ok(content) = fs::read_to_string(package_json) else {
                continue;
            };
            let Ok(parsed) = serde_json::from_str::<Value>(&content) else {
                continue;
            };
            let Some(name) = parsed.get("name").and_then(Value::as_str) else {
                continue;
            };
            if !name.is_empty() {
                packages
                    .by_name
                    .entry(name.to_string())
                    .or_insert_with(|| dir.clone());
            }
        }
    }
    packages
}

fn load_repo_local_package_names(project_path: &Path) -> RepoLocalPackageNames {
    let mut packages = RepoLocalPackageNames::default();
    collect_repo_local_package_names(project_path, project_path, &mut packages);
    for packages_for_name in packages.by_name.values_mut() {
        packages_for_name.sort_by(|left, right| left.dir.cmp(&right.dir));
        packages_for_name.dedup_by(|left, right| left.dir == right.dir);
    }
    packages
        .packages
        .sort_by(|left, right| left.dir.cmp(&right.dir));
    packages
        .packages
        .dedup_by(|left, right| left.dir == right.dir);
    packages
}

fn collect_repo_local_package_names(
    project_path: &Path,
    dir: &Path,
    packages: &mut RepoLocalPackageNames,
) {
    let Ok(relative_dir) = dir.strip_prefix(project_path) else {
        return;
    };
    if is_ignored_repo_local_package_dir(relative_dir) {
        return;
    }

    let package_json = dir.join("package.json");
    if let Ok(content) = fs::read_to_string(&package_json) {
        if let Ok(parsed) = serde_json::from_str::<Value>(&content) {
            if let Some(name) = parsed.get("name").and_then(Value::as_str) {
                if !name.is_empty() {
                    let rel = normalize_path(relative_dir);
                    let package = RepoLocalPackage {
                        dir: rel.clone(),
                        exports: parsed.get("exports").cloned(),
                        imports: parsed.get("imports").cloned(),
                    };
                    packages
                        .by_name
                        .entry(name.to_string())
                        .or_default()
                        .push(package.clone());
                    packages.packages.push(package);
                }
            }
        }
    }

    let Ok(entries) = fs::read_dir(dir) else {
        return;
    };
    for entry in entries.flatten() {
        let Ok(file_type) = entry.file_type() else {
            continue;
        };
        if !file_type.is_dir() {
            continue;
        }
        collect_repo_local_package_names(project_path, &entry.path(), packages);
    }
}

fn is_ignored_repo_local_package_dir(relative_dir: &Path) -> bool {
    relative_dir.components().any(|component| {
        let name = component.as_os_str().to_string_lossy();
        matches!(
            name.as_ref(),
            ".git" | ".zcodegraph" | "node_modules" | "vendor" | "generated"
        )
    })
}

fn normalize_path(path: &Path) -> String {
    path.to_string_lossy().replace('\\', "/")
}

fn package_root_fallback_target(package_dir: &str, subpath: &str) -> PathBuf {
    if subpath.is_empty() {
        Path::new(package_dir).join("index")
    } else {
        Path::new(package_dir).join(subpath)
    }
}

fn resolve_simple_package_exports(
    exports: &Value,
    subpath: &str,
    module_resolution_mode: &str,
    condition_context: &PackageConditionContext,
) -> PackageExportsResolution {
    let condition_order = condition_context.effective_conditions(module_resolution_mode);
    let export_key = if subpath.is_empty() {
        "."
    } else {
        return match export_key_for_subpath(subpath) {
            Some(key) => resolve_package_exports_key(exports, &key, &condition_order),
            None => PackageExportsResolution::Unsupported("exportsUnsupported"),
        };
    };
    resolve_package_exports_key(exports, export_key, &condition_order)
}

fn export_key_for_subpath(subpath: &str) -> Option<String> {
    if subpath.is_empty() || subpath.contains('*') {
        return None;
    }
    Some(format!("./{}", subpath.trim_start_matches('/')))
}

fn resolve_package_exports_key(
    exports: &Value,
    key: &str,
    condition_order: &[String],
) -> PackageExportsResolution {
    match exports {
        Value::String(target) if key == "." => {
            validate_package_exports_target(target, None, condition_order)
        }
        Value::String(_) => PackageExportsResolution::Missing,
        Value::Object(entries) => match entries.get(key) {
            Some(value) => resolve_package_exports_target_value(value, condition_order),
            None => resolve_package_exports_pattern(entries, key, condition_order),
        },
        _ => PackageExportsResolution::Unsupported("exportsUnsupported"),
    }
}

fn resolve_package_exports_pattern(
    entries: &serde_json::Map<String, Value>,
    key: &str,
    condition_order: &[String],
) -> PackageExportsResolution {
    let mut best: Option<(&str, &Value, &str)> = None;
    for (pattern, value) in entries {
        let Some(captured) = match_single_star_export_pattern(pattern, key) else {
            continue;
        };
        if best.map_or(true, |(current, _, _)| {
            pattern_prefix_len(pattern) > pattern_prefix_len(current)
        }) {
            best = Some((pattern.as_str(), value, captured));
        }
    }
    let Some((_pattern, value, captured)) = best else {
        return PackageExportsResolution::Missing;
    };
    resolve_package_exports_pattern_target_value(value, captured, condition_order)
}

fn match_single_star_export_pattern<'a>(pattern: &str, key: &'a str) -> Option<&'a str> {
    if pattern.matches('*').count() != 1 {
        return None;
    }
    let (prefix, suffix) = pattern.split_once('*')?;
    if !prefix.starts_with("./") || !key.starts_with(prefix) || !key.ends_with(suffix) {
        return None;
    }
    let start = prefix.len();
    let end = key.len().saturating_sub(suffix.len());
    if start > end {
        return None;
    }
    Some(&key[start..end])
}

fn pattern_prefix_len(pattern: &str) -> usize {
    pattern
        .split_once('*')
        .map_or(0, |(prefix, _)| prefix.len())
}

fn resolve_package_exports_pattern_target_value(
    value: &Value,
    captured: &str,
    condition_order: &[String],
) -> PackageExportsResolution {
    match value {
        Value::String(target) => {
            resolve_package_exports_pattern_target(target, captured, None, condition_order)
        }
        Value::Object(conditions) => {
            resolve_package_exports_pattern_condition_object(conditions, captured, condition_order)
        }
        Value::Null => PackageExportsResolution::Unsupported("exportsBlocked"),
        _ => PackageExportsResolution::Unsupported("exportsUnsupported"),
    }
}

fn resolve_package_exports_pattern_condition_object(
    conditions: &serde_json::Map<String, Value>,
    captured: &str,
    condition_order: &[String],
) -> PackageExportsResolution {
    resolve_package_exports_pattern_condition_object_at_depth(
        conditions,
        captured,
        condition_order,
        1,
    )
}

fn resolve_package_exports_pattern_condition_object_at_depth(
    conditions: &serde_json::Map<String, Value>,
    captured: &str,
    condition_order: &[String],
    depth: u8,
) -> PackageExportsResolution {
    for condition in condition_order {
        if let Some(value) = conditions.get(condition) {
            return resolve_package_exports_pattern_condition_value(
                value,
                captured,
                condition_order,
                Some(condition.as_str()),
                depth,
            );
        }
    }
    for value in conditions.values() {
        let resolved = resolve_package_exports_pattern_condition_value(
            value,
            captured,
            condition_order,
            None,
            depth,
        );
        if !matches!(
            resolved,
            PackageExportsResolution::Unsupported("exportsUnsupported")
        ) {
            return resolved;
        }
        if matches!(value, Value::Object(_) | Value::Array(_)) {
            return resolved;
        }
    }
    PackageExportsResolution::Unsupported("exportsUnsupported")
}

fn resolve_package_exports_pattern_condition_value(
    value: &Value,
    captured: &str,
    condition_order: &[String],
    matched_condition: Option<&str>,
    depth: u8,
) -> PackageExportsResolution {
    match value {
        Value::String(target) => resolve_package_exports_pattern_target(
            target,
            captured,
            matched_condition,
            condition_order,
        ),
        Value::Object(conditions) if depth < 2 => {
            resolve_package_exports_pattern_condition_object_at_depth(
                conditions,
                captured,
                condition_order,
                depth + 1,
            )
        }
        Value::Null => PackageExportsResolution::Unsupported("exportsBlocked"),
        Value::Object(_) | Value::Array(_) => {
            PackageExportsResolution::Unsupported("exportsUnsupported")
        }
        _ => PackageExportsResolution::Unsupported("exportsUnsupported"),
    }
}

fn resolve_package_exports_pattern_target(
    target: &str,
    captured: &str,
    matched_condition: Option<&str>,
    condition_order: &[String],
) -> PackageExportsResolution {
    if target.matches('*').count() != 1 {
        return PackageExportsResolution::Unsupported("exportsUnsupported");
    }
    validate_package_exports_target(
        &target.replacen('*', captured, 1),
        matched_condition,
        condition_order,
    )
}

fn resolve_package_exports_target_value(
    value: &Value,
    condition_order: &[String],
) -> PackageExportsResolution {
    match value {
        Value::String(target) => validate_package_exports_target(target, None, condition_order),
        Value::Object(conditions) => {
            resolve_package_exports_condition_object(conditions, condition_order)
        }
        Value::Null => PackageExportsResolution::Unsupported("exportsBlocked"),
        _ => PackageExportsResolution::Unsupported("exportsUnsupported"),
    }
}

fn resolve_package_exports_condition_object(
    conditions: &serde_json::Map<String, Value>,
    condition_order: &[String],
) -> PackageExportsResolution {
    resolve_package_exports_condition_object_at_depth(conditions, condition_order, 1)
}

fn resolve_package_exports_condition_object_at_depth(
    conditions: &serde_json::Map<String, Value>,
    condition_order: &[String],
    depth: u8,
) -> PackageExportsResolution {
    for condition in condition_order {
        if let Some(value) = conditions.get(condition) {
            return resolve_package_exports_condition_value(
                value,
                condition_order,
                Some(condition.as_str()),
                depth,
            );
        }
    }
    for value in conditions.values() {
        let resolved = resolve_package_exports_condition_value(value, condition_order, None, depth);
        if !matches!(
            resolved,
            PackageExportsResolution::Unsupported("exportsUnsupported")
        ) {
            return resolved;
        }
        if matches!(value, Value::Object(_) | Value::Array(_)) {
            return resolved;
        }
    }
    PackageExportsResolution::Unsupported("exportsUnsupported")
}

fn resolve_package_exports_condition_value(
    value: &Value,
    condition_order: &[String],
    matched_condition: Option<&str>,
    depth: u8,
) -> PackageExportsResolution {
    match value {
        Value::String(target) => {
            validate_package_exports_target(target, matched_condition, condition_order)
        }
        Value::Object(conditions) if depth < 2 => {
            resolve_package_exports_condition_object_at_depth(
                conditions,
                condition_order,
                depth + 1,
            )
        }
        Value::Null => PackageExportsResolution::Unsupported("exportsBlocked"),
        Value::Object(_) | Value::Array(_) => {
            PackageExportsResolution::Unsupported("exportsUnsupported")
        }
        _ => PackageExportsResolution::Unsupported("exportsUnsupported"),
    }
}

fn validate_package_exports_target(
    target: &str,
    matched_condition: Option<&str>,
    condition_order: &[String],
) -> PackageExportsResolution {
    if target.starts_with("../") || target.starts_with('/') {
        return PackageExportsResolution::Unsupported("exportsTargetEscapesRepo");
    }
    if !target.starts_with("./") || target.contains('*') {
        return PackageExportsResolution::Unsupported("exportsUnsupported");
    }
    let normalized = Path::new(target).components().collect::<Vec<_>>();
    if normalized.iter().any(|component| {
        matches!(
            component,
            std::path::Component::ParentDir | std::path::Component::RootDir
        )
    }) {
        return PackageExportsResolution::Unsupported("exportsTargetEscapesRepo");
    }
    PackageExportsResolution::Resolved(PackageMapResolvedTarget {
        target: PathBuf::from(target.trim_start_matches("./")),
        condition_set: condition_order.to_vec(),
        matched_condition: matched_condition.map(str::to_string),
    })
}

fn resolve_package_imports_map(
    imports: &Value,
    key: &str,
    module_resolution_mode: &str,
    condition_context: &PackageConditionContext,
) -> PackageImportsMapResolution {
    let condition_order = condition_context.effective_conditions(module_resolution_mode);
    if !key.starts_with('#') || key.contains('*') {
        return PackageImportsMapResolution::Unsupported("importsUnsupported");
    }
    match imports {
        Value::Object(entries) => match entries.get(key) {
            Some(value) => resolve_package_imports_target_value(value, &condition_order),
            None => resolve_package_imports_pattern(entries, key, &condition_order),
        },
        _ => PackageImportsMapResolution::Unsupported("importsUnsupported"),
    }
}

fn resolve_package_imports_pattern(
    entries: &serde_json::Map<String, Value>,
    key: &str,
    condition_order: &[String],
) -> PackageImportsMapResolution {
    let mut best: Option<(&str, &Value, &str)> = None;
    for (pattern, value) in entries {
        let Some(captured) = match_single_star_package_import_pattern(pattern, key) else {
            continue;
        };
        if best.map_or(true, |(current, _, _)| {
            pattern_prefix_len(pattern) > pattern_prefix_len(current)
        }) {
            best = Some((pattern.as_str(), value, captured));
        }
    }
    let Some((_pattern, value, captured)) = best else {
        return PackageImportsMapResolution::Missing;
    };
    resolve_package_imports_pattern_target_value(value, captured, condition_order)
}

fn match_single_star_package_import_pattern<'a>(pattern: &str, key: &'a str) -> Option<&'a str> {
    if pattern.matches('*').count() != 1 {
        return None;
    }
    let (prefix, suffix) = pattern.split_once('*')?;
    if !prefix.starts_with('#') || !key.starts_with(prefix) || !key.ends_with(suffix) {
        return None;
    }
    let start = prefix.len();
    let end = key.len().saturating_sub(suffix.len());
    if start > end {
        return None;
    }
    Some(&key[start..end])
}

fn resolve_package_imports_pattern_target_value(
    value: &Value,
    captured: &str,
    condition_order: &[String],
) -> PackageImportsMapResolution {
    match value {
        Value::String(target) => {
            resolve_package_imports_pattern_target(target, captured, None, condition_order)
        }
        Value::Object(conditions) => {
            resolve_package_imports_pattern_condition_object(conditions, captured, condition_order)
        }
        Value::Null => PackageImportsMapResolution::Unsupported("importsBlocked"),
        _ => PackageImportsMapResolution::Unsupported("importsUnsupported"),
    }
}

fn resolve_package_imports_pattern_condition_object(
    conditions: &serde_json::Map<String, Value>,
    captured: &str,
    condition_order: &[String],
) -> PackageImportsMapResolution {
    resolve_package_imports_pattern_condition_object_at_depth(
        conditions,
        captured,
        condition_order,
        1,
    )
}

fn resolve_package_imports_pattern_condition_object_at_depth(
    conditions: &serde_json::Map<String, Value>,
    captured: &str,
    condition_order: &[String],
    depth: u8,
) -> PackageImportsMapResolution {
    for condition in condition_order {
        if let Some(value) = conditions.get(condition) {
            return resolve_package_imports_pattern_condition_value(
                value,
                captured,
                condition_order,
                Some(condition.as_str()),
                depth,
            );
        }
    }
    for value in conditions.values() {
        let resolved = resolve_package_imports_pattern_condition_value(
            value,
            captured,
            condition_order,
            None,
            depth,
        );
        if !matches!(
            resolved,
            PackageImportsMapResolution::Unsupported("importsUnsupported")
        ) {
            return resolved;
        }
        if matches!(value, Value::Object(_) | Value::Array(_)) {
            return resolved;
        }
    }
    PackageImportsMapResolution::Unsupported("importsUnsupported")
}

fn resolve_package_imports_pattern_condition_value(
    value: &Value,
    captured: &str,
    condition_order: &[String],
    matched_condition: Option<&str>,
    depth: u8,
) -> PackageImportsMapResolution {
    match value {
        Value::String(target) => resolve_package_imports_pattern_target(
            target,
            captured,
            matched_condition,
            condition_order,
        ),
        Value::Object(conditions) if depth < 2 => {
            resolve_package_imports_pattern_condition_object_at_depth(
                conditions,
                captured,
                condition_order,
                depth + 1,
            )
        }
        Value::Null => PackageImportsMapResolution::Unsupported("importsBlocked"),
        Value::Object(_) | Value::Array(_) => {
            PackageImportsMapResolution::Unsupported("importsUnsupported")
        }
        _ => PackageImportsMapResolution::Unsupported("importsUnsupported"),
    }
}

fn resolve_package_imports_pattern_target(
    target: &str,
    captured: &str,
    matched_condition: Option<&str>,
    condition_order: &[String],
) -> PackageImportsMapResolution {
    if target.matches('*').count() != 1 {
        return PackageImportsMapResolution::Unsupported("importsUnsupported");
    }
    validate_package_imports_target(
        &target.replacen('*', captured, 1),
        matched_condition,
        condition_order,
    )
}

fn resolve_package_imports_target_value(
    value: &Value,
    condition_order: &[String],
) -> PackageImportsMapResolution {
    match value {
        Value::String(target) => validate_package_imports_target(target, None, condition_order),
        Value::Object(conditions) => {
            resolve_package_imports_condition_object(conditions, condition_order)
        }
        Value::Null => PackageImportsMapResolution::Unsupported("importsBlocked"),
        _ => PackageImportsMapResolution::Unsupported("importsUnsupported"),
    }
}

fn resolve_package_imports_condition_object(
    conditions: &serde_json::Map<String, Value>,
    condition_order: &[String],
) -> PackageImportsMapResolution {
    resolve_package_imports_condition_object_at_depth(conditions, condition_order, 1)
}

fn resolve_package_imports_condition_object_at_depth(
    conditions: &serde_json::Map<String, Value>,
    condition_order: &[String],
    depth: u8,
) -> PackageImportsMapResolution {
    for condition in condition_order {
        if let Some(value) = conditions.get(condition) {
            return resolve_package_imports_condition_value(
                value,
                condition_order,
                Some(condition.as_str()),
                depth,
            );
        }
    }
    for value in conditions.values() {
        let resolved = resolve_package_imports_condition_value(value, condition_order, None, depth);
        if !matches!(
            resolved,
            PackageImportsMapResolution::Unsupported("importsUnsupported")
        ) {
            return resolved;
        }
        if matches!(value, Value::Object(_) | Value::Array(_)) {
            return resolved;
        }
    }
    PackageImportsMapResolution::Unsupported("importsUnsupported")
}

fn resolve_package_imports_condition_value(
    value: &Value,
    condition_order: &[String],
    matched_condition: Option<&str>,
    depth: u8,
) -> PackageImportsMapResolution {
    match value {
        Value::String(target) => {
            validate_package_imports_target(target, matched_condition, condition_order)
        }
        Value::Object(conditions) if depth < 2 => {
            resolve_package_imports_condition_object_at_depth(
                conditions,
                condition_order,
                depth + 1,
            )
        }
        Value::Null => PackageImportsMapResolution::Unsupported("importsBlocked"),
        Value::Object(_) | Value::Array(_) => {
            PackageImportsMapResolution::Unsupported("importsUnsupported")
        }
        _ => PackageImportsMapResolution::Unsupported("importsUnsupported"),
    }
}

fn validate_package_imports_target(
    target: &str,
    matched_condition: Option<&str>,
    condition_order: &[String],
) -> PackageImportsMapResolution {
    if target.starts_with('/') {
        return PackageImportsMapResolution::Unsupported("importsTargetEscapesRepo");
    }
    if target.starts_with("../") {
        return PackageImportsMapResolution::Unsupported("importsTargetEscapesPackage");
    }
    if !target.starts_with("./") || target.contains('*') {
        return PackageImportsMapResolution::Unsupported("importsUnsupported");
    }
    let normalized = Path::new(target).components().collect::<Vec<_>>();
    if normalized.iter().any(|component| {
        matches!(
            component,
            std::path::Component::ParentDir | std::path::Component::RootDir
        )
    }) {
        return PackageImportsMapResolution::Unsupported("importsTargetEscapesPackage");
    }
    PackageImportsMapResolution::Resolved(PackageMapResolvedTarget {
        target: PathBuf::from(target.trim_start_matches("./")),
        condition_set: condition_order.to_vec(),
        matched_condition: matched_condition.map(str::to_string),
    })
}

fn path_stays_within_package(target: &Path, package_dir: &str) -> bool {
    let normalized = normalize_path(target);
    package_dir.is_empty()
        || normalized == package_dir
        || normalized.starts_with(&format!("{}/", package_dir))
}

fn read_workspace_globs(project_path: &Path) -> Vec<String> {
    let mut globs = Vec::new();
    if let Ok(content) = fs::read_to_string(project_path.join("package.json")) {
        if let Ok(parsed) = serde_json::from_str::<Value>(&content) {
            if let Some(workspaces) = parsed.get("workspaces") {
                if let Some(items) = workspaces.as_array() {
                    globs.extend(items.iter().filter_map(Value::as_str).map(str::to_string));
                } else if let Some(items) = workspaces.get("packages").and_then(Value::as_array) {
                    globs.extend(items.iter().filter_map(Value::as_str).map(str::to_string));
                }
            }
        }
    }
    if let Ok(content) = fs::read_to_string(project_path.join("pnpm-workspace.yaml")) {
        globs.extend(parse_pnpm_workspace_packages(&content));
    }
    globs
}

fn parse_pnpm_workspace_packages(content: &str) -> Vec<String> {
    let mut packages = Vec::new();
    let mut in_packages = false;
    for line in content.lines() {
        if line.trim_start().starts_with("packages:") {
            in_packages = true;
            continue;
        }
        if !in_packages {
            continue;
        }
        let trimmed = line.trim();
        if let Some(item) = trimmed.strip_prefix("- ") {
            packages.push(item.trim_matches('"').trim_matches('\'').to_string());
            continue;
        }
        if !trimmed.is_empty() && !line.starts_with(char::is_whitespace) {
            in_packages = false;
        }
    }
    packages
}

fn expand_workspace_glob(project_path: &Path, pattern: &str) -> Vec<String> {
    let normalized = pattern.replace('\\', "/").trim_end_matches('/').to_string();
    let Some(star_index) = normalized.find('*') else {
        return vec![normalized];
    };
    let base = normalized[..star_index].trim_end_matches('/');
    let Ok(entries) = fs::read_dir(project_path.join(base)) else {
        return Vec::new();
    };
    let mut dirs = Vec::new();
    for entry in entries.flatten() {
        let Ok(file_type) = entry.file_type() else {
            continue;
        };
        if !file_type.is_dir() {
            continue;
        }
        let name = entry.file_name().to_string_lossy().to_string();
        if name.starts_with('.') || name == "node_modules" {
            continue;
        }
        dirs.push(if base.is_empty() {
            name
        } else {
            format!("{}/{}", base, name)
        });
    }
    dirs.sort();
    dirs
}

fn resolve_import_target(
    project_path: &Path,
    aliases: &TsPathAliases,
    workspace_packages: &WorkspacePackages,
    package_self_names: &RepoLocalPackageNames,
    from_file_path: &str,
    specifier: &str,
    condition_context: &PackageConditionContext,
) -> Option<ImportTargetResolution> {
    if specifier.starts_with('#') {
        match package_self_names.resolve_package_import(
            from_file_path,
            specifier,
            &aliases.module_resolution_mode,
            condition_context,
        ) {
            PackageImportsResolution::Matched {
                target,
                outcomes,
                condition_set,
                matched_condition,
            } => {
                let resolved = resolve_import_candidate(project_path, &project_path.join(target));
                let outcomes = if resolved.is_some() {
                    outcomes
                } else {
                    vec!["importsMissingTarget"]
                };
                return Some(ImportTargetResolution::package_map(
                    ImportTargetSourceKind::PackageImports,
                    resolved,
                    outcomes,
                    condition_set,
                    matched_condition,
                ));
            }
            PackageImportsResolution::MissingPackageBoundary => {
                return Some(ImportTargetResolution::new(
                    ImportTargetSourceKind::PackageImports,
                    None,
                    vec!["importsMissingPackageBoundary"],
                ));
            }
            PackageImportsResolution::MissingImportsMap => {
                return Some(ImportTargetResolution::new(
                    ImportTargetSourceKind::PackageImports,
                    None,
                    vec!["importsMissingMap"],
                ));
            }
            PackageImportsResolution::Unsupported(reason) => {
                return Some(ImportTargetResolution::new(
                    ImportTargetSourceKind::PackageImports,
                    None,
                    vec![reason],
                ));
            }
            PackageImportsResolution::NotPackageImport => {}
        }
    }
    if is_relative_import_specifier(specifier) {
        let direct = resolve_relative_import(project_path, from_file_path, specifier);
        if direct.is_some() {
            return Some(ImportTargetResolution::new(
                ImportTargetSourceKind::Relative,
                direct,
                Vec::new(),
            ));
        }
        match resolve_root_dirs_relative_import(project_path, aliases, from_file_path, specifier) {
            RootDirsResolution::Resolved(root_dirs_target) => {
                return Some(ImportTargetResolution::new(
                    ImportTargetSourceKind::RootDirs,
                    Some(root_dirs_target),
                    Vec::new(),
                ));
            }
            RootDirsResolution::TargetNotFound => {
                return Some(ImportTargetResolution::new(
                    ImportTargetSourceKind::RootDirs,
                    None,
                    vec!["rootDirsTargetNotFound"],
                ));
            }
            RootDirsResolution::ConfigOutOfScope => {
                return Some(ImportTargetResolution::new(
                    ImportTargetSourceKind::RootDirs,
                    None,
                    vec!["rootDirsConfigOutOfScope"],
                ));
            }
            RootDirsResolution::NotConfigured => {}
        }
        return Some(ImportTargetResolution::new(
            ImportTargetSourceKind::Relative,
            None,
            Vec::new(),
        ));
    }
    if aliases.matches(specifier) {
        return Some(ImportTargetResolution::new(
            ImportTargetSourceKind::TsconfigPaths,
            resolve_alias_import(project_path, aliases, specifier),
            Vec::new(),
        ));
    }
    if let Some(base) = resolve_conventional_alias(specifier) {
        return Some(ImportTargetResolution::new(
            ImportTargetSourceKind::ConventionalAlias,
            resolve_import_candidate(project_path, &project_path.join(base)),
            Vec::new(),
        ));
    }
    if let Some(base) = workspace_packages.resolve_import(specifier) {
        return Some(ImportTargetResolution::new(
            ImportTargetSourceKind::WorkspacePackage,
            resolve_import_candidate(project_path, &project_path.join(base)),
            Vec::new(),
        ));
    }
    match package_self_names.resolve_import(
        specifier,
        &aliases.module_resolution_mode,
        condition_context,
    ) {
        PackageSelfNameResolution::Matched {
            target,
            outcomes,
            condition_set,
            matched_condition,
        } => {
            let resolved = resolve_import_candidate(project_path, &project_path.join(target));
            let outcomes = if resolved.is_some() {
                outcomes
            } else {
                vec!["missingTarget"]
            };
            return Some(ImportTargetResolution::package_map(
                ImportTargetSourceKind::PackageSelfName,
                resolved,
                outcomes,
                condition_set,
                matched_condition,
            ));
        }
        PackageSelfNameResolution::AmbiguousName => {
            return Some(ImportTargetResolution::new(
                ImportTargetSourceKind::PackageSelfName,
                None,
                vec!["ambiguousName"],
            ));
        }
        PackageSelfNameResolution::UnsupportedExports(reason) => {
            return Some(ImportTargetResolution::new(
                ImportTargetSourceKind::PackageSelfName,
                None,
                vec![reason],
            ));
        }
        PackageSelfNameResolution::MissingPackageName => {}
    }
    None
}

fn resolve_conventional_alias(specifier: &str) -> Option<String> {
    matches_conventional_alias(specifier)
        .map(|(alias, replacement)| format!("{}{}", replacement, &specifier[alias.len()..]))
}

fn matches_conventional_alias(specifier: &str) -> Option<(&'static str, &'static str)> {
    [
        ("@/", "src/"),
        ("~/", "src/"),
        ("@src/", "src/"),
        ("src/", "src/"),
        ("@app/", "app/"),
        ("app/", "app/"),
    ]
    .into_iter()
    .find(|(alias, _)| specifier.starts_with(alias))
}

fn resolve_relative_import(
    project_path: &Path,
    from_file_path: &str,
    specifier: &str,
) -> Option<String> {
    let from_dir = Path::new(from_file_path)
        .parent()
        .unwrap_or_else(|| Path::new(""));
    let base = project_path.join(from_dir).join(specifier);
    resolve_relative_import_candidate(project_path, &base)
}

fn resolve_root_dirs_relative_import(
    project_path: &Path,
    aliases: &TsPathAliases,
    from_file_path: &str,
    specifier: &str,
) -> RootDirsResolution {
    if aliases.root_dirs.len() < 2 {
        return RootDirsResolution::NotConfigured;
    }
    let from_dir = Path::new(from_file_path)
        .parent()
        .unwrap_or_else(|| Path::new(""));
    let absolute_from_dir = project_path.join(from_dir);
    let Ok(canonical_from_dir) = fs::canonicalize(&absolute_from_dir) else {
        return RootDirsResolution::ConfigOutOfScope;
    };
    let mut source_is_in_root_dir = false;

    for root_dir in &aliases.root_dirs {
        let Ok(canonical_root_dir) = fs::canonicalize(root_dir) else {
            continue;
        };
        let Ok(virtual_from_dir) = canonical_from_dir.strip_prefix(&canonical_root_dir) else {
            continue;
        };
        source_is_in_root_dir = true;
        for sibling_root_dir in &aliases.root_dirs {
            if sibling_root_dir == root_dir {
                continue;
            }
            let sibling_base = sibling_root_dir.join(virtual_from_dir).join(specifier);
            if let Some(resolved) = resolve_relative_import_candidate(project_path, &sibling_base) {
                return RootDirsResolution::Resolved(resolved);
            }
        }
    }
    if source_is_in_root_dir {
        RootDirsResolution::TargetNotFound
    } else {
        RootDirsResolution::ConfigOutOfScope
    }
}

fn resolve_alias_import(
    project_path: &Path,
    aliases: &TsPathAliases,
    specifier: &str,
) -> Option<String> {
    for pattern in &aliases.patterns {
        let Some(capture) = pattern.matches(specifier) else {
            continue;
        };
        for target in &pattern.targets {
            let candidate = target
                .base_path
                .join(format!("{}{}{}", target.prefix, capture, target.suffix));
            if let Some(resolved) = resolve_import_candidate(project_path, &candidate) {
                return Some(resolved);
            }
        }
    }
    None
}

fn resolve_import_candidate(project_path: &Path, base: &Path) -> Option<String> {
    for candidate in import_file_candidates(base) {
        if candidate.is_file() {
            return canonical_relative_slash_path(project_path, &candidate);
        }
    }
    None
}

fn resolve_relative_import_candidate(project_path: &Path, base: &Path) -> Option<String> {
    for candidate in relative_import_file_candidates(base) {
        if candidate.is_file() {
            return canonical_relative_slash_path(project_path, &candidate);
        }
    }
    None
}

fn import_file_candidates(base: &Path) -> Vec<PathBuf> {
    let mut candidates = Vec::new();
    if base.extension().is_some() {
        candidates.extend(explicit_runtime_extension_pair_candidates(base));
    } else {
        for extension in EXTENSIONLESS_FILE_TARGET_EXTENSIONS {
            candidates.push(base.with_extension(extension));
        }
    }
    for extension in EXTENSIONLESS_FILE_TARGET_EXTENSIONS {
        candidates.push(base.join("index").with_extension(extension));
    }
    candidates
}

const EXTENSIONLESS_FILE_TARGET_EXTENSIONS: &[&str] = &[
    "ts", "tsx", "mts", "cts", "d.ts", "d.mts", "d.cts", "js", "jsx", "mjs", "cjs",
];

fn relative_import_file_candidates(base: &Path) -> Vec<PathBuf> {
    let mut candidates = Vec::new();
    if base.extension().is_some() {
        candidates.extend(explicit_runtime_extension_pair_candidates(base));
    } else {
        candidates.extend(import_file_candidates(base));
    }
    candidates
}

fn explicit_runtime_extension_pair_candidates(base: &Path) -> Vec<PathBuf> {
    let Some(extensions) = explicit_runtime_extension_pair_extensions(base) else {
        return vec![base.to_path_buf()];
    };
    extensions
        .iter()
        .map(|extension| base.with_extension(extension))
        .collect()
}

fn explicit_runtime_extension_pair_extensions(base: &Path) -> Option<&'static [&'static str]> {
    match base.extension().and_then(|extension| extension.to_str()) {
        Some("js") => Some(&["ts", "tsx", "js"]),
        Some("jsx") => Some(&["tsx", "jsx"]),
        Some("mjs") => Some(&["mts", "mjs"]),
        Some("cjs") => Some(&["cts", "cjs"]),
        _ => None,
    }
}

fn classify_import_target_kind(file_path: &str) -> Option<String> {
    let extension = import_target_extension(file_path)?;
    let kind = match extension.as_str() {
        ".ts" | ".tsx" | ".js" | ".jsx" | ".mts" | ".cts" | ".mjs" | ".cjs" => "source",
        ".css" | ".scss" | ".sass" | ".less" | ".wasm" | ".svg" | ".png" | ".jpg" | ".jpeg"
        | ".gif" | ".webp" | ".avif" | ".ico" | ".bmp" | ".mp3" | ".mp4" | ".wav" | ".woff"
        | ".woff2" | ".ttf" | ".eot" => "asset",
        ".json" | ".jsonc" | ".yaml" | ".yml" | ".toml" => "config",
        _ => "unknown",
    };
    Some(kind.to_string())
}

fn import_target_extension(file_path: &str) -> Option<String> {
    let path = file_path.split(['?', '#']).next().unwrap_or(file_path);
    let file_name = Path::new(path).file_name()?.to_string_lossy();
    if file_name.ends_with(".d.ts") {
        return Some(".d.ts".to_string());
    }
    if file_name.ends_with(".d.mts") {
        return Some(".d.mts".to_string());
    }
    if file_name.ends_with(".d.cts") {
        return Some(".d.cts".to_string());
    }
    Path::new(path)
        .extension()
        .and_then(|extension| extension.to_str())
        .map(|extension| format!(".{}", extension))
}

fn canonical_relative_slash_path(project_path: &Path, path: &Path) -> Option<String> {
    let canonical_root = fs::canonicalize(project_path).ok()?;
    let canonical_path = fs::canonicalize(path).ok()?;
    canonical_path
        .strip_prefix(canonical_root)
        .ok()
        .map(|relative| {
            relative
                .to_string_lossy()
                .replace(std::path::MAIN_SEPARATOR, "/")
        })
}

fn find_file_node_id(conn: &Connection, file_path: &str) -> rusqlite::Result<Option<String>> {
    let mut stmt =
        conn.prepare("SELECT id FROM nodes WHERE kind = 'file' AND file_path = ?1 LIMIT 1")?;
    let mut rows = stmt.query(params![file_path])?;
    if let Some(row) = rows.next()? {
        Ok(Some(row.get(0)?))
    } else {
        Ok(None)
    }
}

fn guarded_module_resolution_edge_write_decision(
    conn: &Connection,
    source: ImportTargetSourceKind,
    target_file_path: Option<String>,
    outcomes: &[&'static str],
) -> rusqlite::Result<GuardedModuleResolutionEdgeWrite> {
    let Some(target_file_path) = target_file_path else {
        return Ok(GuardedModuleResolutionEdgeWrite::Skip {
            reason: outcomes
                .first()
                .copied()
                .unwrap_or_else(|| source.target_not_found_reason()),
        });
    };
    let Some(target_node_id) = find_file_node_id(conn, &target_file_path)? else {
        return Ok(GuardedModuleResolutionEdgeWrite::Skip {
            reason: "file-node-not-found",
        });
    };
    Ok(GuardedModuleResolutionEdgeWrite::Write { target_node_id })
}

fn insert_rust_import_edge(
    conn: &Connection,
    reference: &ImportRefRow,
    target_node_id: &str,
) -> rusqlite::Result<bool> {
    let existing: i64 = conn.query_row(
        "SELECT COUNT(*) FROM edges
         WHERE source = ?1 AND target = ?2 AND kind = 'imports' AND edgeOrigin = 'rust-finalization'",
        params![reference.from_node_id, target_node_id],
        |row| row.get(0),
    )?;
    if existing > 0 {
        return Ok(false);
    }

    conn.execute(
        "INSERT INTO edges (source, target, kind, metadata, line, col, edgeOrigin)
         VALUES (?1, ?2, 'imports', ?3, ?4, ?5, 'rust-finalization')",
        params![
            reference.from_node_id,
            target_node_id,
            "{\"resolvedBy\":\"rust-import-path-alias\"}",
            reference.line,
            reference.col,
        ],
    )?;
    Ok(true)
}

fn delete_resolved_import_refs(conn: &Connection, ids: &[i64]) -> rusqlite::Result<()> {
    let mut stmt = conn.prepare("DELETE FROM unresolved_refs WHERE id = ?1")?;
    for id in ids {
        stmt.execute(params![id])?;
    }
    Ok(())
}

fn resolve_esm_named_import_export_refs(
    conn: &Connection,
    project_path: &Path,
) -> Result<EsmNamedImportExportStats, Box<dyn std::error::Error>> {
    let aliases = load_ts_path_aliases(project_path);
    let binding_refs = load_import_refs(conn)?
        .into_iter()
        .filter(|reference| {
            matches!(
                reference.language.as_str(),
                "javascript" | "jsx" | "typescript" | "tsx"
            ) && looks_like_imported_binding(&reference.reference_name)
        })
        .collect::<Vec<_>>();
    let mut stats = EsmNamedImportExportStats::default();
    let mut resolved_ids = Vec::new();
    let mut file_content_cache: HashMap<String, String> = HashMap::new();

    for reference in binding_refs {
        if is_type_only_import_line(
            project_path,
            &reference.file_path,
            reference.line,
            &mut file_content_cache,
        ) {
            stats.record_fallback_sample("type-only-import", &reference, None, None, None, None);
            continue;
        }

        let target_file_paths = find_import_edge_target_files(conn, &reference)?;
        if target_file_paths.is_empty() {
            let reason = if is_package_or_runtime_import_line(
                project_path,
                &reference.file_path,
                reference.line,
                &aliases,
                &mut file_content_cache,
            ) {
                "package-or-runtime-binding"
            } else {
                "import-edge-target-not-found"
            };
            stats.record_fallback_sample(reason, &reference, None, None, None, None);
            continue;
        }
        if target_file_paths.len() > 1 {
            stats.record_fallback_sample(
                "import-edge-target-ambiguous",
                &reference,
                None,
                Some(target_file_paths.len()),
                None,
                None,
            );
            continue;
        }
        let target_file_path = target_file_paths[0].clone();
        let is_named_value_import = is_named_value_import_binding_line(
            project_path,
            &reference.file_path,
            reference.line,
            &reference.reference_name,
            &mut file_content_cache,
        );
        if !is_named_import_binding_line(
            project_path,
            &reference.file_path,
            reference.line,
            &reference.reference_name,
            &mut file_content_cache,
        ) {
            stats.record_fallback_sample(
                "unsupported-import-shape",
                &reference,
                Some(&target_file_path),
                None,
                None,
                None,
            );
            continue;
        }
        let lookup = find_exported_symbol_candidates(
            conn,
            project_path,
            &aliases,
            &target_file_path,
            &reference.reference_name,
            &mut file_content_cache,
        )?;
        if lookup.candidates.len() != 1 {
            if matches!(
                lookup.resolved_by_attempt,
                "direct-export" | "same-file-export-specifier"
            ) {
                if let Some(target) = select_unique_overload_implementation_candidate(
                    project_path,
                    &target_file_path,
                    &lookup.candidates,
                    &mut file_content_cache,
                ) {
                    let Some(edge_created) = write_guarded_esm_named_import_symbol_edge(
                        conn,
                        &mut stats,
                        &reference,
                        &target_file_path,
                        target,
                        ESM_OVERLOAD_IMPLEMENTATION_RESOLVED_BY,
                    )?
                    else {
                        continue;
                    };
                    if edge_created {
                        stats.edges_created += 1;
                    }
                    stats.resolved_refs += 1;
                    stats.overload_implementation_resolved_refs += 1;
                    resolved_ids.push(reference.id);

                    let usage_refs = load_imported_symbol_usage_refs(
                        conn,
                        &reference.file_path,
                        &reference.reference_name,
                    )?;
                    for usage in usage_refs {
                        if insert_rust_imported_symbol_usage_edge(
                            conn,
                            &usage,
                            &target.id,
                            ESM_OVERLOAD_IMPLEMENTATION_RESOLVED_BY,
                        )? {
                            stats.edges_created += 1;
                        }
                        stats.resolved_refs += 1;
                        stats.overload_implementation_resolved_refs += 1;
                        resolved_ids.push(usage.id);
                    }
                    continue;
                }
            }
            if lookup.resolved_by_attempt == "direct-export" {
                let usage_refs = load_imported_symbol_usage_refs(
                    conn,
                    &reference.file_path,
                    &reference.reference_name,
                )?;
                let has_value_usage = !usage_refs.is_empty()
                    || has_decorator_token_usage(
                        project_path,
                        &reference.file_path,
                        &reference.reference_name,
                        &mut file_content_cache,
                    );
                if let Some(target) = select_value_token_interface_candidate(
                    &lookup.candidates,
                    is_named_value_import,
                    has_value_usage,
                ) {
                    let Some(edge_created) = write_guarded_esm_named_import_symbol_edge(
                        conn,
                        &mut stats,
                        &reference,
                        &target_file_path,
                        target,
                        ESM_VALUE_TOKEN_INTERFACE_RESOLVED_BY,
                    )?
                    else {
                        continue;
                    };
                    if edge_created {
                        stats.edges_created += 1;
                    }
                    stats.resolved_refs += 1;
                    resolved_ids.push(reference.id);

                    for usage in usage_refs {
                        if insert_rust_imported_symbol_usage_edge(
                            conn,
                            &usage,
                            &target.id,
                            ESM_VALUE_TOKEN_INTERFACE_RESOLVED_BY,
                        )? {
                            stats.edges_created += 1;
                        }
                        stats.resolved_refs += 1;
                        resolved_ids.push(usage.id);
                    }
                    continue;
                }
            }
            stats.record_fallback_sample(
                lookup.fallback_reason,
                &reference,
                Some(&target_file_path),
                Some(lookup.candidates.len()),
                Some(lookup.resolved_by_attempt),
                candidate_declaration_diagnostics(
                    project_path,
                    &target_file_path,
                    &lookup.candidates,
                    &mut file_content_cache,
                ),
            );
            continue;
        }
        let target = &lookup.candidates[0];
        let is_reexport = target.resolved_by == "rust-esm-one-hop-reexport";

        if !is_reexport {
            let Some(edge_created) = write_guarded_esm_named_import_symbol_edge(
                conn,
                &mut stats,
                &reference,
                &target_file_path,
                target,
                target.resolved_by,
            )?
            else {
                continue;
            };
            if edge_created {
                stats.edges_created += 1;
            }
        } else if insert_rust_import_symbol_edge(conn, &reference, &target.id, target.resolved_by)?
        {
            stats.edges_created += 1;
        }
        stats.resolved_refs += 1;
        if is_reexport {
            stats.reexport_resolved_refs += 1;
        }
        resolved_ids.push(reference.id);

        let usage_refs =
            load_imported_symbol_usage_refs(conn, &reference.file_path, &reference.reference_name)?;
        for usage in usage_refs {
            if insert_rust_imported_symbol_usage_edge(conn, &usage, &target.id, target.resolved_by)?
            {
                stats.edges_created += 1;
            }
            stats.resolved_refs += 1;
            if is_reexport {
                stats.reexport_resolved_refs += 1;
            }
            resolved_ids.push(usage.id);
        }
    }

    delete_resolved_import_refs(conn, &resolved_ids)?;
    Ok(stats)
}

fn is_type_only_import_line(
    project_path: &Path,
    file_path: &str,
    line: i64,
    cache: &mut HashMap<String, String>,
) -> bool {
    let Some(content) = cached_file_content(project_path, file_path, cache) else {
        return false;
    };
    content
        .lines()
        .nth(line.saturating_sub(1) as usize)
        .map(|line_text| line_text.trim_start().starts_with("import type "))
        .unwrap_or(false)
}

fn is_named_import_binding_line(
    project_path: &Path,
    file_path: &str,
    line: i64,
    reference_name: &str,
    cache: &mut HashMap<String, String>,
) -> bool {
    let Some(line_text) = import_line_text(project_path, file_path, line, cache) else {
        return false;
    };
    named_import_list_contains(line_text, reference_name)
}

fn is_named_value_import_binding_line(
    project_path: &Path,
    file_path: &str,
    line: i64,
    reference_name: &str,
    cache: &mut HashMap<String, String>,
) -> bool {
    let Some(line_text) = import_line_text(project_path, file_path, line, cache) else {
        return false;
    };
    named_value_import_list_contains(line_text, reference_name)
}

fn is_package_or_runtime_import_line(
    project_path: &Path,
    file_path: &str,
    line: i64,
    aliases: &TsPathAliases,
    cache: &mut HashMap<String, String>,
) -> bool {
    let Some(line_text) = import_line_text(project_path, file_path, line, cache) else {
        return false;
    };
    let Some(specifier) = import_line_module_specifier(line_text) else {
        return false;
    };
    !is_relative_import_specifier(&specifier)
        && !aliases.matches(&specifier)
        && matches_conventional_alias(&specifier).is_none()
}

fn import_line_text<'a>(
    project_path: &Path,
    file_path: &str,
    line: i64,
    cache: &'a mut HashMap<String, String>,
) -> Option<&'a str> {
    cached_file_content(project_path, file_path, cache)?
        .lines()
        .nth(line.saturating_sub(1) as usize)
}

fn named_import_list_contains(line_text: &str, reference_name: &str) -> bool {
    let Some(open) = line_text.find('{') else {
        return false;
    };
    let Some(close_offset) = line_text[open + 1..].find('}') else {
        return false;
    };
    let close = open + 1 + close_offset;
    line_text[open + 1..close].split(',').any(|part| {
        let local = part.trim().split_whitespace().last().unwrap_or("").trim();
        local == reference_name
    })
}

fn named_value_import_list_contains(line_text: &str, reference_name: &str) -> bool {
    let trimmed = line_text.trim_start();
    if !trimmed.starts_with("import ") || trimmed.starts_with("import type ") {
        return false;
    }
    let Some(open) = line_text.find('{') else {
        return false;
    };
    let Some(close_offset) = line_text[open + 1..].find('}') else {
        return false;
    };
    let close = open + 1 + close_offset;
    let specifiers = line_text[open + 1..close]
        .split(',')
        .map(str::trim)
        .filter(|part| !part.is_empty())
        .collect::<Vec<_>>();
    if specifiers.is_empty() || specifiers.iter().any(|part| part.starts_with("type ")) {
        return false;
    }
    specifiers.iter().any(|part| {
        let normalized = part.trim_start_matches("type ").trim();
        let (imported, local) = normalized
            .split_once(" as ")
            .map(|(left, right)| (left.trim(), right.trim()))
            .unwrap_or((normalized, normalized));
        imported == reference_name || local == reference_name
    })
}

fn import_line_module_specifier(line_text: &str) -> Option<String> {
    if let Some(specifier) = require_call_module_specifier(line_text) {
        return Some(specifier);
    }
    let from_index = line_text.find(" from ")?;
    let raw_specifier = line_text[from_index + " from ".len()..]
        .trim()
        .trim_end_matches(';')
        .trim();
    let specifier = trim_string_literal(raw_specifier);
    if specifier.is_empty() {
        None
    } else {
        Some(specifier.to_string())
    }
}

fn require_call_module_specifier(line_text: &str) -> Option<String> {
    let require_index = line_text.find("require(")?;
    let after_require = line_text[require_index + "require(".len()..].trim_start();
    let quote = after_require.chars().next()?;
    if !matches!(quote, '"' | '\'' | '`') {
        return None;
    }
    let rest = &after_require[quote.len_utf8()..];
    let close = rest.find(quote)?;
    let specifier = &rest[..close];
    if specifier.is_empty() {
        None
    } else {
        Some(specifier.to_string())
    }
}

fn has_decorator_token_usage(
    project_path: &Path,
    file_path: &str,
    reference_name: &str,
    cache: &mut HashMap<String, String>,
) -> bool {
    let Some(content) = cached_file_content(project_path, file_path, cache) else {
        return false;
    };
    let needle = format!("@{reference_name}");
    content.lines().any(|line| {
        let trimmed = line.trim_start();
        !trimmed.starts_with("import ") && token_occurs_on_line(line, &needle)
    })
}

fn token_occurs_on_line(line: &str, token: &str) -> bool {
    let mut start = 0;
    while let Some(offset) = line[start..].find(token) {
        let index = start + offset;
        let after = index + token.len();
        let before_ok = index == 0
            || line[..index]
                .chars()
                .last()
                .is_none_or(|ch| !is_identifier_char(ch) && ch != '@');
        let after_ok = line[after..]
            .chars()
            .next()
            .is_none_or(|ch| !is_identifier_char(ch));
        if before_ok && after_ok {
            return true;
        }
        start = after;
    }
    false
}

fn cached_file_content<'a>(
    project_path: &Path,
    file_path: &str,
    cache: &'a mut HashMap<String, String>,
) -> Option<&'a str> {
    if !cache.contains_key(file_path) {
        let content = fs::read_to_string(project_path.join(file_path)).ok()?;
        cache.insert(file_path.to_string(), content);
    }
    cache.get(file_path).map(String::as_str)
}

fn candidate_declaration_diagnostics(
    project_path: &Path,
    target_file_path: &str,
    candidates: &[SymbolCandidateRow],
    cache: &mut HashMap<String, String>,
) -> Option<Vec<CandidateDeclarationDiagnostic>> {
    if candidates.is_empty() {
        return None;
    }
    let content = cached_file_content(project_path, target_file_path, cache);
    Some(
        candidates
            .iter()
            .map(|candidate| {
                infer_candidate_declaration_diagnostic(target_file_path, content, candidate)
            })
            .collect(),
    )
}

fn select_unique_overload_implementation_candidate<'a>(
    project_path: &Path,
    target_file_path: &str,
    candidates: &'a [SymbolCandidateRow],
    cache: &mut HashMap<String, String>,
) -> Option<&'a SymbolCandidateRow> {
    if is_typescript_declaration_file(target_file_path)
        || candidates.is_empty()
        || !candidates
            .iter()
            .all(|candidate| candidate.kind == "function")
    {
        return None;
    }
    let diagnostics =
        candidate_declaration_diagnostics(project_path, target_file_path, candidates, cache)?;
    if diagnostics.len() != candidates.len()
        || diagnostics
            .iter()
            .any(|diagnostic| diagnostic.metadata_source == "unavailable")
        || diagnostics.iter().any(|diagnostic| {
            diagnostic.declaration_form.as_deref().unwrap_or("unknown") == "unknown"
        })
    {
        return None;
    }

    let implementation_indexes = diagnostics
        .iter()
        .enumerate()
        .filter_map(|(index, diagnostic)| {
            let is_implementation = diagnostic.has_body == Some(true)
                || diagnostic.declaration_form.as_deref() == Some("implementation");
            if is_implementation {
                Some(index)
            } else {
                None
            }
        })
        .collect::<Vec<_>>();

    if implementation_indexes.len() == 1 {
        candidates.get(implementation_indexes[0])
    } else {
        None
    }
}

fn select_value_token_interface_candidate<'a>(
    candidates: &'a [SymbolCandidateRow],
    is_named_value_import: bool,
    has_value_usage: bool,
) -> Option<&'a SymbolCandidateRow> {
    if !is_named_value_import || !has_value_usage || candidates.len() != 2 {
        return None;
    }
    let constant = candidates
        .iter()
        .filter(|candidate| candidate.kind == "constant")
        .collect::<Vec<_>>();
    let interface = candidates
        .iter()
        .filter(|candidate| candidate.kind == "interface")
        .collect::<Vec<_>>();
    if constant.len() == 1 && interface.len() == 1 {
        constant.first().copied()
    } else {
        None
    }
}

fn infer_candidate_declaration_diagnostic(
    target_file_path: &str,
    content: Option<&str>,
    candidate: &SymbolCandidateRow,
) -> CandidateDeclarationDiagnostic {
    let mut diagnostic = CandidateDeclarationDiagnostic {
        kind: candidate.kind.clone(),
        start_line: candidate.start_line,
        end_line: candidate.end_line,
        has_body: None,
        declaration_form: Some("unknown".to_string()),
        metadata_source: "unavailable".to_string(),
    };

    if candidate.kind != "function" {
        return diagnostic;
    }

    let Some(content) = content else {
        return diagnostic;
    };
    diagnostic.metadata_source = "target-file-line-range-inference".to_string();
    let Some(text) = line_range_text(content, candidate.start_line, candidate.end_line) else {
        return diagnostic;
    };
    if text.contains('{') {
        diagnostic.has_body = Some(true);
        diagnostic.declaration_form = Some("implementation".to_string());
        return diagnostic;
    }
    if is_typescript_declaration_file(target_file_path)
        || text.trim_end().ends_with(';')
        || text.trim_start().starts_with("declare function ")
    {
        diagnostic.has_body = Some(false);
        diagnostic.declaration_form = Some("signature".to_string());
    }
    diagnostic
}

fn is_typescript_declaration_file(file_path: &str) -> bool {
    file_path.ends_with(".d.ts") || file_path.ends_with(".d.mts") || file_path.ends_with(".d.cts")
}

const DECLARATION_RUNTIME_SIBLING_SAMPLE_CAP: usize = 5;

fn declaration_target_relationship_diagnostic(
    project_path: &Path,
    source_file: &str,
    resolved_path: Option<&str>,
) -> Option<DeclarationTargetRelationshipDiagnostic> {
    let resolved_path = resolved_path?;
    if !is_typescript_declaration_file(resolved_path) {
        return None;
    }
    let path = Path::new(resolved_path);
    if path.is_absolute()
        || path
            .components()
            .any(|component| component.as_os_str() == "node_modules")
    {
        return Some(DeclarationTargetRelationshipDiagnostic {
            target_kind: "declaration".to_string(),
            runtime_sibling_status: "skippedExternalOrPackageBoundary".to_string(),
            runtime_sibling_candidates: Vec::new(),
            candidate_count: 0,
            truncated: false,
            pairing_decision: Some(DeclarationRuntimePairingDecision {
                status: "blockedExternalOrPackageBoundary".to_string(),
                runtime_target: None,
                reason: "external-or-package-boundary".to_string(),
            }),
        });
    }

    let candidates = declaration_runtime_sibling_candidates(project_path, resolved_path);
    let status = match candidates.len() {
        0 => "noRuntimeSibling",
        1 => "singleRuntimeSibling",
        _ => "multipleRuntimeSiblings",
    };
    let truncated = candidates.len() > DECLARATION_RUNTIME_SIBLING_SAMPLE_CAP;
    let candidate_count = candidates.len();
    let pairing_decision = declaration_runtime_pairing_decision(
        project_path,
        source_file,
        resolved_path,
        status,
        &candidates,
    );
    Some(DeclarationTargetRelationshipDiagnostic {
        target_kind: "declaration".to_string(),
        runtime_sibling_status: status.to_string(),
        runtime_sibling_candidates: candidates
            .into_iter()
            .take(DECLARATION_RUNTIME_SIBLING_SAMPLE_CAP)
            .collect(),
        candidate_count,
        truncated,
        pairing_decision,
    })
}

fn declaration_runtime_pairing_decision(
    project_path: &Path,
    source_file: &str,
    declaration_path: &str,
    runtime_sibling_status: &str,
    runtime_sibling_candidates: &[String],
) -> Option<DeclarationRuntimePairingDecision> {
    match runtime_sibling_status {
        "noRuntimeSibling" => Some(DeclarationRuntimePairingDecision {
            status: "blockedNoRuntimeSibling".to_string(),
            runtime_target: None,
            reason: "no-runtime-sibling".to_string(),
        }),
        "multipleRuntimeSiblings" => Some(DeclarationRuntimePairingDecision {
            status: "blockedMultipleRuntimeSiblings".to_string(),
            runtime_target: None,
            reason: "multiple-runtime-siblings".to_string(),
        }),
        "singleRuntimeSibling" => {
            let Some(runtime_target) = runtime_sibling_candidates.first() else {
                return Some(DeclarationRuntimePairingDecision {
                    status: "blockedUnsupportedDeclarationShape".to_string(),
                    runtime_target: None,
                    reason: "unsupported-declaration-shape".to_string(),
                });
            };
            if same_runtime_pairing_package_boundary(
                project_path,
                source_file,
                declaration_path,
                runtime_target,
            ) {
                Some(DeclarationRuntimePairingDecision {
                    status: "eligibleSingleRuntimeSibling".to_string(),
                    runtime_target: Some(runtime_target.clone()),
                    reason: "same-package-single-runtime-sibling".to_string(),
                })
            } else {
                Some(DeclarationRuntimePairingDecision {
                    status: "blockedExternalOrPackageBoundary".to_string(),
                    runtime_target: None,
                    reason: "external-or-package-boundary".to_string(),
                })
            }
        }
        "skippedExternalOrPackageBoundary" => Some(DeclarationRuntimePairingDecision {
            status: "blockedExternalOrPackageBoundary".to_string(),
            runtime_target: None,
            reason: "external-or-package-boundary".to_string(),
        }),
        _ => Some(DeclarationRuntimePairingDecision {
            status: "blockedUnsupportedDeclarationShape".to_string(),
            runtime_target: None,
            reason: "unsupported-declaration-shape".to_string(),
        }),
    }
}

fn declaration_runtime_edge_write_decision(
    conn: &Connection,
    project_path: &Path,
    source_file: &str,
    target_file_path: Option<&str>,
) -> rusqlite::Result<Option<DeclarationRuntimeEdgeWrite>> {
    let Some(target_file_path) = target_file_path else {
        return Ok(None);
    };
    let Some(relationship) = declaration_target_relationship_diagnostic(
        project_path,
        source_file,
        Some(target_file_path),
    ) else {
        return Ok(None);
    };
    if find_file_node_id(conn, target_file_path)?.is_none() {
        return Ok(Some(DeclarationRuntimeEdgeWrite::KeepDeclaration {
            reason: "declaration-file-node-missing",
        }));
    }
    let Some(pairing_decision) = relationship.pairing_decision else {
        return Ok(Some(DeclarationRuntimeEdgeWrite::KeepDeclaration {
            reason: "unsupported-declaration-shape",
        }));
    };
    if pairing_decision.status != "eligibleSingleRuntimeSibling" {
        return Ok(Some(DeclarationRuntimeEdgeWrite::KeepDeclaration {
            reason: "pairing-not-eligible",
        }));
    }
    let Some(runtime_target_file_path) = pairing_decision.runtime_target else {
        return Ok(Some(DeclarationRuntimeEdgeWrite::KeepDeclaration {
            reason: "unsupported-declaration-shape",
        }));
    };
    if find_file_node_id(conn, &runtime_target_file_path)?.is_none() {
        return Ok(Some(DeclarationRuntimeEdgeWrite::KeepDeclaration {
            reason: "runtime-file-node-missing",
        }));
    }
    Ok(Some(DeclarationRuntimeEdgeWrite::Rewrite {
        runtime_target_file_path,
    }))
}

fn same_runtime_pairing_package_boundary(
    project_path: &Path,
    source_file: &str,
    declaration_path: &str,
    runtime_target: &str,
) -> bool {
    let source_boundary = nearest_package_boundary(project_path, source_file);
    let declaration_boundary = nearest_package_boundary(project_path, declaration_path);
    let runtime_boundary = nearest_package_boundary(project_path, runtime_target);
    source_boundary == declaration_boundary && declaration_boundary == runtime_boundary
}

fn nearest_package_boundary(project_path: &Path, relative_file_path: &str) -> String {
    let path = Path::new(relative_file_path);
    if path.is_absolute() {
        return "__external__".to_string();
    }
    let mut current = path.parent().unwrap_or_else(|| Path::new(""));
    loop {
        if project_path.join(current).join("package.json").is_file() {
            return local_slash_path(current);
        }
        let Some(parent) = current.parent() else {
            return String::new();
        };
        current = parent;
    }
}

fn declaration_runtime_sibling_candidates(project_path: &Path, resolved_path: &str) -> Vec<String> {
    let path = Path::new(resolved_path);
    let Some(file_name) = path.file_name().and_then(|name| name.to_str()) else {
        return Vec::new();
    };
    let Some(base_name) = declaration_runtime_base_name(file_name) else {
        return Vec::new();
    };
    let parent = path.parent().unwrap_or_else(|| Path::new(""));
    let extensions = declaration_runtime_sibling_extensions(file_name);
    let mut seen = HashSet::new();
    let mut candidates = Vec::new();
    for extension in extensions {
        let candidate = parent.join(format!("{}{}", base_name, extension));
        let candidate_slash = local_slash_path(&candidate);
        if !seen.insert(candidate_slash.clone()) {
            continue;
        }
        if project_path.join(&candidate).is_file() {
            candidates.push(candidate_slash);
        }
    }
    candidates
}

fn local_slash_path(path: &Path) -> String {
    path.to_string_lossy()
        .replace(std::path::MAIN_SEPARATOR, "/")
}

fn declaration_runtime_base_name(file_name: &str) -> Option<&str> {
    file_name
        .strip_suffix(".d.mts")
        .or_else(|| file_name.strip_suffix(".d.cts"))
        .or_else(|| file_name.strip_suffix(".d.ts"))
}

fn declaration_runtime_sibling_extensions(file_name: &str) -> &'static [&'static str] {
    if file_name.ends_with(".d.mts") {
        &[".mts", ".mjs", ".ts", ".tsx", ".js", ".jsx"]
    } else if file_name.ends_with(".d.cts") {
        &[".cts", ".cjs", ".ts", ".tsx", ".js", ".jsx"]
    } else {
        &[".ts", ".tsx", ".mts", ".cts", ".js", ".jsx", ".mjs", ".cjs"]
    }
}

fn line_range_text(content: &str, start_line: i64, end_line: i64) -> Option<String> {
    if start_line <= 0 || end_line < start_line {
        return None;
    }
    let start = start_line as usize;
    let end = end_line as usize;
    let lines = content
        .lines()
        .enumerate()
        .filter_map(|(index, line)| {
            let line_number = index + 1;
            if (start..=end).contains(&line_number) {
                Some(line)
            } else {
                None
            }
        })
        .collect::<Vec<_>>();
    if lines.is_empty() {
        None
    } else {
        Some(lines.join("\n"))
    }
}

fn find_import_edge_target_files(
    conn: &Connection,
    reference: &ImportRefRow,
) -> rusqlite::Result<Vec<String>> {
    let mut stmt = conn.prepare(
        "SELECT target.file_path
         FROM edges e
         JOIN nodes target ON target.id = e.target
         WHERE e.source = ?1
           AND e.kind = 'imports'
           AND e.edgeOrigin = 'rust-finalization'
           AND target.kind = 'file'
           AND e.line = ?2
           AND e.col = ?3
         ORDER BY e.id",
    )?;
    let rows = stmt
        .query_map(
            params![reference.from_node_id, reference.line, reference.col],
            |row| {
                Ok(FileImportEdgeRow {
                    target_file_path: row.get(0)?,
                })
            },
        )?
        .collect::<rusqlite::Result<Vec<_>>>()?;
    Ok(rows.into_iter().map(|row| row.target_file_path).collect())
}

fn find_exported_symbol_candidates(
    conn: &Connection,
    project_path: &Path,
    aliases: &TsPathAliases,
    target_file_path: &str,
    name: &str,
    cache: &mut HashMap<String, String>,
) -> Result<ExportedSymbolCandidateLookup, Box<dyn std::error::Error>> {
    let mut stmt = conn.prepare(
        "SELECT id, kind, name, start_line, end_line
         FROM nodes
         WHERE file_path = ?1
           AND name = ?2
           AND kind IN ('function', 'class', 'interface', 'type_alias', 'constant', 'variable', 'enum')
         ORDER BY start_line",
    )?;
    let rows = stmt
        .query_map(params![target_file_path, name], |row| {
            Ok(SymbolCandidateRow {
                id: row.get(0)?,
                kind: row.get(1)?,
                name: row.get(2)?,
                start_line: row.get(3)?,
                end_line: row.get(4)?,
                resolved_by: "rust-esm-named-import-export",
            })
        })?
        .collect::<rusqlite::Result<Vec<_>>>()?;
    let Some(content) = cached_file_content(project_path, target_file_path, cache) else {
        return Ok(ExportedSymbolCandidateLookup {
            candidates: Vec::new(),
            fallback_reason: "target-file-content-unavailable",
            resolved_by_attempt: "direct-export",
        });
    };
    let content = content.to_string();
    let direct = rows
        .into_iter()
        .filter(|candidate| direct_export_declares_name(&content, &candidate.kind, &candidate.name))
        .collect::<Vec<_>>();
    if !direct.is_empty() {
        let fallback_reason = if direct.len() > 1 {
            "direct-export-candidate-multiple"
        } else {
            "direct-export-candidate-zero"
        };
        return Ok(ExportedSymbolCandidateLookup {
            candidates: direct,
            fallback_reason,
            resolved_by_attempt: "direct-export",
        });
    }

    let mut stmt = conn.prepare(
        "SELECT id, kind, name, start_line, end_line
         FROM nodes
         WHERE file_path = ?1
           AND name = ?2
           AND kind IN ('function', 'class', 'interface', 'type_alias', 'constant', 'variable', 'enum')
         ORDER BY start_line",
    )?;
    let same_file_export_candidates = stmt
        .query_map(params![target_file_path, name], |row| {
            Ok(SymbolCandidateRow {
                id: row.get(0)?,
                kind: row.get(1)?,
                name: row.get(2)?,
                start_line: row.get(3)?,
                end_line: row.get(4)?,
                resolved_by: "rust-esm-named-import-export",
            })
        })?
        .collect::<rusqlite::Result<Vec<_>>>()?;
    if same_file_export_specifier_declares_name(&content, name) {
        let fallback_reason = if same_file_export_candidates.len() > 1 {
            "same-file-export-specifier-candidate-multiple"
        } else {
            "same-file-export-specifier-candidate-zero"
        };
        return Ok(ExportedSymbolCandidateLookup {
            candidates: same_file_export_candidates,
            fallback_reason,
            resolved_by_attempt: "same-file-export-specifier",
        });
    }

    find_one_hop_reexport_symbol_candidates(
        conn,
        project_path,
        aliases,
        target_file_path,
        &content,
        name,
        cache,
    )
}

fn direct_export_declares_name(content: &str, kind: &str, name: &str) -> bool {
    content.lines().any(|line| {
        let Some(rest) = line.trim_start().strip_prefix("export ") else {
            return false;
        };
        direct_export_line_declares_name(rest.trim_start(), kind, name)
    })
}

fn direct_export_line_declares_name(rest: &str, kind: &str, name: &str) -> bool {
    if rest.starts_with("default ") || rest.starts_with('{') || rest.contains(" from ") {
        return false;
    }

    let mut tokens = rest.split_whitespace().peekable();
    while matches!(
        tokens.peek().copied(),
        Some("declare" | "abstract" | "async" | "public" | "private" | "protected" | "readonly")
    ) {
        tokens.next();
    }

    let Some(keyword) = tokens.next() else {
        return false;
    };
    if !export_keyword_matches_kind(keyword, kind) {
        return false;
    }

    let Some(raw_name) = tokens.next() else {
        return false;
    };
    identifier_prefix(raw_name) == name
}

fn export_keyword_matches_kind(keyword: &str, kind: &str) -> bool {
    match kind {
        "function" => keyword == "function",
        "class" => keyword == "class",
        "interface" => keyword == "interface",
        "type_alias" => keyword == "type",
        "constant" => keyword == "const",
        "variable" => matches!(keyword, "let" | "var"),
        "enum" => keyword == "enum",
        _ => false,
    }
}

fn identifier_prefix(raw: &str) -> &str {
    let end = raw
        .char_indices()
        .find(|(_, ch)| !is_identifier_char(*ch))
        .map(|(index, _)| index)
        .unwrap_or(raw.len());
    &raw[..end]
}

fn same_file_export_specifier_declares_name(content: &str, name: &str) -> bool {
    content.lines().any(|line| {
        let trimmed = line.trim();
        if !trimmed.starts_with("export ") || trimmed.contains(" from ") {
            return false;
        }
        let Some(open) = trimmed.find('{') else {
            return false;
        };
        let Some(close_offset) = trimmed[open + 1..].find('}') else {
            return false;
        };
        let close = open + 1 + close_offset;
        trimmed[open + 1..close]
            .split(',')
            .any(|part| part.trim() == name)
    })
}

fn find_one_hop_reexport_symbol_candidates(
    conn: &Connection,
    project_path: &Path,
    aliases: &TsPathAliases,
    barrel_file_path: &str,
    barrel_content: &str,
    name: &str,
    cache: &mut HashMap<String, String>,
) -> Result<ExportedSymbolCandidateLookup, Box<dyn std::error::Error>> {
    let Some(specifier) = direct_named_reexport_specifier(barrel_content, name) else {
        return Ok(ExportedSymbolCandidateLookup {
            candidates: Vec::new(),
            fallback_reason: "direct-export-candidate-zero",
            resolved_by_attempt: "direct-export",
        });
    };
    let leaf_file_path = if is_relative_import_specifier(&specifier) {
        resolve_relative_import(project_path, barrel_file_path, &specifier)
    } else if aliases.matches(&specifier) {
        resolve_alias_import(project_path, aliases, &specifier)
    } else {
        None
    };
    let Some(leaf_file_path) = leaf_file_path else {
        return Ok(ExportedSymbolCandidateLookup {
            candidates: Vec::new(),
            fallback_reason: "reexport-specifier-target-not-found",
            resolved_by_attempt: "one-hop-reexport",
        });
    };
    let Some(leaf_content) = cached_file_content(project_path, &leaf_file_path, cache) else {
        return Ok(ExportedSymbolCandidateLookup {
            candidates: Vec::new(),
            fallback_reason: "reexport-leaf-content-unavailable",
            resolved_by_attempt: "one-hop-reexport",
        });
    };

    let mut stmt = conn.prepare(
        "SELECT id, kind, name, start_line, end_line
         FROM nodes
         WHERE file_path = ?1
           AND name = ?2
           AND kind IN ('function', 'class', 'interface', 'type_alias', 'constant', 'variable', 'enum')
         ORDER BY start_line",
    )?;
    let rows = stmt
        .query_map(params![leaf_file_path, name], |row| {
            Ok(SymbolCandidateRow {
                id: row.get(0)?,
                kind: row.get(1)?,
                name: row.get(2)?,
                start_line: row.get(3)?,
                end_line: row.get(4)?,
                resolved_by: "rust-esm-one-hop-reexport",
            })
        })?
        .collect::<rusqlite::Result<Vec<_>>>()?;

    let candidates = rows
        .into_iter()
        .filter(|candidate| {
            direct_export_declares_name(leaf_content, &candidate.kind, &candidate.name)
        })
        .collect::<Vec<_>>();
    let fallback_reason = if candidates.len() > 1 {
        "reexport-leaf-candidate-multiple"
    } else {
        "reexport-leaf-candidate-zero"
    };
    Ok(ExportedSymbolCandidateLookup {
        candidates,
        fallback_reason,
        resolved_by_attempt: "one-hop-reexport",
    })
}

fn direct_named_reexport_specifier(content: &str, name: &str) -> Option<String> {
    for line in content.lines() {
        let trimmed = line.trim();
        if !trimmed.starts_with("export ") || !trimmed.contains(" from ") {
            continue;
        }
        let Some(open) = trimmed.find('{') else {
            continue;
        };
        let Some(close_offset) = trimmed[open + 1..].find('}') else {
            continue;
        };
        let close = open + 1 + close_offset;
        let export_list = &trimmed[open + 1..close];
        let same_name = export_list.split(',').any(|part| part.trim() == name);
        if !same_name {
            continue;
        }
        let rest = trimmed[close + 1..].trim();
        let Some(raw_specifier) = rest.strip_prefix("from ") else {
            continue;
        };
        let raw_specifier = raw_specifier.trim().trim_end_matches(';').trim();
        let specifier = trim_string_literal(raw_specifier);
        if specifier.is_empty() {
            continue;
        }
        return Some(specifier.to_string());
    }
    None
}

fn load_imported_symbol_usage_refs(
    conn: &Connection,
    file_path: &str,
    reference_name: &str,
) -> rusqlite::Result<Vec<LocalRefRow>> {
    let mut stmt = conn.prepare(
        "SELECT id, from_node_id, reference_name, reference_kind, line, col, file_path, language
         FROM unresolved_refs
         WHERE file_path = ?1
           AND reference_name = ?2
           AND reference_kind IN ('calls', 'instantiates', 'references')
         ORDER BY id",
    )?;
    let rows = stmt.query_map(params![file_path, reference_name], |row| {
        Ok(LocalRefRow {
            id: row.get(0)?,
            from_node_id: row.get(1)?,
            reference_name: row.get(2)?,
            reference_kind: row.get(3)?,
            line: row.get(4)?,
            col: row.get(5)?,
            file_path: row.get(6)?,
            language: row.get(7)?,
        })
    })?;

    rows.collect()
}

fn insert_rust_import_symbol_edge(
    conn: &Connection,
    reference: &ImportRefRow,
    target_node_id: &str,
    resolved_by: &str,
) -> rusqlite::Result<bool> {
    let metadata = format!("{{\"resolvedBy\":\"{}\"}}", resolved_by);
    insert_rust_finalization_edge(
        conn,
        &reference.from_node_id,
        target_node_id,
        "imports",
        &metadata,
        reference.line,
        reference.col,
    )
}

fn guarded_esm_named_symbol_edge_write_decision(
    conn: &Connection,
    target_node_id: &str,
    target_file_path: &str,
    candidate_kind: &str,
) -> rusqlite::Result<GuardedEsmNamedSymbolEdgeWrite> {
    let mut stmt = conn.prepare("SELECT kind, file_path FROM nodes WHERE id = ?1 LIMIT 1")?;
    let mut rows = stmt.query(params![target_node_id])?;
    let Some(row) = rows.next()? else {
        return Ok(GuardedEsmNamedSymbolEdgeWrite::Skip {
            reason: "target-node-missing",
        });
    };
    let node_kind: String = row.get(0)?;
    let node_file_path: String = row.get(1)?;
    if node_file_path != target_file_path {
        return Ok(GuardedEsmNamedSymbolEdgeWrite::Skip {
            reason: "target-file-mismatch",
        });
    }
    if node_kind != candidate_kind {
        return Ok(GuardedEsmNamedSymbolEdgeWrite::Skip {
            reason: "unsupported-candidate-shape",
        });
    }
    if !matches!(
        node_kind.as_str(),
        "function" | "class" | "interface" | "type_alias" | "constant" | "variable" | "enum"
    ) {
        return Ok(GuardedEsmNamedSymbolEdgeWrite::Skip {
            reason: "unsupported-candidate-shape",
        });
    }
    Ok(GuardedEsmNamedSymbolEdgeWrite::Write)
}

fn write_guarded_esm_named_import_symbol_edge(
    conn: &Connection,
    stats: &mut EsmNamedImportExportStats,
    reference: &ImportRefRow,
    target_file_path: &str,
    target: &SymbolCandidateRow,
    resolved_by: &str,
) -> rusqlite::Result<Option<bool>> {
    let decision = guarded_esm_named_symbol_edge_write_decision(
        conn,
        &target.id,
        target_file_path,
        &target.kind,
    )?;
    stats.record_edge_write_decision(
        &decision,
        reference,
        Some(target_file_path),
        Some(&target.kind),
        Some(1),
    );
    match decision {
        GuardedEsmNamedSymbolEdgeWrite::Write => Ok(Some(insert_rust_import_symbol_edge(
            conn,
            reference,
            &target.id,
            resolved_by,
        )?)),
        GuardedEsmNamedSymbolEdgeWrite::Skip { .. } => Ok(None),
    }
}

fn insert_rust_imported_symbol_usage_edge(
    conn: &Connection,
    reference: &LocalRefRow,
    target_node_id: &str,
    resolved_by: &str,
) -> rusqlite::Result<bool> {
    let metadata = format!("{{\"resolvedBy\":\"{}\"}}", resolved_by);
    insert_rust_finalization_edge(
        conn,
        &reference.from_node_id,
        target_node_id,
        &reference.reference_kind,
        &metadata,
        reference.line,
        reference.col,
    )
}

fn insert_rust_finalization_edge(
    conn: &Connection,
    source_node_id: &str,
    target_node_id: &str,
    kind: &str,
    metadata: &str,
    line: i64,
    col: i64,
) -> rusqlite::Result<bool> {
    let existing: i64 = conn.query_row(
        "SELECT COUNT(*) FROM edges
         WHERE source = ?1 AND target = ?2 AND kind = ?3 AND edgeOrigin = 'rust-finalization'",
        params![source_node_id, target_node_id, kind],
        |row| row.get(0),
    )?;
    if existing > 0 {
        return Ok(false);
    }

    conn.execute(
        "INSERT INTO edges (source, target, kind, metadata, line, col, edgeOrigin)
         VALUES (?1, ?2, ?3, ?4, ?5, ?6, 'rust-finalization')",
        params![source_node_id, target_node_id, kind, metadata, line, col],
    )?;
    Ok(true)
}

fn resolve_same_file_exact_callable_refs(
    conn: &Connection,
) -> Result<LocalReferenceStats, Box<dyn std::error::Error>> {
    let refs = load_local_callable_refs(conn)?;
    let mut stats = LocalReferenceStats::default();
    let mut resolved_ids = Vec::new();
    let mut candidate_cache: HashMap<(String, String, String), Vec<String>> = HashMap::new();
    let mut existing_edges = load_rust_finalization_edge_keys(conn)?;

    for reference in refs {
        if !matches!(
            reference.language.as_str(),
            "javascript" | "jsx" | "typescript" | "tsx"
        ) {
            continue;
        }
        let cache_key = (
            reference.file_path.clone(),
            reference.reference_name.clone(),
            reference.reference_kind.clone(),
        );
        let candidates = if let Some(candidates) = candidate_cache.get(&cache_key) {
            candidates
        } else {
            let candidates = find_same_file_callable_candidates(
                conn,
                &reference.file_path,
                &reference.reference_name,
                &reference.reference_kind,
            )?;
            candidate_cache.insert(cache_key.clone(), candidates);
            candidate_cache
                .get(&cache_key)
                .expect("candidate cache entry should exist")
        };
        if candidates.len() != 1 {
            stats.fallback_refs += 1;
            continue;
        }
        if insert_rust_local_reference_edge(conn, &reference, &candidates[0], &mut existing_edges)?
        {
            stats.edges_created += 1;
        }
        stats.resolved_refs += 1;
        resolved_ids.push(reference.id);
    }

    delete_resolved_import_refs(conn, &resolved_ids)?;
    Ok(stats)
}

fn load_local_callable_refs(conn: &Connection) -> rusqlite::Result<Vec<LocalRefRow>> {
    let mut stmt = conn.prepare(
        "SELECT id, from_node_id, reference_name, reference_kind, line, col, file_path, language
         FROM unresolved_refs
         WHERE reference_kind IN ('calls', 'instantiates')
         ORDER BY id",
    )?;
    let rows = stmt.query_map([], |row| {
        Ok(LocalRefRow {
            id: row.get(0)?,
            from_node_id: row.get(1)?,
            reference_name: row.get(2)?,
            reference_kind: row.get(3)?,
            line: row.get(4)?,
            col: row.get(5)?,
            file_path: row.get(6)?,
            language: row.get(7)?,
        })
    })?;

    rows.collect()
}

fn load_rust_finalization_edge_keys(
    conn: &Connection,
) -> rusqlite::Result<HashSet<(String, String, String)>> {
    let mut stmt = conn.prepare(
        "SELECT source, target, kind FROM edges
         WHERE edgeOrigin = 'rust-finalization'",
    )?;
    let rows = stmt.query_map([], |row| {
        Ok((
            row.get::<_, String>(0)?,
            row.get::<_, String>(1)?,
            row.get::<_, String>(2)?,
        ))
    })?;
    rows.collect()
}

fn find_same_file_callable_candidates(
    conn: &Connection,
    file_path: &str,
    reference_name: &str,
    reference_kind: &str,
) -> rusqlite::Result<Vec<String>> {
    let kinds = if reference_kind == "instantiates" {
        vec!["class"]
    } else {
        vec!["function", "method", "component"]
    };
    let placeholders = kinds.iter().map(|_| "?").collect::<Vec<_>>().join(",");
    let sql = format!(
        "SELECT id FROM nodes
         WHERE file_path = ?1 AND name = ?2 AND kind IN ({})
         ORDER BY start_line",
        placeholders
    );
    let mut params: Vec<&dyn rusqlite::ToSql> = vec![&file_path, &reference_name];
    for kind in &kinds {
        params.push(kind);
    }
    let mut stmt = conn.prepare(&sql)?;
    let rows = stmt.query_map(params.as_slice(), |row| row.get::<_, String>(0))?;
    rows.collect()
}

fn insert_rust_local_reference_edge(
    conn: &Connection,
    reference: &LocalRefRow,
    target_node_id: &str,
    existing_edges: &mut HashSet<(String, String, String)>,
) -> rusqlite::Result<bool> {
    let edge_key = (
        reference.from_node_id.clone(),
        target_node_id.to_string(),
        reference.reference_kind.clone(),
    );
    if existing_edges.contains(&edge_key) {
        return Ok(false);
    }

    conn.execute(
        "INSERT INTO edges (source, target, kind, metadata, line, col, edgeOrigin)
         VALUES (?1, ?2, ?3, ?4, ?5, ?6, 'rust-finalization')",
        params![
            reference.from_node_id,
            target_node_id,
            reference.reference_kind,
            "{\"resolvedBy\":\"rust-local-exact-reference\"}",
            reference.line,
            reference.col,
        ],
    )?;
    existing_edges.insert(edge_key);
    Ok(true)
}

fn configure_index_connection(conn: &Connection) -> rusqlite::Result<()> {
    conn.pragma_update(None, "journal_mode", "WAL")?;
    conn.pragma_update(None, "synchronous", "NORMAL")?;
    conn.pragma_update(None, "foreign_keys", "ON")?;
    Ok(())
}

fn configure_final_flush_staging_connection(conn: &Connection) -> rusqlite::Result<()> {
    conn.pragma_update(None, "journal_mode", "OFF")?;
    conn.pragma_update(None, "synchronous", "OFF")?;
    conn.pragma_update(None, "temp_store", "MEMORY")?;
    conn.pragma_update(None, "locking_mode", "EXCLUSIVE")?;
    conn.pragma_update(None, "foreign_keys", "OFF")?;
    Ok(())
}

fn suspend_node_fts_triggers_for_bulk_write(conn: &Connection) -> rusqlite::Result<()> {
    conn.execute_batch(
        "
        DROP TRIGGER IF EXISTS nodes_ai;
        DROP TRIGGER IF EXISTS nodes_ad;
        DROP TRIGGER IF EXISTS nodes_au;
        ",
    )
}

fn rebuild_node_fts_after_bulk_write(conn: &Connection) -> rusqlite::Result<()> {
    conn.execute_batch(
        "
        INSERT INTO nodes_fts(nodes_fts) VALUES ('rebuild');

        CREATE TRIGGER IF NOT EXISTS nodes_ai AFTER INSERT ON nodes BEGIN
            INSERT INTO nodes_fts(rowid, id, name, qualified_name, docstring, signature)
            VALUES (NEW.rowid, NEW.id, NEW.name, NEW.qualified_name, NEW.docstring, NEW.signature);
        END;

        CREATE TRIGGER IF NOT EXISTS nodes_ad AFTER DELETE ON nodes BEGIN
            INSERT INTO nodes_fts(nodes_fts, rowid, id, name, qualified_name, docstring, signature)
            VALUES ('delete', OLD.rowid, OLD.id, OLD.name, OLD.qualified_name, OLD.docstring, OLD.signature);
        END;

        CREATE TRIGGER IF NOT EXISTS nodes_au AFTER UPDATE ON nodes BEGIN
            INSERT INTO nodes_fts(nodes_fts, rowid, id, name, qualified_name, docstring, signature)
            VALUES ('delete', OLD.rowid, OLD.id, OLD.name, OLD.qualified_name, OLD.docstring, OLD.signature);
            INSERT INTO nodes_fts(rowid, id, name, qualified_name, docstring, signature)
            VALUES (NEW.rowid, NEW.id, NEW.name, NEW.qualified_name, NEW.docstring, NEW.signature);
        END;
        ",
    )
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
    conn: &mut Connection,
    project_path: &Path,
    features: GraphWorkFeatures,
    parse_walker_diagnostics: bool,
) -> Result<WriteCounts, Box<dyn std::error::Error>> {
    let scan_started = Instant::now();
    let files = collect_supported_files(project_path)?;
    let mut counts = WriteCounts::default();
    counts.profile.source_scan_ms = scan_started.elapsed().as_millis();
    let transaction_started = Instant::now();
    let tx = conn.transaction()?;
    counts.profile.sqlite_write_ms += transaction_started.elapsed().as_millis();
    let mut parsers: HashMap<SourceLanguage, Parser> = HashMap::new();

    for file_path in files {
        let parse_started = Instant::now();
        let language = SourceLanguage::from_path(&file_path)
            .ok_or_else(|| format!("Unsupported source file: {}", file_path.display()))?;
        let language_name = language.codegraph_name().to_string();
        if !parsers.contains_key(&language) {
            let parser_setup_started = Instant::now();
            let mut parser = Parser::new();
            parser.set_language(&language.tree_sitter_language())?;
            parsers.insert(language, parser);
            let elapsed = parser_setup_started.elapsed().as_millis();
            counts.profile.parse_parser_setup_ms += elapsed;
            counts
                .profile
                .add_parse_language_parser_setup(&language_name, elapsed);
        }
        let parser = parsers
            .get_mut(&language)
            .expect("parser should be initialized for source language");
        let relative_path = relative_slash_path(project_path, &file_path)?;
        let source_read_started = Instant::now();
        let content = fs::read_to_string(&file_path)?;
        let metadata = fs::metadata(&file_path)?;
        let source_read_ms = source_read_started.elapsed().as_millis();
        counts.profile.parse_source_read_ms += source_read_ms;
        counts
            .profile
            .add_parse_language_source_read(&language_name, source_read_ms);
        let normalization_started = Instant::now();
        let parse_content = normalize_source_for_parser(&content, language);
        let normalization_ms = normalization_started.elapsed().as_millis();
        counts.profile.parse_normalization_ms += normalization_ms;
        counts
            .profile
            .add_parse_language_normalization(&language_name, normalization_ms);
        let tree_sitter_started = Instant::now();
        let parsed = parser
            .parse(parse_content.as_ref(), None)
            .ok_or_else(|| format!("Parser returned no tree for {}", relative_path))?;
        let tree_sitter_ms = tree_sitter_started.elapsed().as_millis();
        counts.profile.parse_tree_sitter_ms += tree_sitter_ms;
        counts
            .profile
            .add_parse_language_tree_sitter(&language_name, tree_sitter_ms);
        let mut nodes = Vec::new();
        let mut edges = Vec::new();
        let mut unresolved_refs = Vec::new();
        let file_node = ExtractedNode::file(&relative_path, &content, language.codegraph_name());
        let file_node_id = file_node.id.clone();
        nodes.push(file_node);

        if parsed.root_node().has_error() {
            let error_started = Instant::now();
            counts.files_errored += 1;
            counts.errors.push(IndexError::rust_owned_parse_gap(
                relative_path.clone(),
                language.codegraph_name().to_string(),
            ));
            let error_ms = error_started.elapsed().as_millis();
            counts.profile.parse_error_handling_ms += error_ms;
            counts
                .profile
                .add_parse_language_error_handling(&language_name, error_ms);
        } else {
            let ast_started = Instant::now();
            if language.is_go() {
                extract_go_symbols(
                    parsed.root_node(),
                    content.as_bytes(),
                    &relative_path,
                    &file_node_id,
                    &mut nodes,
                    &mut edges,
                    &mut unresolved_refs,
                )?;
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
                    if parse_walker_diagnostics {
                        Some(&mut counts.profile)
                    } else {
                        None
                    },
                    features,
                )?;
            }
            let ast_ms = ast_started.elapsed().as_millis();
            counts.profile.parse_ast_extraction_ms += ast_ms;
            counts
                .profile
                .add_parse_language_ast_extraction(&language_name, ast_ms);
        }
        let parse_file_ms = parse_started.elapsed().as_millis();
        counts.profile.parse_extraction_ms += parse_file_ms;
        counts
            .profile
            .add_parse_language_file(&language_name, parse_file_ms);

        let indexed_at = now_ms();
        let sqlite_write_started = Instant::now();
        insert_nodes(&tx, &nodes)?;
        insert_edges(&tx, &edges)?;
        insert_unresolved_refs(&tx, &unresolved_refs)?;
        upsert_file(
            &tx,
            &relative_path,
            &content,
            &metadata,
            language.codegraph_name(),
            indexed_at,
            nodes.len() as i64,
        )?;
        counts.profile.sqlite_write_ms += sqlite_write_started.elapsed().as_millis();

        counts.files_indexed += 1;
        counts.nodes_created += nodes.len() as u32;
        counts.edges_created += edges.len() as u32;
    }

    let commit_started = Instant::now();
    tx.commit()?;
    counts.profile.sqlite_write_ms += commit_started.elapsed().as_millis();

    Ok(counts)
}

fn normalize_source_for_parser(source: &str, language: SourceLanguage) -> Cow<'_, str> {
    if matches!(language, SourceLanguage::TypeScript | SourceLanguage::Tsx) {
        normalize_typescript_source(source)
    } else {
        Cow::Borrowed(source)
    }
}

fn normalize_typescript_source(source: &str) -> Cow<'_, str> {
    let bytes = source.as_bytes();
    let mut out: Option<Vec<u8>> = None;
    let mut index = 0;

    while index < bytes.len() {
        if bytes.get(index..index + "import(".len()) == Some(b"import(") {
            let Some(type_import_context) = looks_like_type_import_context(source, index) else {
                index += "import(".len();
                continue;
            };

            let Some((end, has_member_access)) = import_type_query_end(bytes, index) else {
                index += "import(".len();
                continue;
            };
            if !has_member_access && !type_import_context.allows_bare_import_type_query {
                index += "import(".len();
                continue;
            }

            replace_with_identifier_placeholder(normalized_bytes(source, &mut out), index, end);
            index = end;
            continue;
        }

        if word_at(bytes, index, b"abstract") && is_property_name_position(bytes, index + 8) {
            normalized_bytes(source, &mut out)[index..index + 8].copy_from_slice(b"_bstract");
            index += 8;
            continue;
        }
        if word_at(bytes, index, b"unique") && is_member_receiver_position(bytes, index + 6) {
            normalized_bytes(source, &mut out)[index..index + 6].copy_from_slice(b"uniq_e");
            index += 6;
            continue;
        }
        index += 1;
    }

    match out {
        Some(out) => Cow::Owned(String::from_utf8(out).unwrap_or_else(|_| source.to_string())),
        None => Cow::Borrowed(source),
    }
}

fn normalized_bytes<'a>(source: &str, out: &'a mut Option<Vec<u8>>) -> &'a mut [u8] {
    out.get_or_insert_with(|| source.as_bytes().to_vec())
        .as_mut_slice()
}

struct TypeImportContext {
    allows_bare_import_type_query: bool,
}

fn looks_like_type_import_context(source: &str, start: usize) -> Option<TypeImportContext> {
    let prefix = &source[..start];
    let trimmed = prefix.trim_end();
    if trimmed.ends_with("typeof") || trimmed.ends_with("readonly") || trimmed.ends_with("=>") {
        return Some(TypeImportContext {
            allows_bare_import_type_query: trimmed.ends_with("typeof"),
        });
    }
    if trimmed
        .rsplit_once(|ch: char| !is_identifier_char(ch))
        .map(|(_, token)| token == "as")
        .unwrap_or(trimmed == "as")
    {
        return Some(TypeImportContext {
            allows_bare_import_type_query: false,
        });
    }
    if trimmed
        .as_bytes()
        .last()
        .is_some_and(|ch| matches!(ch, b':' | b'|' | b'&' | b'<' | b'['))
    {
        return Some(TypeImportContext {
            allows_bare_import_type_query: false,
        });
    }
    if trimmed.ends_with('=') && line_before_import_starts_type_alias(trimmed) {
        return Some(TypeImportContext {
            allows_bare_import_type_query: false,
        });
    }
    None
}

fn line_before_import_starts_type_alias(trimmed_prefix: &str) -> bool {
    let line = trimmed_prefix
        .rsplit_once('\n')
        .map(|(_, line)| line)
        .unwrap_or(trimmed_prefix)
        .trim_start();
    line.starts_with("type ") || line.starts_with("export type ")
}

fn import_type_query_end(bytes: &[u8], start: usize) -> Option<(usize, bool)> {
    let mut index = start + "import(".len();
    index = skip_ascii_whitespace(bytes, index);
    let quote = *bytes.get(index)?;
    if quote != b'\'' && quote != b'"' {
        return None;
    }
    index += 1;
    while index < bytes.len() {
        match bytes[index] {
            b'\\' => index += 2,
            ch if ch == quote => {
                index += 1;
                break;
            }
            _ => index += 1,
        }
    }
    index = skip_ascii_whitespace(bytes, index);
    if *bytes.get(index)? != b')' {
        return None;
    }
    index += 1;
    let mut has_member_access = false;

    loop {
        let before_dot = skip_ascii_whitespace(bytes, index);
        if bytes.get(before_dot) != Some(&b'.') {
            return Some((index, has_member_access));
        }
        let identifier_start = skip_ascii_whitespace(bytes, before_dot + 1);
        let Some(identifier_end) = consume_identifier(bytes, identifier_start) else {
            return Some((index, has_member_access));
        };
        has_member_access = true;
        index = identifier_end;
    }
}

fn skip_ascii_whitespace(bytes: &[u8], mut index: usize) -> usize {
    while bytes.get(index).is_some_and(u8::is_ascii_whitespace) {
        index += 1;
    }
    index
}

fn consume_identifier(bytes: &[u8], start: usize) -> Option<usize> {
    let first = *bytes.get(start)?;
    if !is_identifier_start(first) {
        return None;
    }
    let mut index = start + 1;
    while bytes
        .get(index)
        .is_some_and(|ch| is_identifier_continue(*ch))
    {
        index += 1;
    }
    Some(index)
}

fn is_identifier_start(ch: u8) -> bool {
    ch.is_ascii_alphabetic() || ch == b'_' || ch == b'$'
}

fn is_identifier_continue(ch: u8) -> bool {
    is_identifier_start(ch) || ch.is_ascii_digit()
}

fn is_identifier_char(ch: char) -> bool {
    ch.is_ascii_alphanumeric() || ch == '_' || ch == '$'
}

fn replace_with_identifier_placeholder(out: &mut [u8], start: usize, end: usize) {
    let placeholder = b"ZCGImportType";
    let len = end.saturating_sub(start);
    for byte in &mut out[start..end] {
        *byte = b' ';
    }
    let copy_len = len.min(placeholder.len());
    out[start..start + copy_len].copy_from_slice(&placeholder[..copy_len]);
}

fn word_at(bytes: &[u8], index: usize, word: &[u8]) -> bool {
    bytes.get(index..index + word.len()) == Some(word)
        && index
            .checked_sub(1)
            .and_then(|previous| bytes.get(previous))
            .is_none_or(|ch| !is_identifier_continue(*ch))
        && bytes
            .get(index + word.len())
            .is_none_or(|ch| !is_identifier_continue(*ch))
}

fn is_property_name_position(bytes: &[u8], after_word: usize) -> bool {
    bytes.get(skip_ascii_whitespace(bytes, after_word)) == Some(&b':')
}

fn is_member_receiver_position(bytes: &[u8], after_word: usize) -> bool {
    bytes.get(skip_ascii_whitespace(bytes, after_word)) == Some(&b'.')
}

#[derive(Debug, Clone, Copy, PartialEq, Eq, Hash)]
enum SourceLanguage {
    JavaScript,
    Jsx,
    TypeScript,
    Tsx,
    Mts,
    Cts,
    Go,
}

impl SourceLanguage {
    fn from_path(path: &Path) -> Option<Self> {
        match path.extension().and_then(|ext| ext.to_str()) {
            Some("js") => Some(Self::JavaScript),
            Some("jsx") => Some(Self::Jsx),
            Some("ts") => Some(Self::TypeScript),
            Some("tsx") => Some(Self::Tsx),
            Some("mts") => Some(Self::Mts),
            Some("cts") => Some(Self::Cts),
            Some("go") => Some(Self::Go),
            _ => None,
        }
    }

    fn codegraph_name(self) -> &'static str {
        match self {
            Self::JavaScript => "javascript",
            Self::Jsx => "jsx",
            Self::TypeScript | Self::Mts | Self::Cts => "typescript",
            Self::Tsx => "tsx",
            Self::Go => "go",
        }
    }

    fn tree_sitter_language(self) -> tree_sitter::Language {
        match self {
            Self::JavaScript | Self::Jsx => tree_sitter_javascript::LANGUAGE.into(),
            Self::TypeScript | Self::Mts | Self::Cts => {
                tree_sitter_typescript::LANGUAGE_TYPESCRIPT.into()
            }
            Self::Tsx => tree_sitter_typescript::LANGUAGE_TSX.into(),
            Self::Go => tree_sitter_go::LANGUAGE.into(),
        }
    }

    fn has_jsx(self) -> bool {
        matches!(self, Self::Jsx | Self::Tsx)
    }

    fn is_go(self) -> bool {
        matches!(self, Self::Go)
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
            } else if SourceLanguage::from_path(&path).is_some() && !is_generated_go_file(&path) {
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

fn is_generated_go_file(path: &Path) -> bool {
    if SourceLanguage::from_path(path) != Some(SourceLanguage::Go) {
        return false;
    }
    let Some(file_name) = path.file_name().and_then(|name| name.to_str()) else {
        return false;
    };
    file_name.ends_with(".pb.go")
        || file_name.ends_with(".pulsar.go")
        || file_name.ends_with("_grpc.pb.go")
        || file_name.ends_with("_mock.go")
        || file_name.ends_with("_mocks.go")
        || (file_name.starts_with("mock_") && file_name.ends_with(".go"))
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
    profile: Option<&mut IndexProfile>,
    features: GraphWorkFeatures,
) -> Result<(), Box<dyn std::error::Error>> {
    let mut cursor = root.walk();
    let mut walker_profile = profile
        .as_ref()
        .map(|_| HashMap::<&'static str, ParseAstWalkerProfile>::new());
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
        walker_profile.as_mut(),
        features,
    )?;
    if let (Some(profile), Some(walker_profile)) = (profile, walker_profile) {
        merge_parse_ast_walker_profile(profile, walker_profile);
    }
    Ok(())
}

fn merge_parse_ast_walker_profile(
    profile: &mut IndexProfile,
    walker_profile: HashMap<&'static str, ParseAstWalkerProfile>,
) {
    for (kind, incoming) in walker_profile {
        let entry = profile
            .parse_ast_walker
            .entry(kind.to_string())
            .or_default();
        entry.visits += incoming.visits;
        entry.named_symbol_checks += incoming.named_symbol_checks;
        entry.statement_ref_checks += incoming.statement_ref_checks;
        entry.child_traversals += incoming.child_traversals;
    }
}

fn extract_go_symbols(
    root: SyntaxNode,
    source: &[u8],
    relative_path: &str,
    file_node_id: &str,
    nodes: &mut Vec<ExtractedNode>,
    edges: &mut Vec<ExtractedEdge>,
    unresolved_refs: &mut Vec<UnresolvedRef>,
) -> Result<(), Box<dyn std::error::Error>> {
    let mut cursor = root.walk();
    let source_text = std::str::from_utf8(source).unwrap_or("");
    let group_prefixes = collect_go_gin_group_prefixes(source_text);
    let variable_types = collect_go_variable_types(source_text);
    visit_go_node(
        &mut cursor,
        source,
        relative_path,
        file_node_id,
        file_node_id,
        nodes,
        edges,
        unresolved_refs,
        &group_prefixes,
        &variable_types,
    )?;
    Ok(())
}

fn visit_go_node(
    cursor: &mut TreeCursor,
    source: &[u8],
    relative_path: &str,
    file_node_id: &str,
    current_from_node_id: &str,
    nodes: &mut Vec<ExtractedNode>,
    edges: &mut Vec<ExtractedEdge>,
    unresolved_refs: &mut Vec<UnresolvedRef>,
    group_prefixes: &HashMap<String, String>,
    variable_types: &HashMap<String, String>,
) -> Result<(), Box<dyn std::error::Error>> {
    let node = cursor.node();
    let mut child_from_node_id: Cow<'_, str> = Cow::Borrowed(current_from_node_id);

    if let Some((kind, name, name_node)) = extract_go_named_symbol(node, source)? {
        let extracted = ExtractedNode::symbol(relative_path, kind, &name, node, "go");
        let extracted_id = extracted.id.clone();
        let contains_source = if matches!(kind, "field") && current_from_node_id != file_node_id {
            current_from_node_id
        } else {
            file_node_id
        };
        edges.push(ExtractedEdge {
            source: contains_source.to_string(),
            target: extracted_id.clone(),
            kind: "contains".to_string(),
            line: extracted.start_line,
            col: extracted.start_column,
        });
        nodes.push(extracted);
        if matches!(
            kind,
            "module" | "struct" | "interface" | "function" | "method"
        ) {
            child_from_node_id = Cow::Owned(extracted_id);
        }

        if kind == "field" && name_node.kind() == "field_identifier" {
            return Ok(());
        }
    }

    extract_go_gin_route(
        node,
        source,
        relative_path,
        file_node_id,
        nodes,
        edges,
        unresolved_refs,
        group_prefixes,
        variable_types,
    )?;
    extract_go_statement_refs(
        node,
        source,
        relative_path,
        current_from_node_id,
        unresolved_refs,
    )?;

    if cursor.goto_first_child() {
        loop {
            visit_go_node(
                cursor,
                source,
                relative_path,
                file_node_id,
                &child_from_node_id,
                nodes,
                edges,
                unresolved_refs,
                group_prefixes,
                variable_types,
            )?;
            if !cursor.goto_next_sibling() {
                break;
            }
        }
        cursor.goto_parent();
    }

    Ok(())
}

fn extract_go_gin_route(
    node: SyntaxNode,
    source: &[u8],
    relative_path: &str,
    file_node_id: &str,
    nodes: &mut Vec<ExtractedNode>,
    edges: &mut Vec<ExtractedEdge>,
    unresolved_refs: &mut Vec<UnresolvedRef>,
    group_prefixes: &HashMap<String, String>,
    variable_types: &HashMap<String, String>,
) -> Result<(), Box<dyn std::error::Error>> {
    if node.kind() != "call_expression" {
        return Ok(());
    }
    let call = node.utf8_text(source)?;
    let Some(route) = parse_go_gin_route_call(call, group_prefixes, variable_types) else {
        return Ok(());
    };
    let route_name = format!("{} {}", route.method, route.path);
    let route_node = ExtractedNode::symbol(relative_path, "route", &route_name, node, "go");
    let route_node_id = route_node.id.clone();
    edges.push(ExtractedEdge {
        source: file_node_id.to_string(),
        target: route_node_id.clone(),
        kind: "contains".to_string(),
        line: route_node.start_line,
        col: route_node.start_column,
    });
    nodes.push(route_node);
    push_ref(
        unresolved_refs,
        &route_node_id,
        &route.handler,
        "references",
        node,
        relative_path,
        SourceLanguage::Go,
    );
    Ok(())
}

struct GoGinRoute {
    method: &'static str,
    path: String,
    handler: String,
}

fn parse_go_gin_route_call(
    call: &str,
    group_prefixes: &HashMap<String, String>,
    variable_types: &HashMap<String, String>,
) -> Option<GoGinRoute> {
    const METHODS: [&str; 5] = ["GET", "POST", "PUT", "DELETE", "PATCH"];
    for method in METHODS {
        let needle = format!(".{method}(");
        let Some(method_index) = call.find(&needle) else {
            continue;
        };
        let receiver = call[..method_index].trim();
        if receiver.is_empty()
            || !receiver
                .chars()
                .all(|ch| ch.is_ascii_alphanumeric() || ch == '_')
        {
            return None;
        }
        let args = &call[method_index + needle.len()..];
        let (path, after_path) = parse_first_go_string(args)?;
        let handler = parse_second_go_arg(after_path, variable_types)?;
        let full_path = format_route_path(group_prefixes.get(receiver).map(String::as_str), &path);
        return Some(GoGinRoute {
            method,
            path: full_path,
            handler,
        });
    }
    None
}

fn collect_go_gin_group_prefixes(source: &str) -> HashMap<String, String> {
    let mut groups = HashMap::new();
    for line in source.lines() {
        let Some((left, right)) = line.split_once(":=") else {
            continue;
        };
        let var_name = left.trim();
        if var_name.is_empty() || !right.contains(".Group(") {
            continue;
        }
        if let Some((prefix, _)) = parse_first_go_string(
            right
                .split_once(".Group(")
                .map(|(_, args)| args)
                .unwrap_or(right),
        ) {
            groups.insert(var_name.to_string(), prefix);
        }
    }
    groups
}

fn collect_go_variable_types(source: &str) -> HashMap<String, String> {
    let mut variables = HashMap::new();
    for line in source.lines() {
        let Some((left, right)) = line.split_once(":=") else {
            continue;
        };
        let var_name = left.trim();
        let right = right.trim_start();
        let Some(rest) = right.strip_prefix('&') else {
            continue;
        };
        let type_name: String = rest
            .chars()
            .take_while(|ch| ch.is_ascii_alphanumeric() || *ch == '_')
            .collect();
        if !var_name.is_empty() && !type_name.is_empty() {
            variables.insert(var_name.to_string(), type_name);
        }
    }
    variables
}

fn parse_first_go_string(input: &str) -> Option<(String, &str)> {
    let bytes = input.as_bytes();
    let start = bytes.iter().position(|ch| *ch == b'"')?;
    let mut index = start + 1;
    while index < bytes.len() {
        match bytes[index] {
            b'\\' => index += 2,
            b'"' => {
                return Some((input[start + 1..index].to_string(), &input[index + 1..]));
            }
            _ => index += 1,
        }
    }
    None
}

fn parse_second_go_arg<'a>(
    after_first_string: &'a str,
    variable_types: &HashMap<String, String>,
) -> Option<String> {
    let after_comma = after_first_string.split_once(',')?.1.trim_start();
    let raw: String = after_comma
        .chars()
        .take_while(|ch| !matches!(*ch, ',' | ')'))
        .collect::<String>()
        .trim()
        .to_string();
    if raw.is_empty() {
        return None;
    }
    if let Some((receiver, method)) = raw.split_once('.') {
        if let Some(type_name) = variable_types.get(receiver.trim()) {
            return Some(format!("{}.{}", type_name, method.trim()));
        }
        return Some(method.trim().to_string());
    }
    Some(raw)
}

fn format_route_path(prefix: Option<&str>, path: &str) -> String {
    let Some(prefix) = prefix else {
        return path.to_string();
    };
    let prefix = prefix.trim_end_matches('/');
    let path = path.trim_start_matches('/');
    if prefix.is_empty() {
        format!("/{path}")
    } else if path.is_empty() {
        prefix.to_string()
    } else {
        format!("{prefix}/{path}")
    }
}

fn extract_go_statement_refs(
    node: SyntaxNode,
    source: &[u8],
    relative_path: &str,
    from_node_id: &str,
    unresolved_refs: &mut Vec<UnresolvedRef>,
) -> Result<(), Box<dyn std::error::Error>> {
    if node.kind() != "call_expression" {
        return Ok(());
    }
    let Some(target_node) = node.child_by_field_name("function") else {
        return Ok(());
    };
    let Some(reference_name) = go_call_reference_name(target_node, source)? else {
        return Ok(());
    };
    push_ref(
        unresolved_refs,
        from_node_id,
        &reference_name,
        "calls",
        target_node,
        relative_path,
        SourceLanguage::Go,
    );
    Ok(())
}

fn go_call_reference_name(
    node: SyntaxNode,
    source: &[u8],
) -> Result<Option<String>, Box<dyn std::error::Error>> {
    match node.kind() {
        "identifier" => Ok(Some(node.utf8_text(source)?.to_string())),
        "selector_expression" => {
            let mut last_selector = None;
            for child in node.named_children(&mut node.walk()) {
                if matches!(child.kind(), "field_identifier" | "identifier") {
                    last_selector = Some(child);
                }
            }
            Ok(last_selector
                .and_then(|child| child.utf8_text(source).ok().map(ToString::to_string)))
        }
        _ => Ok(None),
    }
}

fn extract_go_named_symbol<'a>(
    node: SyntaxNode<'a>,
    source: &[u8],
) -> Result<Option<(&'static str, String, SyntaxNode<'a>)>, Box<dyn std::error::Error>> {
    match node.kind() {
        "package_clause" => {
            if let Some(name_node) = first_named_child_of_kind(node, "package_identifier") {
                return Ok(Some((
                    "module",
                    name_node.utf8_text(source)?.to_string(),
                    name_node,
                )));
            }
        }
        "function_declaration" => {
            if let Some(name_node) = node.child_by_field_name("name") {
                return Ok(Some((
                    "function",
                    name_node.utf8_text(source)?.to_string(),
                    name_node,
                )));
            }
        }
        "method_declaration" => {
            if let Some(name_node) = node.child_by_field_name("name") {
                let method = name_node.utf8_text(source)?;
                let receiver = go_receiver_name(node, source)
                    .map(|receiver| format!("{receiver}.{method}"))
                    .unwrap_or_else(|| method.to_string());
                return Ok(Some(("method", receiver, name_node)));
            }
        }
        "type_spec" => {
            if let Some(name_node) = node.child_by_field_name("name") {
                let type_node = node.child_by_field_name("type");
                let kind = match type_node.map(|n| n.kind()) {
                    Some("struct_type") => "struct",
                    Some("interface_type") => "interface",
                    _ => "type_alias",
                };
                return Ok(Some((
                    kind,
                    name_node.utf8_text(source)?.to_string(),
                    name_node,
                )));
            }
        }
        "type_alias" => {
            if let Some(name_node) = node.child_by_field_name("name") {
                return Ok(Some((
                    "type_alias",
                    name_node.utf8_text(source)?.to_string(),
                    name_node,
                )));
            }
        }
        "field_declaration" => {
            if let Some(name_node) = first_named_child_of_kind(node, "field_identifier") {
                return Ok(Some((
                    "field",
                    name_node.utf8_text(source)?.to_string(),
                    name_node,
                )));
            }
        }
        "const_spec" => {
            if let Some(name_node) = node.child_by_field_name("name") {
                return Ok(Some((
                    "constant",
                    name_node.utf8_text(source)?.to_string(),
                    name_node,
                )));
            }
        }
        "var_spec" => {
            if let Some(name_node) = node.child_by_field_name("name") {
                return Ok(Some((
                    "variable",
                    name_node.utf8_text(source)?.to_string(),
                    name_node,
                )));
            }
        }
        _ => {}
    }

    Ok(None)
}

fn first_named_child_of_kind<'a>(node: SyntaxNode<'a>, kind: &str) -> Option<SyntaxNode<'a>> {
    node.named_children(&mut node.walk())
        .find(|child| child.kind() == kind)
}

fn go_receiver_name(node: SyntaxNode, source: &[u8]) -> Option<String> {
    let receiver = node.child_by_field_name("receiver")?;
    for child in receiver.named_children(&mut receiver.walk()) {
        if child.kind() == "parameter_declaration" {
            for named in child.named_children(&mut child.walk()) {
                if matches!(
                    named.kind(),
                    "type_identifier" | "qualified_type" | "pointer_type" | "generic_type"
                ) {
                    return go_type_name(named, source);
                }
            }
        }
    }
    None
}

fn go_type_name(node: SyntaxNode, source: &[u8]) -> Option<String> {
    match node.kind() {
        "type_identifier" => node.utf8_text(source).ok().map(ToString::to_string),
        "pointer_type" | "generic_type" => {
            for child in node.named_children(&mut node.walk()) {
                if let Some(name) = go_type_name(child, source) {
                    return Some(name);
                }
            }
            None
        }
        "qualified_type" => node
            .named_children(&mut node.walk())
            .last()
            .and_then(|child| child.utf8_text(source).ok().map(ToString::to_string)),
        _ => None,
    }
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
    mut walker_profile: Option<&mut HashMap<&'static str, ParseAstWalkerProfile>>,
    features: GraphWorkFeatures,
) -> Result<(), Box<dyn std::error::Error>> {
    let node = cursor.node();
    let node_kind = node.kind();
    if let Some(walker_profile) = walker_profile.as_deref_mut() {
        walker_profile.entry(node_kind).or_default().visits += 1;
    }
    if !node.is_named() && node.child_count() == 0 {
        return Ok(());
    }
    let mut child_from_node_id: Cow<'_, str> = Cow::Borrowed(current_from_node_id);

    if let Some(walker_profile) = walker_profile.as_deref_mut() {
        walker_profile
            .entry(node_kind)
            .or_default()
            .named_symbol_checks += 1;
    }
    if let Some(symbol) = extract_named_symbol(node, source, language, features)? {
        let kind = symbol.kind;
        let extracted = ExtractedNode::symbol(
            relative_path,
            kind,
            &symbol.name,
            node,
            language.codegraph_name(),
        );
        let extracted_id = extracted.id.clone();
        let contains_source = if current_from_node_id != file_node_id
            && matches!(kind, "method" | "field" | "property")
        {
            current_from_node_id
        } else {
            file_node_id
        };
        edges.push(ExtractedEdge {
            source: contains_source.to_string(),
            target: extracted_id.clone(),
            kind: "contains".to_string(),
            line: extracted.start_line,
            col: extracted.start_column,
        });
        nodes.push(extracted);
        child_from_node_id = Cow::Owned(extracted_id);
    }

    extract_statement_refs(
        node,
        source,
        relative_path,
        language,
        current_from_node_id,
        unresolved_refs,
        walker_profile.as_deref_mut(),
        features,
    )?;

    if cursor.goto_first_child() {
        loop {
            if let Some(walker_profile) = walker_profile.as_deref_mut() {
                walker_profile
                    .entry(node_kind)
                    .or_default()
                    .child_traversals += 1;
            }
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
                walker_profile.as_deref_mut(),
                features,
            )?;
            if !cursor.goto_next_sibling() {
                break;
            }
        }
        cursor.goto_parent();
    }

    Ok(())
}

struct JsSymbolCandidate {
    kind: &'static str,
    name: String,
}

fn extract_named_symbol<'a>(
    node: SyntaxNode<'a>,
    source: &[u8],
    language: SourceLanguage,
    features: GraphWorkFeatures,
) -> Result<Option<JsSymbolCandidate>, Box<dyn std::error::Error>> {
    if matches!(
        node.kind(),
        "function_declaration"
            | "function_signature"
            | "class_declaration"
            | "abstract_class_declaration"
            | "enum_declaration"
    ) {
        if let Some(name_node) = node.child_by_field_name("name") {
            let name = name_node.utf8_text(source)?;
            let kind = if matches!(node.kind(), "function_declaration" | "function_signature")
                && features.component_detection
                && language.has_jsx()
                && is_pascal_case(name)
            {
                "component"
            } else if matches!(node.kind(), "function_declaration" | "function_signature") {
                "function"
            } else if node.kind() == "enum_declaration" {
                "enum"
            } else {
                "class"
            };
            return Ok(Some(JsSymbolCandidate {
                kind,
                name: name.to_string(),
            }));
        }
    }

    if matches!(node.kind(), "ambient_declaration" | "declaration") {
        for child in node.named_children(&mut node.walk()) {
            if let Some(symbol) = extract_named_symbol(child, source, language, features)? {
                return Ok(Some(symbol));
            }
        }
    }

    if node.kind() == "import_statement"
        || (node.kind() == "export_statement" && features.export_extraction)
    {
        if let Some(name_node) = module_literal_node(node) {
            let kind = if node.kind() == "import_statement" {
                "import"
            } else {
                "export"
            };
            let name = trim_string_literal(name_node.utf8_text(source)?).to_string();
            return Ok(Some(JsSymbolCandidate { kind, name }));
        }
    }

    let kind = match node.kind() {
        "interface_declaration" => Some("interface"),
        "type_alias_declaration" => Some("type_alias"),
        "method_definition" => Some("method"),
        "public_field_definition" | "field_definition" => {
            if node_has_function_value(node) {
                Some("method")
            } else if features.field_extraction {
                Some("field")
            } else {
                None
            }
        }
        _ => None,
    };
    if let Some(kind) = kind {
        if let Some(name_node) = node.child_by_field_name("name") {
            return Ok(Some(JsSymbolCandidate {
                kind,
                name: name_node.utf8_text(source)?.to_string(),
            }));
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
                    if features.component_detection && language.has_jsx() && is_pascal_case(name) {
                        return Ok(Some(JsSymbolCandidate {
                            kind: "component",
                            name: name.to_string(),
                        }));
                    }
                    if variable_declarator_has_function_value(child) {
                        return Ok(Some(JsSymbolCandidate {
                            kind: "function",
                            name: name.to_string(),
                        }));
                    }
                    if kind == "constant" && !features.constant_extraction {
                        return Ok(None);
                    }
                    return Ok(Some(JsSymbolCandidate {
                        kind,
                        name: name.to_string(),
                    }));
                }
            }
        }
    }

    Ok(None)
}

fn variable_declarator_has_function_value(node: SyntaxNode) -> bool {
    node_has_function_value(node)
}

fn node_has_function_value(node: SyntaxNode) -> bool {
    node.child_by_field_name("value")
        .map(|value| node_contains_function_value(value))
        .unwrap_or(false)
}

fn node_contains_function_value(node: SyntaxNode) -> bool {
    if matches!(
        node.kind(),
        "arrow_function" | "function" | "function_expression"
    ) {
        return true;
    }

    let mut cursor = node.walk();
    for child in node.named_children(&mut cursor) {
        if node_contains_function_value(child) {
            return true;
        }
    }
    false
}

fn extract_statement_refs(
    node: SyntaxNode,
    source: &[u8],
    relative_path: &str,
    language: SourceLanguage,
    from_node_id: &str,
    unresolved_refs: &mut Vec<UnresolvedRef>,
    walker_profile: Option<&mut HashMap<&'static str, ParseAstWalkerProfile>>,
    features: GraphWorkFeatures,
) -> Result<(), Box<dyn std::error::Error>> {
    if let Some(walker_profile) = walker_profile {
        walker_profile
            .entry(node.kind())
            .or_default()
            .statement_ref_checks += 1;
    }
    match node.kind() {
        "import_statement" => {
            let statement = node.utf8_text(source)?;
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
            for binding in import_export_binding_names(statement) {
                push_ref(
                    unresolved_refs,
                    from_node_id,
                    &binding,
                    "imports",
                    node,
                    relative_path,
                    language,
                );
            }
        }
        "export_statement" if features.export_extraction => {
            let statement = node.utf8_text(source)?;
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
            for binding in import_export_binding_names(statement) {
                push_ref(
                    unresolved_refs,
                    from_node_id,
                    &binding,
                    "exports",
                    node,
                    relative_path,
                    language,
                );
            }
        }
        "call_expression" | "new_expression" if features.aggressive_call_extraction => {
            if let Some(name_node) = call_target_node(node) {
                let reference_name = reference_name(name_node, source)?;
                if node.kind() == "call_expression" && reference_name == "require" {
                    if let Some(module) = require_call_module_specifier(node.utf8_text(source)?) {
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
        "jsx_opening_element" | "jsx_self_closing_element" if features.component_detection => {
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

fn import_export_binding_names(statement: &str) -> Vec<&str> {
    let Some(open) = statement.find('{') else {
        return Vec::new();
    };
    let Some(close_offset) = statement[open + 1..].find('}') else {
        return Vec::new();
    };
    let close = open + 1 + close_offset;
    statement[open + 1..close]
        .split(',')
        .filter_map(|part| {
            let raw = part.trim();
            if raw.is_empty() {
                return None;
            }
            let imported = raw
                .split_once(" as ")
                .map(|(left, _)| left)
                .unwrap_or(raw)
                .trim();
            if imported.is_empty() || imported == "type" {
                return None;
            }
            Some(imported.trim_start_matches("type "))
        })
        .collect()
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
        .map(|err| {
            let mut fields = vec![
                format!("\"message\":\"{}\"", escape_json(&err.message)),
                format!("\"severity\":\"{}\"", escape_json(&err.severity)),
            ];
            if let Some(file_path) = &err.file_path {
                fields.push(format!("\"filePath\":\"{}\"", escape_json(file_path)));
            }
            if let Some(language) = &err.language {
                fields.push(format!("\"language\":\"{}\"", escape_json(language)));
            }
            if let Some(code) = &err.code {
                fields.push(format!("\"code\":\"{}\"", escape_json(code)));
            }
            if let Some(written_by_rust) = err.written_by_rust {
                fields.push(format!("\"writtenByRust\":{}", written_by_rust));
            }
            format!("{{{}}}", fields.join(","))
        })
        .collect::<Vec<_>>()
        .join(",");

    format!(
        "{{\"type\":\"result\",\"success\":{},\"filesIndexed\":{},\"filesSkipped\":{},\"filesErrored\":{},\"nodesCreated\":{},\"edgesCreated\":{},\"errors\":[{}],\"durationMs\":{},\"profile\":{{\"sourceScanMs\":{},\"parseExtractionMs\":{},\"parseSourceReadMs\":{},\"parseNormalizationMs\":{},\"parseParserSetupMs\":{},\"parseTreeSitterMs\":{},\"parseAstExtractionMs\":{},\"parseErrorHandlingMs\":{},\"parseByLanguage\":{},\"parseAstWalker\":{},\"sqliteWriteMs\":{},\"importPathAliasResolutionMs\":{},\"importPathAliasResolvedRefs\":{},\"importPathAliasFallbackRefs\":{},\"importPathAliasBindingFallbackRefs\":{},\"importPathAliasUnsupportedFallbackRefs\":{},\"importPathAliasUnresolvedFallbackRefs\":{},\"importPathAliasResolvedBySource\":{{\"relative\":{},\"tsconfigPaths\":{},\"conventionalAlias\":{},\"workspacePackage\":{},\"rootDirs\":{},\"packageSelfName\":{},\"packageImports\":{}}},\"importPathAliasFallbackBySource\":{{\"relative\":{},\"tsconfigPaths\":{},\"conventionalAlias\":{},\"workspacePackage\":{},\"rootDirs\":{},\"packageSelfName\":{},\"packageImports\":{},\"binding\":{},\"unsupported\":{},\"unresolved\":{}}},\"importPathAliasPackageSelfNameOutcomeCounts\":{},\"importPathAliasPackageImportsOutcomeCounts\":{},\"importPathAliasFallbackSampleCounts\":{},\"importPathAliasFallbackSamples\":{},\"importPathAliasFallbackSampleCap\":{},\"esmNamedImportExportResolutionMs\":{},\"esmNamedImportExportResolvedRefs\":{},\"esmNamedImportExportFallbackRefs\":{},\"esmOneHopReexportResolvedRefs\":{},\"esmNamedImportExportOverloadImplementationResolvedRefs\":{},\"esmNamedImportExportFallbackSampleCounts\":{},\"esmNamedImportExportFallbackSamples\":{},\"esmNamedImportExportFallbackSampleCap\":{},\"esmNamedImportExportEdgeWriteAttemptedRefs\":{},\"esmNamedImportExportEdgeWriteWrittenRefs\":{},\"esmNamedImportExportEdgeWriteSkippedRefs\":{},\"esmNamedImportExportEdgeWriteSkippedCounts\":{},\"esmNamedImportExportEdgeWriteSkippedSamples\":{},\"esmNamedImportExportEdgeWriteSkippedSampleCap\":{},\"moduleResolutionShadowDecisionRefs\":{},\"moduleResolutionShadowDecisionCounts\":{},\"moduleResolutionShadowParityCounts\":{},\"moduleResolutionDeclarationTargetRelationshipCounts\":{},\"moduleResolutionDeclarationRuntimePairingDecisionCounts\":{},\"moduleResolutionShadowSamples\":{},\"moduleResolutionShadowSampleCap\":{},\"moduleResolutionEffectiveModeSource\":\"{}\",\"moduleResolutionGuardedEdgeWriteAttemptedRefs\":{},\"moduleResolutionGuardedEdgeWriteWrittenRefs\":{},\"moduleResolutionGuardedEdgeWriteSkippedRefs\":{},\"moduleResolutionGuardedEdgeWriteSkippedCounts\":{},\"moduleResolutionDeclarationRuntimeEdgeWriteAttemptedRefs\":{},\"moduleResolutionDeclarationRuntimeEdgeWriteWrittenRefs\":{},\"moduleResolutionDeclarationRuntimeEdgeWriteSkippedRefs\":{},\"moduleResolutionDeclarationRuntimeEdgeWriteSkippedCounts\":{},\"localExactReferenceResolutionMs\":{},\"localExactReferenceResolvedRefs\":{},\"localExactReferenceFallbackRefs\":{}}}}}",
        result.success,
        result.files_indexed,
        result.files_skipped,
        result.files_errored,
        result.nodes_created,
        result.edges_created,
        errors,
        result.duration_ms,
        result.profile.source_scan_ms,
        result.profile.parse_extraction_ms,
        result.profile.parse_source_read_ms,
        result.profile.parse_normalization_ms,
        result.profile.parse_parser_setup_ms,
        result.profile.parse_tree_sitter_ms,
        result.profile.parse_ast_extraction_ms,
        result.profile.parse_error_handling_ms,
        parse_by_language_json(&result.profile.parse_by_language),
        parse_ast_walker_json(&result.profile.parse_ast_walker),
        result.profile.sqlite_write_ms,
        result.profile.import_path_alias_resolution_ms,
        result.profile.import_path_alias_resolved_refs,
        result.profile.import_path_alias_fallback_refs,
        result.profile.import_path_alias_binding_fallback_refs,
        result.profile.import_path_alias_unsupported_fallback_refs,
        result.profile.import_path_alias_unresolved_fallback_refs,
        result.profile.import_path_alias_relative_resolved_refs,
        result.profile.import_path_alias_tsconfig_resolved_refs,
        result
            .profile
            .import_path_alias_conventional_alias_resolved_refs,
        result.profile.import_path_alias_workspace_resolved_refs,
        result.profile.import_path_alias_root_dirs_resolved_refs,
        result.profile.import_path_alias_package_self_name_resolved_refs,
        result.profile.import_path_alias_package_imports_resolved_refs,
        result.profile.import_path_alias_relative_fallback_refs,
        result.profile.import_path_alias_tsconfig_fallback_refs,
        result
            .profile
            .import_path_alias_conventional_alias_fallback_refs,
        result.profile.import_path_alias_workspace_fallback_refs,
        result.profile.import_path_alias_root_dirs_fallback_refs,
        result.profile.import_path_alias_package_self_name_fallback_refs,
        result.profile.import_path_alias_package_imports_fallback_refs,
        result.profile.import_path_alias_binding_fallback_refs,
        result.profile.import_path_alias_unsupported_fallback_refs,
        result.profile.import_path_alias_unresolved_fallback_refs,
        fallback_sample_counts_json(
            &result
                .profile
                .import_path_alias_package_self_name_outcome_counts
        ),
        fallback_sample_counts_json(
            &result
                .profile
                .import_path_alias_package_imports_outcome_counts
        ),
        fallback_sample_counts_json(&result.profile.import_path_alias_fallback_sample_counts),
        fallback_samples_json(&result.profile.import_path_alias_fallback_samples),
        fallback_sample_cap_json(&result.profile.import_path_alias_fallback_sample_cap),
        result.profile.esm_named_import_export_resolution_ms,
        result.profile.esm_named_import_export_resolved_refs,
        result.profile.esm_named_import_export_fallback_refs,
        result.profile.esm_one_hop_reexport_resolved_refs,
        result
            .profile
            .esm_named_import_export_overload_implementation_resolved_refs,
        fallback_sample_counts_json(&result.profile.esm_named_import_export_fallback_sample_counts),
        esm_named_fallback_samples_json(&result.profile.esm_named_import_export_fallback_samples),
        fallback_sample_cap_json(&result.profile.esm_named_import_export_fallback_sample_cap),
        result
            .profile
            .esm_named_import_export_edge_write_attempted_refs,
        result
            .profile
            .esm_named_import_export_edge_write_written_refs,
        result
            .profile
            .esm_named_import_export_edge_write_skipped_refs,
        fallback_sample_counts_json(
            &result
                .profile
                .esm_named_import_export_edge_write_skipped_counts
        ),
        esm_named_fallback_samples_json(
            &result
                .profile
                .esm_named_import_export_edge_write_skipped_samples
        ),
        fallback_sample_cap_json(
            &result
                .profile
                .esm_named_import_export_edge_write_skipped_sample_cap
        ),
        result.profile.module_resolution_shadow_decision_refs,
        fallback_sample_counts_json(&result.profile.module_resolution_shadow_decision_counts),
        fallback_sample_counts_json(&result.profile.module_resolution_shadow_parity_counts),
        fallback_sample_counts_json(
            &result
                .profile
                .module_resolution_declaration_target_relationship_counts
        ),
        fallback_sample_counts_json(
            &result
                .profile
                .module_resolution_declaration_runtime_pairing_decision_counts
        ),
        module_resolution_shadow_samples_json(&result.profile.module_resolution_shadow_samples),
        fallback_sample_cap_json(&result.profile.module_resolution_shadow_sample_cap),
        escape_json(&result.profile.module_resolution_effective_mode_source),
        result
            .profile
            .module_resolution_guarded_edge_write_attempted_refs,
        result.profile.module_resolution_guarded_edge_write_written_refs,
        result.profile.module_resolution_guarded_edge_write_skipped_refs,
        fallback_sample_counts_json(
            &result
                .profile
                .module_resolution_guarded_edge_write_skipped_counts
        ),
        result
            .profile
            .module_resolution_declaration_runtime_edge_write_attempted_refs,
        result
            .profile
            .module_resolution_declaration_runtime_edge_write_written_refs,
        result
            .profile
            .module_resolution_declaration_runtime_edge_write_skipped_refs,
        fallback_sample_counts_json(
            &result
                .profile
                .module_resolution_declaration_runtime_edge_write_skipped_counts
        ),
        result.profile.local_exact_reference_resolution_ms,
        result.profile.local_exact_reference_resolved_refs,
        result.profile.local_exact_reference_fallback_refs
    )
}

fn parse_ast_walker_json(profiles: &BTreeMap<String, ParseAstWalkerProfile>) -> String {
    let fields = profiles
        .iter()
        .map(|(key, profile)| {
            format!(
                "\"{}\":{{\"visits\":{},\"namedSymbolChecks\":{},\"statementRefChecks\":{},\"childTraversals\":{}}}",
                escape_json(key),
                profile.visits,
                profile.named_symbol_checks,
                profile.statement_ref_checks,
                profile.child_traversals
            )
        })
        .collect::<Vec<_>>()
        .join(",");
    format!("{{{}}}", fields)
}

fn fallback_sample_counts_json(counts: &BTreeMap<String, u32>) -> String {
    let fields = counts
        .iter()
        .map(|(key, value)| format!("\"{}\":{}", escape_json(key), value))
        .collect::<Vec<_>>()
        .join(",");
    format!("{{{}}}", fields)
}

fn parse_by_language_json(profiles: &BTreeMap<String, ParseLanguageProfile>) -> String {
    let fields = profiles
        .iter()
        .map(|(language, profile)| {
            format!(
                "\"{}\":{{\"files\":{},\"parseExtractionMs\":{},\"sourceReadMs\":{},\"normalizationMs\":{},\"parserSetupMs\":{},\"treeSitterMs\":{},\"astExtractionMs\":{},\"errorHandlingMs\":{}}}",
                escape_json(language),
                profile.files,
                profile.parse_extraction_ms,
                profile.source_read_ms,
                profile.normalization_ms,
                profile.parser_setup_ms,
                profile.tree_sitter_ms,
                profile.ast_extraction_ms,
                profile.error_handling_ms,
            )
        })
        .collect::<Vec<_>>()
        .join(",");
    format!("{{{}}}", fields)
}

fn fallback_samples_json(samples: &[ImportFallbackSample]) -> String {
    let items = samples
        .iter()
        .map(|sample| {
            let mut fields = vec![
                format!("\"sourceKind\":\"{}\"", escape_json(&sample.source_kind)),
                format!("\"reason\":\"{}\"", escape_json(&sample.reason)),
                format!(
                    "\"referenceName\":\"{}\"",
                    escape_json(&sample.reference_name)
                ),
                format!("\"filePath\":\"{}\"", escape_json(&sample.file_path)),
                format!("\"language\":\"{}\"", escape_json(&sample.language)),
                format!("\"line\":{}", sample.line),
                format!("\"col\":{}", sample.col),
            ];
            if let Some(target_kind) = &sample.target_kind {
                fields.push(format!("\"targetKind\":\"{}\"", escape_json(target_kind)));
            }
            if let Some(target_extension) = &sample.target_extension {
                fields.push(format!(
                    "\"targetExtension\":\"{}\"",
                    escape_json(target_extension)
                ));
            }
            format!("{{{}}}", fields.join(","))
        })
        .collect::<Vec<_>>()
        .join(",");
    format!("[{}]", items)
}

fn esm_named_fallback_samples_json(samples: &[EsmNamedFallbackSample]) -> String {
    let items = samples
        .iter()
        .map(|sample| {
            let mut fields = vec![
                format!("\"reason\":\"{}\"", escape_json(&sample.reason)),
                format!(
                    "\"referenceName\":\"{}\"",
                    escape_json(&sample.reference_name)
                ),
                format!(
                    "\"referenceKind\":\"{}\"",
                    escape_json(&sample.reference_kind)
                ),
                format!("\"filePath\":\"{}\"", escape_json(&sample.file_path)),
                format!("\"language\":\"{}\"", escape_json(&sample.language)),
                format!("\"line\":{}", sample.line),
                format!("\"col\":{}", sample.col),
            ];
            if let Some(target_file_path) = &sample.target_file_path {
                fields.push(format!(
                    "\"targetFilePath\":\"{}\"",
                    escape_json(target_file_path)
                ));
            }
            if let Some(candidate_kind) = &sample.candidate_kind {
                fields.push(format!(
                    "\"candidateKind\":\"{}\"",
                    escape_json(candidate_kind)
                ));
            }
            if let Some(candidate_count) = sample.candidate_count {
                fields.push(format!("\"candidateCount\":{}", candidate_count));
            }
            if let Some(resolved_by_attempt) = &sample.resolved_by_attempt {
                fields.push(format!(
                    "\"resolvedByAttempt\":\"{}\"",
                    escape_json(resolved_by_attempt)
                ));
            }
            if let Some(candidate_line_ranges) = &sample.candidate_line_ranges {
                fields.push(format!(
                    "\"candidateLineRanges\":{}",
                    candidate_declaration_diagnostics_json(candidate_line_ranges)
                ));
            }
            format!("{{{}}}", fields.join(","))
        })
        .collect::<Vec<_>>()
        .join(",");
    format!("[{}]", items)
}

fn module_resolution_shadow_samples_json(samples: &[ModuleResolutionDecisionRecord]) -> String {
    serde_json::to_string(samples).unwrap_or_else(|_| "[]".to_string())
}

fn candidate_declaration_diagnostics_json(candidates: &[CandidateDeclarationDiagnostic]) -> String {
    let items = candidates
        .iter()
        .map(|candidate| {
            let mut fields = vec![
                format!("\"kind\":\"{}\"", escape_json(&candidate.kind)),
                format!("\"startLine\":{}", candidate.start_line),
                format!("\"endLine\":{}", candidate.end_line),
                format!(
                    "\"metadataSource\":\"{}\"",
                    escape_json(&candidate.metadata_source)
                ),
            ];
            if let Some(has_body) = candidate.has_body {
                fields.push(format!("\"hasBody\":{}", has_body));
            }
            if let Some(declaration_form) = &candidate.declaration_form {
                fields.push(format!(
                    "\"declarationForm\":\"{}\"",
                    escape_json(declaration_form)
                ));
            }
            format!("{{{}}}", fields.join(","))
        })
        .collect::<Vec<_>>()
        .join(",");
    format!("[{}]", items)
}

fn fallback_sample_cap_json(cap: &ImportFallbackSampleCap) -> String {
    format!(
        "{{\"perBucket\":{},\"total\":{},\"truncated\":{}}}",
        cap.per_bucket, cap.total, cap.truncated
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
    fn graph_work_profile_parse_rejects_unknown_profiles() {
        assert_eq!(
            GraphWorkProfile::parse("full").unwrap(),
            GraphWorkProfile::Full
        );
        assert_eq!(
            GraphWorkProfile::parse("matched-ts-js").unwrap(),
            GraphWorkProfile::MatchedTsJs
        );
        let err = GraphWorkProfile::parse("wide-open").unwrap_err();
        assert!(err.contains("unsupported graph work profile"));
        assert!(err.contains("full, matched-ts-js"));
    }

    #[test]
    fn index_connection_uses_wal_and_normal_synchronous() {
        let dir = temp_dir("sqlite-pragmas");
        let db_path = dir.join("index.db");
        let conn = Connection::open(&db_path).unwrap();

        configure_index_connection(&conn).unwrap();

        let journal_mode: String = conn
            .pragma_query_value(None, "journal_mode", |row| row.get(0))
            .unwrap();
        let synchronous: i64 = conn
            .pragma_query_value(None, "synchronous", |row| row.get(0))
            .unwrap();
        assert_eq!(journal_mode.to_lowercase(), "wal");
        assert_eq!(synchronous, 1);
        fs::remove_dir_all(dir).unwrap();
    }

    #[test]
    fn candidate_producer_returns_exact_name_and_presence_from_sqlite() {
        let dir = temp_dir("candidate-producer");
        let db_path = dir.join("zcodegraph.db");
        let conn = Connection::open(&db_path).unwrap();
        conn.execute_batch(SCHEMA_SQL).unwrap();
        conn.execute(
            "INSERT INTO nodes (
                id, kind, name, qualified_name, file_path, language,
                start_line, end_line, start_column, end_column, updated_at
            ) VALUES (?1, 'function', ?2, ?3, ?4, 'typescript', 1, 1, 0, 1, 1)",
            params!["node-a", "shared", "src/a.ts::shared", "src/a.ts"],
        )
        .unwrap();
        conn.execute(
            "INSERT INTO nodes (
                id, kind, name, qualified_name, file_path, language,
                start_line, end_line, start_column, end_column, updated_at
            ) VALUES (?1, 'function', ?2, ?3, ?4, 'typescript', 2, 2, 0, 1, 1)",
            params!["node-b", "shared", "src/b.ts::shared", "src/b.ts"],
        )
        .unwrap();
        drop(conn);

        let request = serde_json::json!({
            "version": 1,
            "indexPath": db_path,
            "lookups": [
                { "kind": "ExactName", "name": "shared" },
                { "kind": "ExactName", "name": "missing" },
                { "kind": "KnownNamePresence", "name": "shared" },
                { "kind": "KnownNamePresence", "name": "missing" }
            ]
        });

        let response: Value =
            serde_json::from_str(&candidate_producer_json(&request.to_string()).unwrap()).unwrap();
        assert_eq!(response["type"], "candidate_producer_result");
        assert_eq!(response["diagnostics"]["lookupCount"], 4);
        assert_eq!(response["diagnostics"]["exactNameCount"], 2);
        assert_eq!(response["diagnostics"]["knownNamePresenceCount"], 2);
        assert_eq!(response["diagnostics"]["candidateCount"], 2);
        assert_eq!(
            response["results"][0]["candidateIds"],
            serde_json::json!(["node-a", "node-b"])
        );
        assert_eq!(
            response["results"][1]["candidateIds"],
            serde_json::json!([])
        );
        assert_eq!(response["results"][2]["present"], true);
        assert_eq!(response["results"][3]["present"], false);

        fs::remove_dir_all(dir).unwrap();
    }

    #[test]
    fn candidate_producer_returns_lower_name_candidates_from_sqlite() {
        let dir = temp_dir("candidate-producer-lower-name");
        let db_path = dir.join("zcodegraph.db");
        let conn = Connection::open(&db_path).unwrap();
        conn.execute_batch(SCHEMA_SQL).unwrap();
        for (id, name, line) in [
            ("node-mixed", "MixedCase", 1),
            ("node-lower", "mixedcase", 2),
            ("node-other", "OtherName", 3),
        ] {
            conn.execute(
                "INSERT INTO nodes (
                    id, kind, name, qualified_name, file_path, language,
                    start_line, end_line, start_column, end_column, updated_at
                ) VALUES (?1, 'function', ?2, ?3, ?4, 'typescript', ?5, ?5, 0, 1, 1)",
                params![
                    id,
                    name,
                    format!("src/case.ts::{}", name),
                    "src/case.ts",
                    line
                ],
            )
            .unwrap();
        }
        drop(conn);

        let request = serde_json::json!({
            "version": 1,
            "indexPath": db_path,
            "lookups": [
                { "kind": "LowerName", "lowerName": "mixedcase" },
                { "kind": "LowerName", "lowerName": "missing" }
            ]
        });

        let response: Value =
            serde_json::from_str(&candidate_producer_json(&request.to_string()).unwrap()).unwrap();
        assert_eq!(response["type"], "candidate_producer_result");
        assert_eq!(response["diagnostics"]["lookupCount"], 2);
        assert_eq!(response["diagnostics"]["lowerNameCount"], 2);
        assert_eq!(response["diagnostics"]["candidateCount"], 2);
        assert_eq!(
            response["results"][0]["candidateIds"],
            serde_json::json!(["node-mixed", "node-lower"])
        );
        assert_eq!(
            response["results"][1]["candidateIds"],
            serde_json::json!([])
        );

        fs::remove_dir_all(dir).unwrap();
    }

    #[test]
    fn candidate_producer_returns_qualified_name_and_file_nodes_from_sqlite() {
        let dir = temp_dir("candidate-producer-complete-shapes");
        let db_path = dir.join("zcodegraph.db");
        let conn = Connection::open(&db_path).unwrap();
        conn.execute_batch(SCHEMA_SQL).unwrap();
        for (id, name, qualified_name, file_path, line) in [
            ("node-a", "leaf", "pkg::Type.leaf", "src/a.ts", 1),
            ("node-b", "leafAlias", "pkg::Type.leaf", "src/b.ts", 2),
            ("node-c", "helper", "pkg::helper", "src/a.ts", 3),
        ] {
            conn.execute(
                "INSERT INTO nodes (
                    id, kind, name, qualified_name, file_path, language,
                    start_line, end_line, start_column, end_column, updated_at
                ) VALUES (?1, 'function', ?2, ?3, ?4, 'typescript', ?5, ?5, 0, 1, 1)",
                params![id, name, qualified_name, file_path, line],
            )
            .unwrap();
        }
        drop(conn);

        let request = serde_json::json!({
            "version": 1,
            "indexPath": db_path,
            "lookups": [
                { "kind": "QualifiedName", "qualifiedName": "pkg::Type.leaf" },
                { "kind": "QualifiedName", "qualifiedName": "pkg::missing" },
                { "kind": "FileNodes", "filePath": "src/a.ts" },
                { "kind": "FileNodes", "filePath": "src/missing.ts" }
            ]
        });

        let response: Value =
            serde_json::from_str(&candidate_producer_json(&request.to_string()).unwrap()).unwrap();
        assert_eq!(response["type"], "candidate_producer_result");
        assert_eq!(response["diagnostics"]["lookupCount"], 4);
        assert_eq!(response["diagnostics"]["qualifiedNameCount"], 2);
        assert_eq!(response["diagnostics"]["fileNodesCount"], 2);
        assert_eq!(response["diagnostics"]["candidateCount"], 4);
        assert_eq!(
            response["results"][0]["candidateIds"],
            serde_json::json!(["node-a", "node-b"])
        );
        assert_eq!(
            response["results"][1]["candidateIds"],
            serde_json::json!([])
        );
        assert_eq!(
            response["results"][2]["candidateIds"],
            serde_json::json!(["node-a", "node-c"])
        );
        assert_eq!(
            response["results"][3]["candidateIds"],
            serde_json::json!([])
        );

        fs::remove_dir_all(dir).unwrap();
    }

    #[test]
    fn normalization_borrows_sources_when_no_rewrite_is_needed() {
        let js = "export function alpha() { return 1; }\n";
        assert!(matches!(
            normalize_source_for_parser(js, SourceLanguage::JavaScript),
            Cow::Borrowed(_)
        ));

        let ts = "export function beta(value: string): string { return value; }\n";
        assert!(matches!(
            normalize_source_for_parser(ts, SourceLanguage::TypeScript),
            Cow::Borrowed(_)
        ));
    }

    #[test]
    fn normalization_allocates_once_when_typescript_rewrites_are_needed() {
        let source = [
            "type TextEdit = readonly import('./private-to-property.ts').TextEdit[];",
            "type Lookup = (name: string) => import('../src/types').Node[];",
            "const graph = {} as unknown as import('../src/index').default;",
            "export type MemberStats = { abstract: Set<string>; concrete: Set<string> };",
            "export function commonLength(unique: Element[]): number { return unique.length; }",
            "",
        ]
        .join("\n");

        let normalized = normalize_source_for_parser(&source, SourceLanguage::TypeScript);

        let Cow::Owned(normalized) = normalized else {
            panic!("TypeScript rewrites should allocate only when replacements are needed");
        };
        assert!(normalized.contains("ZCGImportType"));
        assert!(normalized.contains("_bstract"));
        assert!(normalized.contains("uniq_e.length"));
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
            profile: IndexProfile {
                source_scan_ms: 1,
                parse_extraction_ms: 2,
                parse_source_read_ms: 4,
                parse_normalization_ms: 5,
                parse_parser_setup_ms: 6,
                parse_tree_sitter_ms: 7,
                parse_ast_extraction_ms: 8,
                parse_error_handling_ms: 9,
                parse_by_language: BTreeMap::from([(
                    "typescript".to_string(),
                    ParseLanguageProfile {
                        files: 1,
                        parse_extraction_ms: 39,
                        source_read_ms: 4,
                        normalization_ms: 5,
                        parser_setup_ms: 6,
                        tree_sitter_ms: 7,
                        ast_extraction_ms: 8,
                        error_handling_ms: 9,
                    },
                )]),
                parse_ast_walker: BTreeMap::from([(
                    "function_declaration".to_string(),
                    ParseAstWalkerProfile {
                        visits: 2,
                        named_symbol_checks: 2,
                        statement_ref_checks: 2,
                        child_traversals: 4,
                    },
                )]),
                sqlite_write_ms: 3,
                esm_named_import_export_edge_write_attempted_refs: 3,
                esm_named_import_export_edge_write_written_refs: 2,
                esm_named_import_export_edge_write_skipped_refs: 1,
                esm_named_import_export_edge_write_skipped_counts: BTreeMap::from([(
                    "target-file-mismatch".to_string(),
                    1,
                )]),
                esm_named_import_export_edge_write_skipped_samples: vec![EsmNamedFallbackSample {
                    reason: "target-file-mismatch".to_string(),
                    reference_name: "alpha".to_string(),
                    reference_kind: "imports".to_string(),
                    file_path: "consumer.ts".to_string(),
                    language: "typescript".to_string(),
                    line: 1,
                    col: 9,
                    target_file_path: Some("source.ts".to_string()),
                    candidate_kind: Some("constant".to_string()),
                    candidate_count: Some(1),
                    resolved_by_attempt: None,
                    candidate_line_ranges: None,
                }],
                esm_named_import_export_edge_write_skipped_sample_cap: ImportFallbackSampleCap {
                    per_bucket: IMPORT_FALLBACK_SAMPLE_PER_BUCKET_CAP,
                    total: IMPORT_FALLBACK_SAMPLE_TOTAL_CAP,
                    truncated: true,
                },
                ..IndexProfile::default()
            },
            errors: Vec::new(),
        };

        let json: serde_json::Value = serde_json::from_str(&result_json(&result)).unwrap();
        assert_eq!(json["type"], "result");
        assert_eq!(json["profile"]["parseByLanguage"]["typescript"]["files"], 1);
        assert_eq!(
            json["profile"]["parseAstWalker"]["function_declaration"]["visits"],
            2
        );
        assert_eq!(json["profile"]["sqliteWriteMs"], 3);
        assert_eq!(json["profile"]["moduleResolutionShadowDecisionRefs"], 0);
        assert_eq!(
            json["profile"]["moduleResolutionShadowSampleCap"]["perBucket"],
            IMPORT_FALLBACK_SAMPLE_PER_BUCKET_CAP
        );
        assert_eq!(
            json["profile"]["esmNamedImportExportEdgeWriteAttemptedRefs"],
            3
        );
        assert_eq!(
            json["profile"]["esmNamedImportExportEdgeWriteWrittenRefs"],
            2
        );
        assert_eq!(
            json["profile"]["esmNamedImportExportEdgeWriteSkippedRefs"],
            1
        );
        assert_eq!(
            json["profile"]["esmNamedImportExportEdgeWriteSkippedCounts"]["target-file-mismatch"],
            1
        );
        assert_eq!(
            json["profile"]["esmNamedImportExportEdgeWriteSkippedSamples"][0]["candidateKind"],
            "constant"
        );
        assert_eq!(
            json["profile"]["esmNamedImportExportEdgeWriteSkippedSampleCap"]["truncated"],
            true
        );
    }

    #[test]
    fn result_json_emits_module_resolution_shadow_diagnostics() {
        let result = IndexResult {
            success: true,
            files_indexed: 0,
            files_skipped: 0,
            files_errored: 0,
            nodes_created: 0,
            edges_created: 0,
            duration_ms: 7,
            profile: IndexProfile {
                module_resolution_shadow_decision_refs: 1,
                module_resolution_shadow_decision_counts: BTreeMap::from([(
                    "relative".to_string(),
                    1,
                )]),
                module_resolution_shadow_parity_counts: BTreeMap::from([(
                    "unknown".to_string(),
                    1,
                )]),
                module_resolution_declaration_target_relationship_counts: BTreeMap::from([(
                    "singleRuntimeSibling".to_string(),
                    1,
                )]),
                module_resolution_declaration_runtime_pairing_decision_counts: BTreeMap::from([(
                    "eligibleSingleRuntimeSibling".to_string(),
                    1,
                )]),
                module_resolution_shadow_samples: vec![ModuleResolutionDecisionRecord {
                    specifier: "./dep".to_string(),
                    source_file: "src/main.ts".to_string(),
                    module_resolution_mode: "bundler".to_string(),
                    module_resolution_mode_source: "explicit".to_string(),
                    resolved_kind: "relative".to_string(),
                    resolved_path: Some("src/dep.ts".to_string()),
                    is_external_library_import: false,
                    failed_lookup_category: None,
                    condition_set: vec!["import".to_string()],
                    matched_condition: None,
                    parity_status: "unknown".to_string(),
                    fallback_reason: None,
                    declaration_target_relationship: Some(
                        DeclarationTargetRelationshipDiagnostic {
                            target_kind: "declaration".to_string(),
                            runtime_sibling_status: "singleRuntimeSibling".to_string(),
                            runtime_sibling_candidates: vec!["src/dep.ts".to_string()],
                            candidate_count: 1,
                            truncated: false,
                            pairing_decision: Some(DeclarationRuntimePairingDecision {
                                status: "eligibleSingleRuntimeSibling".to_string(),
                                runtime_target: Some("src/dep.ts".to_string()),
                                reason: "same-package-single-runtime-sibling".to_string(),
                            }),
                        },
                    ),
                }],
                module_resolution_guarded_edge_write_attempted_refs: 3,
                module_resolution_guarded_edge_write_written_refs: 2,
                module_resolution_guarded_edge_write_skipped_refs: 1,
                module_resolution_guarded_edge_write_skipped_counts: BTreeMap::from([(
                    "file-node-not-found".to_string(),
                    1,
                )]),
                ..IndexProfile::default()
            },
            errors: Vec::new(),
        };

        let output = result_json(&result);
        let json: serde_json::Value = serde_json::from_str(&output).unwrap();

        assert_eq!(json["profile"]["moduleResolutionShadowDecisionRefs"], 1);
        assert_eq!(
            json["profile"]["moduleResolutionShadowDecisionCounts"]["relative"],
            1
        );
        assert_eq!(
            json["profile"]["moduleResolutionShadowParityCounts"]["unknown"],
            1
        );
        assert_eq!(
            json["profile"]["moduleResolutionDeclarationTargetRelationshipCounts"]
                ["singleRuntimeSibling"],
            1
        );
        assert_eq!(
            json["profile"]["moduleResolutionDeclarationRuntimePairingDecisionCounts"]
                ["eligibleSingleRuntimeSibling"],
            1
        );
        assert_eq!(
            json["profile"]["moduleResolutionShadowSamples"][0]["specifier"],
            "./dep"
        );
        assert_eq!(
            json["profile"]["moduleResolutionShadowSamples"][0]["resolvedPath"],
            "src/dep.ts"
        );
        assert_eq!(
            json["profile"]["moduleResolutionShadowSamples"][0]["declarationTargetRelationship"]
                ["targetKind"],
            "declaration"
        );
        assert_eq!(
            json["profile"]["moduleResolutionShadowSamples"][0]["declarationTargetRelationship"]
                ["runtimeSiblingStatus"],
            "singleRuntimeSibling"
        );
        assert_eq!(
            json["profile"]["moduleResolutionShadowSamples"][0]["declarationTargetRelationship"]
                ["runtimeSiblingCandidates"][0],
            "src/dep.ts"
        );
        assert_eq!(
            json["profile"]["moduleResolutionShadowSamples"][0]["declarationTargetRelationship"]
                ["pairingDecision"]["runtimeTarget"],
            "src/dep.ts"
        );
        assert_eq!(
            json["profile"]["moduleResolutionGuardedEdgeWriteAttemptedRefs"],
            3
        );
        assert_eq!(
            json["profile"]["moduleResolutionGuardedEdgeWriteWrittenRefs"],
            2
        );
        assert_eq!(
            json["profile"]["moduleResolutionGuardedEdgeWriteSkippedRefs"],
            1
        );
        assert_eq!(
            json["profile"]["moduleResolutionGuardedEdgeWriteSkippedCounts"]["file-node-not-found"],
            1
        );
        assert!(!output.contains("const secret"));
    }

    #[test]
    fn rust_index_emits_module_resolution_shadow_profile_without_changing_graph_contract() {
        let dir = temp_dir("module-resolution-shadow-profile");
        fs::write(
            dir.join("tsconfig.json"),
            r#"{"compilerOptions":{"moduleResolution":"bundler","baseUrl":".","paths":{"@/*":["src/*"]}}}"#,
        )
        .unwrap();
        fs::create_dir_all(dir.join("src")).unwrap();
        fs::write(dir.join("src").join("dep.ts"), "export const dep = 1;\n").unwrap();
        fs::write(
            dir.join("src").join("main.ts"),
            [
                "import { dep } from './dep';",
                "import fs from 'node:fs';",
                "import lodash from 'lodash';",
                "export const total = dep + lodash.size([fs]);",
                "",
            ]
            .join("\n"),
        )
        .unwrap();

        let request = IndexRequest {
            engine: "rust".to_string(),
            project_path: dir.to_string_lossy().to_string(),
            index_path: dir
                .join(".zcodegraph")
                .join("zcodegraph.db")
                .to_string_lossy()
                .to_string(),
            force: true,
            verbose: false,
            graph_work_profile: GraphWorkProfile::Full,
            sqlite_write_mode: SqliteWriteMode::Disk,
            parse_walker_diagnostics: false,
        };

        let result = run_index(&request);

        assert!(result.success, "{:?}", result.errors);
        assert!(result.profile.module_resolution_shadow_decision_refs >= 3);
        assert!(
            result
                .profile
                .module_resolution_shadow_decision_counts
                .get("relative")
                .copied()
                .unwrap_or(0)
                >= 1
        );
        assert_eq!(
            result
                .profile
                .module_resolution_shadow_decision_counts
                .get("nodeRuntimeBuiltin"),
            Some(&1)
        );
        assert_eq!(
            result
                .profile
                .module_resolution_shadow_decision_counts
                .get("packageOrRuntime"),
            Some(&1)
        );
        assert!(result
            .profile
            .module_resolution_shadow_samples
            .iter()
            .any(|sample| sample.module_resolution_mode == "bundler"));
        assert!(result
            .profile
            .module_resolution_shadow_samples
            .iter()
            .all(|sample| sample.parity_status == "unknown"));

        let conn = Connection::open(&request.index_path).unwrap();
        let rust_shadow_edges = conn
            .query_row(
                "SELECT COUNT(*) FROM edges WHERE edgeOrigin = 'rust-module-resolution-shadow'",
                [],
                |row| row.get::<_, i64>(0),
            )
            .unwrap();
        assert_eq!(rust_shadow_edges, 0);

        fs::remove_dir_all(dir).unwrap();
    }

    #[test]
    fn rust_index_emits_declaration_target_relationship_diagnostics() {
        let dir = temp_dir("declaration-target-relationship-profile");
        fs::write(dir.join("package.json"), r#"{"name":"root"}"#).unwrap();
        fs::write(
            dir.join("tsconfig.json"),
            r#"{"compilerOptions":{"moduleResolution":"bundler"}}"#,
        )
        .unwrap();
        fs::create_dir_all(dir.join("src")).unwrap();
        fs::create_dir_all(dir.join("src").join("nested")).unwrap();
        fs::write(
            dir.join("src").join("nested").join("package.json"),
            r#"{"name":"nested"}"#,
        )
        .unwrap();
        fs::write(
            dir.join("src").join("no.d.ts"),
            "export declare const no: number;\n",
        )
        .unwrap();
        fs::write(
            dir.join("src").join("single.d.mts"),
            "export declare const single: number;\n",
        )
        .unwrap();
        fs::write(
            dir.join("src").join("single.mts"),
            "export const single = 1;\n",
        )
        .unwrap();
        fs::write(
            dir.join("src").join("nested").join("cross.d.ts"),
            "export declare const cross: number;\n",
        )
        .unwrap();
        fs::write(
            dir.join("src").join("nested").join("cross.ts"),
            "export const cross = 1;\n",
        )
        .unwrap();
        fs::write(
            dir.join("src").join("multi.d.cts"),
            "export declare const multi: number;\n",
        )
        .unwrap();
        fs::write(
            dir.join("src").join("multi.cts"),
            "export const multi = 1;\n",
        )
        .unwrap();
        fs::write(dir.join("src").join("multi.cjs"), "exports.multi = 1;\n").unwrap();
        fs::write(
            dir.join("src").join("main.ts"),
            [
                "import './no.d.ts';",
                "import './single.d.mts';",
                "import './multi.d.cts';",
                "import './nested/cross.d.ts';",
                "",
            ]
            .join("\n"),
        )
        .unwrap();

        let request = IndexRequest {
            engine: "rust".to_string(),
            project_path: dir.to_string_lossy().to_string(),
            index_path: dir
                .join(".zcodegraph")
                .join("zcodegraph.db")
                .to_string_lossy()
                .to_string(),
            force: true,
            verbose: false,
            graph_work_profile: GraphWorkProfile::Full,
            sqlite_write_mode: SqliteWriteMode::Disk,
            parse_walker_diagnostics: false,
        };

        let result = run_index(&request);
        assert!(result.success, "{:?}", result.errors);
        assert_eq!(
            result
                .profile
                .module_resolution_declaration_target_relationship_counts
                .get("noRuntimeSibling"),
            Some(&1)
        );
        assert_eq!(
            result
                .profile
                .module_resolution_declaration_target_relationship_counts
                .get("singleRuntimeSibling"),
            Some(&2)
        );
        assert_eq!(
            result
                .profile
                .module_resolution_declaration_target_relationship_counts
                .get("multipleRuntimeSiblings"),
            Some(&1)
        );
        assert_eq!(
            result
                .profile
                .module_resolution_declaration_runtime_pairing_decision_counts
                .get("eligibleSingleRuntimeSibling"),
            Some(&1)
        );
        assert_eq!(
            result
                .profile
                .module_resolution_declaration_runtime_pairing_decision_counts
                .get("blockedNoRuntimeSibling"),
            Some(&1)
        );
        assert_eq!(
            result
                .profile
                .module_resolution_declaration_runtime_pairing_decision_counts
                .get("blockedMultipleRuntimeSiblings"),
            Some(&1)
        );
        assert_eq!(
            result
                .profile
                .module_resolution_declaration_runtime_pairing_decision_counts
                .get("blockedExternalOrPackageBoundary"),
            Some(&1)
        );

        let relationships = result
            .profile
            .module_resolution_shadow_samples
            .iter()
            .filter_map(|sample| {
                sample
                    .declaration_target_relationship
                    .as_ref()
                    .map(|relationship| {
                        (
                            sample.resolved_path.as_deref().unwrap_or_default(),
                            relationship,
                        )
                    })
            })
            .collect::<Vec<_>>();
        assert_eq!(relationships.len(), 4);
        assert!(relationships.iter().any(|(path, relationship)| {
            *path == "src/no.d.ts"
                && relationship.runtime_sibling_status == "noRuntimeSibling"
                && relationship.runtime_sibling_candidates.is_empty()
                && relationship
                    .pairing_decision
                    .as_ref()
                    .is_some_and(|decision| {
                        decision.status == "blockedNoRuntimeSibling"
                            && decision.runtime_target.is_none()
                    })
        }));
        assert!(relationships.iter().any(|(path, relationship)| {
            *path == "src/single.d.mts"
                && relationship.runtime_sibling_status == "singleRuntimeSibling"
                && relationship.runtime_sibling_candidates == vec!["src/single.mts"]
                && relationship
                    .pairing_decision
                    .as_ref()
                    .is_some_and(|decision| {
                        decision.status == "eligibleSingleRuntimeSibling"
                            && decision.runtime_target.as_deref() == Some("src/single.mts")
                    })
        }));
        assert!(relationships.iter().any(|(path, relationship)| {
            *path == "src/multi.d.cts"
                && relationship.runtime_sibling_status == "multipleRuntimeSiblings"
                && relationship.candidate_count == 2
                && relationship
                    .runtime_sibling_candidates
                    .contains(&"src/multi.cts".to_string())
                && relationship
                    .runtime_sibling_candidates
                    .contains(&"src/multi.cjs".to_string())
                && relationship
                    .pairing_decision
                    .as_ref()
                    .is_some_and(|decision| {
                        decision.status == "blockedMultipleRuntimeSiblings"
                            && decision.runtime_target.is_none()
                    })
        }));
        assert!(relationships.iter().any(|(path, relationship)| {
            *path == "src/nested/cross.d.ts"
                && relationship.runtime_sibling_status == "singleRuntimeSibling"
                && relationship
                    .pairing_decision
                    .as_ref()
                    .is_some_and(|decision| {
                        decision.status == "blockedExternalOrPackageBoundary"
                            && decision.runtime_target.is_none()
                    })
        }));
        assert_eq!(
            result
                .profile
                .module_resolution_declaration_runtime_edge_write_attempted_refs,
            4
        );
        assert_eq!(
            result
                .profile
                .module_resolution_declaration_runtime_edge_write_written_refs,
            1
        );
        assert_eq!(
            result
                .profile
                .module_resolution_declaration_runtime_edge_write_skipped_refs,
            3
        );
        assert_eq!(
            result
                .profile
                .module_resolution_declaration_runtime_edge_write_skipped_counts
                .get("pairing-not-eligible"),
            Some(&3)
        );

        let conn = Connection::open(dir.join(".zcodegraph").join("zcodegraph.db")).unwrap();
        let targets = conn
            .prepare(
                "SELECT DISTINCT target.file_path
                 FROM edges e
                 JOIN nodes source ON source.id = e.source
                 JOIN nodes target ON target.id = e.target
                 WHERE e.kind = 'imports'
                   AND e.edgeOrigin = 'rust-finalization'
                   AND source.file_path = 'src/main.ts'
                   AND source.kind = 'file'
                 ORDER BY target.file_path",
            )
            .unwrap()
            .query_map([], |row| row.get::<_, String>(0))
            .unwrap()
            .collect::<Result<Vec<_>, _>>()
            .unwrap();
        assert_eq!(
            targets,
            vec![
                "src/multi.d.cts",
                "src/nested/cross.d.ts",
                "src/no.d.ts",
                "src/single.mts",
            ]
        );

        let json: serde_json::Value = serde_json::from_str(&result_json(&result)).unwrap();
        assert_eq!(
            json["profile"]["moduleResolutionDeclarationTargetRelationshipCounts"]
                ["multipleRuntimeSiblings"],
            1
        );
        assert_eq!(
            json["profile"]["moduleResolutionDeclarationRuntimePairingDecisionCounts"]
                ["eligibleSingleRuntimeSibling"],
            1
        );
        assert_eq!(
            json["profile"]["moduleResolutionDeclarationRuntimeEdgeWriteWrittenRefs"],
            1
        );
        assert!(json["profile"]["moduleResolutionShadowSamples"]
            .as_array()
            .unwrap()
            .iter()
            .any(
                |sample| sample["declarationTargetRelationship"]["pairingDecision"]["status"]
                    == "eligibleSingleRuntimeSibling"
            ));

        fs::remove_dir_all(dir).unwrap();
    }

    #[test]
    fn declaration_runtime_edge_write_fails_closed_when_runtime_file_node_is_missing() {
        let dir = temp_dir("declaration-runtime-missing-runtime-node");
        fs::write(dir.join("package.json"), r#"{"name":"root"}"#).unwrap();
        fs::create_dir_all(dir.join("src")).unwrap();
        fs::write(dir.join("src").join("main.ts"), "import './api.d.ts';\n").unwrap();
        fs::write(
            dir.join("src").join("api.d.ts"),
            "export declare const api: number;\n",
        )
        .unwrap();
        fs::write(dir.join("src").join("api.ts"), "export const api = 1;\n").unwrap();

        let conn = Connection::open_in_memory().unwrap();
        conn.execute_batch(SCHEMA_SQL).unwrap();
        insert_file_node(&conn, "file:src/main.ts", "src/main.ts");
        insert_file_node(&conn, "file:src/api.d.ts", "src/api.d.ts");

        let decision = declaration_runtime_edge_write_decision(
            &conn,
            &dir,
            "src/main.ts",
            Some("src/api.d.ts"),
        )
        .unwrap()
        .unwrap();
        match decision {
            DeclarationRuntimeEdgeWrite::KeepDeclaration { reason } => {
                assert_eq!(reason, "runtime-file-node-missing");
            }
            DeclarationRuntimeEdgeWrite::Rewrite { .. } => {
                panic!("missing runtime file node must fail closed");
            }
        }

        fs::remove_dir_all(dir).unwrap();
    }

    #[test]
    fn guarded_esm_named_symbol_edge_write_fails_closed_for_weak_targets() {
        let conn = Connection::open_in_memory().unwrap();
        conn.execute_batch(SCHEMA_SQL).unwrap();
        insert_symbol_node(
            &conn,
            "function:alpha",
            "function",
            "alpha",
            "src/source.ts",
        );
        insert_symbol_node(&conn, "route:alpha", "route", "alpha", "src/source.ts");

        assert_eq!(
            guarded_esm_named_symbol_edge_write_decision(
                &conn,
                "function:missing",
                "src/source.ts",
                "function",
            )
            .unwrap(),
            GuardedEsmNamedSymbolEdgeWrite::Skip {
                reason: "target-node-missing"
            }
        );
        assert_eq!(
            guarded_esm_named_symbol_edge_write_decision(
                &conn,
                "function:alpha",
                "src/other.ts",
                "function",
            )
            .unwrap(),
            GuardedEsmNamedSymbolEdgeWrite::Skip {
                reason: "target-file-mismatch"
            }
        );
        assert_eq!(
            guarded_esm_named_symbol_edge_write_decision(
                &conn,
                "function:alpha",
                "src/source.ts",
                "class",
            )
            .unwrap(),
            GuardedEsmNamedSymbolEdgeWrite::Skip {
                reason: "unsupported-candidate-shape"
            }
        );
        assert_eq!(
            guarded_esm_named_symbol_edge_write_decision(
                &conn,
                "route:alpha",
                "src/source.ts",
                "route",
            )
            .unwrap(),
            GuardedEsmNamedSymbolEdgeWrite::Skip {
                reason: "unsupported-candidate-shape"
            }
        );
    }

    #[test]
    fn guarded_esm_named_import_symbol_edge_skip_records_diagnostics_without_writing() {
        let conn = Connection::open_in_memory().unwrap();
        conn.execute_batch(SCHEMA_SQL).unwrap();
        insert_symbol_node(
            &conn,
            "function:alpha",
            "function",
            "alpha",
            "src/source.ts",
        );
        let reference = ImportRefRow {
            id: 7,
            from_node_id: "import:consumer-alpha".to_string(),
            reference_name: "alpha".to_string(),
            line: 1,
            col: 9,
            file_path: "src/consumer.ts".to_string(),
            language: "typescript".to_string(),
        };
        let target = SymbolCandidateRow {
            id: "function:alpha".to_string(),
            kind: "function".to_string(),
            name: "alpha".to_string(),
            start_line: 1,
            end_line: 1,
            resolved_by: "rust-esm-named-import-export",
        };
        let mut stats = EsmNamedImportExportStats::default();

        let edge_created = write_guarded_esm_named_import_symbol_edge(
            &conn,
            &mut stats,
            &reference,
            "src/other.ts",
            &target,
            "rust-esm-named-import-export",
        )
        .unwrap();

        assert_eq!(edge_created, None);
        assert_eq!(stats.edge_write_attempted_refs, 1);
        assert_eq!(stats.edge_write_written_refs, 0);
        assert_eq!(stats.edge_write_skipped_refs, 1);
        assert_eq!(
            stats.edge_write_skipped_counts,
            BTreeMap::from([("target-file-mismatch".to_string(), 1)])
        );
        assert_eq!(stats.edge_write_skipped_samples.len(), 1);
        assert_eq!(
            stats.edge_write_skipped_samples[0].candidate_kind,
            Some("function".to_string())
        );
        assert_eq!(
            stats.edge_write_skipped_samples[0].target_file_path,
            Some("src/other.ts".to_string())
        );
        let edge_count: i64 = conn
            .query_row("SELECT COUNT(*) FROM edges", [], |row| row.get(0))
            .unwrap();
        assert_eq!(edge_count, 0);
    }

    fn insert_file_node(conn: &Connection, id: &str, file_path: &str) {
        conn.execute(
            "INSERT INTO nodes (
                id, kind, name, qualified_name, file_path, language,
                start_line, end_line, start_column, end_column, updated_at
            ) VALUES (?1, 'file', ?2, ?2, ?2, 'typescript', 1, 1, 0, 0, 1)",
            params![id, file_path],
        )
        .unwrap();
    }

    fn insert_symbol_node(conn: &Connection, id: &str, kind: &str, name: &str, file_path: &str) {
        conn.execute(
            "INSERT INTO nodes (
                id, kind, name, qualified_name, file_path, language,
                start_line, end_line, start_column, end_column, updated_at
            ) VALUES (?1, ?2, ?3, ?3, ?4, 'typescript', 1, 1, 0, 0, 1)",
            params![id, kind, name, file_path],
        )
        .unwrap();
    }

    #[test]
    fn result_json_emits_candidate_declaration_diagnostics() {
        let result = IndexResult {
            success: true,
            files_indexed: 0,
            files_skipped: 0,
            files_errored: 0,
            nodes_created: 0,
            edges_created: 0,
            duration_ms: 7,
            profile: IndexProfile {
                esm_named_import_export_fallback_samples: vec![EsmNamedFallbackSample {
                    reason: "direct-export-candidate-multiple".to_string(),
                    reference_name: "parseThing".to_string(),
                    reference_kind: "imports".to_string(),
                    file_path: "consumer.ts".to_string(),
                    language: "typescript".to_string(),
                    line: 1,
                    col: 9,
                    target_file_path: Some("api.ts".to_string()),
                    candidate_kind: None,
                    candidate_count: Some(2),
                    resolved_by_attempt: Some("direct-export".to_string()),
                    candidate_line_ranges: Some(vec![CandidateDeclarationDiagnostic {
                        kind: "function".to_string(),
                        start_line: 1,
                        end_line: 3,
                        has_body: Some(true),
                        declaration_form: Some("implementation".to_string()),
                        metadata_source: "target-file-line-range-inference".to_string(),
                    }]),
                }],
                ..IndexProfile::default()
            },
            errors: Vec::new(),
        };

        let json = result_json(&result);

        assert!(json.contains("\"candidateLineRanges\":["));
        assert!(json.contains("\"hasBody\":true"));
        assert!(json.contains("\"declarationForm\":\"implementation\""));
        assert!(json.contains("\"metadataSource\":\"target-file-line-range-inference\""));
        assert!(!json.contains("return String"));
    }

    #[test]
    fn caps_import_fallback_samples_but_keeps_full_counts() {
        let mut stats = ImportResolutionStats::default();
        let reference = ImportRefRow {
            id: 1,
            from_node_id: "from".to_string(),
            reference_name: "./missing".to_string(),
            line: 3,
            col: 8,
            file_path: "src/main.ts".to_string(),
            language: "typescript".to_string(),
        };

        for _ in 0..(IMPORT_FALLBACK_SAMPLE_PER_BUCKET_CAP + 1) {
            stats.record_fallback_sample("relative", "target-not-found", &reference);
        }

        assert_eq!(
            stats
                .fallback_sample_counts
                .get("relative/target-not-found"),
            Some(&((IMPORT_FALLBACK_SAMPLE_PER_BUCKET_CAP + 1) as u32))
        );
        assert_eq!(
            stats.fallback_samples.len(),
            IMPORT_FALLBACK_SAMPLE_PER_BUCKET_CAP
        );
        assert!(stats.fallback_samples_truncated);
    }

    #[test]
    fn emits_structured_rust_owned_parse_gap_errors() {
        let result = IndexResult {
            success: true,
            files_indexed: 1,
            files_skipped: 0,
            files_errored: 1,
            nodes_created: 1,
            edges_created: 0,
            duration_ms: 7,
            profile: IndexProfile::default(),
            errors: vec![IndexError::rust_owned_parse_gap(
                "src/bad.ts".to_string(),
                "typescript".to_string(),
            )],
        };

        assert!(result_json(&result).contains("\"filePath\":\"src/bad.ts\""));
        assert!(result_json(&result).contains("\"language\":\"typescript\""));
        assert!(result_json(&result).contains("\"code\":\"rust-owned-parse-gap\""));
        assert!(result_json(&result).contains("\"severity\":\"warning\""));
        assert!(result_json(&result).contains("\"writtenByRust\":false"));
    }

    #[test]
    fn escapes_error_messages_as_json_strings() {
        assert_eq!(
            error_json("bad \"path\"\nnext"),
            "{\"type\":\"error\",\"severity\":\"error\",\"message\":\"bad \\\"path\\\"\\nnext\"}"
        );
    }

    fn node_json(
        id: &str,
        kind: &str,
        name: &str,
        qualified_name: &str,
        file_path: &str,
    ) -> serde_json::Value {
        serde_json::json!({
            "id": id,
            "kind": kind,
            "name": name,
            "qualifiedName": qualified_name,
            "filePath": file_path,
            "language": "typescript",
            "startLine": 1,
            "isExported": true
        })
    }

    fn matcher_response(reference_name: &str, candidates: serde_json::Value) -> serde_json::Value {
        let request = serde_json::json!({
            "version": 1,
            "references": [{
                "key": "ref-1",
                "ref": {
                    "referenceName": reference_name,
                    "referenceKind": "calls",
                    "filePath": "src/caller.ts",
                    "language": "typescript",
                    "line": 3
                },
                "candidates": candidates
            }]
        });
        let output = match_name_json(&request.to_string()).unwrap();
        serde_json::from_str(&output).unwrap()
    }

    #[test]
    fn rust_name_matcher_resolves_exact_candidate_facts() {
        let target = node_json(
            "node-alpha",
            "function",
            "alpha",
            "src/target.ts::alpha",
            "src/target.ts",
        );
        let response = matcher_response(
            "alpha",
            serde_json::json!({
                "byName": [target],
                "byQualifiedName": [],
                "byLeafName": [],
                "byLowerName": [],
                "byFileName": [],
                "classCandidates": [],
                "capitalizedClassCandidates": [],
                "methodCandidates": [],
                "nodesInFiles": {}
            }),
        );

        assert_eq!(response["decisions"][0]["targetNodeId"], "node-alpha");
        assert_eq!(response["decisions"][0]["resolvedBy"], "exact-match");
        assert_eq!(response["diagnostics"]["rustMatcherHandledRefs"], 1);
    }

    #[test]
    fn rust_name_matcher_resolves_qualified_candidate_facts() {
        let target = node_json(
            "node-qualified",
            "function",
            "run",
            "Service.run",
            "src/service.ts",
        );
        let response = matcher_response(
            "Service.run",
            serde_json::json!({
                "byName": [],
                "byQualifiedName": [target],
                "byLeafName": [],
                "byLowerName": [],
                "byFileName": [],
                "classCandidates": [],
                "capitalizedClassCandidates": [],
                "methodCandidates": [],
                "nodesInFiles": {}
            }),
        );

        assert_eq!(response["decisions"][0]["targetNodeId"], "node-qualified");
        assert_eq!(response["decisions"][0]["resolvedBy"], "qualified-name");
    }

    #[test]
    fn rust_name_matcher_resolves_method_candidate_facts() {
        let class_node = node_json(
            "class-service",
            "class",
            "Service",
            "Service",
            "src/service.ts",
        );
        let method_node = node_json(
            "method-run",
            "method",
            "run",
            "Service.run",
            "src/service.ts",
        );
        let response = matcher_response(
            "Service.run",
            serde_json::json!({
                "byName": [],
                "byQualifiedName": [],
                "byLeafName": [],
                "byLowerName": [],
                "byFileName": [],
                "classCandidates": [class_node],
                "capitalizedClassCandidates": [],
                "methodCandidates": [method_node],
                "nodesInFiles": {
                    "src/service.ts": [method_node]
                }
            }),
        );

        assert_eq!(response["decisions"][0]["targetNodeId"], "method-run");
        assert_eq!(response["decisions"][0]["resolvedBy"], "qualified-name");
    }

    #[test]
    fn rust_name_matcher_resolves_function_member_candidate_facts() {
        let class_node = node_json(
            "class-service",
            "class",
            "Service",
            "Service",
            "src/service.ts",
        );
        let method_node = node_json(
            "function-run",
            "function",
            "run",
            "Service.run",
            "src/service.ts",
        );
        let response = matcher_response(
            "Service.run",
            serde_json::json!({
                "byName": [],
                "byQualifiedName": [],
                "byLeafName": [],
                "byLowerName": [],
                "byFileName": [],
                "classCandidates": [class_node],
                "capitalizedClassCandidates": [],
                "methodCandidates": [method_node],
                "nodesInFiles": {
                    "src/service.ts": [method_node]
                }
            }),
        );

        assert_eq!(response["decisions"][0]["targetNodeId"], "function-run");
        assert_eq!(response["decisions"][0]["resolvedBy"], "qualified-name");
    }

    #[test]
    fn rust_name_matcher_reports_decision_oriented_fallback_reason() {
        let response = matcher_response(
            "missing",
            serde_json::json!({
                "byName": [],
                "byQualifiedName": [],
                "byLeafName": [],
                "byLowerName": [],
                "byFileName": [],
                "classCandidates": [],
                "capitalizedClassCandidates": [],
                "methodCandidates": [],
                "nodesInFiles": {}
            }),
        );

        assert_eq!(
            response["decisions"][0]["fallbackReason"],
            "missing-candidate-facts"
        );
        assert_eq!(
            response["diagnostics"]["rustMatcherFallbackReasons"]["missing-candidate-facts"],
            1
        );
        assert!(response["diagnostics"]["rustMatcherFallbackReasons"]["unresolved"].is_null());
    }

    #[test]
    fn rust_name_matcher_reports_fallback_for_unhandled_reference() {
        let response = matcher_response(
            "missing",
            serde_json::json!({
                "byName": [],
                "byQualifiedName": [],
                "byLeafName": [],
                "byLowerName": [],
                "byFileName": [],
                "classCandidates": [],
                "capitalizedClassCandidates": [],
                "methodCandidates": [],
                "nodesInFiles": {}
            }),
        );

        assert_eq!(
            response["decisions"][0]["targetNodeId"],
            serde_json::Value::Null
        );
        assert_eq!(
            response["decisions"][0]["fallbackReason"],
            "missing-candidate-facts"
        );
        assert_eq!(
            response["diagnostics"]["rustMatcherFallbackReasons"]["missing-candidate-facts"],
            1
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

    #[test]
    fn rust_index_keeps_sqlite_writes_batched_for_symbol_heavy_projects() {
        let dir = temp_dir("batched-writes");
        for file_index in 0..40 {
            let mut source = String::new();
            for symbol_index in 0..80 {
                source.push_str(&format!(
                    "export function f{}_{}() {{ return {}; }}\n",
                    file_index, symbol_index, symbol_index
                ));
            }
            fs::write(dir.join(format!("f{}.ts", file_index)), source).unwrap();
        }

        let request = IndexRequest {
            engine: "rust".to_string(),
            project_path: dir.to_string_lossy().to_string(),
            index_path: dir
                .join(".zcodegraph")
                .join("zcodegraph.db")
                .to_string_lossy()
                .to_string(),
            force: true,
            verbose: false,
            graph_work_profile: GraphWorkProfile::Full,
            sqlite_write_mode: SqliteWriteMode::Disk,
            parse_walker_diagnostics: false,
        };

        let result = run_index(&request);

        assert!(result.success, "{:?}", result.errors);
        assert_eq!(result.files_indexed, 40);
        assert!(result.nodes_created >= 3_200);
        let max_expected_sqlite_ms = 500.max(result.profile.parse_extraction_ms * 4);
        assert!(
            result.profile.sqlite_write_ms <= max_expected_sqlite_ms,
            "sqliteWriteMs={}ms parseExtractionMs={}ms maxExpectedSqliteMs={}ms",
            result.profile.sqlite_write_ms,
            result.profile.parse_extraction_ms,
            max_expected_sqlite_ms
        );
        fs::remove_dir_all(dir).unwrap();
    }

    #[test]
    fn rust_index_bulk_write_rebuilds_search_index_for_symbol_heavy_projects() {
        let dir = temp_dir("bulk-search-index");
        for file_index in 0..80 {
            let mut source = String::new();
            for symbol_index in 0..500 {
                source.push_str(&format!(
                    "export function f{}_{}() {{ return {}; }}\n",
                    file_index, symbol_index, symbol_index
                ));
            }
            fs::write(dir.join(format!("f{}.ts", file_index)), source).unwrap();
        }

        let request = IndexRequest {
            engine: "rust".to_string(),
            project_path: dir.to_string_lossy().to_string(),
            index_path: dir
                .join(".zcodegraph")
                .join("zcodegraph.db")
                .to_string_lossy()
                .to_string(),
            force: true,
            verbose: false,
            graph_work_profile: GraphWorkProfile::Full,
            sqlite_write_mode: SqliteWriteMode::FinalFlush,
            parse_walker_diagnostics: false,
        };

        let result = run_index(&request);

        assert!(result.success, "{:?}", result.errors);
        assert_eq!(result.files_indexed, 80);
        assert!(result.nodes_created >= 40_000);
        let conn = Connection::open(dir.join(".zcodegraph").join("zcodegraph.db")).unwrap();
        let fts_count: i64 = conn
            .query_row("SELECT count(*) FROM nodes_fts", [], |row| row.get(0))
            .unwrap();
        let node_count: i64 = conn
            .query_row("SELECT count(*) FROM nodes", [], |row| row.get(0))
            .unwrap();
        assert_eq!(fts_count, node_count);

        let max_expected_sqlite_ms = 250.max(result.profile.parse_extraction_ms * 2);
        assert!(
            result.profile.sqlite_write_ms <= max_expected_sqlite_ms,
            "sqliteWriteMs={}ms parseExtractionMs={}ms maxExpectedSqliteMs={}ms",
            result.profile.sqlite_write_ms,
            result.profile.parse_extraction_ms,
            max_expected_sqlite_ms
        );
        fs::remove_dir_all(dir).unwrap();
    }

    #[test]
    fn rust_index_bulk_transaction_keeps_parse_gap_files_and_continues() {
        let dir = temp_dir("bulk-parse-gap");
        fs::write(
            dir.join("good-before.ts"),
            "export function stableSymbol() { return 1; }\n",
        )
        .unwrap();
        fs::write(dir.join("bad.ts"), "export function broken( {\n").unwrap();
        fs::write(
            dir.join("good-after.ts"),
            "export function laterSymbol() { return stableSymbol(); }\n",
        )
        .unwrap();

        let request = IndexRequest {
            engine: "rust".to_string(),
            project_path: dir.to_string_lossy().to_string(),
            index_path: dir
                .join(".zcodegraph")
                .join("zcodegraph.db")
                .to_string_lossy()
                .to_string(),
            force: true,
            verbose: false,
            graph_work_profile: GraphWorkProfile::Full,
            sqlite_write_mode: SqliteWriteMode::FinalFlush,
            parse_walker_diagnostics: false,
        };

        let result = run_index(&request);

        assert!(result.success, "{:?}", result.errors);
        assert_eq!(result.files_indexed, 3);
        assert_eq!(result.files_errored, 1);
        assert_eq!(result.errors.len(), 1);
        let conn = Connection::open(dir.join(".zcodegraph").join("zcodegraph.db")).unwrap();
        let file_count: i64 = conn
            .query_row("SELECT COUNT(*) FROM files", [], |row| row.get(0))
            .unwrap();
        let fts_count: i64 = conn
            .query_row("SELECT count(*) FROM nodes_fts", [], |row| row.get(0))
            .unwrap();
        let node_count: i64 = conn
            .query_row("SELECT count(*) FROM nodes", [], |row| row.get(0))
            .unwrap();
        let stable_count: i64 = conn
            .query_row(
                "SELECT COUNT(*) FROM nodes WHERE name = 'stableSymbol'",
                [],
                |row| row.get(0),
            )
            .unwrap();
        let later_count: i64 = conn
            .query_row(
                "SELECT COUNT(*) FROM nodes WHERE name = 'laterSymbol'",
                [],
                |row| row.get(0),
            )
            .unwrap();

        assert_eq!(file_count, 3);
        assert_eq!(fts_count, node_count);
        assert_eq!(stable_count, 1);
        assert_eq!(later_count, 1);
        fs::remove_dir_all(dir).unwrap();
    }

    #[test]
    fn rust_index_skips_anonymous_leaf_checks_without_losing_js_graph_facts() {
        let dir = temp_dir("anonymous-leaf-walker");
        fs::create_dir_all(dir.join("src")).unwrap();
        fs::write(
            dir.join("src").join("dep.tsx"),
            [
                "export function helper() { return 1; }",
                "export function Button() { return <span />; }",
                "",
            ]
            .join("\n"),
        )
        .unwrap();
        fs::write(
            dir.join("src").join("main.tsx"),
            [
                "import { helper, Button } from './dep';",
                "export function App() {",
                "  helper();",
                "  return <Button />;",
                "}",
                "",
            ]
            .join("\n"),
        )
        .unwrap();

        let request = IndexRequest {
            engine: "rust".to_string(),
            project_path: dir.to_string_lossy().to_string(),
            index_path: dir
                .join(".zcodegraph")
                .join("zcodegraph.db")
                .to_string_lossy()
                .to_string(),
            force: true,
            verbose: false,
            graph_work_profile: GraphWorkProfile::Full,
            sqlite_write_mode: SqliteWriteMode::FinalFlush,
            parse_walker_diagnostics: true,
        };

        let result = run_index(&request);

        assert!(result.success, "{:?}", result.errors);
        assert_eq!(result.files_indexed, 2);
        let conn = Connection::open(dir.join(".zcodegraph").join("zcodegraph.db")).unwrap();
        for name in ["helper", "Button", "App"] {
            let count: i64 = conn
                .query_row(
                    "SELECT COUNT(*) FROM nodes WHERE name = ?1",
                    [name],
                    |row| row.get(0),
                )
                .unwrap();
            assert_eq!(count, 1, "expected one node named {name}");
        }
        let semantic_edges: i64 = conn
            .query_row(
                "SELECT COUNT(*) FROM edges WHERE kind IN ('imports', 'calls', 'references')",
                [],
                |row| row.get(0),
            )
            .unwrap();
        assert!(
            semantic_edges >= 3,
            "expected import, call, and JSX graph facts to remain visible"
        );
        let anonymous_quote = result.profile.parse_ast_walker.get("'");
        assert_eq!(
            anonymous_quote.map(|profile| profile.named_symbol_checks),
            Some(0)
        );
        assert_eq!(
            anonymous_quote.map(|profile| profile.statement_ref_checks),
            Some(0)
        );

        fs::remove_dir_all(dir).unwrap();
    }

    #[test]
    fn rust_index_leaves_parse_walker_diagnostics_off_by_default() {
        let dir = temp_dir("walker-diagnostics-off");
        fs::write(
            dir.join("main.ts"),
            "export function alpha() { return beta(); }\nfunction beta() { return 1; }\n",
        )
        .unwrap();

        let request = IndexRequest {
            engine: "rust".to_string(),
            project_path: dir.to_string_lossy().to_string(),
            index_path: dir
                .join(".zcodegraph")
                .join("zcodegraph.db")
                .to_string_lossy()
                .to_string(),
            force: true,
            verbose: false,
            graph_work_profile: GraphWorkProfile::Full,
            sqlite_write_mode: SqliteWriteMode::FinalFlush,
            parse_walker_diagnostics: false,
        };

        let result = run_index(&request);

        assert!(result.success, "{:?}", result.errors);
        assert!(result.profile.parse_ast_walker.is_empty());
        fs::remove_dir_all(dir).unwrap();
    }

    #[test]
    fn rust_profile_classifies_typescript_overload_implementation_candidates() {
        let dir = temp_dir("ts-overload-implementation-metadata");
        fs::write(
            dir.join("api.ts"),
            [
                "export function parseThing(value: string): string;",
                "export function parseThing(value: number): string;",
                "export function parseThing(value: string | number) {",
                "  return String(value);",
                "}",
                "",
            ]
            .join("\n"),
        )
        .unwrap();
        fs::write(
            dir.join("consumer.ts"),
            "import { parseThing } from './api';\nexport const result = parseThing('x');\n",
        )
        .unwrap();

        let request = IndexRequest {
            engine: "rust".to_string(),
            project_path: dir.to_string_lossy().to_string(),
            index_path: dir
                .join(".zcodegraph")
                .join("zcodegraph.db")
                .to_string_lossy()
                .to_string(),
            force: true,
            verbose: false,
            graph_work_profile: GraphWorkProfile::Full,
            sqlite_write_mode: SqliteWriteMode::FinalFlush,
            parse_walker_diagnostics: false,
        };

        let result = run_index(&request);

        assert!(result.success, "{:?}", result.errors);
        assert_eq!(
            result
                .profile
                .esm_named_import_export_overload_implementation_resolved_refs,
            2
        );
        assert!(result
            .profile
            .esm_named_import_export_fallback_samples
            .iter()
            .all(|sample| sample.reference_name != "parseThing"));

        fs::remove_dir_all(dir).unwrap();
    }

    #[test]
    fn rust_profile_populates_parse_extraction_sub_buckets() {
        let dir = temp_dir("parse-extraction-profile");
        fs::write(
            dir.join("main.ts"),
            [
                "type Lookup = (name: string) => import('./types').Node[];",
                "export function alpha(value: string): string {",
                "  return value;",
                "}",
                "",
            ]
            .join("\n"),
        )
        .unwrap();
        fs::write(
            dir.join("helper.js"),
            [
                "export function beta(value) {",
                "  return value + 1;",
                "}",
                "",
            ]
            .join("\n"),
        )
        .unwrap();

        let request = IndexRequest {
            engine: "rust".to_string(),
            project_path: dir.to_string_lossy().to_string(),
            index_path: dir
                .join(".zcodegraph")
                .join("zcodegraph.db")
                .to_string_lossy()
                .to_string(),
            force: true,
            verbose: false,
            graph_work_profile: GraphWorkProfile::Full,
            sqlite_write_mode: SqliteWriteMode::FinalFlush,
            parse_walker_diagnostics: false,
        };

        let result = run_index(&request);

        assert!(result.success, "{:?}", result.errors);
        assert_eq!(result.files_indexed, 2);
        assert!(result.profile.parse_extraction_ms <= result.duration_ms);
        assert!(result.profile.parse_by_language.contains_key("typescript"));
        assert!(result.profile.parse_by_language.contains_key("javascript"));
        let total_files = result
            .profile
            .parse_by_language
            .values()
            .map(|profile| profile.files)
            .sum::<u32>();
        assert_eq!(total_files, 2);
        let sub_bucket_total = result.profile.parse_source_read_ms
            + result.profile.parse_normalization_ms
            + result.profile.parse_parser_setup_ms
            + result.profile.parse_tree_sitter_ms
            + result.profile.parse_ast_extraction_ms
            + result.profile.parse_error_handling_ms;
        assert!(sub_bucket_total <= result.profile.parse_extraction_ms);
        let language_parse_total = result
            .profile
            .parse_by_language
            .values()
            .map(|profile| profile.parse_extraction_ms)
            .sum::<u128>();
        assert_eq!(language_parse_total, result.profile.parse_extraction_ms);

        fs::remove_dir_all(dir).unwrap();
    }

    #[test]
    fn rust_profile_keeps_no_go_declaration_metadata_out_of_implementation() {
        let dir = temp_dir("ts-overload-no-go-metadata");
        fs::write(
            dir.join("ambient.ts"),
            [
                "export declare function ambientOnly(value: string): string;",
                "export declare function ambientOnly(value: number): string;",
                "",
            ]
            .join("\n"),
        )
        .unwrap();
        fs::write(
            dir.join("types.d.ts"),
            [
                "export declare function declaredOnly(value: string): string;",
                "export declare function declaredOnly(value: number): string;",
                "",
            ]
            .join("\n"),
        )
        .unwrap();
        fs::write(
            dir.join("collision.ts"),
            [
                "export type Collided = { value: string };",
                "export const Collided = { value: 'x' };",
                "",
            ]
            .join("\n"),
        )
        .unwrap();
        fs::write(
            dir.join("consumer.ts"),
            [
                "import { ambientOnly } from './ambient';",
                "import { declaredOnly } from './types';",
                "import { Collided } from './collision';",
                "export const a = ambientOnly('x');",
                "export const d = declaredOnly('x');",
                "export const c = Collided;",
                "",
            ]
            .join("\n"),
        )
        .unwrap();

        let request = IndexRequest {
            engine: "rust".to_string(),
            project_path: dir.to_string_lossy().to_string(),
            index_path: dir
                .join(".zcodegraph")
                .join("zcodegraph.db")
                .to_string_lossy()
                .to_string(),
            force: true,
            verbose: false,
            graph_work_profile: GraphWorkProfile::Full,
            sqlite_write_mode: SqliteWriteMode::FinalFlush,
            parse_walker_diagnostics: false,
        };

        let result = run_index(&request);

        assert!(result.success, "{:?}", result.errors);
        let sample_for = |name: &str| {
            result
                .profile
                .esm_named_import_export_fallback_samples
                .iter()
                .find(|sample| sample.reference_name == name)
                .unwrap_or_else(|| panic!("expected fallback sample for {name}"))
        };
        for name in ["ambientOnly", "declaredOnly"] {
            let sample = sample_for(name);
            let candidates = sample
                .candidate_line_ranges
                .as_ref()
                .expect("candidate diagnostics should be attached");
            assert!(
                candidates
                    .iter()
                    .all(|candidate| candidate.declaration_form.as_deref() == Some("signature")),
                "{name} candidates should remain signatures: {candidates:?}"
            );
            assert!(
                candidates
                    .iter()
                    .all(|candidate| candidate.has_body == Some(false)),
                "{name} candidates should not have bodies: {candidates:?}"
            );
        }

        let collision = sample_for("Collided");
        let collision_candidates = collision
            .candidate_line_ranges
            .as_ref()
            .expect("collision candidate diagnostics should be attached");
        assert!(
            collision_candidates
                .iter()
                .all(|candidate| candidate.declaration_form.as_deref() == Some("unknown")),
            "type/value collision should not produce implementation metadata: {collision_candidates:?}"
        );
        assert!(
            collision_candidates
                .iter()
                .all(|candidate| candidate.has_body.is_none()),
            "type/value collision should not claim body metadata: {collision_candidates:?}"
        );

        fs::remove_dir_all(dir).unwrap();
    }

    #[test]
    fn rust_index_extracts_mixed_languages_with_reused_parsers() {
        let dir = temp_dir("mixed-language-parser-reuse");
        fs::write(
            dir.join("alpha.ts"),
            "export function alpha() { return 1; }\n",
        )
        .unwrap();
        fs::write(
            dir.join("view.tsx"),
            "export function Widget() { return <div />; }\n",
        )
        .unwrap();
        fs::write(
            dir.join("server.go"),
            ["package main", "func handler() int { return 1 }", ""].join("\n"),
        )
        .unwrap();

        let request = IndexRequest {
            engine: "rust".to_string(),
            project_path: dir.to_string_lossy().to_string(),
            index_path: dir
                .join(".zcodegraph")
                .join("zcodegraph.db")
                .to_string_lossy()
                .to_string(),
            force: true,
            verbose: false,
            graph_work_profile: GraphWorkProfile::Full,
            sqlite_write_mode: SqliteWriteMode::FinalFlush,
            parse_walker_diagnostics: false,
        };

        let result = run_index(&request);

        assert!(result.success, "{:?}", result.errors);
        assert_eq!(result.files_indexed, 3);
        assert_eq!(result.files_errored, 0);
        let conn = Connection::open(dir.join(".zcodegraph").join("zcodegraph.db")).unwrap();
        let count_name = |name: &str| -> i64 {
            conn.query_row(
                "SELECT COUNT(*) FROM nodes WHERE name = ?1",
                [name],
                |row| row.get(0),
            )
            .unwrap()
        };
        assert_eq!(count_name("alpha"), 1);
        assert_eq!(count_name("Widget"), 1);
        assert_eq!(count_name("handler"), 1);
        fs::remove_dir_all(dir).unwrap();
    }

    #[test]
    fn rust_index_reuses_local_exact_candidate_lookups_for_repeated_calls() {
        let dir = temp_dir("local-exact-repeated-calls");
        let mut source = String::from("export function helper() { return 1; }\n");
        for index in 0..900 {
            source.push_str(&format!(
                "export function caller{}() {{ return helper(); }}\n",
                index
            ));
        }
        fs::write(dir.join("index.ts"), source).unwrap();

        let request = IndexRequest {
            engine: "rust".to_string(),
            project_path: dir.to_string_lossy().to_string(),
            index_path: dir
                .join(".zcodegraph")
                .join("zcodegraph.db")
                .to_string_lossy()
                .to_string(),
            force: true,
            verbose: false,
            graph_work_profile: GraphWorkProfile::Full,
            sqlite_write_mode: SqliteWriteMode::FinalFlush,
            parse_walker_diagnostics: false,
        };

        let result = run_index(&request);

        assert!(result.success, "{:?}", result.errors);
        assert_eq!(result.profile.local_exact_reference_resolved_refs, 900);
        assert_eq!(result.profile.local_exact_reference_fallback_refs, 0);
        assert!(
            result.profile.local_exact_reference_resolution_ms <= 160,
            "localExactReferenceResolutionMs={}ms resolvedRefs={}",
            result.profile.local_exact_reference_resolution_ms,
            result.profile.local_exact_reference_resolved_refs
        );
        fs::remove_dir_all(dir).unwrap();
    }

    #[test]
    fn matched_ts_js_profile_controls_cost_relevant_graph_work_before_write() {
        let dir = temp_dir("matched-ts-js-profile");
        fs::write(
            dir.join("index.tsx"),
            [
                "export class Service { field = 1; method() { return helper(); } }",
                "export const VALUE = 1;",
                "export function helper() { return VALUE; }",
                "export function Widget() { return <Service />; }",
                "",
            ]
            .join("\n"),
        )
        .unwrap();

        let request = IndexRequest {
            engine: "rust".to_string(),
            project_path: dir.to_string_lossy().to_string(),
            index_path: dir
                .join(".zcodegraph")
                .join("zcodegraph.db")
                .to_string_lossy()
                .to_string(),
            force: true,
            verbose: false,
            graph_work_profile: GraphWorkProfile::MatchedTsJs,
            sqlite_write_mode: SqliteWriteMode::Disk,
            parse_walker_diagnostics: false,
        };

        let result = run_index(&request);

        assert!(result.success, "{:?}", result.errors);
        {
            let conn = Connection::open(&request.index_path).unwrap();
            let count_kind = |kind: &str| -> i64 {
                conn.query_row(
                    "SELECT COUNT(*) FROM nodes WHERE kind = ?1",
                    params![kind],
                    |row| row.get(0),
                )
                .unwrap()
            };
            let ref_count = conn
                .query_row("SELECT COUNT(*) FROM unresolved_refs", [], |row| {
                    row.get::<_, i64>(0)
                })
                .unwrap();
            assert_eq!(count_kind("component"), 0);
            assert_eq!(count_kind("constant"), 0);
            assert_eq!(count_kind("field"), 0);
            assert_eq!(count_kind("export"), 0);
            assert_eq!(ref_count, 0);
            assert!(count_kind("file") >= 1);
            assert!(count_kind("function") >= 1);
            assert!(count_kind("class") >= 1);
            assert!(count_kind("method") >= 1);
        }
        fs::remove_dir_all(dir).unwrap();
    }

    #[test]
    fn rust_index_preserves_js_ts_import_export_binding_refs_for_text_reuse() {
        let dir = temp_dir("js-ts-import-export-text-reuse");
        fs::write(
            dir.join("source.ts"),
            [
                "export const alpha = 1;",
                "export function beta() { return alpha; }",
                "export class Widget {}",
                "",
            ]
            .join("\n"),
        )
        .unwrap();
        fs::write(
            dir.join("barrel.ts"),
            [
                "export { alpha, beta as renamedBeta, type Widget } from './source';",
                "",
            ]
            .join("\n"),
        )
        .unwrap();
        fs::write(
            dir.join("consumer.ts"),
            [
                "import { alpha, beta as localBeta, type Widget } from './source';",
                "export const total = alpha + localBeta();",
                "",
            ]
            .join("\n"),
        )
        .unwrap();

        let request = IndexRequest {
            engine: "rust".to_string(),
            project_path: dir.to_string_lossy().to_string(),
            index_path: dir
                .join(".zcodegraph")
                .join("zcodegraph.db")
                .to_string_lossy()
                .to_string(),
            force: true,
            verbose: false,
            graph_work_profile: GraphWorkProfile::Full,
            sqlite_write_mode: SqliteWriteMode::Disk,
            parse_walker_diagnostics: false,
        };

        let result = run_index(&request);

        assert!(result.success, "{:?}", result.errors);
        assert_eq!(result.files_errored, 0, "{:?}", result.errors);
        let conn = Connection::open(dir.join(".zcodegraph").join("zcodegraph.db")).unwrap();
        let node_count = |kind: &str, name: &str| -> i64 {
            conn.query_row(
                "SELECT COUNT(*) FROM nodes WHERE kind = ?1 AND name = ?2",
                params![kind, name],
                |row| row.get(0),
            )
            .unwrap()
        };
        assert_eq!(node_count("constant", "alpha"), 1);
        assert_eq!(node_count("function", "beta"), 1);
        assert_eq!(node_count("class", "Widget"), 1);
        assert_eq!(node_count("constant", "total"), 1);

        let mut unresolved_stmt = conn
            .prepare(
                "SELECT file_path, reference_kind, reference_name, language
                 FROM unresolved_refs
                 WHERE file_path IN ('barrel.ts', 'consumer.ts')
                 ORDER BY file_path, reference_kind, reference_name",
            )
            .unwrap();
        let unresolved_refs = unresolved_stmt
            .query_map([], |row| {
                Ok((
                    row.get::<_, String>(0)?,
                    row.get::<_, String>(1)?,
                    row.get::<_, String>(2)?,
                    row.get::<_, String>(3)?,
                ))
            })
            .unwrap()
            .collect::<Result<Vec<_>, _>>()
            .unwrap();
        assert_eq!(
            unresolved_refs,
            vec![
                (
                    "barrel.ts".to_string(),
                    "exports".to_string(),
                    "./source".to_string(),
                    "typescript".to_string()
                ),
                (
                    "barrel.ts".to_string(),
                    "exports".to_string(),
                    "Widget".to_string(),
                    "typescript".to_string()
                ),
                (
                    "barrel.ts".to_string(),
                    "exports".to_string(),
                    "alpha".to_string(),
                    "typescript".to_string()
                ),
                (
                    "barrel.ts".to_string(),
                    "exports".to_string(),
                    "beta".to_string(),
                    "typescript".to_string()
                ),
                (
                    "consumer.ts".to_string(),
                    "calls".to_string(),
                    "localBeta".to_string(),
                    "typescript".to_string()
                ),
                (
                    "consumer.ts".to_string(),
                    "imports".to_string(),
                    "beta".to_string(),
                    "typescript".to_string()
                ),
            ]
        );
        let mut edge_stmt = conn
            .prepare(
                "SELECT target.kind, target.name, target.file_path
                 FROM edges e
                 JOIN nodes source ON source.id = e.source
                 JOIN nodes target ON target.id = e.target
                 WHERE e.kind = 'imports'
                   AND source.file_path = 'consumer.ts'
                 ORDER BY target.kind, target.name, target.file_path",
            )
            .unwrap();
        let import_edges = edge_stmt
            .query_map([], |row| {
                Ok((
                    row.get::<_, String>(0)?,
                    row.get::<_, String>(1)?,
                    row.get::<_, String>(2)?,
                ))
            })
            .unwrap()
            .collect::<Result<Vec<_>, _>>()
            .unwrap();
        assert_eq!(
            import_edges,
            vec![
                (
                    "class".to_string(),
                    "Widget".to_string(),
                    "source.ts".to_string()
                ),
                (
                    "constant".to_string(),
                    "alpha".to_string(),
                    "source.ts".to_string()
                ),
                (
                    "file".to_string(),
                    "source.ts".to_string(),
                    "source.ts".to_string()
                ),
            ]
        );
        assert_eq!(
            result
                .profile
                .esm_named_import_export_edge_write_attempted_refs,
            2
        );
        assert_eq!(
            result
                .profile
                .esm_named_import_export_edge_write_written_refs,
            2
        );
        assert_eq!(
            result
                .profile
                .esm_named_import_export_edge_write_skipped_refs,
            0
        );

        fs::remove_dir_all(dir).unwrap();
    }

    #[test]
    fn rust_resolves_js_ts_alias_and_workspace_file_import_targets() {
        let dir = temp_dir("file-import-target-parity");
        fs::create_dir_all(dir.join("src")).unwrap();
        fs::create_dir_all(dir.join("app")).unwrap();
        fs::create_dir_all(dir.join("packages/ui/widgets")).unwrap();
        fs::create_dir_all(dir.join("packages/data")).unwrap();
        fs::create_dir_all(dir.join("tools/logger")).unwrap();
        fs::write(
            dir.join("tsconfig.json"),
            r#"{"compilerOptions":{"baseUrl":".","paths":{"@lib/*":["src/lib/*"]}}}"#,
        )
        .unwrap();
        fs::write(
            dir.join("package.json"),
            r#"{"name":"root","private":true,"workspaces":["packages/*"]}"#,
        )
        .unwrap();
        fs::write(
            dir.join("pnpm-workspace.yaml"),
            "packages:\n  - 'tools/*'\n",
        )
        .unwrap();
        fs::write(
            dir.join("packages/ui/package.json"),
            r#"{"name":"@scope/ui","version":"1.0.0"}"#,
        )
        .unwrap();
        fs::write(
            dir.join("packages/data/package.json"),
            r#"{"name":"@scope/ui/data","version":"1.0.0"}"#,
        )
        .unwrap();
        fs::write(
            dir.join("tools/logger/package.json"),
            r#"{"name":"@tools/logger","version":"1.0.0"}"#,
        )
        .unwrap();
        fs::create_dir_all(dir.join("src/lib")).unwrap();
        fs::write(dir.join("src/rel.ts"), "export const rel = 1;\n").unwrap();
        fs::write(dir.join("src/lib/path.ts"), "export const pathValue = 1;\n").unwrap();
        fs::write(dir.join("src/alias.ts"), "export const aliasValue = 1;\n").unwrap();
        fs::write(
            dir.join("app/service.ts"),
            "export const serviceValue = 1;\n",
        )
        .unwrap();
        fs::write(
            dir.join("packages/ui/widgets/index.ts"),
            "export const widgetValue = 1;\n",
        )
        .unwrap();
        fs::write(
            dir.join("packages/data/index.ts"),
            "export const dataValue = 1;\n",
        )
        .unwrap();
        fs::write(
            dir.join("tools/logger/index.ts"),
            "export const loggerValue = 1;\n",
        )
        .unwrap();
        fs::write(
            dir.join("src/main.ts"),
            [
                "import { rel } from './rel';",
                "import { pathValue } from '@lib/path';",
                "import { aliasValue } from '@/alias';",
                "import { serviceValue } from 'app/service';",
                "import { widgetValue } from '@scope/ui/widgets';",
                "import { dataValue } from '@scope/ui/data';",
                "import { loggerValue } from '@tools/logger';",
                "export const total = rel + pathValue + aliasValue + serviceValue + widgetValue + dataValue + loggerValue;",
            ]
            .join("\n"),
        )
        .unwrap();

        let request = IndexRequest {
            engine: "rust".to_string(),
            project_path: dir.to_string_lossy().to_string(),
            index_path: dir
                .join(".zcodegraph")
                .join("zcodegraph.db")
                .to_string_lossy()
                .to_string(),
            force: true,
            verbose: false,
            graph_work_profile: GraphWorkProfile::Full,
            sqlite_write_mode: SqliteWriteMode::Disk,
            parse_walker_diagnostics: false,
        };

        let result = run_index(&request);

        assert!(result.success, "{:?}", result.errors);
        assert_eq!(result.profile.import_path_alias_resolved_refs, 7);
        assert_eq!(result.profile.import_path_alias_relative_resolved_refs, 1);
        assert_eq!(result.profile.import_path_alias_tsconfig_resolved_refs, 1);
        assert_eq!(
            result
                .profile
                .import_path_alias_conventional_alias_resolved_refs,
            2
        );
        assert_eq!(result.profile.import_path_alias_workspace_resolved_refs, 3);
        assert_eq!(result.profile.import_path_alias_unresolved_fallback_refs, 0);

        let conn = Connection::open(dir.join(".zcodegraph").join("zcodegraph.db")).unwrap();
        let mut stmt = conn
            .prepare(
                "SELECT DISTINCT target.file_path
                 FROM edges e
                 JOIN nodes source ON source.id = e.source
                 JOIN nodes target ON target.id = e.target
                 WHERE e.kind = 'imports'
                   AND e.edgeOrigin = 'rust-finalization'
                   AND source.file_path = 'src/main.ts'
                   AND source.kind = 'file'
                 ORDER BY target.file_path",
            )
            .unwrap();
        let targets = stmt
            .query_map([], |row| row.get::<_, String>(0))
            .unwrap()
            .collect::<Result<Vec<_>, _>>()
            .unwrap();
        assert_eq!(
            targets,
            vec![
                "app/service.ts",
                "packages/data/index.ts",
                "packages/ui/widgets/index.ts",
                "src/alias.ts",
                "src/lib/path.ts",
                "src/rel.ts",
                "tools/logger/index.ts",
            ]
        );

        fs::remove_dir_all(dir).unwrap();
    }

    #[test]
    fn rust_guarded_file_import_edge_writes_record_write_and_skip_decisions() {
        let dir = temp_dir("guarded-file-import-edge-writes");
        fs::create_dir_all(dir.join("src")).unwrap();
        fs::write(
            dir.join("tsconfig.json"),
            r#"{"compilerOptions":{"baseUrl":".","paths":{"@missing/*":["src/missing/*"],"@ghost":["src/ghost.txt"]}}}"#,
        )
        .unwrap();
        fs::write(dir.join("src/dep.ts"), "export const dep = 1;\n").unwrap();
        fs::write(dir.join("src/ghost.txt"), "not indexed as a code file\n").unwrap();
        fs::write(
            dir.join("src/main.ts"),
            [
                "import { dep } from './dep';",
                "import { missing } from '@missing/value';",
                "import { ghost } from '@ghost';",
                "export const total = dep;",
                "",
            ]
            .join("\n"),
        )
        .unwrap();

        let request = IndexRequest {
            engine: "rust".to_string(),
            project_path: dir.to_string_lossy().to_string(),
            index_path: dir
                .join(".zcodegraph")
                .join("zcodegraph.db")
                .to_string_lossy()
                .to_string(),
            force: true,
            verbose: false,
            graph_work_profile: GraphWorkProfile::Full,
            sqlite_write_mode: SqliteWriteMode::Disk,
            parse_walker_diagnostics: false,
        };

        let result = run_index(&request);

        assert!(result.success, "{:?}", result.errors);
        assert_eq!(
            result
                .profile
                .module_resolution_guarded_edge_write_attempted_refs,
            3
        );
        assert_eq!(
            result
                .profile
                .module_resolution_guarded_edge_write_written_refs,
            1
        );
        assert_eq!(
            result
                .profile
                .module_resolution_guarded_edge_write_skipped_refs,
            2
        );
        assert_eq!(
            result
                .profile
                .module_resolution_guarded_edge_write_skipped_counts
                .get("tsconfig-path-target-not-found"),
            Some(&1)
        );
        assert_eq!(
            result
                .profile
                .module_resolution_guarded_edge_write_skipped_counts
                .get("file-node-not-found"),
            Some(&1)
        );

        let conn = Connection::open(dir.join(".zcodegraph").join("zcodegraph.db")).unwrap();
        let targets = conn
            .prepare(
                "SELECT DISTINCT target.file_path
                 FROM edges e
                 JOIN nodes source ON source.id = e.source
                 JOIN nodes target ON target.id = e.target
                 WHERE e.kind = 'imports'
                   AND e.edgeOrigin = 'rust-finalization'
                   AND source.file_path = 'src/main.ts'
                   AND source.kind = 'file'
                 ORDER BY target.file_path",
            )
            .unwrap()
            .query_map([], |row| row.get::<_, String>(0))
            .unwrap()
            .collect::<Result<Vec<_>, _>>()
            .unwrap();
        assert_eq!(targets, vec!["src/dep.ts"]);

        fs::remove_dir_all(dir).unwrap();
    }

    #[test]
    fn rust_pairs_explicit_js_runtime_extensions_to_ts_source_targets() {
        let dir = temp_dir("explicit-js-runtime-extension-pairing");
        fs::create_dir_all(dir.join("src/lib")).unwrap();
        fs::write(
            dir.join("tsconfig.json"),
            r#"{"compilerOptions":{"baseUrl":".","paths":{"@lib/*":["src/lib/*"]}}}"#,
        )
        .unwrap();
        fs::write(dir.join("src/dep.ts"), "export const dep = 1;\n").unwrap();
        fs::write(dir.join("src/dep.js"), "export const dep = 0;\n").unwrap();
        fs::write(dir.join("src/view.tsx"), "export const view = 2;\n").unwrap();
        fs::write(
            dir.join("src/module.mts"),
            "export const moduleValue = 3;\n",
        )
        .unwrap();
        fs::write(
            dir.join("src/common.cts"),
            "export const commonValue = 4;\n",
        )
        .unwrap();
        fs::write(
            dir.join("src/lib/alias.ts"),
            "export const aliasValue = 5;\n",
        )
        .unwrap();
        fs::write(
            dir.join("src/lib/runtime.js"),
            "export const runtimeValue = 6;\n",
        )
        .unwrap();
        fs::write(
            dir.join("src/main.ts"),
            [
                "import { dep } from './dep.js';",
                "import { view } from './view.jsx';",
                "import { moduleValue } from './module.mjs';",
                "import { commonValue } from './common.cjs';",
                "import { aliasValue } from '@lib/alias.js';",
                "import { runtimeValue } from '@lib/runtime.js';",
                "export const total = dep + view + moduleValue + commonValue + aliasValue + runtimeValue;",
                "",
            ]
            .join("\n"),
        )
        .unwrap();

        let request = IndexRequest {
            engine: "rust".to_string(),
            project_path: dir.to_string_lossy().to_string(),
            index_path: dir
                .join(".zcodegraph")
                .join("zcodegraph.db")
                .to_string_lossy()
                .to_string(),
            force: true,
            verbose: false,
            graph_work_profile: GraphWorkProfile::Full,
            sqlite_write_mode: SqliteWriteMode::Disk,
            parse_walker_diagnostics: false,
        };

        let result = run_index(&request);

        assert!(result.success, "{:?}", result.errors);
        let conn = Connection::open(dir.join(".zcodegraph").join("zcodegraph.db")).unwrap();
        let targets = conn
            .prepare(
                "SELECT DISTINCT target.file_path
                 FROM edges e
                 JOIN nodes source ON source.id = e.source
                 JOIN nodes target ON target.id = e.target
                 WHERE e.kind = 'imports'
                   AND e.edgeOrigin = 'rust-finalization'
                   AND source.file_path = 'src/main.ts'
                   AND source.kind = 'file'
                 ORDER BY target.file_path",
            )
            .unwrap()
            .query_map([], |row| row.get::<_, String>(0))
            .unwrap()
            .collect::<Result<Vec<_>, _>>()
            .unwrap();
        assert_eq!(
            targets,
            vec![
                "src/common.cts",
                "src/dep.ts",
                "src/lib/alias.ts",
                "src/lib/runtime.js",
                "src/module.mts",
                "src/view.tsx",
            ]
        );

        fs::remove_dir_all(dir).unwrap();
    }

    #[test]
    fn rust_resolves_extensionless_mts_cts_and_directory_index_targets() {
        let dir = temp_dir("extensionless-mts-cts-index-targets");
        fs::create_dir_all(dir.join("src/feature")).unwrap();
        fs::create_dir_all(dir.join("src/common")).unwrap();
        fs::write(
            dir.join("src/module.mts"),
            "export const moduleValue = 1;\n",
        )
        .unwrap();
        fs::write(
            dir.join("src/common.cts"),
            "export const commonValue = 2;\n",
        )
        .unwrap();
        fs::write(
            dir.join("src/feature/index.mts"),
            "export const featureValue = 3;\n",
        )
        .unwrap();
        fs::write(
            dir.join("src/common/index.cts"),
            "export const nestedCommonValue = 4;\n",
        )
        .unwrap();
        fs::write(
            dir.join("src/main.ts"),
            [
                "import { moduleValue } from './module';",
                "import { commonValue } from './common';",
                "import { featureValue } from './feature';",
                "export const total = moduleValue + commonValue + featureValue;",
                "",
            ]
            .join("\n"),
        )
        .unwrap();

        let request = IndexRequest {
            engine: "rust".to_string(),
            project_path: dir.to_string_lossy().to_string(),
            index_path: dir
                .join(".zcodegraph")
                .join("zcodegraph.db")
                .to_string_lossy()
                .to_string(),
            force: true,
            verbose: false,
            graph_work_profile: GraphWorkProfile::Full,
            sqlite_write_mode: SqliteWriteMode::Disk,
            parse_walker_diagnostics: false,
        };

        let result = run_index(&request);

        assert!(result.success, "{:?}", result.errors);
        let conn = Connection::open(dir.join(".zcodegraph").join("zcodegraph.db")).unwrap();
        let targets = conn
            .prepare(
                "SELECT DISTINCT target.file_path
                 FROM edges e
                 JOIN nodes source ON source.id = e.source
                 JOIN nodes target ON target.id = e.target
                 WHERE e.kind = 'imports'
                   AND e.edgeOrigin = 'rust-finalization'
                   AND source.file_path = 'src/main.ts'
                   AND source.kind = 'file'
                 ORDER BY target.file_path",
            )
            .unwrap()
            .query_map([], |row| row.get::<_, String>(0))
            .unwrap()
            .collect::<Result<Vec<_>, _>>()
            .unwrap();
        assert_eq!(
            targets,
            vec!["src/common.cts", "src/feature/index.mts", "src/module.mts"]
        );

        fs::remove_dir_all(dir).unwrap();
    }

    #[test]
    fn rust_prefers_extensionless_source_candidate_order_before_js_family() {
        let dir = temp_dir("extensionless-source-candidate-priority");
        fs::create_dir_all(dir.join("src/ordered")).unwrap();
        fs::write(dir.join("src/ordered.ts"), "export const ordered = 1;\n").unwrap();
        fs::write(dir.join("src/ordered.tsx"), "export const ordered = 2;\n").unwrap();
        fs::write(dir.join("src/ordered.mts"), "export const ordered = 3;\n").unwrap();
        fs::write(dir.join("src/ordered.cts"), "export const ordered = 4;\n").unwrap();
        fs::write(
            dir.join("src/ordered.d.ts"),
            "export declare const ordered: number;\n",
        )
        .unwrap();
        fs::write(dir.join("src/ordered.js"), "export const ordered = 8;\n").unwrap();
        fs::write(
            dir.join("src/ordered/index.ts"),
            "export const orderedIndex = 1;\n",
        )
        .unwrap();
        fs::write(
            dir.join("src/ordered/index.mts"),
            "export const orderedIndex = 3;\n",
        )
        .unwrap();
        fs::write(
            dir.join("src/ordered/index.js"),
            "export const orderedIndex = 8;\n",
        )
        .unwrap();
        fs::write(
            dir.join("src/main.ts"),
            [
                "import { ordered } from './ordered';",
                "import { orderedIndex } from './ordered';",
                "export const total = ordered + orderedIndex;",
                "",
            ]
            .join("\n"),
        )
        .unwrap();

        let request = IndexRequest {
            engine: "rust".to_string(),
            project_path: dir.to_string_lossy().to_string(),
            index_path: dir
                .join(".zcodegraph")
                .join("zcodegraph.db")
                .to_string_lossy()
                .to_string(),
            force: true,
            verbose: false,
            graph_work_profile: GraphWorkProfile::Full,
            sqlite_write_mode: SqliteWriteMode::Disk,
            parse_walker_diagnostics: false,
        };

        let result = run_index(&request);

        assert!(result.success, "{:?}", result.errors);
        let conn = Connection::open(dir.join(".zcodegraph").join("zcodegraph.db")).unwrap();
        let targets = conn
            .prepare(
                "SELECT DISTINCT target.file_path
                 FROM edges e
                 JOIN nodes source ON source.id = e.source
                 JOIN nodes target ON target.id = e.target
                 WHERE e.kind = 'imports'
                   AND e.edgeOrigin = 'rust-finalization'
                   AND source.file_path = 'src/main.ts'
                   AND source.kind = 'file'
                 ORDER BY target.file_path",
            )
            .unwrap()
            .query_map([], |row| row.get::<_, String>(0))
            .unwrap()
            .collect::<Result<Vec<_>, _>>()
            .unwrap();
        assert_eq!(targets, vec!["src/ordered.ts"]);

        fs::remove_dir_all(dir).unwrap();
    }

    #[test]
    fn rust_shares_extensionless_file_targets_across_repo_local_resolver_paths() {
        let dir = temp_dir("extensionless-shared-repo-local-paths");
        fs::create_dir_all(dir.join("src/lib")).unwrap();
        fs::create_dir_all(dir.join("packages/pkg")).unwrap();
        fs::write(
            dir.join("tsconfig.json"),
            r#"{"compilerOptions":{"baseUrl":".","paths":{"@lib/*":["src/lib/*"]}}}"#,
        )
        .unwrap();
        fs::write(
            dir.join("package.json"),
            r##"{"name":"@fixture/app","private":true,"workspaces":["packages/*"],"exports":{"./feature":"./src/feature"},"imports":{"#internal":"./src/internal"}}"##,
        )
        .unwrap();
        fs::write(
            dir.join("packages/pkg/package.json"),
            r#"{"name":"@fixture/pkg","private":true}"#,
        )
        .unwrap();
        fs::write(
            dir.join("src/lib/alias.mts"),
            "export const aliasValue = 1;\n",
        )
        .unwrap();
        fs::write(
            dir.join("packages/pkg/tool.cts"),
            "export const workspaceValue = 2;\n",
        )
        .unwrap();
        fs::write(
            dir.join("src/feature.mts"),
            "export const featureValue = 3;\n",
        )
        .unwrap();
        fs::write(
            dir.join("src/internal.cts"),
            "export const internalValue = 4;\n",
        )
        .unwrap();
        fs::write(
            dir.join("src/main.ts"),
            [
                "import { aliasValue } from '@lib/alias';",
                "import { workspaceValue } from '@fixture/pkg/tool';",
                "import { featureValue } from '@fixture/app/feature';",
                "import { internalValue } from '#internal';",
                "export const total = aliasValue + workspaceValue + featureValue + internalValue;",
                "",
            ]
            .join("\n"),
        )
        .unwrap();

        let request = IndexRequest {
            engine: "rust".to_string(),
            project_path: dir.to_string_lossy().to_string(),
            index_path: dir
                .join(".zcodegraph")
                .join("zcodegraph.db")
                .to_string_lossy()
                .to_string(),
            force: true,
            verbose: false,
            graph_work_profile: GraphWorkProfile::Full,
            sqlite_write_mode: SqliteWriteMode::Disk,
            parse_walker_diagnostics: false,
        };

        let result = run_index(&request);

        assert!(result.success, "{:?}", result.errors);
        assert_eq!(result.profile.import_path_alias_tsconfig_resolved_refs, 1);
        assert_eq!(result.profile.import_path_alias_workspace_resolved_refs, 1);
        assert_eq!(
            result
                .profile
                .import_path_alias_package_self_name_resolved_refs,
            1
        );
        assert_eq!(
            result
                .profile
                .import_path_alias_package_imports_resolved_refs,
            1
        );
        let conn = Connection::open(dir.join(".zcodegraph").join("zcodegraph.db")).unwrap();
        let targets = conn
            .prepare(
                "SELECT DISTINCT target.file_path
                 FROM edges e
                 JOIN nodes source ON source.id = e.source
                 JOIN nodes target ON target.id = e.target
                 WHERE e.kind = 'imports'
                   AND e.edgeOrigin = 'rust-finalization'
                   AND source.file_path = 'src/main.ts'
                   AND source.kind = 'file'
                 ORDER BY target.file_path",
            )
            .unwrap()
            .query_map([], |row| row.get::<_, String>(0))
            .unwrap()
            .collect::<Result<Vec<_>, _>>()
            .unwrap();
        assert_eq!(
            targets,
            vec![
                "packages/pkg/tool.cts",
                "src/feature.mts",
                "src/internal.cts",
                "src/lib/alias.mts",
            ]
        );

        fs::remove_dir_all(dir).unwrap();
    }

    #[test]
    fn rust_does_not_expand_extensionless_config_data_targets_into_graph_edges() {
        let dir = temp_dir("extensionless-config-data-no-edge");
        fs::create_dir_all(dir.join("src")).unwrap();
        fs::write(dir.join("src/config.json"), r#"{"enabled":true}"#).unwrap();
        fs::write(
            dir.join("src/main.ts"),
            [
                "import config from './config';",
                "export const enabled = Boolean(config);",
                "",
            ]
            .join("\n"),
        )
        .unwrap();

        let request = IndexRequest {
            engine: "rust".to_string(),
            project_path: dir.to_string_lossy().to_string(),
            index_path: dir
                .join(".zcodegraph")
                .join("zcodegraph.db")
                .to_string_lossy()
                .to_string(),
            force: true,
            verbose: false,
            graph_work_profile: GraphWorkProfile::Full,
            sqlite_write_mode: SqliteWriteMode::Disk,
            parse_walker_diagnostics: false,
        };

        let result = run_index(&request);

        assert!(result.success, "{:?}", result.errors);
        assert_eq!(result.profile.import_path_alias_relative_resolved_refs, 0);
        assert_eq!(result.profile.import_path_alias_relative_fallback_refs, 1);
        let conn = Connection::open(dir.join(".zcodegraph").join("zcodegraph.db")).unwrap();
        let count = conn
            .query_row(
                "SELECT COUNT(*)
                 FROM edges e
                 JOIN nodes source ON source.id = e.source
                 WHERE e.kind = 'imports'
                   AND e.edgeOrigin = 'rust-finalization'
                   AND source.file_path = 'src/main.ts'",
                [],
                |row| row.get::<_, i64>(0),
            )
            .unwrap();
        assert_eq!(count, 0);

        fs::remove_dir_all(dir).unwrap();
    }

    #[test]
    fn rust_pairs_explicit_js_runtime_extensions_from_package_map_targets() {
        let dir = temp_dir("explicit-js-runtime-extension-package-map-pairing");
        fs::create_dir_all(dir.join("src/features")).unwrap();
        fs::write(
            dir.join("package.json"),
            r#"{"name":"@fixture/app","private":true,"exports":{"./feature":"./src/features/feature.js"}}"#,
        )
        .unwrap();
        fs::write(
            dir.join("src/features/feature.ts"),
            "export const featureValue = 1;\n",
        )
        .unwrap();
        fs::write(
            dir.join("src/features/feature.js"),
            "export const featureValue = 0;\n",
        )
        .unwrap();
        fs::write(
            dir.join("src/main.ts"),
            [
                "import { featureValue } from '@fixture/app/feature';",
                "export const total = featureValue;",
                "",
            ]
            .join("\n"),
        )
        .unwrap();

        let request = IndexRequest {
            engine: "rust".to_string(),
            project_path: dir.to_string_lossy().to_string(),
            index_path: dir
                .join(".zcodegraph")
                .join("zcodegraph.db")
                .to_string_lossy()
                .to_string(),
            force: true,
            verbose: false,
            graph_work_profile: GraphWorkProfile::Full,
            sqlite_write_mode: SqliteWriteMode::Disk,
            parse_walker_diagnostics: false,
        };

        let result = run_index(&request);

        assert!(result.success, "{:?}", result.errors);
        assert_eq!(
            result
                .profile
                .import_path_alias_package_self_name_outcome_counts
                .get("exportsResolved"),
            Some(&1)
        );

        let conn = Connection::open(dir.join(".zcodegraph").join("zcodegraph.db")).unwrap();
        let target = conn
            .query_row(
                "SELECT DISTINCT target.file_path
                 FROM edges e
                 JOIN nodes source ON source.id = e.source
                 JOIN nodes target ON target.id = e.target
                 WHERE e.kind = 'imports'
                   AND e.edgeOrigin = 'rust-finalization'
                   AND source.file_path = 'src/main.ts'
                   AND source.kind = 'file'",
                [],
                |row| row.get::<_, String>(0),
            )
            .unwrap();
        assert_eq!(target, "src/features/feature.ts");

        fs::remove_dir_all(dir).unwrap();
    }

    #[test]
    fn rust_loads_repo_local_extends_with_declaring_config_path_basis() {
        let dir = temp_dir("repo-local-config-extends-path-basis");
        fs::create_dir_all(dir.join("config/src/lib")).unwrap();
        fs::create_dir_all(dir.join("src")).unwrap();
        fs::write(
            dir.join("config/tsconfig.base.json"),
            r#"{"compilerOptions":{"module":"NodeNext","baseUrl":".","paths":{"@lib/*":["src/lib/*"]}}}"#,
        )
        .unwrap();
        fs::write(
            dir.join("tsconfig.json"),
            r#"{"extends":"./config/tsconfig.base","compilerOptions":{"allowJs":true}}"#,
        )
        .unwrap();
        fs::write(
            dir.join("config/src/lib/value.ts"),
            "export const value = 1;\n",
        )
        .unwrap();
        fs::write(
            dir.join("src/main.ts"),
            [
                "import { value } from '@lib/value';",
                "export const total = value;",
                "",
            ]
            .join("\n"),
        )
        .unwrap();

        let request = IndexRequest {
            engine: "rust".to_string(),
            project_path: dir.to_string_lossy().to_string(),
            index_path: dir
                .join(".zcodegraph")
                .join("zcodegraph.db")
                .to_string_lossy()
                .to_string(),
            force: true,
            verbose: false,
            graph_work_profile: GraphWorkProfile::Full,
            sqlite_write_mode: SqliteWriteMode::Disk,
            parse_walker_diagnostics: false,
        };

        let result = run_index(&request);

        assert!(result.success, "{:?}", result.errors);
        assert_eq!(result.profile.import_path_alias_tsconfig_resolved_refs, 1);
        assert_eq!(
            result.profile.module_resolution_effective_mode_source,
            "defaulted"
        );
        assert!(result
            .profile
            .module_resolution_shadow_samples
            .iter()
            .any(|sample| {
                sample.specifier == "@lib/value"
                    && sample.module_resolution_mode == "nodenext"
                    && sample.module_resolution_mode_source == "defaulted"
                    && sample.resolved_path.as_deref() == Some("config/src/lib/value.ts")
            }));

        let conn = Connection::open(dir.join(".zcodegraph").join("zcodegraph.db")).unwrap();
        let target = conn
            .query_row(
                "SELECT DISTINCT target.file_path
                 FROM edges e
                 JOIN nodes source ON source.id = e.source
                 JOIN nodes target ON target.id = e.target
                 WHERE e.kind = 'imports'
                   AND e.edgeOrigin = 'rust-finalization'
                   AND source.file_path = 'src/main.ts'
                   AND source.kind = 'file'",
                [],
                |row| row.get::<_, String>(0),
            )
            .unwrap();
        assert_eq!(target, "config/src/lib/value.ts");

        fs::remove_dir_all(dir).unwrap();
    }

    #[test]
    fn rust_config_extends_child_overrides_paths_and_explicit_mode() {
        let dir = temp_dir("repo-local-config-extends-child-override");
        fs::create_dir_all(dir.join("base-src/lib")).unwrap();
        fs::create_dir_all(dir.join("src/lib")).unwrap();
        fs::write(
            dir.join("tsconfig.base.json"),
            r#"{"compilerOptions":{"moduleResolution":"node10","baseUrl":".","paths":{"@lib/*":["base-src/lib/*"]}}}"#,
        )
        .unwrap();
        fs::write(
            dir.join("tsconfig.json"),
            r#"{"extends":"./tsconfig.base.json","compilerOptions":{"moduleResolution":"bundler","paths":{"@lib/*":["src/lib/*"]}}}"#,
        )
        .unwrap();
        fs::write(
            dir.join("base-src/lib/value.ts"),
            "export const value = 0;\n",
        )
        .unwrap();
        fs::write(dir.join("src/lib/value.ts"), "export const value = 1;\n").unwrap();
        fs::write(
            dir.join("src/main.ts"),
            [
                "import { value } from '@lib/value';",
                "export const total = value;",
                "",
            ]
            .join("\n"),
        )
        .unwrap();

        let request = IndexRequest {
            engine: "rust".to_string(),
            project_path: dir.to_string_lossy().to_string(),
            index_path: dir
                .join(".zcodegraph")
                .join("zcodegraph.db")
                .to_string_lossy()
                .to_string(),
            force: true,
            verbose: false,
            graph_work_profile: GraphWorkProfile::Full,
            sqlite_write_mode: SqliteWriteMode::Disk,
            parse_walker_diagnostics: false,
        };

        let result = run_index(&request);

        assert!(result.success, "{:?}", result.errors);
        assert_eq!(result.profile.import_path_alias_tsconfig_resolved_refs, 1);
        assert_eq!(
            result.profile.module_resolution_effective_mode_source,
            "explicit"
        );
        assert!(result
            .profile
            .module_resolution_shadow_samples
            .iter()
            .any(|sample| {
                sample.specifier == "@lib/value"
                    && sample.module_resolution_mode == "bundler"
                    && sample.module_resolution_mode_source == "explicit"
                    && sample.resolved_path.as_deref() == Some("src/lib/value.ts")
            }));

        let conn = Connection::open(dir.join(".zcodegraph").join("zcodegraph.db")).unwrap();
        let target = conn
            .query_row(
                "SELECT DISTINCT target.file_path
                 FROM edges e
                 JOIN nodes source ON source.id = e.source
                 JOIN nodes target ON target.id = e.target
                 WHERE e.kind = 'imports'
                   AND e.edgeOrigin = 'rust-finalization'
                   AND source.file_path = 'src/main.ts'
                   AND source.kind = 'file'",
                [],
                |row| row.get::<_, String>(0),
            )
            .unwrap();
        assert_eq!(target, "src/lib/value.ts");

        fs::remove_dir_all(dir).unwrap();
    }

    #[test]
    fn rust_config_extends_unsupported_package_and_cycles_fail_closed() {
        let dir = temp_dir("repo-local-config-extends-unsupported-and-cycle");
        fs::create_dir_all(dir.join("src/lib")).unwrap();
        fs::write(
            dir.join("tsconfig.json"),
            r#"{"extends":"@tsconfig/node20/tsconfig.json","compilerOptions":{"paths":{"@direct/*":["src/lib/*"]}}}"#,
        )
        .unwrap();
        fs::write(dir.join("cycle.json"), r#"{"extends":"./cycle"}"#).unwrap();
        fs::write(dir.join("src/lib/value.ts"), "export const value = 1;\n").unwrap();
        fs::write(
            dir.join("src/main.ts"),
            [
                "import { value } from '@direct/value';",
                "import { missing } from '@pkg-extends-only/value';",
                "export const total = value;",
                "",
            ]
            .join("\n"),
        )
        .unwrap();

        let request = IndexRequest {
            engine: "rust".to_string(),
            project_path: dir.to_string_lossy().to_string(),
            index_path: dir
                .join(".zcodegraph")
                .join("zcodegraph.db")
                .to_string_lossy()
                .to_string(),
            force: true,
            verbose: false,
            graph_work_profile: GraphWorkProfile::Full,
            sqlite_write_mode: SqliteWriteMode::Disk,
            parse_walker_diagnostics: false,
        };

        let result = run_index(&request);

        assert!(result.success, "{:?}", result.errors);
        assert_eq!(result.profile.import_path_alias_tsconfig_resolved_refs, 1);
        assert!(result
            .profile
            .import_path_alias_fallback_sample_counts
            .contains_key("unsupported/unsupported-import-form"));

        fs::remove_dir_all(dir).unwrap();
    }

    #[test]
    fn rust_module_resolution_classic_fails_closed_for_package_maps() {
        let dir = temp_dir("module-resolution-classic-package-maps");
        fs::create_dir_all(dir.join("src/features")).unwrap();
        fs::write(
            dir.join("tsconfig.json"),
            r#"{"compilerOptions":{"moduleResolution":"classic"}}"#,
        )
        .unwrap();
        fs::write(
            dir.join("package.json"),
            r#"{"name":"@fixture/app","private":true,"exports":{"./feature":"./src/features/feature.ts"}}"#,
        )
        .unwrap();
        fs::write(
            dir.join("src/features/feature.ts"),
            "export const featureValue = 1;\n",
        )
        .unwrap();
        fs::write(
            dir.join("src/main.ts"),
            [
                "import { featureValue } from '@fixture/app/feature';",
                "export const total = featureValue;",
                "",
            ]
            .join("\n"),
        )
        .unwrap();

        let request = IndexRequest {
            engine: "rust".to_string(),
            project_path: dir.to_string_lossy().to_string(),
            index_path: dir
                .join(".zcodegraph")
                .join("zcodegraph.db")
                .to_string_lossy()
                .to_string(),
            force: true,
            verbose: false,
            graph_work_profile: GraphWorkProfile::Full,
            sqlite_write_mode: SqliteWriteMode::Disk,
            parse_walker_diagnostics: false,
        };

        let result = run_index(&request);

        assert!(result.success, "{:?}", result.errors);
        assert_eq!(
            result
                .profile
                .import_path_alias_package_self_name_outcome_counts
                .get("moduleResolutionClassicPackageMapsUnsupported"),
            Some(&1)
        );
        assert!(result
            .profile
            .module_resolution_shadow_samples
            .iter()
            .any(|sample| {
                sample.specifier == "@fixture/app/feature"
                    && sample.module_resolution_mode == "classic"
                    && sample.condition_set.is_empty()
                    && sample.failed_lookup_category.as_deref()
                        == Some("moduleResolutionClassicPackageMapsUnsupported")
            }));

        let conn = Connection::open(dir.join(".zcodegraph").join("zcodegraph.db")).unwrap();
        let count = conn
            .query_row(
                "SELECT COUNT(*)
                 FROM edges e
                 JOIN nodes source ON source.id = e.source
                 WHERE e.kind = 'imports'
                   AND e.edgeOrigin = 'rust-finalization'
                   AND source.file_path = 'src/main.ts'
                   AND source.kind = 'file'",
                [],
                |row| row.get::<_, i64>(0),
            )
            .unwrap();
        assert_eq!(count, 0);

        fs::remove_dir_all(dir).unwrap();
    }

    #[test]
    fn rust_resolves_root_dirs_relative_import_targets_across_sibling_roots() {
        let dir = temp_dir("root-dirs-relative-import-target");
        fs::create_dir_all(dir.join("src")).unwrap();
        fs::create_dir_all(dir.join("generated")).unwrap();
        fs::write(
            dir.join("tsconfig.json"),
            r#"{"compilerOptions":{"rootDirs":["src","generated"]}}"#,
        )
        .unwrap();
        fs::write(dir.join("src/shared.ts"), "export const shared = 1;\n").unwrap();
        fs::write(
            dir.join("generated/consumer.ts"),
            [
                "import { shared } from './shared';",
                "export const total = shared;",
                "",
            ]
            .join("\n"),
        )
        .unwrap();

        let request = IndexRequest {
            engine: "rust".to_string(),
            project_path: dir.to_string_lossy().to_string(),
            index_path: dir
                .join(".zcodegraph")
                .join("zcodegraph.db")
                .to_string_lossy()
                .to_string(),
            force: true,
            verbose: false,
            graph_work_profile: GraphWorkProfile::Full,
            sqlite_write_mode: SqliteWriteMode::Disk,
            parse_walker_diagnostics: false,
        };

        let result = run_index(&request);

        assert!(result.success, "{:?}", result.errors);
        assert_eq!(result.profile.import_path_alias_root_dirs_resolved_refs, 1);
        assert!(result
            .profile
            .module_resolution_shadow_decision_counts
            .contains_key("rootDirs"));

        let conn = Connection::open(dir.join(".zcodegraph").join("zcodegraph.db")).unwrap();
        let target = conn
            .query_row(
                "SELECT target.file_path
                 FROM edges e
                 JOIN nodes source ON source.id = e.source
                 JOIN nodes target ON target.id = e.target
                 WHERE e.kind = 'imports'
                   AND e.edgeOrigin = 'rust-finalization'
                   AND source.file_path = 'generated/consumer.ts'
                   AND source.kind = 'file'",
                [],
                |row| row.get::<_, String>(0),
            )
            .unwrap();
        assert_eq!(target, "src/shared.ts");

        fs::remove_dir_all(dir).unwrap();
    }

    #[test]
    fn rust_resolves_inherited_root_dirs_with_declaring_config_path_basis() {
        let dir = temp_dir("inherited-root-dirs-relative-import-target");
        fs::create_dir_all(dir.join("config/src")).unwrap();
        fs::create_dir_all(dir.join("config/generated")).unwrap();
        fs::write(
            dir.join("config/tsconfig.base.json"),
            r#"{"compilerOptions":{"rootDirs":["src","generated"]}}"#,
        )
        .unwrap();
        fs::write(
            dir.join("tsconfig.json"),
            r#"{"extends":"./config/tsconfig.base.json"}"#,
        )
        .unwrap();
        fs::write(
            dir.join("config/src/shared.ts"),
            "export const shared = 1;\n",
        )
        .unwrap();
        fs::write(
            dir.join("config/generated/consumer.ts"),
            [
                "import { shared } from './shared';",
                "export const total = shared;",
                "",
            ]
            .join("\n"),
        )
        .unwrap();

        let request = IndexRequest {
            engine: "rust".to_string(),
            project_path: dir.to_string_lossy().to_string(),
            index_path: dir
                .join(".zcodegraph")
                .join("zcodegraph.db")
                .to_string_lossy()
                .to_string(),
            force: true,
            verbose: false,
            graph_work_profile: GraphWorkProfile::Full,
            sqlite_write_mode: SqliteWriteMode::Disk,
            parse_walker_diagnostics: false,
        };

        let result = run_index(&request);

        assert!(result.success, "{:?}", result.errors);
        assert_eq!(result.profile.import_path_alias_root_dirs_resolved_refs, 1);

        let conn = Connection::open(dir.join(".zcodegraph").join("zcodegraph.db")).unwrap();
        let target = conn
            .query_row(
                "SELECT target.file_path
                 FROM edges e
                 JOIN nodes source ON source.id = e.source
                 JOIN nodes target ON target.id = e.target
                 WHERE e.kind = 'imports'
                   AND e.edgeOrigin = 'rust-finalization'
                   AND source.file_path = 'config/generated/consumer.ts'
                   AND source.kind = 'file'",
                [],
                |row| row.get::<_, String>(0),
            )
            .unwrap();
        assert_eq!(target, "config/src/shared.ts");

        fs::remove_dir_all(dir).unwrap();
    }

    #[test]
    fn rust_root_dirs_reports_target_not_found_and_config_out_of_scope() {
        let dir = temp_dir("root-dirs-relative-import-taxonomy");
        fs::create_dir_all(dir.join("src")).unwrap();
        fs::create_dir_all(dir.join("generated")).unwrap();
        fs::create_dir_all(dir.join("outside")).unwrap();
        fs::write(
            dir.join("tsconfig.json"),
            r#"{"compilerOptions":{"rootDirs":["src","generated"]}}"#,
        )
        .unwrap();
        fs::write(
            dir.join("generated/consumer.ts"),
            [
                "import { missing } from './missing';",
                "export const total = 1;",
                "",
            ]
            .join("\n"),
        )
        .unwrap();
        fs::write(
            dir.join("outside/consumer.ts"),
            [
                "import { missing } from './missing';",
                "export const total = 1;",
                "",
            ]
            .join("\n"),
        )
        .unwrap();

        let request = IndexRequest {
            engine: "rust".to_string(),
            project_path: dir.to_string_lossy().to_string(),
            index_path: dir
                .join(".zcodegraph")
                .join("zcodegraph.db")
                .to_string_lossy()
                .to_string(),
            force: true,
            verbose: false,
            graph_work_profile: GraphWorkProfile::Full,
            sqlite_write_mode: SqliteWriteMode::Disk,
            parse_walker_diagnostics: false,
        };

        let result = run_index(&request);

        assert!(result.success, "{:?}", result.errors);
        assert_eq!(result.profile.import_path_alias_root_dirs_fallback_refs, 2);
        assert_eq!(
            result
                .profile
                .module_resolution_guarded_edge_write_skipped_counts
                .get("rootDirsTargetNotFound"),
            Some(&1)
        );
        assert_eq!(
            result
                .profile
                .module_resolution_guarded_edge_write_skipped_counts
                .get("rootDirsConfigOutOfScope"),
            Some(&1)
        );

        fs::remove_dir_all(dir).unwrap();
    }

    #[test]
    fn rust_resolves_package_self_name_root_and_subpath_import_targets() {
        let dir = temp_dir("package-self-name-import-target");
        fs::create_dir_all(dir.join("src/features")).unwrap();
        fs::write(
            dir.join("package.json"),
            r#"{"name":"@fixture/app","private":true}"#,
        )
        .unwrap();
        fs::write(dir.join("index.ts"), "export const rootValue = 1;\n").unwrap();
        fs::write(
            dir.join("src/features/tool.ts"),
            "export const toolValue = 2;\n",
        )
        .unwrap();
        fs::write(
            dir.join("src/main.ts"),
            [
                "import { rootValue } from '@fixture/app';",
                "import { toolValue } from '@fixture/app/src/features/tool';",
                "export const total = rootValue + toolValue;",
                "",
            ]
            .join("\n"),
        )
        .unwrap();

        let request = IndexRequest {
            engine: "rust".to_string(),
            project_path: dir.to_string_lossy().to_string(),
            index_path: dir
                .join(".zcodegraph")
                .join("zcodegraph.db")
                .to_string_lossy()
                .to_string(),
            force: true,
            verbose: false,
            graph_work_profile: GraphWorkProfile::Full,
            sqlite_write_mode: SqliteWriteMode::Disk,
            parse_walker_diagnostics: false,
        };

        let result = run_index(&request);

        assert!(result.success, "{:?}", result.errors);
        assert_eq!(
            result
                .profile
                .import_path_alias_package_self_name_resolved_refs,
            2
        );
        assert_eq!(
            result
                .profile
                .import_path_alias_package_self_name_outcome_counts
                .get("resolvedRootIndex"),
            Some(&1)
        );
        assert_eq!(
            result
                .profile
                .import_path_alias_package_self_name_outcome_counts
                .get("resolvedSubpath"),
            Some(&1)
        );

        let conn = Connection::open(dir.join(".zcodegraph").join("zcodegraph.db")).unwrap();
        let mut stmt = conn
            .prepare(
                "SELECT DISTINCT target.file_path
                 FROM edges e
                 JOIN nodes source ON source.id = e.source
                 JOIN nodes target ON target.id = e.target
                 WHERE e.kind = 'imports'
                   AND e.edgeOrigin = 'rust-finalization'
                   AND source.file_path = 'src/main.ts'
                   AND source.kind = 'file'
                 ORDER BY target.file_path",
            )
            .unwrap();
        let targets = stmt
            .query_map([], |row| row.get::<_, String>(0))
            .unwrap()
            .collect::<Result<Vec<_>, _>>()
            .unwrap();
        assert_eq!(targets, vec!["index.ts", "src/features/tool.ts"]);

        fs::remove_dir_all(dir).unwrap();
    }

    #[test]
    fn rust_resolves_simple_package_exports_for_self_name_import_targets() {
        let dir = temp_dir("package-exports-import-target");
        fs::create_dir_all(dir.join("src/features")).unwrap();
        fs::write(
            dir.join("package.json"),
            r#"{"name":"@fixture/app","private":true,"exports":{".":"./src/public.ts","./feature":"./src/features/public.ts"}}"#,
        )
        .unwrap();
        fs::write(dir.join("index.ts"), "export const oldRoot = 0;\n").unwrap();
        fs::write(dir.join("feature.ts"), "export const oldFeature = 0;\n").unwrap();
        fs::write(dir.join("src/public.ts"), "export const rootValue = 1;\n").unwrap();
        fs::write(
            dir.join("src/features/public.ts"),
            "export const featureValue = 2;\n",
        )
        .unwrap();
        fs::write(
            dir.join("src/main.ts"),
            [
                "import { rootValue } from '@fixture/app';",
                "import { featureValue } from '@fixture/app/feature';",
                "export const total = rootValue + featureValue;",
                "",
            ]
            .join("\n"),
        )
        .unwrap();

        let request = IndexRequest {
            engine: "rust".to_string(),
            project_path: dir.to_string_lossy().to_string(),
            index_path: dir
                .join(".zcodegraph")
                .join("zcodegraph.db")
                .to_string_lossy()
                .to_string(),
            force: true,
            verbose: false,
            graph_work_profile: GraphWorkProfile::Full,
            sqlite_write_mode: SqliteWriteMode::Disk,
            parse_walker_diagnostics: false,
        };

        let result = run_index(&request);

        assert!(result.success, "{:?}", result.errors);
        assert_eq!(
            result
                .profile
                .import_path_alias_package_self_name_resolved_refs,
            2
        );
        assert_eq!(
            result
                .profile
                .import_path_alias_package_self_name_outcome_counts
                .get("exportsResolved"),
            Some(&2)
        );

        let conn = Connection::open(dir.join(".zcodegraph").join("zcodegraph.db")).unwrap();
        let targets = conn
            .prepare(
                "SELECT DISTINCT target.file_path
                 FROM edges e
                 JOIN nodes source ON source.id = e.source
                 JOIN nodes target ON target.id = e.target
                 WHERE e.kind = 'imports'
                   AND e.edgeOrigin = 'rust-finalization'
                   AND source.file_path = 'src/main.ts'
                   AND source.kind = 'file'
                 ORDER BY target.file_path",
            )
            .unwrap()
            .query_map([], |row| row.get::<_, String>(0))
            .unwrap()
            .collect::<Result<Vec<_>, _>>()
            .unwrap();
        assert_eq!(targets, vec!["src/features/public.ts", "src/public.ts"]);

        fs::remove_dir_all(dir).unwrap();
    }

    #[test]
    fn rust_resolves_package_exports_condition_objects_and_declaration_targets() {
        let dir = temp_dir("package-exports-condition-target");
        fs::create_dir_all(dir.join("types")).unwrap();
        fs::create_dir_all(dir.join("src")).unwrap();
        fs::write(
            dir.join("package.json"),
            r#"{"name":"@fixture/app","private":true,"exports":{".":{"types":"./types/index.d.ts","default":"./src/runtime.ts"},"./runtime":{"default":"./src/runtime.ts"}}}"#,
        )
        .unwrap();
        fs::write(
            dir.join("types/index.d.ts"),
            "export declare const typeValue: number;\n",
        )
        .unwrap();
        fs::write(
            dir.join("src/runtime.ts"),
            "export const runtimeValue = 2;\n",
        )
        .unwrap();
        fs::write(
            dir.join("src/main.ts"),
            [
                "import { typeValue } from '@fixture/app';",
                "import { runtimeValue } from '@fixture/app/runtime';",
                "export const total = typeValue + runtimeValue;",
                "",
            ]
            .join("\n"),
        )
        .unwrap();

        let request = IndexRequest {
            engine: "rust".to_string(),
            project_path: dir.to_string_lossy().to_string(),
            index_path: dir
                .join(".zcodegraph")
                .join("zcodegraph.db")
                .to_string_lossy()
                .to_string(),
            force: true,
            verbose: false,
            graph_work_profile: GraphWorkProfile::Full,
            sqlite_write_mode: SqliteWriteMode::Disk,
            parse_walker_diagnostics: false,
        };

        let result = run_index(&request);

        assert!(result.success, "{:?}", result.errors);
        assert_eq!(
            result
                .profile
                .import_path_alias_package_self_name_outcome_counts
                .get("exportsResolved"),
            Some(&2)
        );

        let conn = Connection::open(dir.join(".zcodegraph").join("zcodegraph.db")).unwrap();
        let targets = conn
            .prepare(
                "SELECT DISTINCT target.file_path
                 FROM edges e
                 JOIN nodes source ON source.id = e.source
                 JOIN nodes target ON target.id = e.target
                 WHERE e.kind = 'imports'
                   AND e.edgeOrigin = 'rust-finalization'
                   AND source.file_path = 'src/main.ts'
                   AND source.kind = 'file'
                 ORDER BY target.file_path",
            )
            .unwrap()
            .query_map([], |row| row.get::<_, String>(0))
            .unwrap()
            .collect::<Result<Vec<_>, _>>()
            .unwrap();
        assert_eq!(targets, vec!["src/runtime.ts", "types/index.d.ts"]);
        let typed_sample = result
            .profile
            .module_resolution_shadow_samples
            .iter()
            .find(|sample| sample.specifier == "@fixture/app")
            .expect("package self-name condition sample");
        assert_eq!(
            typed_sample.condition_set,
            vec![
                "types".to_string(),
                "import".to_string(),
                "node".to_string(),
                "default".to_string()
            ]
        );
        assert_eq!(typed_sample.matched_condition.as_deref(), Some("types"));

        fs::remove_dir_all(dir).unwrap();
    }

    #[test]
    fn rust_package_maps_use_custom_conditions_after_standard_conditions() {
        let dir = temp_dir("package-map-custom-conditions");
        fs::create_dir_all(dir.join("src")).unwrap();
        fs::write(
            dir.join("tsconfig.json"),
            r#"{"compilerOptions":{"moduleResolution":"bundler","customConditions":["source"]}}"#,
        )
        .unwrap();
        fs::write(
            dir.join("package.json"),
            r##"{"name":"@fixture/app","private":true,"exports":{"./feature":{"source":"./src/source-feature.ts","default":"./src/default-feature.ts"}},"imports":{"#internal":{"source":"./src/source-internal.ts","default":"./src/default-internal.ts"}}}"##,
        )
        .unwrap();
        fs::write(
            dir.join("src/source-feature.ts"),
            "export const featureValue = 1;\n",
        )
        .unwrap();
        fs::write(
            dir.join("src/default-feature.ts"),
            "export const featureValue = 0;\n",
        )
        .unwrap();
        fs::write(
            dir.join("src/source-internal.ts"),
            "export const internalValue = 2;\n",
        )
        .unwrap();
        fs::write(
            dir.join("src/default-internal.ts"),
            "export const internalValue = 0;\n",
        )
        .unwrap();
        fs::write(
            dir.join("src/main.ts"),
            [
                "import { featureValue } from '@fixture/app/feature';",
                "import { internalValue } from '#internal';",
                "export const total = featureValue + internalValue;",
                "",
            ]
            .join("\n"),
        )
        .unwrap();

        let request = IndexRequest {
            engine: "rust".to_string(),
            project_path: dir.to_string_lossy().to_string(),
            index_path: dir
                .join(".zcodegraph")
                .join("zcodegraph.db")
                .to_string_lossy()
                .to_string(),
            force: true,
            verbose: false,
            graph_work_profile: GraphWorkProfile::Full,
            sqlite_write_mode: SqliteWriteMode::Disk,
            parse_walker_diagnostics: false,
        };

        let result = run_index(&request);

        assert!(result.success, "{:?}", result.errors);
        assert_eq!(
            result
                .profile
                .import_path_alias_package_self_name_resolved_refs,
            1
        );
        assert_eq!(
            result
                .profile
                .import_path_alias_package_imports_resolved_refs,
            1
        );

        let conn = Connection::open(dir.join(".zcodegraph").join("zcodegraph.db")).unwrap();
        let targets = conn
            .prepare(
                "SELECT DISTINCT target.file_path
                 FROM edges e
                 JOIN nodes source ON source.id = e.source
                 JOIN nodes target ON target.id = e.target
                 WHERE e.kind = 'imports'
                   AND e.edgeOrigin = 'rust-finalization'
                   AND source.file_path = 'src/main.ts'
                   AND source.kind = 'file'
                 ORDER BY target.file_path",
            )
            .unwrap()
            .query_map([], |row| row.get::<_, String>(0))
            .unwrap()
            .collect::<Result<Vec<_>, _>>()
            .unwrap();
        assert_eq!(
            targets,
            vec!["src/source-feature.ts", "src/source-internal.ts"]
        );
        for specifier in ["@fixture/app/feature", "#internal"] {
            let sample = result
                .profile
                .module_resolution_shadow_samples
                .iter()
                .find(|sample| sample.specifier == specifier)
                .expect("package map custom condition sample");
            assert_eq!(
                sample.condition_set,
                vec![
                    "types".to_string(),
                    "import".to_string(),
                    "node".to_string(),
                    "source".to_string(),
                    "default".to_string()
                ]
            );
            assert_eq!(sample.matched_condition.as_deref(), Some("source"));
        }

        fs::remove_dir_all(dir).unwrap();
    }

    #[test]
    fn rust_package_exports_use_require_condition_for_commonjs_require() {
        let dir = temp_dir("package-exports-require-condition");
        fs::create_dir_all(dir.join("src")).unwrap();
        fs::write(
            dir.join("package.json"),
            r#"{"name":"@fixture/app","private":true,"exports":{"./feature":{"import":"./src/esm.ts","require":"./src/cjs.ts","default":"./src/default.ts"}}}"#,
        )
        .unwrap();
        fs::write(dir.join("src/esm.ts"), "export const value = 1;\n").unwrap();
        fs::write(dir.join("src/cjs.ts"), "export const value = 2;\n").unwrap();
        fs::write(dir.join("src/default.ts"), "export const value = 3;\n").unwrap();
        fs::write(
            dir.join("src/main.js"),
            [
                "const feature = require('@fixture/app/feature');",
                "exports.total = feature.value;",
                "",
            ]
            .join("\n"),
        )
        .unwrap();

        let request = IndexRequest {
            engine: "rust".to_string(),
            project_path: dir.to_string_lossy().to_string(),
            index_path: dir
                .join(".zcodegraph")
                .join("zcodegraph.db")
                .to_string_lossy()
                .to_string(),
            force: true,
            verbose: false,
            graph_work_profile: GraphWorkProfile::Full,
            sqlite_write_mode: SqliteWriteMode::Disk,
            parse_walker_diagnostics: false,
        };

        let result = run_index(&request);

        assert!(result.success, "{:?}", result.errors);
        assert_eq!(
            result
                .profile
                .import_path_alias_package_self_name_resolved_refs,
            1
        );

        let conn = Connection::open(dir.join(".zcodegraph").join("zcodegraph.db")).unwrap();
        let target = conn
            .query_row(
                "SELECT DISTINCT target.file_path
                 FROM edges e
                 JOIN nodes source ON source.id = e.source
                 JOIN nodes target ON target.id = e.target
                 WHERE e.kind = 'imports'
                   AND e.edgeOrigin = 'rust-finalization'
                   AND source.file_path = 'src/main.js'",
                [],
                |row| row.get::<_, String>(0),
            )
            .unwrap();
        assert_eq!(target, "src/cjs.ts");

        let sample = result
            .profile
            .module_resolution_shadow_samples
            .iter()
            .find(|sample| sample.specifier == "@fixture/app/feature")
            .expect("require package map condition sample");
        assert_eq!(
            sample.condition_set,
            vec![
                "types".to_string(),
                "require".to_string(),
                "node".to_string(),
                "default".to_string()
            ]
        );
        assert_eq!(sample.matched_condition.as_deref(), Some("require"));

        fs::remove_dir_all(dir).unwrap();
    }

    #[test]
    fn rust_package_exports_missing_keys_fallback_but_unsupported_shapes_fail_closed() {
        let dir = temp_dir("package-exports-fallback-and-unsupported");
        fs::create_dir_all(dir.join("packages/fallback/src")).unwrap();
        fs::create_dir_all(dir.join("packages/array")).unwrap();
        fs::create_dir_all(dir.join("packages/pattern/src")).unwrap();
        fs::create_dir_all(dir.join("packages/escape")).unwrap();
        fs::write(
            dir.join("package.json"),
            r#"{"name":"root","private":true}"#,
        )
        .unwrap();
        fs::write(
            dir.join("packages/fallback/package.json"),
            r#"{"name":"@fixture/fallback","exports":{".":"./src/index.ts"}}"#,
        )
        .unwrap();
        fs::write(
            dir.join("packages/array/package.json"),
            r#"{"name":"@fixture/array","exports":["./index.ts"]}"#,
        )
        .unwrap();
        fs::write(
            dir.join("packages/pattern/package.json"),
            r#"{"name":"@fixture/pattern","exports":{"./*":"./src/*.ts"}}"#,
        )
        .unwrap();
        fs::write(
            dir.join("packages/escape/package.json"),
            r#"{"name":"@fixture/escape","exports":"../outside.ts"}"#,
        )
        .unwrap();
        fs::write(
            dir.join("packages/fallback/missing.ts"),
            "export const fallbackValue = 1;\n",
        )
        .unwrap();
        fs::write(
            dir.join("packages/array/index.ts"),
            "export const arrayValue = 2;\n",
        )
        .unwrap();
        fs::write(
            dir.join("packages/pattern/src/foo.ts"),
            "export const patternValue = 3;\n",
        )
        .unwrap();
        fs::write(
            dir.join("packages/escape/index.ts"),
            "export const escapeValue = 4;\n",
        )
        .unwrap();
        fs::create_dir_all(dir.join("src")).unwrap();
        fs::write(
            dir.join("src/main.ts"),
            [
                "import { fallbackValue } from '@fixture/fallback/missing';",
                "import { arrayValue } from '@fixture/array';",
                "import { patternValue } from '@fixture/pattern/foo';",
                "import { escapeValue } from '@fixture/escape';",
                "export const total = fallbackValue;",
                "",
            ]
            .join("\n"),
        )
        .unwrap();

        let request = IndexRequest {
            engine: "rust".to_string(),
            project_path: dir.to_string_lossy().to_string(),
            index_path: dir
                .join(".zcodegraph")
                .join("zcodegraph.db")
                .to_string_lossy()
                .to_string(),
            force: true,
            verbose: false,
            graph_work_profile: GraphWorkProfile::Full,
            sqlite_write_mode: SqliteWriteMode::Disk,
            parse_walker_diagnostics: false,
        };

        let result = run_index(&request);

        assert!(result.success, "{:?}", result.errors);
        assert_eq!(
            result
                .profile
                .import_path_alias_package_self_name_resolved_refs,
            2
        );
        assert_eq!(
            result
                .profile
                .import_path_alias_package_self_name_fallback_refs,
            2
        );
        assert_eq!(
            result
                .profile
                .import_path_alias_package_self_name_outcome_counts
                .get("exportsMissing"),
            Some(&1)
        );
        assert_eq!(
            result
                .profile
                .import_path_alias_package_self_name_outcome_counts
                .get("rootFallbackResolved"),
            Some(&1)
        );
        assert_eq!(
            result
                .profile
                .import_path_alias_package_self_name_outcome_counts
                .get("exportsUnsupported"),
            Some(&1)
        );
        assert_eq!(
            result
                .profile
                .import_path_alias_package_self_name_outcome_counts
                .get("exportsTargetEscapesRepo"),
            Some(&1)
        );

        let conn = Connection::open(dir.join(".zcodegraph").join("zcodegraph.db")).unwrap();
        let targets = conn
            .prepare(
                "SELECT DISTINCT target.file_path
                 FROM edges e
                 JOIN nodes source ON source.id = e.source
                 JOIN nodes target ON target.id = e.target
                 WHERE e.kind = 'imports'
                   AND e.edgeOrigin = 'rust-finalization'
                   AND source.file_path = 'src/main.ts'
                   AND source.kind = 'file'
                 ORDER BY target.file_path",
            )
            .unwrap()
            .query_map([], |row| row.get::<_, String>(0))
            .unwrap()
            .collect::<Result<Vec<_>, _>>()
            .unwrap();
        assert_eq!(
            targets,
            vec![
                "packages/fallback/missing.ts",
                "packages/pattern/src/foo.ts"
            ]
        );

        fs::remove_dir_all(dir).unwrap();
    }

    #[test]
    fn rust_resolves_package_exports_patterns_with_specificity_priority() {
        let dir = temp_dir("package-exports-pattern-priority");
        fs::create_dir_all(dir.join("src/features")).unwrap();
        fs::write(
            dir.join("package.json"),
            r#"{"name":"@fixture/app","private":true,"exports":{"./foo":"./src/exact-foo.ts","./*":"./src/*.ts","./features/*":"./src/features/*.ts"}}"#,
        )
        .unwrap();
        fs::write(dir.join("src/exact-foo.ts"), "export const fooValue = 1;\n").unwrap();
        fs::write(dir.join("src/bar.ts"), "export const barValue = 2;\n").unwrap();
        fs::write(
            dir.join("src/features/a.ts"),
            "export const featureValue = 3;\n",
        )
        .unwrap();
        fs::write(
            dir.join("src/main.ts"),
            [
                "import { fooValue } from '@fixture/app/foo';",
                "import { barValue } from '@fixture/app/bar';",
                "import { featureValue } from '@fixture/app/features/a';",
                "export const total = fooValue + barValue + featureValue;",
                "",
            ]
            .join("\n"),
        )
        .unwrap();

        let request = IndexRequest {
            engine: "rust".to_string(),
            project_path: dir.to_string_lossy().to_string(),
            index_path: dir
                .join(".zcodegraph")
                .join("zcodegraph.db")
                .to_string_lossy()
                .to_string(),
            force: true,
            verbose: false,
            graph_work_profile: GraphWorkProfile::Full,
            sqlite_write_mode: SqliteWriteMode::Disk,
            parse_walker_diagnostics: false,
        };

        let result = run_index(&request);

        assert!(result.success, "{:?}", result.errors);
        assert_eq!(
            result
                .profile
                .import_path_alias_package_self_name_resolved_refs,
            3
        );
        assert_eq!(
            result
                .profile
                .import_path_alias_package_self_name_outcome_counts
                .get("exportsResolved"),
            Some(&3)
        );

        let conn = Connection::open(dir.join(".zcodegraph").join("zcodegraph.db")).unwrap();
        let targets = conn
            .prepare(
                "SELECT DISTINCT target.file_path
                 FROM edges e
                 JOIN nodes source ON source.id = e.source
                 JOIN nodes target ON target.id = e.target
                 WHERE e.kind = 'imports'
                   AND e.edgeOrigin = 'rust-finalization'
                   AND source.file_path = 'src/main.ts'
                   AND source.kind = 'file'
                 ORDER BY target.file_path",
            )
            .unwrap()
            .query_map([], |row| row.get::<_, String>(0))
            .unwrap()
            .collect::<Result<Vec<_>, _>>()
            .unwrap();
        assert_eq!(
            targets,
            vec!["src/bar.ts", "src/exact-foo.ts", "src/features/a.ts"]
        );

        fs::remove_dir_all(dir).unwrap();
    }

    #[test]
    fn rust_resolves_package_exports_nested_conditions_up_to_two_levels() {
        let dir = temp_dir("package-exports-nested-conditions");
        fs::create_dir_all(dir.join("src")).unwrap();
        fs::create_dir_all(dir.join("types")).unwrap();
        fs::write(
            dir.join("package.json"),
            r#"{"name":"@fixture/app","private":true,"exports":{".":{"import":{"types":"./types/index.d.ts","default":"./src/index.ts"}},"./feature":{"default":{"default":"./src/feature.ts"}}}}"#,
        )
        .unwrap();
        fs::write(
            dir.join("types/index.d.ts"),
            "export declare const typeValue: number;\n",
        )
        .unwrap();
        fs::write(dir.join("src/index.ts"), "export const runtimeValue = 1;\n").unwrap();
        fs::write(
            dir.join("src/feature.ts"),
            "export const featureValue = 2;\n",
        )
        .unwrap();
        fs::write(
            dir.join("src/main.ts"),
            [
                "import { typeValue } from '@fixture/app';",
                "import { featureValue } from '@fixture/app/feature';",
                "export const total = typeValue + featureValue;",
                "",
            ]
            .join("\n"),
        )
        .unwrap();

        let request = IndexRequest {
            engine: "rust".to_string(),
            project_path: dir.to_string_lossy().to_string(),
            index_path: dir
                .join(".zcodegraph")
                .join("zcodegraph.db")
                .to_string_lossy()
                .to_string(),
            force: true,
            verbose: false,
            graph_work_profile: GraphWorkProfile::Full,
            sqlite_write_mode: SqliteWriteMode::Disk,
            parse_walker_diagnostics: false,
        };

        let result = run_index(&request);

        assert!(result.success, "{:?}", result.errors);
        assert_eq!(
            result
                .profile
                .import_path_alias_package_self_name_outcome_counts
                .get("exportsResolved"),
            Some(&2)
        );

        let conn = Connection::open(dir.join(".zcodegraph").join("zcodegraph.db")).unwrap();
        let targets = conn
            .prepare(
                "SELECT DISTINCT target.file_path
                 FROM edges e
                 JOIN nodes source ON source.id = e.source
                 JOIN nodes target ON target.id = e.target
                 WHERE e.kind = 'imports'
                   AND e.edgeOrigin = 'rust-finalization'
                   AND source.file_path = 'src/main.ts'
                   AND source.kind = 'file'
                 ORDER BY target.file_path",
            )
            .unwrap()
            .query_map([], |row| row.get::<_, String>(0))
            .unwrap()
            .collect::<Result<Vec<_>, _>>()
            .unwrap();
        assert_eq!(targets, vec!["src/feature.ts", "types/index.d.ts"]);

        fs::remove_dir_all(dir).unwrap();
    }

    #[test]
    fn rust_package_exports_blocked_overdeep_and_array_shapes_fail_closed() {
        let dir = temp_dir("package-exports-blocked-overdeep-array");
        fs::create_dir_all(dir.join("packages/blocked/internal")).unwrap();
        fs::create_dir_all(dir.join("packages/deep/src")).unwrap();
        fs::create_dir_all(dir.join("packages/array")).unwrap();
        fs::write(
            dir.join("package.json"),
            r#"{"name":"root","private":true}"#,
        )
        .unwrap();
        fs::write(
            dir.join("packages/blocked/package.json"),
            r#"{"name":"@fixture/blocked","exports":{"./internal/*":null}}"#,
        )
        .unwrap();
        fs::write(
            dir.join("packages/deep/package.json"),
            r#"{"name":"@fixture/deep","exports":{".":{"import":{"default":{"default":"./src/index.ts"}}}}}"#,
        )
        .unwrap();
        fs::write(
            dir.join("packages/array/package.json"),
            r#"{"name":"@fixture/array","exports":["./index.ts"]}"#,
        )
        .unwrap();
        fs::write(
            dir.join("packages/blocked/internal/foo.ts"),
            "export const blockedValue = 1;\n",
        )
        .unwrap();
        fs::write(
            dir.join("packages/deep/src/index.ts"),
            "export const deepValue = 2;\n",
        )
        .unwrap();
        fs::write(
            dir.join("packages/array/index.ts"),
            "export const arrayValue = 3;\n",
        )
        .unwrap();
        fs::create_dir_all(dir.join("src")).unwrap();
        fs::write(
            dir.join("src/main.ts"),
            [
                "import { blockedValue } from '@fixture/blocked/internal/foo';",
                "import { deepValue } from '@fixture/deep';",
                "import { arrayValue } from '@fixture/array';",
                "export const total = 0;",
                "",
            ]
            .join("\n"),
        )
        .unwrap();

        let request = IndexRequest {
            engine: "rust".to_string(),
            project_path: dir.to_string_lossy().to_string(),
            index_path: dir
                .join(".zcodegraph")
                .join("zcodegraph.db")
                .to_string_lossy()
                .to_string(),
            force: true,
            verbose: false,
            graph_work_profile: GraphWorkProfile::Full,
            sqlite_write_mode: SqliteWriteMode::Disk,
            parse_walker_diagnostics: false,
        };

        let result = run_index(&request);

        assert!(result.success, "{:?}", result.errors);
        assert_eq!(
            result
                .profile
                .import_path_alias_package_self_name_resolved_refs,
            0
        );
        assert_eq!(
            result
                .profile
                .import_path_alias_package_self_name_fallback_refs,
            3
        );
        assert_eq!(
            result
                .profile
                .import_path_alias_package_self_name_outcome_counts
                .get("exportsBlocked"),
            Some(&1)
        );
        assert_eq!(
            result
                .profile
                .import_path_alias_package_self_name_outcome_counts
                .get("exportsUnsupported"),
            Some(&2)
        );

        let conn = Connection::open(dir.join(".zcodegraph").join("zcodegraph.db")).unwrap();
        let count = conn
            .query_row(
                "SELECT COUNT(*)
                 FROM edges e
                 JOIN nodes source ON source.id = e.source
                 WHERE e.kind = 'imports'
                   AND e.edgeOrigin = 'rust-finalization'
                   AND source.file_path = 'src/main.ts'
                   AND source.kind = 'file'",
                [],
                |row| row.get::<_, i64>(0),
            )
            .unwrap();
        assert_eq!(count, 0);

        fs::remove_dir_all(dir).unwrap();
    }

    #[test]
    fn rust_resolves_package_imports_from_nearest_package_boundary() {
        let dir = temp_dir("package-imports-boundary");
        fs::create_dir_all(dir.join("src")).unwrap();
        fs::create_dir_all(dir.join("packages/app/src/internal/features")).unwrap();
        fs::create_dir_all(dir.join("packages/app/types")).unwrap();
        fs::write(
            dir.join("package.json"),
            r##"{"name":"root","private":true,"imports":{"#internal":"./src/root-internal.ts"}}"##,
        )
        .unwrap();
        fs::write(
            dir.join("packages/app/package.json"),
            r##"{"name":"@fixture/app","private":true,"imports":{"#internal":"./src/internal/index.ts","#feature/*":"./src/internal/features/*.ts","#typed":{"import":{"types":"./types/typed.d.ts","default":"./src/internal/typed.ts"}}}}"##,
        )
        .unwrap();
        fs::write(
            dir.join("src/root-internal.ts"),
            "export const rootInternal = 0;\n",
        )
        .unwrap();
        fs::write(
            dir.join("packages/app/src/internal/index.ts"),
            "export const internalValue = 1;\n",
        )
        .unwrap();
        fs::write(
            dir.join("packages/app/src/internal/features/tool.ts"),
            "export const featureValue = 2;\n",
        )
        .unwrap();
        fs::write(
            dir.join("packages/app/types/typed.d.ts"),
            "export declare const typedValue: number;\n",
        )
        .unwrap();
        fs::write(
            dir.join("packages/app/src/internal/typed.ts"),
            "export const runtimeTypedValue = 3;\n",
        )
        .unwrap();
        fs::write(
            dir.join("packages/app/src/main.ts"),
            [
                "import { internalValue } from '#internal';",
                "import { featureValue } from '#feature/tool';",
                "import { typedValue } from '#typed';",
                "export const total = internalValue + featureValue + typedValue;",
                "",
            ]
            .join("\n"),
        )
        .unwrap();

        let request = IndexRequest {
            engine: "rust".to_string(),
            project_path: dir.to_string_lossy().to_string(),
            index_path: dir
                .join(".zcodegraph")
                .join("zcodegraph.db")
                .to_string_lossy()
                .to_string(),
            force: true,
            verbose: false,
            graph_work_profile: GraphWorkProfile::Full,
            sqlite_write_mode: SqliteWriteMode::Disk,
            parse_walker_diagnostics: false,
        };

        let result = run_index(&request);

        assert!(result.success, "{:?}", result.errors);
        assert_eq!(
            result
                .profile
                .import_path_alias_package_imports_resolved_refs,
            3
        );
        assert_eq!(
            result
                .profile
                .import_path_alias_package_imports_outcome_counts
                .get("importsResolved"),
            Some(&3)
        );

        let conn = Connection::open(dir.join(".zcodegraph").join("zcodegraph.db")).unwrap();
        let targets = conn
            .prepare(
                "SELECT DISTINCT target.file_path
                 FROM edges e
                 JOIN nodes source ON source.id = e.source
                 JOIN nodes target ON target.id = e.target
                 WHERE e.kind = 'imports'
                   AND e.edgeOrigin = 'rust-finalization'
                   AND source.file_path = 'packages/app/src/main.ts'
                   AND source.kind = 'file'
                 ORDER BY target.file_path",
            )
            .unwrap()
            .query_map([], |row| row.get::<_, String>(0))
            .unwrap()
            .collect::<Result<Vec<_>, _>>()
            .unwrap();
        assert_eq!(
            targets,
            vec![
                "packages/app/src/internal/features/tool.ts",
                "packages/app/src/internal/index.ts",
                "packages/app/types/typed.d.ts"
            ]
        );

        fs::remove_dir_all(dir).unwrap();
    }

    #[test]
    fn rust_package_imports_fail_closed_for_blocked_unsupported_and_escaping_targets() {
        let dir = temp_dir("package-imports-fail-closed");
        fs::create_dir_all(dir.join("packages/app/src")).unwrap();
        fs::create_dir_all(dir.join("packages/shared/src")).unwrap();
        fs::write(
            dir.join("package.json"),
            r#"{"name":"root","private":true}"#,
        )
        .unwrap();
        fs::write(
            dir.join("packages/app/package.json"),
            r##"{"name":"@fixture/app","private":true,"imports":{"#blocked":null,"#array":["./src/array.ts"],"#missing":"./src/missing.ts","#escape":"../shared/src/index.ts"}}"##,
        )
        .unwrap();
        fs::write(
            dir.join("packages/app/src/array.ts"),
            "export const arrayValue = 1;\n",
        )
        .unwrap();
        fs::write(
            dir.join("packages/shared/src/index.ts"),
            "export const sharedValue = 2;\n",
        )
        .unwrap();
        fs::write(
            dir.join("packages/app/src/main.ts"),
            [
                "import { blockedValue } from '#blocked';",
                "import { arrayValue } from '#array';",
                "import { missingValue } from '#missing';",
                "import { sharedValue } from '#escape';",
                "export const total = 0;",
                "",
            ]
            .join("\n"),
        )
        .unwrap();

        let request = IndexRequest {
            engine: "rust".to_string(),
            project_path: dir.to_string_lossy().to_string(),
            index_path: dir
                .join(".zcodegraph")
                .join("zcodegraph.db")
                .to_string_lossy()
                .to_string(),
            force: true,
            verbose: false,
            graph_work_profile: GraphWorkProfile::Full,
            sqlite_write_mode: SqliteWriteMode::Disk,
            parse_walker_diagnostics: false,
        };

        let result = run_index(&request);

        assert!(result.success, "{:?}", result.errors);
        assert_eq!(
            result
                .profile
                .import_path_alias_package_imports_resolved_refs,
            0
        );
        assert_eq!(
            result
                .profile
                .import_path_alias_package_imports_fallback_refs,
            4
        );
        assert_eq!(
            result
                .profile
                .import_path_alias_package_imports_outcome_counts
                .get("importsBlocked"),
            Some(&1)
        );
        assert_eq!(
            result
                .profile
                .import_path_alias_package_imports_outcome_counts
                .get("importsUnsupported"),
            Some(&1)
        );
        assert_eq!(
            result
                .profile
                .import_path_alias_package_imports_outcome_counts
                .get("importsMissingTarget"),
            Some(&1)
        );
        assert_eq!(
            result
                .profile
                .import_path_alias_package_imports_outcome_counts
                .get("importsTargetEscapesPackage"),
            Some(&1)
        );

        let conn = Connection::open(dir.join(".zcodegraph").join("zcodegraph.db")).unwrap();
        let count = conn
            .query_row(
                "SELECT COUNT(*)
                 FROM edges e
                 JOIN nodes source ON source.id = e.source
                 WHERE e.kind = 'imports'
                   AND e.edgeOrigin = 'rust-finalization'
                   AND source.file_path = 'packages/app/src/main.ts'
                   AND source.kind = 'file'",
                [],
                |row| row.get::<_, i64>(0),
            )
            .unwrap();
        assert_eq!(count, 0);

        fs::remove_dir_all(dir).unwrap();
    }

    #[test]
    fn rust_package_self_name_failures_are_diagnostic_only() {
        let dir = temp_dir("package-self-name-failures");
        fs::create_dir_all(dir.join("packages/one")).unwrap();
        fs::create_dir_all(dir.join("packages/two")).unwrap();
        fs::create_dir_all(dir.join("src/lib")).unwrap();
        fs::write(
            dir.join("tsconfig.json"),
            r#"{"compilerOptions":{"baseUrl":".","paths":{"virtual-lib":["src/lib/virtual.ts"]}}}"#,
        )
        .unwrap();
        fs::write(
            dir.join("packages/one/package.json"),
            r#"{"name":"@fixture/dup"}"#,
        )
        .unwrap();
        fs::write(
            dir.join("packages/two/package.json"),
            r#"{"name":"@fixture/dup"}"#,
        )
        .unwrap();
        fs::write(
            dir.join("package.json"),
            r#"{"name":"@fixture/root","private":true}"#,
        )
        .unwrap();
        fs::write(
            dir.join("src/lib/virtual.ts"),
            "export const virtualValue = 1;\n",
        )
        .unwrap();
        fs::write(
            dir.join("src/main.ts"),
            [
                "import { dupValue } from '@fixture/dup';",
                "import { missingValue } from '@fixture/root/missing';",
                "import { missingPackageValue } from '@fixture/missing';",
                "import { virtualValue } from 'virtual-lib';",
                "export const total = virtualValue;",
                "",
            ]
            .join("\n"),
        )
        .unwrap();

        let request = IndexRequest {
            engine: "rust".to_string(),
            project_path: dir.to_string_lossy().to_string(),
            index_path: dir
                .join(".zcodegraph")
                .join("zcodegraph.db")
                .to_string_lossy()
                .to_string(),
            force: true,
            verbose: false,
            graph_work_profile: GraphWorkProfile::Full,
            sqlite_write_mode: SqliteWriteMode::Disk,
            parse_walker_diagnostics: false,
        };

        let result = run_index(&request);

        assert!(result.success, "{:?}", result.errors);
        assert_eq!(result.profile.import_path_alias_tsconfig_resolved_refs, 1);
        assert_eq!(
            result
                .profile
                .import_path_alias_package_self_name_fallback_refs,
            3
        );
        assert_eq!(
            result
                .profile
                .import_path_alias_package_self_name_outcome_counts
                .get("ambiguousName"),
            Some(&1)
        );
        assert_eq!(
            result
                .profile
                .import_path_alias_package_self_name_outcome_counts
                .get("missingTarget"),
            Some(&1)
        );
        assert_eq!(
            result
                .profile
                .import_path_alias_package_self_name_outcome_counts
                .get("missingPackageName"),
            Some(&1)
        );
        assert_eq!(
            result
                .profile
                .import_path_alias_package_self_name_outcome_counts
                .get("resolvedRootIndex"),
            None
        );

        let conn = Connection::open(dir.join(".zcodegraph").join("zcodegraph.db")).unwrap();
        let targets = conn
            .prepare(
                "SELECT DISTINCT target.file_path
                 FROM edges e
                 JOIN nodes source ON source.id = e.source
                 JOIN nodes target ON target.id = e.target
                 WHERE e.kind = 'imports'
                   AND e.edgeOrigin = 'rust-finalization'
                   AND source.file_path = 'src/main.ts'
                   AND source.kind = 'file'
                 ORDER BY target.file_path",
            )
            .unwrap()
            .query_map([], |row| row.get::<_, String>(0))
            .unwrap()
            .collect::<Result<Vec<_>, _>>()
            .unwrap();
        assert_eq!(targets, vec!["src/lib/virtual.ts"]);

        fs::remove_dir_all(dir).unwrap();
    }

    #[test]
    fn rust_workspace_package_loader_handles_manifests_and_longest_match() {
        let dir = temp_dir("workspace-package-loader");
        assert!(load_workspace_packages(&dir).by_name.is_empty());
        fs::write(dir.join("package.json"), "{not-json").unwrap();
        assert!(load_workspace_packages(&dir).by_name.is_empty());

        fs::create_dir_all(dir.join("packages/ui-core")).unwrap();
        fs::create_dir_all(dir.join("packages/ui-core/button")).unwrap();
        fs::create_dir_all(dir.join("apps/web")).unwrap();
        fs::create_dir_all(dir.join("tools/logger")).unwrap();
        fs::write(
            dir.join("package.json"),
            r#"{"workspaces":{"packages":["packages/*","apps/*"]}}"#,
        )
        .unwrap();
        fs::write(
            dir.join("pnpm-workspace.yaml"),
            "packages:\n  - 'tools/*'\n",
        )
        .unwrap();
        fs::write(
            dir.join("packages/ui-core/package.json"),
            r#"{"name":"@scope/ui"}"#,
        )
        .unwrap();
        fs::write(
            dir.join("packages/ui-core/button/package.json"),
            r#"{"name":"@scope/ui/button"}"#,
        )
        .unwrap();
        fs::write(dir.join("apps/web/package.json"), r#"{"name":"web"}"#).unwrap();
        fs::write(
            dir.join("tools/logger/package.json"),
            r#"{"name":"@tools/logger"}"#,
        )
        .unwrap();

        let packages = load_workspace_packages(&dir);

        assert_eq!(
            packages.by_name.get("@scope/ui").map(String::as_str),
            Some("packages/ui-core")
        );
        assert_eq!(
            packages.by_name.get("web").map(String::as_str),
            Some("apps/web")
        );
        assert_eq!(
            packages.by_name.get("@tools/logger").map(String::as_str),
            Some("tools/logger")
        );
        assert_eq!(
            packages.resolve_import("@scope/ui/button/icon"),
            Some(PathBuf::from("packages/ui-core/button/icon"))
        );

        fs::remove_dir_all(dir).unwrap();
    }

    #[test]
    fn rust_index_accepts_typescript_import_type_queries() {
        let dir = temp_dir("import-type-queries");
        fs::write(
            dir.join("index.ts"),
            [
                "type TextEdit = readonly import('./private-to-property.ts').TextEdit[];",
                "interface TelemetryEventProperties {",
                "\treadonly [key: string]: string | import('vscode').TelemetryTrustedValue<string> | undefined;",
                "}",
                "export async function load(importOriginal: <T>() => Promise<T>): Promise<void> {",
                "\tconst actual = await importOriginal<typeof import('../slashCommands/claudeSlashCommandRegistry')>();",
                "\tconst runtimeModule = import('./runtime-module');",
                "\tvoid runtimeModule;",
                "\tvoid actual;",
                "}",
                "export function mockGraph(): import('../src/index').default {",
                "\treturn {} as unknown as import('../src/index').default;",
                "}",
                "export type Lookup = (name: string) => import('../src/types').Node[];",
                "",
            ]
            .join("\n"),
        )
        .unwrap();

        let request = IndexRequest {
            engine: "rust".to_string(),
            project_path: dir.to_string_lossy().to_string(),
            index_path: dir
                .join(".zcodegraph")
                .join("zcodegraph.db")
                .to_string_lossy()
                .to_string(),
            force: true,
            verbose: false,
            graph_work_profile: GraphWorkProfile::Full,
            sqlite_write_mode: SqliteWriteMode::Disk,
            parse_walker_diagnostics: false,
        };

        let result = run_index(&request);

        assert!(result.success, "{:?}", result.errors);
        assert_eq!(result.files_errored, 0, "{:?}", result.errors);
        assert!(
            result.errors.is_empty(),
            "import type queries should parse without Rust-core syntax errors: {:?}",
            result.errors
        );
        fs::remove_dir_all(dir).unwrap();
    }

    #[test]
    fn memory_final_flush_sqlite_mode_writes_a_readable_index() {
        let dir = temp_dir("memory-final-flush");
        fs::write(
            dir.join("index.ts"),
            "export function alpha(): number { return 1; }\n",
        )
        .unwrap();

        let request = IndexRequest {
            engine: "rust".to_string(),
            project_path: dir.to_string_lossy().to_string(),
            index_path: dir
                .join(".zcodegraph")
                .join("zcodegraph.db")
                .to_string_lossy()
                .to_string(),
            force: true,
            verbose: false,
            graph_work_profile: GraphWorkProfile::Full,
            sqlite_write_mode: SqliteWriteMode::MemoryFinalFlush,
            parse_walker_diagnostics: false,
        };

        let result = run_index(&request);

        assert!(result.success, "{:?}", result.errors);
        assert_eq!(result.files_indexed, 1);
        let conn = Connection::open(&request.index_path).unwrap();
        let alpha_count: i64 = conn
            .query_row(
                "SELECT COUNT(*) FROM nodes WHERE name = 'alpha'",
                [],
                |row| row.get(0),
            )
            .unwrap();
        let schema_version: i64 = conn
            .query_row(
                "SELECT version FROM schema_versions WHERE version = ?1",
                params![CURRENT_SCHEMA_VERSION],
                |row| row.get(0),
            )
            .unwrap();
        let engine: String = conn
            .query_row(
                "SELECT value FROM project_metadata WHERE key = 'indexed_with_engine'",
                [],
                |row| row.get(0),
            )
            .unwrap();
        assert_eq!(alpha_count, 1);
        assert_eq!(schema_version, CURRENT_SCHEMA_VERSION);
        assert_eq!(engine, "rust");
        fs::remove_dir_all(dir).unwrap();
    }

    #[test]
    fn final_flush_sqlite_mode_preserves_previous_good_index_when_staging_fails() {
        let dir = temp_dir("final-flush-preserves-active-index");
        fs::write(
            dir.join("index.ts"),
            "export function stableSymbol(): number { return 1; }\n",
        )
        .unwrap();
        let index_path = dir.join(".zcodegraph").join("zcodegraph.db");

        let initial_request = IndexRequest {
            engine: "rust".to_string(),
            project_path: dir.to_string_lossy().to_string(),
            index_path: index_path.to_string_lossy().to_string(),
            force: true,
            verbose: false,
            graph_work_profile: GraphWorkProfile::Full,
            sqlite_write_mode: SqliteWriteMode::FinalFlush,
            parse_walker_diagnostics: false,
        };

        let initial = run_index(&initial_request);
        assert!(initial.success, "{:?}", initial.errors);

        let staging_path = temp_index_path(&index_path);
        fs::create_dir(&staging_path).unwrap();

        let failed = run_index(&initial_request);
        assert!(
            !failed.success,
            "staging should fail when the temp DB path is blocked"
        );

        let conn = Connection::open(&index_path).unwrap();
        let stable_count: i64 = conn
            .query_row(
                "SELECT COUNT(*) FROM nodes WHERE name = 'stableSymbol'",
                [],
                |row| row.get(0),
            )
            .unwrap();
        let engine: String = conn
            .query_row(
                "SELECT value FROM project_metadata WHERE key = 'indexed_with_engine'",
                [],
                |row| row.get(0),
            )
            .unwrap();
        assert_eq!(stable_count, 1);
        assert_eq!(engine, "rust");
        fs::remove_dir_all(dir).unwrap();
    }

    #[test]
    fn final_flush_sqlite_mode_leaves_active_index_in_wal_mode() {
        let dir = temp_dir("final-flush-active-wal");
        fs::write(
            dir.join("index.ts"),
            "export function alpha(): number { return 1; }\n",
        )
        .unwrap();

        let request = IndexRequest {
            engine: "rust".to_string(),
            project_path: dir.to_string_lossy().to_string(),
            index_path: dir
                .join(".zcodegraph")
                .join("zcodegraph.db")
                .to_string_lossy()
                .to_string(),
            force: true,
            verbose: false,
            graph_work_profile: GraphWorkProfile::Full,
            sqlite_write_mode: SqliteWriteMode::FinalFlush,
            parse_walker_diagnostics: false,
        };

        let result = run_index(&request);

        assert!(result.success, "{:?}", result.errors);
        let conn = Connection::open(&request.index_path).unwrap();
        let journal_mode: String = conn
            .pragma_query_value(None, "journal_mode", |row| row.get(0))
            .unwrap();
        let engine: String = conn
            .query_row(
                "SELECT value FROM project_metadata WHERE key = 'indexed_with_engine'",
                [],
                |row| row.get(0),
            )
            .unwrap();
        assert_eq!(journal_mode.to_lowercase(), "wal");
        assert_eq!(engine, "rust");
        fs::remove_dir_all(dir).unwrap();
    }

    #[test]
    fn rust_index_accepts_typescript_contextual_keyword_identifiers() {
        let dir = temp_dir("contextual-keywords");
        fs::write(
            dir.join("index.ts"),
            [
                "export type MemberStats = { abstract: Set<string>; concrete: Set<string> };",
                "export function commonLength(unique: Element[]): number {",
                "\treturn unique.length;",
                "}",
                "",
            ]
            .join("\n"),
        )
        .unwrap();

        let request = IndexRequest {
            engine: "rust".to_string(),
            project_path: dir.to_string_lossy().to_string(),
            index_path: dir
                .join(".zcodegraph")
                .join("zcodegraph.db")
                .to_string_lossy()
                .to_string(),
            force: true,
            verbose: false,
            graph_work_profile: GraphWorkProfile::Full,
            sqlite_write_mode: SqliteWriteMode::Disk,
            parse_walker_diagnostics: false,
        };

        let result = run_index(&request);

        assert!(result.success, "{:?}", result.errors);
        assert_eq!(result.files_errored, 0, "{:?}", result.errors);
        fs::remove_dir_all(dir).unwrap();
    }
}
