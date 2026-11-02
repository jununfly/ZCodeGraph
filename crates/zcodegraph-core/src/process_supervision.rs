//! OS-enforced lifetime for a borrowed native writer and its descendants.
//! The parent owns the replacement lease; this module owns only process lifetime.

use std::io::{self, Read};
use std::process::{Child, Command, ExitStatus};
use std::time::Duration;

#[cfg(windows)]
struct WindowsJob(windows_sys::Win32::Foundation::HANDLE);

#[cfg(windows)]
impl WindowsJob {
    fn new() -> io::Result<Self> {
        use windows_sys::Win32::System::JobObjects::{
            CreateJobObjectW, JobObjectExtendedLimitInformation, SetInformationJobObject,
            JOBOBJECT_EXTENDED_LIMIT_INFORMATION, JOB_OBJECT_LIMIT_KILL_ON_JOB_CLOSE,
        };
        let handle = unsafe { CreateJobObjectW(std::ptr::null(), std::ptr::null()) };
        if handle.is_null() {
            return Err(io::Error::last_os_error());
        }
        let mut info: JOBOBJECT_EXTENDED_LIMIT_INFORMATION = unsafe { std::mem::zeroed() };
        info.BasicLimitInformation.LimitFlags = JOB_OBJECT_LIMIT_KILL_ON_JOB_CLOSE;
        let ok = unsafe {
            SetInformationJobObject(
                handle,
                JobObjectExtendedLimitInformation,
                &info as *const _ as *const _,
                std::mem::size_of::<JOBOBJECT_EXTENDED_LIMIT_INFORMATION>() as u32,
            )
        };
        if ok == 0 {
            let error = io::Error::last_os_error();
            unsafe {
                windows_sys::Win32::Foundation::CloseHandle(handle);
            }
            return Err(error);
        }
        Ok(Self(handle))
    }

    fn assign(&self, process: windows_sys::Win32::Foundation::HANDLE) -> io::Result<()> {
        let ok = unsafe {
            windows_sys::Win32::System::JobObjects::AssignProcessToJobObject(self.0, process)
        };
        if ok == 0 {
            Err(io::Error::last_os_error())
        } else {
            Ok(())
        }
    }
}

#[cfg(windows)]
impl Drop for WindowsJob {
    fn drop(&mut self) {
        // KILL_ON_JOB_CLOSE also terminates descendants assigned to this Job.
        unsafe {
            windows_sys::Win32::Foundation::CloseHandle(self.0);
        }
    }
}

pub struct SupervisedChild {
    child: Child,
    #[cfg(windows)]
    job: Option<WindowsJob>,
}

impl SupervisedChild {
    fn terminate_descendants(&mut self) {
        #[cfg(unix)]
        unsafe {
            // The child is its own process-group leader, so this does not
            // include the supervisor or the parent that owns the lease.
            libc::kill(-(self.child.id() as i32), libc::SIGKILL);
        }
        #[cfg(windows)]
        {
            // Closing the last supervisor handle kills the entire Job, not just
            // its direct child. Native helpers never inherit this handle.
            self.job.take();
        }
    }

    pub fn try_wait(&mut self) -> io::Result<Option<ExitStatus>> {
        let status = self.child.try_wait()?;
        if status.is_some() {
            // A writer that returns while leaving a live descendant is not a
            // completed operation. Reap its group/Job before releasing the gate.
            self.terminate_descendants();
        }
        Ok(status)
    }

    pub fn kill_and_wait(&mut self) {
        self.terminate_descendants();
        let _ = self.child.kill();
        let _ = self.child.wait();
    }
}

impl Drop for SupervisedChild {
    fn drop(&mut self) {
        self.kill_and_wait();
    }
}

#[cfg(windows)]
fn resume_child_threads(process_id: u32) -> io::Result<()> {
    use windows_sys::Win32::Foundation::{CloseHandle, INVALID_HANDLE_VALUE};
    use windows_sys::Win32::System::Diagnostics::ToolHelp::{
        CreateToolhelp32Snapshot, Thread32First, Thread32Next, TH32CS_SNAPTHREAD, THREADENTRY32,
    };
    use windows_sys::Win32::System::Threading::{OpenThread, ResumeThread, THREAD_SUSPEND_RESUME};
    let snapshot = unsafe { CreateToolhelp32Snapshot(TH32CS_SNAPTHREAD, 0) };
    if snapshot == INVALID_HANDLE_VALUE {
        return Err(io::Error::last_os_error());
    }
    let mut entry: THREADENTRY32 = unsafe { std::mem::zeroed() };
    entry.dwSize = std::mem::size_of::<THREADENTRY32>() as u32;
    let mut found = false;
    let mut result = Ok(());
    if unsafe { Thread32First(snapshot, &mut entry) } != 0 {
        loop {
            if entry.th32OwnerProcessID == process_id {
                found = true;
                let thread = unsafe { OpenThread(THREAD_SUSPEND_RESUME, 0, entry.th32ThreadID) };
                if thread.is_null() {
                    result = Err(io::Error::last_os_error());
                    break;
                }
                let resumed = unsafe { ResumeThread(thread) };
                unsafe {
                    CloseHandle(thread);
                }
                if resumed == u32::MAX {
                    result = Err(io::Error::last_os_error());
                    break;
                }
            }
            if unsafe { Thread32Next(snapshot, &mut entry) } == 0 {
                break;
            }
        }
    } else {
        result = Err(io::Error::last_os_error());
    }
    unsafe {
        CloseHandle(snapshot);
    }
    if found {
        result
    } else {
        Err(io::Error::other("native writer has no startable thread"))
    }
}

/// Start a writer only after the OS can enforce its descendants' lifetime.
/// Any unsupported/failing platform step fails before writer code can execute.
pub fn spawn_supervised(command: &mut Command) -> io::Result<SupervisedChild> {
    #[cfg(unix)]
    {
        use std::os::unix::process::CommandExt;
        command.process_group(0);
    }
    #[cfg(windows)]
    let job = WindowsJob::new()?;
    #[cfg(windows)]
    {
        use std::os::windows::process::CommandExt;
        use windows_sys::Win32::System::Threading::CREATE_SUSPENDED;
        command.creation_flags(CREATE_SUSPENDED);
    }
    let mut child = command.spawn()?;
    #[cfg(windows)]
    {
        use std::os::windows::io::AsRawHandle;
        let handle = child.as_raw_handle() as windows_sys::Win32::Foundation::HANDLE;
        if let Err(error) = job
            .assign(handle)
            .and_then(|_| resume_child_threads(child.id()))
        {
            let _ = child.kill();
            let _ = child.wait();
            return Err(error);
        }
    }
    Ok(SupervisedChild {
        child,
        #[cfg(windows)]
        job: Some(job),
    })
}

/// Wait for either normal writer completion or supervision-channel EOF.
/// EOF has no graceful fallback: it kills the writer's entire OS boundary.
pub fn wait_for_supervision(child: &mut SupervisedChild) -> io::Result<ExitStatus> {
    let (channel_tx, channel_rx) = std::sync::mpsc::channel();
    std::thread::spawn(move || {
        let mut stdin = io::stdin();
        let mut byte = [0_u8; 1];
        loop {
            match stdin.read(&mut byte) {
                Ok(0) | Err(_) => {
                    let _ = channel_tx.send(());
                    return;
                }
                Ok(_) => {}
            }
        }
    });
    loop {
        if let Some(status) = child.try_wait()? {
            return Ok(status);
        }
        if channel_rx.try_recv().is_ok() {
            child.kill_and_wait();
            return Err(io::Error::new(
                io::ErrorKind::Interrupted,
                "native writer supervision channel closed",
            ));
        }
        std::thread::sleep(Duration::from_millis(5));
    }
}
