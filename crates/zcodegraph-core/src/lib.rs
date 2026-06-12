use rusqlite::{params, Connection};
use std::fs;
use std::io;
use std::path::{Path, PathBuf};
use std::time::{Duration, Instant, SystemTime};

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

    if let Err(err) = write_minimal_index(request) {
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

    IndexResult {
        success: true,
        files_indexed: 0,
        files_skipped: 0,
        files_errored: 0,
        nodes_created: 0,
        edges_created: 0,
        duration_ms: started.elapsed().as_millis(),
        errors: Vec::new(),
    }
}

pub fn write_minimal_index(request: &IndexRequest) -> Result<(), Box<dyn std::error::Error>> {
    let index_path = Path::new(&request.index_path);
    if let Some(parent) = index_path.parent() {
        fs::create_dir_all(parent)?;
    }

    let lock_path = Path::new(&request.project_path)
        .join(".zcodegraph")
        .join("zcodegraph.lock");
    let _lock = ProjectLock::acquire(&lock_path)?;

    let temp_path = temp_index_path(index_path);
    if temp_path.exists() {
        fs::remove_file(&temp_path)?;
    }

    let write_result = (|| -> Result<(), Box<dyn std::error::Error>> {
        {
            let conn = Connection::open(&temp_path)?;
            conn.pragma_update(None, "journal_mode", "WAL")?;
            conn.pragma_update(None, "foreign_keys", "ON")?;
            conn.execute_batch(SCHEMA_SQL)?;
            stamp_schema_version(&conn)?;
            stamp_metadata(&conn)?;
        }

        replace_active_index(&temp_path, index_path)?;
        cleanup_sqlite_sidecars(&temp_path);
        Ok(())
    })();

    if write_result.is_err() {
        cleanup_sqlite_sidecars(&temp_path);
        let _ = fs::remove_file(&temp_path);
    }

    write_result
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
    set_metadata(conn, "indexed_with_engine_version", env!("CARGO_PKG_VERSION"))?;
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

        match fs::OpenOptions::new().write(true).create_new(true).open(path) {
            Ok(mut file) => {
                use std::io::Write;
                write!(file, "{}", std::process::id())?;
                Ok(Self {
                    path: path.to_path_buf(),
                })
            }
            Err(err) if err.kind() == io::ErrorKind::AlreadyExists => Err(io::Error::new(
                io::ErrorKind::AlreadyExists,
                format!(
                    "CodeGraph database is locked by another process. If this is stale, delete {}",
                    path.display()
                ),
            )),
            Err(err) => Err(err),
        }
    }
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
