#[cfg(feature = "dhat")]
use std::fs;
#[cfg(feature = "dhat")]
use std::path::Path;

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
