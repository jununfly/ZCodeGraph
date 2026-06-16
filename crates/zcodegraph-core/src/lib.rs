use rusqlite::{params, Connection};
use serde::{Deserialize, Serialize};
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
    pub graph_work_profile: GraphWorkProfile,
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
struct GraphWorkFeatures {
    component_detection: bool,
    constant_extraction: bool,
    field_extraction: bool,
    export_extraction: bool,
    aggressive_call_extraction: bool,
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
    pub errors: Vec<String>,
}

#[derive(Debug, Clone, Copy, Default, PartialEq, Eq)]
pub struct IndexProfile {
    pub source_scan_ms: u128,
    pub parse_extraction_ms: u128,
    pub sqlite_write_ms: u128,
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
                errors: vec![err.to_string()],
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

pub fn match_name_json(input: &str) -> Result<String, String> {
    let started = Instant::now();
    let mut request: NameMatcherBatchRequest =
        serde_json::from_str(input).map_err(|err| format!("invalid match-name request: {}", err))?;
    if request.version != 1 {
        return Err(format!("unsupported match-name request version: {}", request.version));
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
        + candidates.nodes_in_files.values().map(Vec::len).sum::<usize>()
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
        return Some(decision(reference, &reference.candidates.by_qualified_name[0], 0.95, "qualified-name"));
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
        let Some(nodes_in_file) = reference.candidates.nodes_in_files.get(&class_node.file_path) else {
            continue;
        };
        if let Some(method_node) = nodes_in_file.iter().find(|node| {
            matches!(node.kind.as_str(), "method" | "function") &&
                node.name == method_name &&
                node.qualified_name.contains(&class_node.name)
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
            let Some(nodes_in_file) = reference.candidates.nodes_in_files.get(&class_node.file_path) else {
                continue;
            };
            if let Some(method_node) = nodes_in_file.iter().find(|node| {
                matches!(node.kind.as_str(), "method" | "function") &&
                    node.name == method_name &&
                    node.qualified_name.contains(&class_node.name)
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
    let target_methods = if same_language.is_empty() { methods } else { same_language };
    if target_methods.len() == 1 && target_methods[0].language == reference.ref_data.language {
        return Some(decision(reference, target_methods[0], 0.7, "instance-method"));
    }
    if target_methods.len() > 1 {
        let receiver_words = split_camel_case(receiver);
        let mut best: Option<&NodeFact> = None;
        let mut best_score = 0;
        for method in target_methods {
            let class_words = split_camel_case(&method.qualified_name);
            let mut score = receiver_words
                .iter()
                .filter(|word| class_words.iter().any(|class_word| class_word.eq_ignore_ascii_case(word)))
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
        return Some(decision(reference, candidates[0], confidence, "exact-match"));
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
    let final_candidates = if same_language.is_empty() { gated } else { same_language };
    if final_candidates.len() != 1 {
        return None;
    }
    let confidence = if final_candidates[0].language == reference.ref_data.language {
        0.5
    } else {
        0.3
    };
    Some(decision(reference, final_candidates[0], confidence, "fuzzy"))
}

fn decision(reference: &NameMatcherReference, node: &NodeFact, confidence: f64, resolved_by: &'static str) -> NameMatcherDecision {
    NameMatcherDecision {
        key: reference.key.clone(),
        target_node_id: Some(node.id.clone()),
        confidence,
        resolved_by: Some(resolved_by),
        fallback_reason: None,
    }
}

fn apply_language_gate<'a>(candidates: &'a [NodeFact], reference: &UnresolvedReferenceFact) -> Vec<&'a NodeFact> {
    let refs: Vec<&NodeFact> = candidates.iter().collect();
    apply_language_gate_refs(&refs, reference)
}

fn apply_language_gate_refs<'a>(candidates: &[&'a NodeFact], reference: &UnresolvedReferenceFact) -> Vec<&'a NodeFact> {
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

fn find_best_match<'a>(reference: &UnresolvedReferenceFact, candidates: &[&'a NodeFact]) -> Option<&'a NodeFact> {
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
        if reference.reference_kind == "calls" && matches!(candidate.kind.as_str(), "function" | "method") {
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

fn pick_closest_file_node<'a>(candidates: &[&'a NodeFact], reference: &UnresolvedReferenceFact) -> &'a NodeFact {
    let reference_dir = dir_of(&reference.file_path);
    let same_dir: Vec<&NodeFact> = candidates
        .iter()
        .copied()
        .filter(|node| dir_of(&node.file_path) == reference_dir)
        .collect();
    let pool = if same_dir.is_empty() { candidates.to_vec() } else { same_dir };
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
    let a_parts: Vec<&str> = a.rsplit_once('/').map(|(dir, _)| dir).unwrap_or("").split('/').collect();
    let b_parts: Vec<&str> = b.rsplit_once('/').map(|(dir, _)| dir).unwrap_or("").split('/').collect();
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
    !extension.is_empty() &&
        extension.len() <= 4 &&
        extension.chars().next().is_some_and(|ch| ch.is_ascii_alphabetic()) &&
        extension.chars().all(|ch| ch.is_ascii_alphanumeric())
}

fn parse_method_reference(value: &str) -> Option<(&str, &str)> {
    if let Some((receiver, method)) = value.rsplit_once("::") {
        if !receiver.is_empty() && !method.is_empty() && !receiver.contains("::") && !method.contains("::") {
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
            let sqlite_setup_started = Instant::now();
            let mut conn = Connection::open(&temp_path)?;
            conn.pragma_update(None, "journal_mode", "WAL")?;
            conn.pragma_update(None, "foreign_keys", "ON")?;
            conn.execute_batch(SCHEMA_SQL)?;
            stamp_schema_version(&conn)?;
            stamp_metadata(&conn)?;
            let sqlite_setup_ms = sqlite_setup_started.elapsed().as_millis();
            let tx = conn.transaction()?;
            let mut counts = index_javascript_files(&tx, Path::new(&request.project_path), request.graph_work_profile.features())?;
            let commit_started = Instant::now();
            tx.commit()?;
            counts.profile.sqlite_write_ms += sqlite_setup_ms;
            counts.profile.sqlite_write_ms += commit_started.elapsed().as_millis();
            counts
        };

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
    features: GraphWorkFeatures,
) -> Result<WriteCounts, Box<dyn std::error::Error>> {
    let scan_started = Instant::now();
    let files = collect_supported_files(project_path)?;
    let mut counts = WriteCounts::default();
    counts.profile.source_scan_ms = scan_started.elapsed().as_millis();

    for file_path in files {
        let parse_started = Instant::now();
        let language = SourceLanguage::from_path(&file_path)
            .ok_or_else(|| format!("Unsupported source file: {}", file_path.display()))?;
        let mut parser = Parser::new();
        parser.set_language(&language.tree_sitter_language())?;
        let relative_path = relative_slash_path(project_path, &file_path)?;
        let content = fs::read_to_string(&file_path)?;
        let metadata = fs::metadata(&file_path)?;
        let parse_content = normalize_source_for_parser(&content, language);
        let parsed = parser
            .parse(parse_content.as_str(), None)
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
                features,
            )?;
        }
        counts.profile.parse_extraction_ms += parse_started.elapsed().as_millis();

        let indexed_at = now_ms();
        let sqlite_write_started = Instant::now();
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
        counts.profile.sqlite_write_ms += sqlite_write_started.elapsed().as_millis();

        counts.files_indexed += 1;
        counts.nodes_created += nodes.len() as u32;
        counts.edges_created += edges.len() as u32;
    }

    Ok(counts)
}

fn normalize_source_for_parser(source: &str, language: SourceLanguage) -> String {
    if matches!(language, SourceLanguage::TypeScript | SourceLanguage::Tsx) {
        normalize_typescript_contextual_keywords(&normalize_import_type_queries(source))
    } else {
        source.to_string()
    }
}

fn normalize_import_type_queries(source: &str) -> String {
    let mut out = source.as_bytes().to_vec();
    let bytes = source.as_bytes();
    let mut index = 0;

    while let Some(offset) = find_subslice(&bytes[index..], b"import(") {
        let start = index + offset;
        let Some(type_import_context) = looks_like_type_import_context(source, start) else {
            index = start + "import(".len();
            continue;
        };

        let Some((end, has_member_access)) = import_type_query_end(bytes, start) else {
            index = start + "import(".len();
            continue;
        };
        if !has_member_access && !type_import_context.allows_bare_import_type_query {
            index = start + "import(".len();
            continue;
        }

        replace_with_identifier_placeholder(&mut out, start, end);
        index = end;
    }

    String::from_utf8(out).unwrap_or_else(|_| source.to_string())
}

struct TypeImportContext {
    allows_bare_import_type_query: bool,
}

fn find_subslice(haystack: &[u8], needle: &[u8]) -> Option<usize> {
    haystack
        .windows(needle.len())
        .position(|window| window == needle)
}

fn looks_like_type_import_context(source: &str, start: usize) -> Option<TypeImportContext> {
    let prefix = &source[..start];
    let trimmed = prefix.trim_end();
    if trimmed.ends_with("typeof") || trimmed.ends_with("readonly") {
        return Some(TypeImportContext {
            allows_bare_import_type_query: trimmed.ends_with("typeof"),
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

fn replace_with_identifier_placeholder(out: &mut [u8], start: usize, end: usize) {
    let placeholder = b"ZCGImportType";
    let len = end.saturating_sub(start);
    for byte in &mut out[start..end] {
        *byte = b' ';
    }
    let copy_len = len.min(placeholder.len());
    out[start..start + copy_len].copy_from_slice(&placeholder[..copy_len]);
}

fn normalize_typescript_contextual_keywords(source: &str) -> String {
    let mut out = source.as_bytes().to_vec();
    let bytes = source.as_bytes();
    let mut index = 0;

    while index < bytes.len() {
        if word_at(bytes, index, b"abstract") && is_property_name_position(bytes, index + 8) {
            out[index..index + 8].copy_from_slice(b"_bstract");
            index += 8;
            continue;
        }
        if word_at(bytes, index, b"unique") && is_member_receiver_position(bytes, index + 6) {
            out[index..index + 6].copy_from_slice(b"uniq_e");
            index += 6;
            continue;
        }
        index += 1;
    }

    String::from_utf8(out).unwrap_or_else(|_| source.to_string())
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
    features: GraphWorkFeatures,
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
        features,
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
    features: GraphWorkFeatures,
) -> Result<(), Box<dyn std::error::Error>> {
    let node = cursor.node();
    let mut child_from_node_id = current_from_node_id.to_string();

    if let Some((kind, name_node)) = extract_named_symbol(node, source, language, features)? {
        let mut name = name_node.utf8_text(source)?.to_string();
        if matches!(kind, "import" | "export") {
            name = trim_string_literal(&name).to_string();
        }
        let extracted =
            ExtractedNode::symbol(relative_path, kind, &name, node, language.codegraph_name());
        let extracted_id = extracted.id.clone();
        let contains_source = if current_from_node_id != file_node_id
            && matches!(kind, "method" | "field" | "property")
        {
            current_from_node_id.to_string()
        } else {
            file_node_id.to_string()
        };
        edges.push(ExtractedEdge {
            source: contains_source,
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
        features,
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

fn extract_named_symbol<'a>(
    node: SyntaxNode<'a>,
    source: &[u8],
    language: SourceLanguage,
    features: GraphWorkFeatures,
) -> Result<Option<(&'static str, SyntaxNode<'a>)>, Box<dyn std::error::Error>> {
    if matches!(
        node.kind(),
        "function_declaration" | "class_declaration" | "enum_declaration"
    ) {
        if let Some(name_node) = node.child_by_field_name("name") {
            let name = name_node.utf8_text(source)?;
            let kind = if node.kind() == "function_declaration"
                && features.component_detection
                && language.has_jsx()
                && is_pascal_case(name)
            {
                "component"
            } else if node.kind() == "function_declaration" {
                "function"
            } else if node.kind() == "enum_declaration" {
                "enum"
            } else {
                "class"
            };
            return Ok(Some((kind, name_node)));
        }
    }

    if node.kind() == "import_statement" || (node.kind() == "export_statement" && features.export_extraction) {
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
                    if features.component_detection && language.has_jsx() && is_pascal_case(name) {
                        return Ok(Some(("component", name_node)));
                    }
                    if variable_declarator_has_function_value(child) {
                        return Ok(Some(("function", name_node)));
                    }
                    if kind == "constant" && !features.constant_extraction {
                        return Ok(None);
                    }
                    return Ok(Some((kind, name_node)));
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
        .map(|value| {
            node_contains_function_value(value)
        })
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
    features: GraphWorkFeatures,
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
            for binding in import_export_binding_names(node.utf8_text(source)?) {
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
            for binding in import_export_binding_names(node.utf8_text(source)?) {
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

fn import_export_binding_names(statement: &str) -> Vec<String> {
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
            Some(imported.trim_start_matches("type ").to_string())
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
        .map(|message| {
            format!(
                "{{\"message\":\"{}\",\"severity\":\"error\"}}",
                escape_json(message)
            )
        })
        .collect::<Vec<_>>()
        .join(",");

    format!(
        "{{\"type\":\"result\",\"success\":{},\"filesIndexed\":{},\"filesSkipped\":{},\"filesErrored\":{},\"nodesCreated\":{},\"edgesCreated\":{},\"errors\":[{}],\"durationMs\":{},\"profile\":{{\"sourceScanMs\":{},\"parseExtractionMs\":{},\"sqliteWriteMs\":{}}}}}",
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
        result.profile.sqlite_write_ms
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
        assert_eq!(GraphWorkProfile::parse("full").unwrap(), GraphWorkProfile::Full);
        assert_eq!(GraphWorkProfile::parse("matched-ts-js").unwrap(), GraphWorkProfile::MatchedTsJs);
        let err = GraphWorkProfile::parse("wide-open").unwrap_err();
        assert!(err.contains("unsupported graph work profile"));
        assert!(err.contains("full, matched-ts-js"));
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
                sqlite_write_ms: 3,
            },
            errors: Vec::new(),
        };

        assert_eq!(
            result_json(&result),
            "{\"type\":\"result\",\"success\":true,\"filesIndexed\":0,\"filesSkipped\":0,\"filesErrored\":0,\"nodesCreated\":0,\"edgesCreated\":0,\"errors\":[],\"durationMs\":7,\"profile\":{\"sourceScanMs\":1,\"parseExtractionMs\":2,\"sqliteWriteMs\":3}}"
        );
    }

    #[test]
    fn escapes_error_messages_as_json_strings() {
        assert_eq!(
            error_json("bad \"path\"\nnext"),
            "{\"type\":\"error\",\"severity\":\"error\",\"message\":\"bad \\\"path\\\"\\nnext\"}"
        );
    }

    fn node_json(id: &str, kind: &str, name: &str, qualified_name: &str, file_path: &str) -> serde_json::Value {
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
        let target = node_json("node-alpha", "function", "alpha", "src/target.ts::alpha", "src/target.ts");
        let response = matcher_response("alpha", serde_json::json!({
            "byName": [target],
            "byQualifiedName": [],
            "byLeafName": [],
            "byLowerName": [],
            "byFileName": [],
            "classCandidates": [],
            "capitalizedClassCandidates": [],
            "methodCandidates": [],
            "nodesInFiles": {}
        }));

        assert_eq!(response["decisions"][0]["targetNodeId"], "node-alpha");
        assert_eq!(response["decisions"][0]["resolvedBy"], "exact-match");
        assert_eq!(response["diagnostics"]["rustMatcherHandledRefs"], 1);
    }

    #[test]
    fn rust_name_matcher_resolves_qualified_candidate_facts() {
        let target = node_json("node-qualified", "function", "run", "Service.run", "src/service.ts");
        let response = matcher_response("Service.run", serde_json::json!({
            "byName": [],
            "byQualifiedName": [target],
            "byLeafName": [],
            "byLowerName": [],
            "byFileName": [],
            "classCandidates": [],
            "capitalizedClassCandidates": [],
            "methodCandidates": [],
            "nodesInFiles": {}
        }));

        assert_eq!(response["decisions"][0]["targetNodeId"], "node-qualified");
        assert_eq!(response["decisions"][0]["resolvedBy"], "qualified-name");
    }

    #[test]
    fn rust_name_matcher_resolves_method_candidate_facts() {
        let class_node = node_json("class-service", "class", "Service", "Service", "src/service.ts");
        let method_node = node_json("method-run", "method", "run", "Service.run", "src/service.ts");
        let response = matcher_response("Service.run", serde_json::json!({
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
        }));

        assert_eq!(response["decisions"][0]["targetNodeId"], "method-run");
        assert_eq!(response["decisions"][0]["resolvedBy"], "qualified-name");
    }

    #[test]
    fn rust_name_matcher_resolves_function_member_candidate_facts() {
        let class_node = node_json("class-service", "class", "Service", "Service", "src/service.ts");
        let method_node = node_json("function-run", "function", "run", "Service.run", "src/service.ts");
        let response = matcher_response("Service.run", serde_json::json!({
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
        }));

        assert_eq!(response["decisions"][0]["targetNodeId"], "function-run");
        assert_eq!(response["decisions"][0]["resolvedBy"], "qualified-name");
    }

    #[test]
    fn rust_name_matcher_reports_decision_oriented_fallback_reason() {
        let response = matcher_response("missing", serde_json::json!({
            "byName": [],
            "byQualifiedName": [],
            "byLeafName": [],
            "byLowerName": [],
            "byFileName": [],
            "classCandidates": [],
            "capitalizedClassCandidates": [],
            "methodCandidates": [],
            "nodesInFiles": {}
        }));

        assert_eq!(response["decisions"][0]["fallbackReason"], "missing-candidate-facts");
        assert_eq!(response["diagnostics"]["rustMatcherFallbackReasons"]["missing-candidate-facts"], 1);
        assert!(response["diagnostics"]["rustMatcherFallbackReasons"]["unresolved"].is_null());
    }

    #[test]
    fn rust_name_matcher_reports_fallback_for_unhandled_reference() {
        let response = matcher_response("missing", serde_json::json!({
            "byName": [],
            "byQualifiedName": [],
            "byLeafName": [],
            "byLowerName": [],
            "byFileName": [],
            "classCandidates": [],
            "capitalizedClassCandidates": [],
            "methodCandidates": [],
            "nodesInFiles": {}
        }));

        assert_eq!(response["decisions"][0]["targetNodeId"], serde_json::Value::Null);
        assert_eq!(response["decisions"][0]["fallbackReason"], "missing-candidate-facts");
        assert_eq!(response["diagnostics"]["rustMatcherFallbackReasons"]["missing-candidate-facts"], 1);
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
        };

        let result = run_index(&request);

        assert!(result.success, "{:?}", result.errors);
        {
            let conn = Connection::open(&request.index_path).unwrap();
            let count_kind = |kind: &str| -> i64 {
                conn.query_row("SELECT COUNT(*) FROM nodes WHERE kind = ?1", params![kind], |row| row.get(0))
                    .unwrap()
            };
            let ref_count = conn
                .query_row("SELECT COUNT(*) FROM unresolved_refs", [], |row| row.get::<_, i64>(0))
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
        };

        let result = run_index(&request);

        assert!(result.success, "{:?}", result.errors);
        assert_eq!(result.files_errored, 0, "{:?}", result.errors);
        fs::remove_dir_all(dir).unwrap();
    }
}
