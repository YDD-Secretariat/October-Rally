# October Rally 2026 — Web App

A full-stack rewrite of the October Rally registration + attendance system as a
**Next.js (App Router) + TypeScript** application backed by **SQLite (libSQL)** —
a local file in development, and **Turso** in production, so it runs on serverless
hosts like **Vercel**. It replaces the original static HTML pages that talked to a
Google Apps Script endpoint.

## Why this exists

The original dashboard was slow because every refresh fired **six separate
requests** to a single Google Apps Script `/exec` URL, which serializes
requests — so a refresh took many seconds and repeated every 9s.

Here, the dashboard loads from **one** endpoint (`/api/dashboard`) backed by
SQLite, which returns in tens of milliseconds. The UI also only re-renders when
the data actually changes.

## Stack

- **Next.js 15** (App Router) + **React 19** + **TypeScript**
- **SQLite / libSQL** via `@libsql/client`, typed with **Drizzle ORM** — a local
  file in dev, **Turso** (hosted libSQL) in production
- Photo uploads to the local disk in dev, **Vercel Blob** in production
- **Tailwind CSS** + **lucide-react** icons (no emoji UI)

## Running it

```bash
cd webapp
npm install
npm run dev     # http://localhost:3100
```

Optional — load a sample worker/minister roster so individual registration has
names to search:

```bash
npm run db:seed
```

### Production

```bash
npm run build
npm start        # http://localhost:3100
```

### Deploying

**A. Vercel + Turso (recommended — fully serverless).**

1. Create a Turso database and an auth token:
   ```bash
   turso db create october-rally
   turso db show october-rally --url          # → TURSO_DATABASE_URL
   turso db tokens create october-rally       # → TURSO_AUTH_TOKEN
   ```
2. Import this repo into Vercel (root directory: `webapp`). Add a **Blob store**
   to the project (Storage → Blob) — it injects `BLOB_READ_WRITE_TOKEN`.
3. Set env vars in Vercel: `TURSO_DATABASE_URL`, `TURSO_AUTH_TOKEN`,
   `RALLY_PASSCODE`, and `RALLY_AUTH_SECRET` (a long random string). Deploy.

The schema is created automatically on first boot. Turso handles durability and
backups; Vercel Blob stores the photos. No persistent disk or always-on process
required.

**B. Docker, any VM (persistent disk, no external services).**
[`Dockerfile`](Dockerfile) runs the app with a local SQLite file and disk uploads
on a mounted volume — no Turso/Blob needed:

```bash
docker build -t october-rally ./webapp
docker run -d --name october-rally -p 80:3100 \
  -e RALLY_PASSCODE='your-event-passcode' \
  -e RALLY_AUTH_SECRET="$(openssl rand -hex 32)" \
  -v october-rally-data:/data \
  october-rally
```

It honours the platform's `$PORT` and stores the DB + uploads on `/data` (verified
to survive restarts). [`render.yaml`](render.yaml) is the same idea as a Render
Blueprint with a 1 GB disk. For a VM, back the `/data` volume up on a schedule
(libSQL files work with Litestream). Put HTTPS in front either way.

> GitHub Pages / plain static hosts still can't run this (it needs a Node
> server) — but with option A it's fully serverless on Vercel.

### Environment variables

Copy `.env.example` → `.env.local` (dev) or set these in your host:

| Variable | Purpose |
|----------|---------|
| `RALLY_PASSCODE` | Shared passcode to access the app. **Set it in production** — when set, the whole app is gated behind a login. Unset = no auth (dev/test). |
| `RALLY_AUTH_SECRET` | Random string used to sign the auth cookie. Set a distinct value in production. |
| `TURSO_DATABASE_URL` / `TURSO_AUTH_TOKEN` | Turso (hosted libSQL) connection. Set both for Vercel/serverless. Unset = local SQLite file. |
| `BLOB_READ_WRITE_TOKEN` | Vercel Blob token for photo storage (auto-set on Vercel). Unset = photos saved to local disk. |
| `RALLY_DATA_DIR` | Local-file DB + uploads location (dev / Docker only; ignored when Turso is set). Default `./data`. |

## Migrating existing data from the Google Sheet

The old static app stored its data behind a Google Apps Script endpoint. To seed
this database with the current live counts before going live:

```bash
npm run db:import              # imports into empty tables (safe; refuses if data exists)
npm run db:import -- --force   # clears & re-imports the migrated tables
```

It pulls schools, bulk members, visitors, and the bulk worker/minister total
(individual worker rows can't be migrated — the legacy backend lists no endpoint
for them) and prints a grand-total summary you can reconcile against the sheet.
Override the source with `RALLY_IMPORT_URL`. Run it on the server (with
`RALLY_DATA_DIR` set) right before launch so the first page load shows real
numbers.

## Attendance-sheet photos

Uploaded sheets are stored in **Vercel Blob** (or the local disk in dev) and
viewable from the dashboard: open a school in the **Schools Registered** table and
its photos appear as thumbnails in the detail panel (click to open full size).
Served by `GET /api/photos/:id`, which stays auth-gated by proxying the bytes
(the underlying blob/disk URL is never exposed).

## Production hardening (built in)

- **Idempotent writes** — each submission carries a `clientRequestId`; a retry
  (offline queue, or a lost response) replays the stored result instead of
  inserting again, so headcounts are never double-counted.
- **Durable storage** — in production the database is **Turso**, which provides
  built-in replication and point-in-time restore. On the Docker/VM path (local
  SQLite file), back the data volume up on a schedule (e.g. [Litestream](https://litestream.io)).
- **Shared-passcode auth** — set `RALLY_PASSCODE` to require a login (httpOnly,
  signed cookie) for all pages and API routes. Lock button in the footer.
- **Hardened misc** — SQLite `busy_timeout` for multi-process safety, and CSV
  exports neutralize spreadsheet formula injection.

## Data model (SQLite)

| Table | Purpose |
|-------|---------|
| `schools` | School headcount registrations (+ photo count) |
| `bulk_members` | Group member headcounts (Group 1–4, Others / Visitors) |
| `worker_bulk` | Bulk worker/minister headcounts |
| `worker_roster` | Searchable roster for individual registration |
| `worker_registrations` | Individual registrations (roster confirmations + walk-ins) |
| `visitors` | Visitor headcounts |
| `photos` | Uploaded attendance-sheet images |
| `idempotency_keys` | Dedupe store so retried writes aren't double-counted |

Tables are created automatically on first run (see `src/db/index.ts`).

## How totals are counted

```
grandTotal = students + members(bulk) + visitors + workers
workers    = bulk worker headcount + individual registrations
```

Visitors are reported both on their own and folded into the grand total.

## API

| Method & path | Description |
|---------------|-------------|
| `GET /api/dashboard` | **Combined** payload for the live dashboard (one call) |
| `GET /api/summary` | Totals for the landing page + kitchen dashboard |
| `GET/POST /api/schools` | List / register a school (with fuzzy duplicate detection) |
| `GET /api/schools/recent` | Recent school registrations |
| `POST /api/members` · `GET /api/members/recent` | Bulk members |
| `POST /api/workers/bulk` · `GET /api/workers/bulk/recent` | Bulk workers/ministers |
| `GET /api/workers/search?q=` | Roster search |
| `POST /api/workers` | Register a roster person or a walk-in |
| `POST /api/visitors` · `GET /api/visitors/recent` | Visitors |
| `POST /api/uploads` | Attendance-sheet photo upload |

## Offline tolerance

Writes that fail (e.g. a dropped connection at a desk) are saved to a per-device
queue in `localStorage` and retried automatically — see `src/lib/api-client.ts`
and the sync indicator in the footer.

## Project layout

```
webapp/
  src/
    app/            # pages + API routes (App Router)
    components/     # NavBar, form bits, UI primitives
    db/             # Drizzle schema, connection, seed
    lib/            # aggregation, similarity, api client, formatting
```

The original static site remains in the repository root for reference.
