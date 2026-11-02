//! Native test adapter for CLI argument/stdout fixtures.
//!
//! Production accepts only the native zcodegraph-core executable. This separate
//! fixture owns the real OS replacement lease and supervises a scripted writer,
//! so CLI protocol tests do not need a production bypass or a spawn monkey patch.

use std::env;
use std::path::{Path, PathBuf};
use std::process::{self, Command, Stdio};

use zcodegraph_core::process_supervision::{spawn_supervised, wait_for_supervision};

fn main() {
    let args: Vec<String> = env::args().skip(1).collect();
    let script = env::var_os("ZCG_TEST_RUST_CORE_SCRIPT").unwrap_or_else(|| {
        eprintln!("scripted-index-fixture requires ZCG_TEST_RUST_CORE_SCRIPT");
        process::exit(2);
    });
    let script = PathBuf::from(script);
    if !script.is_file() {
        eprintln!(
            "scripted-index-fixture script is not a file: {}",
            script.display()
        );
        process::exit(2);
    }

    match args.first().map(String::as_str) {
        Some("supervised-index") => supervise_writer(&script, &args[1..]),
        Some("replacement-gate") => hold_gate(&args[1..], true),
        Some("worker-lease") => hold_gate(&args[1..], false),
        _ => {
            eprintln!("scripted-index-fixture supports only native supervision and gate commands");
            process::exit(2);
        }
    }
}

fn project_path(args: &[String]) -> PathBuf {
    let index = args
        .iter()
        .position(|arg| arg == "--project-path")
        .unwrap_or_else(|| {
            eprintln!("scripted-index-fixture requires --project-path");
            process::exit(2);
        });
    args.get(index + 1).map(PathBuf::from).unwrap_or_else(|| {
        eprintln!("scripted-index-fixture --project-path requires a value");
        process::exit(2);
    })
}

fn wait_ms(args: &[String]) -> u64 {
    let Some(index) = args.iter().position(|arg| arg == "--wait-ms") else {
        return 5_000;
    };
    args.get(index + 1)
        .and_then(|value| value.parse().ok())
        .unwrap_or_else(|| {
            eprintln!("scripted-index-fixture requires a valid --wait-ms");
            process::exit(2);
        })
}

fn hold_gate(args: &[String], exclusive: bool) {
    let project = project_path(args);
    let wait_ms = wait_ms(args);
    let acquired = if exclusive {
        zcodegraph_core::acquire_replacement_gate(Path::new(&project), wait_ms)
            .map(|(intent, lease)| (Some(intent), lease))
    } else {
        zcodegraph_core::acquire_worker_lease(Path::new(&project), wait_ms)
            .map(|lease| (None, lease))
    };
    let _lease = acquired.unwrap_or_else(|error| {
        eprintln!("{error}");
        process::exit(if error.kind() == std::io::ErrorKind::WouldBlock {
            3
        } else {
            2
        });
    });
    println!("acquired");
    let mut stdin = std::io::stdin();
    let mut byte = [0_u8; 1];
    loop {
        match std::io::Read::read(&mut stdin, &mut byte) {
            Ok(0) | Err(_) => return,
            Ok(_) => {}
        }
    }
}

fn supervise_writer(script: &Path, args: &[String]) {
    if args.first().map(String::as_str) != Some("index") {
        eprintln!("scripted-index-fixture requires supervised-index index");
        process::exit(2);
    }
    let mut command =
        Command::new(env::var_os("ZCG_TEST_NODE_BINARY").unwrap_or_else(|| "node".into()));
    command.arg(script).args(
        args.iter()
            .filter(|arg| arg.as_str() != "--replacement-gate-externally-held"),
    );
    command.stdin(Stdio::null());
    let mut child = spawn_supervised(&mut command).unwrap_or_else(|error| {
        eprintln!("scripted-index-fixture supervision unavailable: {error}");
        process::exit(2);
    });
    match wait_for_supervision(&mut child) {
        Ok(status) => process::exit(status.code().unwrap_or(1)),
        Err(_) => process::exit(4),
    }
}
