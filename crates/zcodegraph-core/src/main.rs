use std::env;
use std::io::{self, Read};
use std::process;

use zcodegraph_core::{
    candidate_producer_json, error_json, match_name_json, progress_json, result_json, run_index,
    start_heap_profiler, IndexRequest,
};

fn main() {
    let args: Vec<String> = env::args().skip(1).collect();
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
            let result = run_index(&request);
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
            "--verbose" => verbose = true,
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
    })
}
