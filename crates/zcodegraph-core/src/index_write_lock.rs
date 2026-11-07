//! OS-backed stable rendezvous lock for the index-write path (ADR-0011 §1/§3).
//!
//! Stage 1 of the P1 implementation program: an additive, independently
//! testable lock-policy module. It is **not wired into** `ProjectLock` or the
//! TypeScript `FileLock` yet, does not change any shipped behavior, and must
//! not be read as evidence that ADR-0011 is implemented. Wiring requires the
//! cross-language native Adapter decision and all 8 Required verification
//! items; see the 2026-11-07 governance backlog entry.
//!
//! Design rules taken verbatim from ADR-0011 §1:
//! - `.zcodegraph/zcodegraph.lock` is a stable rendezvous file, never a mutex
//!   whose existence is deleted on release.
//! - Mutual exclusion comes from a non-blocking exclusive OS lock on the
//!   acquired handle. PID/timestamp/ownerToken metadata is diagnostic only.
//! - Release unlocks and closes that same handle. No unlink, rename, or
//!   replacement of the directory entry while a handle is held.
//! - Path validation rejects symlinks, directories, and store paths that
//!   escape the real project directory. Unsupported Adapters fail closed
//!   before any write.
//!
//! Pinned platform conformance finding (Windows, 2026-11-07): `fs2`'s
//! exclusive `LockFileEx` locks the whole file, so while a lease is held a
//! second handle cannot even read the rendezvous file (ERROR_LOCK_VIOLATION).
//! ADR-0011 §4 asks `unlock` to report diagnostics for an active writer; that
//! cannot be implemented by reading this file. The shared Adapter decision
//! must reserve a separate diagnostic channel or a dedicated byte range.

// Stage 1 is deliberately unwired: the module and its tests are the reviewable
// unit, while cross-language wiring waits for the Adapter decision.
#![allow(dead_code)]

use std::fs::{self, File, OpenOptions};
use std::io::{self, Seek, SeekFrom, Write};
use std::path::{Path, PathBuf};
use std::time::{SystemTime, UNIX_EPOCH};

use crate::replacement_gate::{try_lock, try_unlock};

pub const RENDEZVOUS_FILE: &str = "zcodegraph.lock";

const PROTOCOL_VERSION: u32 = 1;
const MAX_METADATA_BYTES: usize = 512;

/// Diagnosis outcome for `unlock` (ADR-0011 §4 behavior matrix). This is
/// intentionally not an authorization result: no state here permits bypassing
/// the OS lock.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum RendezvousState {
    NotLocked,
    ActiveWriter,
    InvalidRendezvous,
    UnsupportedAdapter,
    Unknown,
}

impl RendezvousState {
    /// Stable, non-sensitive token for the `unlock` CLI diagnosis (ADR-0011 §4).
    pub fn as_str(self) -> &'static str {
        match self {
            Self::NotLocked => "not-locked",
            Self::ActiveWriter => "active-writer",
            Self::InvalidRendezvous => "invalid-rendezvous",
            Self::UnsupportedAdapter => "unsupported-adapter",
            Self::Unknown => "unknown",
        }
    }
}

/// An acquired OS lock on the stable rendezvous file. Dropping the value
/// releases the lock through the OS; the file itself is never removed.
#[derive(Debug)]
pub struct IndexWriteLease {
    file: File,
    #[allow(dead_code)]
    path: PathBuf,
    released: bool,
}

fn invalid(message: &str) -> io::Error {
    io::Error::new(io::ErrorKind::InvalidInput, message)
}

fn metadata_written_now() -> io::Result<String> {
    let acquired_at = SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .unwrap_or_default()
        .as_millis();
    let metadata = format!(
        "{{\"protocol\":{},\"pid\":{},\"acquiredAt\":{}}}",
        PROTOCOL_VERSION,
        std::process::id(),
        acquired_at
    );
    if metadata.len() > MAX_METADATA_BYTES {
        return Err(io::Error::new(
            io::ErrorKind::InvalidData,
            "rendezvous metadata exceeds its bounded size",
        ));
    }
    Ok(metadata)
}

/// Resolve and validate the rendezvous path without following a symlink at the
/// store or file level, and without accepting a directory or an escaped store.
fn validated_rendezvous_path(project_path: &Path) -> io::Result<PathBuf> {
    let project = project_path
        .canonicalize()
        .map_err(|error| invalid(&format!("project path cannot be resolved: {error}")))?;
    if !project.is_dir() {
        return Err(invalid("project path is not a directory"));
    }

    let store = project.join(".zcodegraph");
    let store_meta = fs::symlink_metadata(&store)
        .map_err(|error| invalid(&format!(".zcodegraph store is unavailable: {error}")))?;
    if store_meta.file_type().is_symlink() || !store_meta.is_dir() {
        return Err(invalid(".zcodegraph must be a real directory, not a link or file"));
    }
    let canonical_store = store
        .canonicalize()
        .map_err(|error| invalid(&format!(".zcodegraph cannot be resolved: {error}")))?;
    if canonical_store.parent() != Some(project.as_path()) || !canonical_store.is_dir() {
        return Err(invalid(".zcodegraph escapes the real project directory"));
    }

    let rendezvous = canonical_store.join(RENDEZVOUS_FILE);
    if let Ok(meta) = fs::symlink_metadata(&rendezvous) {
        if meta.file_type().is_symlink() || !meta.file_type().is_file() {
            return Err(invalid("rendezvous path is not a regular file"));
        }
    }
    Ok(rendezvous)
}

/// Open the real regular file with a handle that can carry an OS lock. Creation
/// is allowed, replacement is not. Windows `LockFileEx` requires a non-empty
/// file, so a brand new rendezvous is grown to one byte before locking.
fn open_rendezvous(path: &Path) -> io::Result<File> {
    let file = OpenOptions::new()
        .read(true)
        .write(true)
        .create(true)
        .open(path)?;
    let meta = file.metadata()?;
    if !meta.file_type().is_file() {
        return Err(invalid("rendezvous path is not a regular file"));
    }
    if meta.len() == 0 {
        file.set_len(1)?;
    }
    Ok(file)
}

/// Bounded metadata is rewritten in place through the already-locked handle.
/// It never unlinks, renames over, or replaces the rendezvous directory entry.
fn write_metadata_in_place(file: &mut File) -> io::Result<()> {
    let metadata = metadata_written_now()?;
    file.seek(SeekFrom::Start(0))?;
    file.write_all(metadata.as_bytes())?;
    file.set_len(metadata.len() as u64)?;
    file.flush()
}

impl IndexWriteLease {
    /// Acquire the exclusive OS lock before any write. On `WouldBlock` or an
    /// unsupported Adapter this fails closed; there is no PID/stale fallback
    /// and no unlocked write path.
    pub fn acquire(project_path: &Path) -> io::Result<Self> {
        let path = validated_rendezvous_path(project_path)?;
        let mut file = open_rendezvous(&path)?;
        try_lock(&file, true)?;
        if let Err(error) = write_metadata_in_place(&mut file) {
            let _ = try_unlock(&file);
            return Err(error);
        }
        Ok(Self {
            file,
            path,
            released: false,
        })
    }

    /// Explicit release surfaces unlock errors (Required verification item 5).
    /// The rendezvous file is left in place.
    pub fn release(mut self) -> io::Result<()> {
        let result = try_unlock(&self.file);
        if result.is_ok() {
            self.released = true;
        }
        result
    }

    /// Inspect-only diagnosis for `unlock`. It never deletes the file and
    /// never reports `NotLocked` while another process holds the OS lock.
    pub fn diagnose(project_path: &Path) -> RendezvousState {
        let path = match validated_rendezvous_path(project_path) {
            Ok(path) => path,
            Err(_) => return RendezvousState::InvalidRendezvous,
        };
        let file = match open_rendezvous(&path) {
            Ok(file) => file,
            Err(_) => return RendezvousState::Unknown,
        };
        match try_lock(&file, true) {
            Ok(()) => {
                let _ = try_unlock(&file);
                RendezvousState::NotLocked
            }
            Err(error) if error.kind() == io::ErrorKind::WouldBlock => {
                RendezvousState::ActiveWriter
            }
            Err(error) if error.kind() == io::ErrorKind::Unsupported => {
                RendezvousState::UnsupportedAdapter
            }
            Err(_) => RendezvousState::Unknown,
        }
    }
}

impl Drop for IndexWriteLease {
    fn drop(&mut self) {
        if !self.released {
            // Abnormal termination is handled by OS handle cleanup on close.
            // Best-effort explicit unlock first; errors cannot be propagated
            // from Drop and must never turn into a file deletion.
            let _ = try_unlock(&self.file);
        }
        // Deliberately no fs::remove_file. Normal release leaves the stable
        // rendezvous file in place by design (ADR-0011 §1 / item 5).
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::sync::atomic::{AtomicU64, Ordering};

    static COUNTER: AtomicU64 = AtomicU64::new(0);

    fn fixture() -> PathBuf {
        let dir = std::env::temp_dir().join(format!(
            "zcg-index-write-lock-{}-{}",
            std::process::id(),
            COUNTER.fetch_add(1, Ordering::Relaxed)
        ));
        fs::create_dir_all(dir.join(".zcodegraph")).unwrap();
        dir
    }

    fn cleanup(dir: &Path) {
        let _ = fs::remove_dir_all(dir);
    }

    #[test]
    fn exclusive_lock_blocks_a_second_writer_without_deleting_the_file() {
        let dir = fixture();
        let first = IndexWriteLease::acquire(&dir).unwrap();
        let rendezvous = dir.join(".zcodegraph").join(RENDEZVOUS_FILE);
        assert!(rendezvous.is_file());

        let second = IndexWriteLease::acquire(&dir);
        assert!(
            matches!(
                second.as_ref().err().map(|error| error.kind()),
                Some(io::ErrorKind::WouldBlock)
            ),
            "second writer must fail closed while the OS lock is held"
        );

        drop(first);
        assert!(rendezvous.is_file(), "release must never unlink the rendezvous");
        assert!(IndexWriteLease::acquire(&dir).is_ok());
        cleanup(&dir);
    }

    #[test]
    fn normal_release_leaves_stable_file_and_repeated_acquire_works() {
        let dir = fixture();
        let rendezvous = dir.join(".zcodegraph").join(RENDEZVOUS_FILE);
        for _ in 0..3 {
            let lease = IndexWriteLease::acquire(&dir).unwrap();
            lease.release().unwrap();
            assert!(rendezvous.is_file());
        }
        cleanup(&dir);
    }

    #[test]
    fn malformed_legacy_metadata_is_repaired_in_place_not_bypassed() {
        let dir = fixture();
        let rendezvous = dir.join(".zcodegraph").join(RENDEZVOUS_FILE);
        fs::write(&rendezvous, b"99999999\nlegacy garbage").unwrap();
        let lease = IndexWriteLease::acquire(&dir).unwrap();
        // A second handle cannot read while the exclusive OS lock is held on
        // Windows (see the sharing-mode conformance test below), so inspect
        // only after the lease is released.
        lease.release().unwrap();
        let content = fs::read_to_string(&rendezvous).unwrap();
        assert!(content.contains("\"protocol\":1"));
        assert!(!content.contains("legacy garbage"));
        assert!(rendezvous.is_file());
        cleanup(&dir);
    }

    #[cfg(windows)]
    #[test]
    fn windows_exclusive_lease_pins_sharing_mode_semantics() {
        // ADR-0011 §3 requires sharing mode and byte-range length to be
        // pinned in shared conformance tests. fs2's exclusive LockFileEx locks
        // the whole file: while the lease is held, a second handle's read is
        // rejected with ERROR_LOCK_VIOLATION (33). Consequence for §4: an
        // active writer's diagnostics cannot be read back from the rendezvous
        // file itself. The Adapter decision must reserve a separate diagnostic
        // channel or a dedicated byte range instead of assuming readability.
        let dir = fixture();
        let rendezvous = dir.join(".zcodegraph").join(RENDEZVOUS_FILE);
        let lease = IndexWriteLease::acquire(&dir).unwrap();
        assert!(
            fs::read_to_string(&rendezvous).is_err(),
            "whole-file exclusive lock must reject reads from another handle"
        );
        lease.release().unwrap();
        assert!(fs::read_to_string(&rendezvous).is_ok());
        cleanup(&dir);
    }

    #[test]
    fn directory_or_file_store_is_rejected_before_locking() {
        let dir = fixture();
        let store = dir.join(".zcodegraph");
        cleanup(&dir);
        fs::create_dir_all(&dir).unwrap();
        fs::write(&store, b"not a directory").unwrap();
        assert_eq!(
            IndexWriteLease::acquire(&dir).unwrap_err().kind(),
            io::ErrorKind::InvalidInput
        );
        cleanup(&dir);

        let dir2 = fixture();
        let rendezvous = dir2.join(".zcodegraph").join(RENDEZVOUS_FILE);
        fs::create_dir_all(&rendezvous).unwrap();
        assert_eq!(
            IndexWriteLease::acquire(&dir2).unwrap_err().kind(),
            io::ErrorKind::InvalidInput
        );
        cleanup(&dir2);
    }

    #[test]
    fn diagnose_reports_not_locked_then_active_writer() {
        let dir = fixture();
        assert_eq!(
            IndexWriteLease::diagnose(&dir),
            RendezvousState::NotLocked
        );
        let lease = IndexWriteLease::acquire(&dir).unwrap();
        assert_eq!(
            IndexWriteLease::diagnose(&dir),
            RendezvousState::ActiveWriter
        );
        lease.release().unwrap();
        assert_eq!(
            IndexWriteLease::diagnose(&dir),
            RendezvousState::NotLocked
        );
        cleanup(&dir);
    }

    #[cfg(unix)]
    #[test]
    fn symlinked_rendezvous_is_rejected() {
        use std::os::unix::fs::symlink;
        let dir = fixture();
        let store = dir.join(".zcodegraph");
        let target = dir.join("elsewhere.lock");
        fs::write(&target, b"x").unwrap();
        symlink(&target, store.join(RENDEZVOUS_FILE)).unwrap();
        assert_eq!(
            IndexWriteLease::acquire(&dir).unwrap_err().kind(),
            io::ErrorKind::InvalidInput
        );
        cleanup(&dir);
    }
}
