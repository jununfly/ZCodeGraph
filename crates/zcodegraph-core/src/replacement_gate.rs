use std::fs::{File, OpenOptions};
use std::io;
use std::path::{Path, PathBuf};
use std::thread;
use std::time::{Duration, Instant};

/// A stable-file, OS-backed reader/writer gate. No PID or timestamp is used
/// to decide ownership; closing the handle releases the lease through the OS.
#[derive(Debug)]
pub struct OsFileLease {
    _file: File,
}

struct GatePaths {
    intent: PathBuf,
    lease: PathBuf,
}

fn gate_paths(project_path: &Path) -> io::Result<GatePaths> {
    let project = project_path.canonicalize()?;
    if !project.is_dir() {
        return Err(io::Error::new(
            io::ErrorKind::InvalidInput,
            "project path is not a directory",
        ));
    }
    let store = project.join(".zcodegraph");
    let canonical_store = store.canonicalize()?;
    if canonical_store.parent() != Some(project.as_path()) || !canonical_store.is_dir() {
        return Err(io::Error::new(
            io::ErrorKind::InvalidInput,
            "invalid .zcodegraph store",
        ));
    }
    Ok(GatePaths {
        intent: canonical_store.join("embedding-replacement.intent.lock"),
        lease: canonical_store.join("embedding-replacement.lease.lock"),
    })
}

fn open_stable_file(path: &Path) -> io::Result<File> {
    if path
        .symlink_metadata()
        .is_ok_and(|metadata| !metadata.file_type().is_file())
    {
        return Err(io::Error::new(
            io::ErrorKind::InvalidInput,
            "gate path is not a regular file",
        ));
    }
    let file = OpenOptions::new()
        .read(true)
        .write(true)
        .create(true)
        .open(path)?;
    if file.metadata()?.len() == 0 {
        file.set_len(1)?;
    }
    if !file.metadata()?.file_type().is_file() {
        return Err(io::Error::new(
            io::ErrorKind::InvalidInput,
            "gate path is not a regular file",
        ));
    }
    Ok(file)
}

#[cfg(unix)]
fn try_lock(file: &File, exclusive: bool) -> io::Result<()> {
    use std::os::fd::AsRawFd;
    let operation = if exclusive {
        libc::LOCK_EX
    } else {
        libc::LOCK_SH
    } | libc::LOCK_NB;
    if unsafe { libc::flock(file.as_raw_fd(), operation) } == 0 {
        Ok(())
    } else {
        Err(io::Error::last_os_error())
    }
}

#[cfg(windows)]
fn try_lock(file: &File, exclusive: bool) -> io::Result<()> {
    let result = if exclusive {
        fs2::FileExt::try_lock_exclusive(file)
    } else {
        fs2::FileExt::try_lock_shared(file)
    };
    result.map_err(|error| {
        if matches!(error.raw_os_error(), Some(32 | 33)) {
            io::Error::new(io::ErrorKind::WouldBlock, error)
        } else {
            error
        }
    })
}

#[cfg(not(any(unix, windows)))]
fn try_lock(_file: &File, _exclusive: bool) -> io::Result<()> {
    Err(io::Error::new(
        io::ErrorKind::Unsupported,
        "no OS replacement gate adapter",
    ))
}

fn acquire(path: &Path, exclusive: bool, wait_ms: u64) -> io::Result<OsFileLease> {
    let file = open_stable_file(path)?;
    let deadline = Instant::now() + Duration::from_millis(wait_ms);
    loop {
        match try_lock(&file, exclusive) {
            Ok(()) => return Ok(OsFileLease { _file: file }),
            Err(error)
                if error.kind() == io::ErrorKind::WouldBlock && Instant::now() < deadline =>
            {
                thread::sleep(Duration::from_millis(10));
            }
            Err(error) => return Err(error),
        }
    }
}

/// The turnstile prevents new workers once replacement owns it. The shared
/// lease then remains held until the worker process or its parent releases it.
pub fn acquire_worker_lease(project_path: &Path, wait_ms: u64) -> io::Result<OsFileLease> {
    let paths = gate_paths(project_path)?;
    let intent = acquire(&paths.intent, false, wait_ms)?;
    let lease = acquire(&paths.lease, false, wait_ms)?;
    drop(intent);
    Ok(lease)
}

/// Acquire in one order only: exclusive turnstile, then exclusive worker lease.
/// The turnstile stays held while waiting so later workers cannot barge in.
pub fn acquire_replacement_gate(
    project_path: &Path,
    wait_ms: u64,
) -> io::Result<(OsFileLease, OsFileLease)> {
    let paths = gate_paths(project_path)?;
    let intent = acquire(&paths.intent, true, wait_ms)?;
    let lease = acquire(&paths.lease, true, wait_ms)?;
    Ok((intent, lease))
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::fs;

    #[test]
    fn exclusive_lock_blocks_another_shared_handle() {
        let root = std::env::temp_dir().join(format!("zcg-native-lock-{}", std::process::id()));
        fs::create_dir_all(&root).unwrap();
        let path = root.join("probe.lock");
        let first = open_stable_file(&path).unwrap();
        let second = open_stable_file(&path).unwrap();
        fs2::FileExt::lock_exclusive(&first).unwrap();
        assert!(fs2::FileExt::try_lock_shared(&second).is_err());
        fs2::FileExt::unlock(&first).unwrap();
        fs::remove_dir_all(root).unwrap();
    }

    #[test]
    fn idle_shared_lease_blocks_exclusive_replacement_until_drop() {
        let root = std::env::temp_dir().join(format!("zcg-gate-{}", std::process::id()));
        let store = root.join(".zcodegraph");
        fs::create_dir_all(&store).unwrap();
        let worker = acquire_worker_lease(&root, 0).unwrap();
        assert_eq!(
            acquire_replacement_gate(&root, 0).unwrap_err().kind(),
            io::ErrorKind::WouldBlock
        );
        drop(worker);
        let replacement = acquire_replacement_gate(&root, 0).unwrap();
        assert!(acquire_worker_lease(&root, 0).is_err());
        drop(replacement);
        fs::remove_dir_all(root).unwrap();
    }
}
