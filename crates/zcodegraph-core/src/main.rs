use std::env;
use std::io::{self, Read};
use std::path::Path;
use std::process;

use zcodegraph_core::{
    candidate_producer_json, error_json, match_name_json, progress_json, result_json, run_index,
    start_heap_profiler, IndexRequest,
};

fn monitor_parent_stdin() {
    std::thread::spawn(|| {
        let mut byte = [0_u8; 1];
        loop {
            match io::stdin().read(&mut byte) {
                Ok(0) | Err(_) => process::exit(4),
                Ok(_) => {}
            }
        }
    });
}

#[cfg(target_os = "linux")]
fn arm_parent_death_signal() {
    // PR_SET_PDEATHSIG is Linux-specific. The process group and channel EOF
    // provide the common supervision boundary on every supported Unix.
    unsafe {
        libc::prctl(libc::PR_SET_PDEATHSIG, libc::SIGKILL);
    }
    if unsafe { libc::getppid() } == 1 {
        process::exit(4);
    }
}

#[cfg(not(target_os = "linux"))]
fn arm_parent_death_signal() {}

fn run_supervised_index(args: Vec<String>) {
    let executable = env::current_exe().unwrap_or_else(|error| {
        eprintln!("cannot locate native index worker: {}", error);
        process::exit(2);
    });
    let mut forwarded = Vec::with_capacity(args.len() + 1);
    if !args
        .iter()
        .any(|arg| arg == "--replacement-gate-externally-held")
    {
        forwarded.push("--replacement-gate-externally-held".to_string());
    }
    forwarded.extend(args);
    let mut command = process::Command::new(executable);
    command.args(forwarded);
    let mut child = zcodegraph_core::process_supervision::spawn_supervised(&mut command)
        .unwrap_or_else(|error| {
            eprintln!("native index process supervision unavailable: {}", error);
            process::exit(2);
        });
    match zcodegraph_core::process_supervision::wait_for_supervision(&mut child) {
        Ok(status) => process::exit(status.code().unwrap_or(1)),
        Err(error) if error.kind() == io::ErrorKind::Interrupted => process::exit(4),
        Err(error) => {
            eprintln!("native index process supervision failed: {}", error);
            process::exit(2);
        }
    }
}

fn main() {
    let args: Vec<String> = env::args().skip(1).collect();
    if args.first().map(String::as_str) == Some("supervised-index") {
        run_supervised_index(args[1..].to_vec());
        return;
    }
    if matches!(
        args.first().map(String::as_str),
        Some("worker-lease" | "replacement-gate")
    ) {
        monitor_parent_stdin();
    }
    if matches!(
        args.first().map(String::as_str),
        Some("worker-lease" | "replacement-gate")
    ) {
        run_replacement_gate_command(&args);
        return;
    }
    if args.first().map(String::as_str) == Some("match-name") {
        let mut input = String::new();
        if let Err(err) = io::stdin().read_to_string(&mut input) {
            eprintln!("{}", error_json(&format!("failed to read stdin: {}", err)));
            process::exit(2);
        }
        match match_name_json(&input) {
            Ok(output) => println!("{}", output),
            Err(message) => {
                eprintln!("{}", error_json(&message));
                process::exit(2);
            }
        }
        return;
    }
    if args.first().map(String::as_str) == Some("produce-candidates") {
        let mut input = String::new();
        if let Err(err) = io::stdin().read_to_string(&mut input) {
            eprintln!("{}", error_json(&format!("failed to read stdin: {}", err)));
            process::exit(2);
        }
        match candidate_producer_json(&input) {
            Ok(output) => println!("{}", output),
            Err(message) => {
                eprintln!("{}", error_json(&message));
                process::exit(2);
            }
        }
        return;
    }

    let borrowed_replacement_gate = args
        .iter()
        .any(|arg| arg == "--replacement-gate-externally-held");
    if borrowed_replacement_gate {
        arm_parent_death_signal();
        monitor_parent_stdin();
    }
    match parse_args(args) {
        Ok(request) => {
            let _heap_profiler = match start_heap_profiler(&request.project_path) {
                Ok(profiler) => profiler,
                Err(message) => {
                    eprintln!("{}", error_json(&message));
                    process::exit(2);
                }
            };
            println!("{}", progress_json("scanning", 0, 1));
            let result = if borrowed_replacement_gate {
                zcodegraph_core::run_index_with_borrowed_gate(&request)
            } else {
                run_index(&request)
            };
            let success = result.success;
            println!("{}", result_json(&result));
            if !success {
                process::exit(1);
            }
        }
        Err(message) => {
            eprintln!("{}", error_json(&message));
            process::exit(2);
        }
    }
}

fn run_replacement_gate_command(args: &[String]) {
    let command = args[0].as_str();
    let mut project_path: Option<String> = None;
    let mut wait_ms = 5_000;
    let mut index = 1;
    while index < args.len() {
        match args[index].as_str() {
            "--project-path" => {
                index += 1;
                project_path = args.get(index).cloned();
            }
            "--wait-ms" => {
                index += 1;
                wait_ms = match args.get(index).and_then(|value| value.parse::<u64>().ok()) {
                    Some(value) => value,
                    None => {
                        eprintln!("invalid --wait-ms");
                        process::exit(2);
                    }
                };
            }
            other => {
                eprintln!("unknown replacement gate argument: {}", other);
                process::exit(2);
            }
        }
        index += 1;
    }
    let Some(project_path) = project_path else {
        eprintln!("--project-path is required");
        process::exit(2);
    };
    let acquired = if command == "worker-lease" {
        zcodegraph_core::acquire_worker_lease(Path::new(&project_path), wait_ms)
            .map(|lease| (None, lease))
    } else {
        zcodegraph_core::acquire_replacement_gate(Path::new(&project_path), wait_ms)
            .map(|(intent, lease)| (Some(intent), lease))
    };
    let _lease = match acquired {
        Ok(lease) => lease,
        Err(error) => {
            eprintln!("{}", error);
            process::exit(if error.kind() == io::ErrorKind::WouldBlock {
                3
            } else {
                2
            });
        }
    };
    println!("acquired");
    // Both helpers keep their lease until terminated. Exclusive replacement
    // probes also release by process exit, after reporting acquisition.
    let _lease = _lease;
    loop {
        std::thread::park();
    }
}

fn parse_args(args: Vec<String>) -> Result<IndexRequest, String> {
    if args.first().map(String::as_str) != Some("index") {
        return Err("expected command: index".to_string());
    }

    let mut project_path: Option<String> = None;
    let mut index_path: Option<String> = None;
    let mut engine: Option<String> = None;
    let mut force = false;
    let mut verbose = false;
    let mut graph_work_profile = zcodegraph_core::GraphWorkProfile::Full;
    let mut sqlite_write_mode = zcodegraph_core::SqliteWriteMode::FinalFlush;
    let mut parse_walker_diagnostics = false;
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
            "--verbose" => verbose = true,
            "--parse-walker-diagnostics" => parse_walker_diagnostics = true,
            "--graph-work-profile" => {
                i += 1;
                let Some(raw_profile) = args.get(i) else {
                    return Err("--graph-work-profile requires a value".to_string());
                };
                graph_work_profile = zcodegraph_core::GraphWorkProfile::parse(raw_profile)?;
            }
            "--sqlite-write-mode" => {
                i += 1;
                let Some(raw_mode) = args.get(i) else {
                    return Err("--sqlite-write-mode requires a value".to_string());
                };
                sqlite_write_mode = zcodegraph_core::SqliteWriteMode::parse(raw_mode)?;
            }
            other => return Err(format!("unknown argument: {}", other)),
        }
        i += 1;
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
    })
}
