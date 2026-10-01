import path from "node:path";
import fs from "node:fs";
import Database from "better-sqlite3";
import { drizzle } from "drizzle-orm/better-sqlite3";
import * as schema from "./schema";

// SQLite lives on the local filesystem, so this app must run on a host with a
// persistent disk (a normal Node server or container) — not Vercel serverless.
export const DATA_DIR = process.env.RALLY_DATA_DIR
  ? path.resolve(process.env.RALLY_DATA_DIR)
  : path.join(process.cwd(), "data");

if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });

export const UPLOADS_DIR = path.join(DATA_DIR, "uploads");
if (!fs.existsSync(UPLOADS_DIR)) fs.mkdirSync(UPLOADS_DIR, { recursive: true });

const DB_PATH = path.join(DATA_DIR, "rally.db");

// Reuse a single connection across hot reloads in development.
const globalForDb = globalThis as unknown as { __rallySqlite?: Database.Database };

function createConnection(): Database.Database {
  const sqlite = new Database(DB_PATH);
  sqlite.pragma("journal_mode = WAL");
  sqlite.pragma("foreign_keys = ON");
  // Wait up to 5s instead of throwing SQLITE_BUSY if another process holds the
  // write lock (relevant when running more than one server process).
  sqlite.pragma("busy_timeout = 5000");
  ensureSchema(sqlite);
  return sqlite;
}

const sqlite = globalForDb.__rallySqlite ?? createConnection();
if (process.env.NODE_ENV !== "production") globalForDb.__rallySqlite = sqlite;

export const db = drizzle(sqlite, { schema });

/**
 * Write a consistent, compact backup copy of the database to `destPath`.
 * `VACUUM INTO` is WAL-safe and produces a single clean file.
 */
export function backupDatabase(destPath: string) {
  sqlite.prepare("VACUUM INTO ?").run(destPath);
}

/** Remove idempotency keys older than the given age (default 24h). */
export function pruneIdempotencyKeys(maxAgeMs = 24 * 60 * 60 * 1000) {
  const cutoff = new Date(Date.now() - maxAgeMs).toISOString();
  sqlite.prepare("DELETE FROM idempotency_keys WHERE created_at < ?").run(cutoff);
}

/**
 * Create tables on first boot. Kept as plain idempotent DDL so the app is
 * self-migrating for this single-file SQLite setup — no separate migrate step.
 */
function ensureSchema(conn: Database.Database) {
  conn.exec(`
    CREATE TABLE IF NOT EXISTS schools (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      school_name TEXT NOT NULL,
      location TEXT DEFAULT '',
      coordinator_name TEXT DEFAULT '',
      coordinator_phone TEXT DEFAULT '',
      coordinator_location TEXT DEFAULT '',
      male INTEGER NOT NULL DEFAULT 0,
      female INTEGER NOT NULL DEFAULT 0,
      total INTEGER NOT NULL DEFAULT 0,
      station TEXT DEFAULT '',
      photo_count INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
    );

    CREATE TABLE IF NOT EXISTS bulk_members (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      group_name TEXT NOT NULL,
      male INTEGER NOT NULL DEFAULT 0,
      female INTEGER NOT NULL DEFAULT 0,
      count INTEGER NOT NULL DEFAULT 0,
      station TEXT DEFAULT '',
      submitted_by TEXT DEFAULT '',
      created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
    );

    CREATE TABLE IF NOT EXISTS worker_bulk (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      male INTEGER NOT NULL DEFAULT 0,
      female INTEGER NOT NULL DEFAULT 0,
      total INTEGER NOT NULL DEFAULT 0,
      station TEXT DEFAULT '',
      submitted_by TEXT DEFAULT '',
      created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
    );

    CREATE TABLE IF NOT EXISTS worker_roster (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      full_name TEXT NOT NULL,
      phone TEXT DEFAULT '',
      station TEXT DEFAULT '',
      details TEXT DEFAULT '',
      created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
    );

    CREATE TABLE IF NOT EXISTS worker_registrations (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      roster_id INTEGER,
      full_name TEXT NOT NULL,
      phone TEXT DEFAULT '',
      group_name TEXT DEFAULT '',
      station TEXT DEFAULT '',
      submitted_by TEXT DEFAULT '',
      is_walk_in INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
    );

    CREATE TABLE IF NOT EXISTS visitors (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      category TEXT DEFAULT 'Visitors',
      male INTEGER NOT NULL DEFAULT 0,
      female INTEGER NOT NULL DEFAULT 0,
      total INTEGER NOT NULL DEFAULT 0,
      notes TEXT DEFAULT '',
      station TEXT DEFAULT '',
      created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
    );

    CREATE TABLE IF NOT EXISTS idempotency_keys (
      key TEXT PRIMARY KEY,
      response TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
    );

    CREATE TABLE IF NOT EXISTS photos (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      school_id INTEGER,
      school_name TEXT DEFAULT '',
      file_name TEXT DEFAULT '',
      stored_path TEXT NOT NULL,
      station TEXT DEFAULT '',
      created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
    );

    CREATE INDEX IF NOT EXISTS idx_schools_created ON schools(created_at);
    CREATE INDEX IF NOT EXISTS idx_bulk_created ON bulk_members(created_at);
    CREATE INDEX IF NOT EXISTS idx_visitors_created ON visitors(created_at);
    CREATE INDEX IF NOT EXISTS idx_roster_name ON worker_roster(full_name);
  `);
}

export { schema };
