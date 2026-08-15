const path = require('path');
const Database = require('better-sqlite3');
const { VALID_ERROR_TYPES } = require('./errorTypes');

const dbPath = path.join(__dirname, '..', 'data', 'events.db');
const db = new Database(dbPath);

db.pragma('journal_mode = WAL');

db.exec(`
  CREATE TABLE IF NOT EXISTS events (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    event_type  TEXT NOT NULL CHECK (event_type IN ('session_start', 'run_pressed')),
    error_type  TEXT NULL CHECK (
                  error_type IS NULL OR error_type IN (
                    'indentation_error', 'syntax_error_colon', 'syntax_error_bracket',
                    'syntax_error_quote', 'syntax_error_other', 'name_error',
                    'type_error_str_int', 'type_error_other', 'value_error',
                    'index_error', 'key_error', 'zero_division_error',
                    'attribute_error', 'import_error', 'naming_convention', 'other_error'
                  )
                ),
    session_id  TEXT NOT NULL,
    created_at  TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
  );

  CREATE INDEX IF NOT EXISTS idx_events_type ON events(event_type);
  CREATE INDEX IF NOT EXISTS idx_events_created ON events(created_at);
`);

const insertStmt = db.prepare(
  'INSERT INTO events (event_type, error_type, session_id) VALUES (?, ?, ?)'
);

function insertEvent(eventType, errorType, sessionId) {
  insertStmt.run(eventType, errorType ?? null, sessionId);
}

const totalSessionsStmt = db.prepare(
  "SELECT COUNT(DISTINCT session_id) AS n FROM events WHERE event_type = 'session_start'"
);
const totalRunsStmt = db.prepare(
  "SELECT COUNT(*) AS n FROM events WHERE event_type = 'run_pressed'"
);
const errorRunsStmt = db.prepare(
  "SELECT COUNT(*) AS n FROM events WHERE event_type = 'run_pressed' AND error_type IS NOT NULL"
);
const errorBreakdownStmt = db.prepare(
  `SELECT error_type, COUNT(*) AS n FROM events
   WHERE event_type = 'run_pressed' AND error_type IS NOT NULL
   GROUP BY error_type`
);

function getStats() {
  const totalSessions = totalSessionsStmt.get().n;
  const totalRuns = totalRunsStmt.get().n;
  const errorRuns = errorRunsStmt.get().n;
  const successfulRuns = totalRuns - errorRuns;

  const errorBreakdown = {};
  for (const type of VALID_ERROR_TYPES) {
    errorBreakdown[type] = 0;
  }
  for (const row of errorBreakdownStmt.all()) {
    errorBreakdown[row.error_type] = row.n;
  }

  return {
    total_sessions: totalSessions,
    total_runs: totalRuns,
    successful_runs: successfulRuns,
    error_breakdown: errorBreakdown,
  };
}

module.exports = { db, insertEvent, getStats };
