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
