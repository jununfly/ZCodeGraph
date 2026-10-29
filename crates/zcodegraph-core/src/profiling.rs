#[cfg(feature = "dhat")]
use std::fs;
#[cfg(feature = "dhat")]
use std::path::Path;

#[cfg(any(feature = "dhat", test))]
pub fn validate_experiment_id(value: &str) -> Result<String, String> {
    if value.is_empty()
        || value.len() > 128
        || value.starts_with('-')
        || value.starts_with('.')
        || !value.chars().all(|c| c.is_ascii_alphanumeric() || c == '-' || c == '_')
    {
        return Err(
            "ZCG_EXPERIMENT_ID must be 1-128 ASCII letters, digits, '-' or '_' and must not start with '-' or '.'".to_string(),
        );
    }
    Ok(value.to_string())
}

fn validate_profiling_mode(value: &str) -> Result<(), String> {
    if value.trim() == "heap" {
        Ok(())
    } else {
        Err(format!(
            "unsupported profiling mode: {}. Supported modes: heap",
            value
        ))
    }
}

#[cfg(feature = "dhat")]
pub type HeapProfilerGuard = dhat::Profiler;

#[cfg(not(feature = "dhat"))]
pub type HeapProfilerGuard = ();

#[cfg(feature = "dhat")]
pub fn start_heap_profiler(project_path: &str) -> Result<Option<HeapProfilerGuard>, String> {
    match std::env::var("ZCG_PROFILING") {
        Ok(value) if value.trim() == "heap" => {
            let experiment_id = validate_experiment_id(
                &std::env::var("ZCG_EXPERIMENT_ID").unwrap_or_else(|_| "manual".to_string()),
            )?;
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
        Ok(value) => validate_profiling_mode(&value).map(|_| None),
        Err(std::env::VarError::NotPresent) => Ok(None),
        Err(err) => Err(format!("failed to read ZCG_PROFILING: {}", err)),
    }
}

#[cfg(not(feature = "dhat"))]
pub fn start_heap_profiler(_project_path: &str) -> Result<Option<HeapProfilerGuard>, String> {
    match std::env::var("ZCG_PROFILING") {
        Ok(value) if value.trim() == "heap" => {
            Err("heap profiling requires building zcodegraph-core with --features dhat".to_string())
        }
        Ok(value) => validate_profiling_mode(&value).map(|_| None),
        Err(std::env::VarError::NotPresent) => Ok(None),
        Err(err) => Err(format!("failed to read ZCG_PROFILING: {}", err)),
    }
}

#[cfg(test)]
mod tests {
    use super::{validate_experiment_id, validate_profiling_mode};

    #[test]
    fn validates_profiling_mode_without_silently_ignoring_empty_values() {
        for value in ["heap", " heap ", "HEAP"] {
            if value == "HEAP" {
                assert!(validate_profiling_mode(value).is_err());
            } else {
                assert!(validate_profiling_mode(value).is_ok());
            }
        }
        for value in ["", "   ", "cpu", "yes"] {
            assert!(validate_profiling_mode(value).is_err(), "accepted {value:?}");
        }
    }

    #[test]
    fn accepts_safe_experiment_ids() {
        for value in ["manual", "baseline-01", "Candidate_Protocol", "a"] {
            assert_eq!(validate_experiment_id(value).as_deref(), Ok(value));
        }
        assert!(validate_experiment_id(&"a".repeat(128)).is_ok());
    }

    #[test]
    fn rejects_empty_long_and_path_traversal_ids() {
        for value in [
            "", "../escape", "..\\escape", "nested/report", "nested\\report",
            ".", "-baseline", "white space", "report.json", "非ASCII",
        ] {
            assert!(validate_experiment_id(value).is_err(), "accepted {value:?}");
        }
        assert!(validate_experiment_id(&"a".repeat(129)).is_err());
    }
}
