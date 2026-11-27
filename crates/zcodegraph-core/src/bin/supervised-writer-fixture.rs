use std::env;
use std::path::PathBuf;
use std::process;
use std::time::Duration;

use rusqlite::Connection;
use zcodegraph_core::process_supervision::{spawn_supervised, wait_for_supervision};

fn main() {
    let args: Vec<String> = env::args().skip(1).collect();
    if args.first().map(String::as_str) == Some("write") {
        write_until_killed(&args[1..]);
    }
    let executable = env::current_exe().expect("current executable");
    let mut command = process::Command::new(executable);
    command.arg("write").args(&args);
    let mut child = spawn_supervised(&mut command).unwrap_or_else(|error| {
        eprintln!("test writer supervision unavailable: {}", error);
        process::exit(2);
    });
    match wait_for_supervision(&mut child) {
        Ok(status) => process::exit(status.code().unwrap_or(1)),
        Err(_) => process::exit(4),
    }
}

fn write_until_killed(args: &[String]) -> ! {
    let db = PathBuf::from(args.first().expect("database path"));
    let state = PathBuf::from(args.get(1).expect("state path"));
    let conn = Connection::open(db).expect("open writer DB");
    conn.execute_batch("CREATE TABLE IF NOT EXISTS writes (id INTEGER PRIMARY KEY, value TEXT); PRAGMA journal_mode=DELETE;").expect("initialize writer DB");
    let mut count = 0_u64;
    loop {
        conn.execute("INSERT INTO writes(value) VALUES (?1)", [count.to_string()])
            .expect("write row");
        // Publish only complete state snapshots; readers may poll while the
        // writer is running and must never observe a truncated JSON document.
        let next_state = state.with_extension("json.next");
        std::fs::write(
            &next_state,
            format!("{{\"pid\":{},\"count\":{}}}", process::id(), count),
        )
        .expect("write next state");
        std::fs::rename(&next_state, &state).expect("publish complete state");
        count += 1;
        std::thread::sleep(Duration::from_millis(15));
    }
}
