import path from "node:path";
import fs from "node:fs";
import { createClient, type Client } from "@libsql/client";
import { drizzle } from "drizzle-orm/libsql";
import * as schema from "./schema";

// Local file (dev / Docker) unless a Turso database is configured. On Vercel,
// set TURSO_DATABASE_URL + TURSO_AUTH_TOKEN and this talks to Turso over HTTP.
export const DATA_DIR = process.env.RALLY_DATA_DIR
  ? path.resolve(process.env.RALLY_DATA_DIR)
  : path.join(process.cwd(), "data");

const usingTurso = !!process.env.TURSO_DATABASE_URL;

if (!usingTurso && !fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });

// Local disk fallback for uploaded photos when Vercel Blob isn't configured.
export const UPLOADS_DIR = path.join(DATA_DIR, "uploads");
if (!usingTurso && !fs.existsSync(UPLOADS_DIR)) fs.mkdirSync(UPLOADS_DIR, { recursive: true });

const url = process.env.TURSO_DATABASE_URL || `file:${path.join(DATA_DIR, "rally.db")}`;

const globalForDb = globalThis as unknown as { __rallyClient?: Client };

const client =
  globalForDb.__rallyClient ??
  createClient({ url, authToken: process.env.TURSO_AUTH_TOKEN });
if (process.env.NODE_ENV !== "production") globalForDb.__rallyClient = client;

export const db = drizzle(client, { schema });

const DDL = `
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
`;

// Create tables once per process (idempotent). Awaited at startup via
// instrumentation, and by the CLI scripts before they run queries.
let schemaReady: Promise<void> | null = null;
export function ensureSchema(): Promise<void> {
  if (!schemaReady) schemaReady = client.executeMultiple(DDL);
  return schemaReady;
}

export { schema };
