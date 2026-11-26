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
    pub java_finalization: Option<JavaFinalizationIdentity>,
    #[cfg(feature = "test-fault-injection")]
    pub test_post_commit_fts_rebuild_failure: bool,
}

impl IndexRequest {
    /** Shared by the real native worker and its native scripted test adapter. */
    pub fn from_index_args(
        args: Vec<String>,
        borrowed_replacement_gate: bool,
    ) -> Result<Self, String> {
        if args.first().map(String::as_str) != Some("index") {
            return Err("expected command: index".to_string());
        }
        let mut project_path: Option<String> = None;
        let mut index_path: Option<String> = None;
        let mut engine: Option<String> = None;
        let mut force = false;
        let mut verbose = false;
        let mut graph_work_profile = GraphWorkProfile::Full;
        let mut sqlite_write_mode = SqliteWriteMode::FinalFlush;
        let mut parse_walker_diagnostics = false;
        let mut java_finalization_run: Option<String> = None;
        let mut java_finalization_pass: Option<String> = None;
        #[cfg(feature = "test-fault-injection")]
        let mut test_post_commit_fts_rebuild_failure = false;
        let mut i = 1;
        while i < args.len() {
            match args[i].as_str() {
                "--project-path" => {
                    i += 1;
                    project_path = args.get(i).cloned();
                    if project_path.is_none() {
                        return Err("--project-path requires a value".to_string());
                    }
                }
                "--engine" => {
                    i += 1;
                    engine = args.get(i).cloned();
                    if engine.is_none() {
                        return Err("--engine requires a value".to_string());
                    }
                    if engine.as_deref() != Some("rust") {
                        return Err("--engine must be rust".to_string());
                    }
                }
                "--index-path" => {
                    i += 1;
                    index_path = args.get(i).cloned();
                    if index_path.is_none() {
                        return Err("--index-path requires a value".to_string());
                    }
                }
                "--force" => force = true,
                "--replacement-gate-externally-held" => {}
                #[cfg(feature = "test-fault-injection")]
                "--test-post-commit-fts-rebuild-failure" => {
                    test_post_commit_fts_rebuild_failure = true;
                }
                "--verbose" => verbose = true,
                "--parse-walker-diagnostics" => parse_walker_diagnostics = true,
                "--java-finalization-run" => {
                    i += 1;
                    java_finalization_run = args.get(i).cloned();
                    if java_finalization_run.as_deref().is_none_or(str::is_empty) {
                        return Err("--java-finalization-run requires a non-empty value".to_string());
                    }
                }
                "--java-finalization-pass" => {
                    i += 1;
                    java_finalization_pass = args.get(i).cloned();
                    if java_finalization_pass.as_deref().is_none_or(str::is_empty) {
                        return Err("--java-finalization-pass requires a non-empty value".to_string());
                    }
                }
                "--graph-work-profile" => {
                    i += 1;
                    let Some(raw_profile) = args.get(i) else {
                        return Err("--graph-work-profile requires a value".to_string());
                    };
                    graph_work_profile = GraphWorkProfile::parse(raw_profile)?;
                }
                "--sqlite-write-mode" => {
                    i += 1;
                    let Some(raw_mode) = args.get(i) else {
                        return Err("--sqlite-write-mode requires a value".to_string());
                    };
                    sqlite_write_mode = SqliteWriteMode::parse(raw_mode)?;
                }
                other => return Err(format!("unknown argument: {}", other)),
            }
            i += 1;
        }
        #[cfg(feature = "test-fault-injection")]
        if test_post_commit_fts_rebuild_failure && !borrowed_replacement_gate {
            return Err(
                "post-COMMIT test injection requires an externally held replacement gate".into(),
            );
        }
        Ok(IndexRequest {
            engine: engine.unwrap_or_else(|| "rust".to_string()),
            project_path: project_path.ok_or_else(|| "--project-path is required".to_string())?,
            index_path: index_path.ok_or_else(|| "--index-path is required".to_string())?,
            force,
            verbose,
            graph_work_profile,
            sqlite_write_mode,
            parse_walker_diagnostics,
            java_finalization: match (java_finalization_run, java_finalization_pass) {
                (Some(run_id), Some(pass_id)) if borrowed_replacement_gate => {
                    Some(JavaFinalizationIdentity { run_id, pass_id })
                }
                (None, None) => None,
                _ => return Err(
                    "Java finalization requires both run/pass values and an externally held replacement gate"
                        .to_string(),
                ),
            },
            #[cfg(feature = "test-fault-injection")]
            test_post_commit_fts_rebuild_failure,
        })
    }
}

#[derive(Debug, Clone, PartialEq, Eq)]
pub struct JavaFinalizationIdentity {
    pub run_id: String,
    pub pass_id: String,
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

    pub(crate) fn features(self) -> GraphWorkFeatures {
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
pub(crate) struct GraphWorkFeatures {
    pub(crate) component_detection: bool,
    pub(crate) constant_extraction: bool,
    pub(crate) field_extraction: bool,
    pub(crate) export_extraction: bool,
    pub(crate) aggressive_call_extraction: bool,
}
