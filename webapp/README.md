# October Rally 2026 — Web App

A full-stack rewrite of the October Rally registration + attendance system as a
**Next.js (App Router) + TypeScript** application backed by a local **SQLite**
database. It replaces the original static HTML pages that talked to a Google
Apps Script endpoint.

## Why this exists

The original dashboard was slow because every refresh fired **six separate
requests** to a single Google Apps Script `/exec` URL, which serializes
requests — so a refresh took many seconds and repeated every 9s.

Here, the dashboard loads from **one** endpoint (`/api/dashboard`) backed by
SQLite, which returns in tens of milliseconds. The UI also only re-renders when
the data actually changes.

## Stack

- **Next.js 15** (App Router) + **React 19** + **TypeScript**
- **SQLite** via `better-sqlite3`, typed with **Drizzle ORM**
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

> **Hosting — read this first.** This is a **server** app with a SQLite database,
> so it **cannot run on GitHub Pages / Vercel / Netlify** (static or serverless —
> no persistent disk). Deploy it to a host that gives you a long-running Node
> process **and a persistent volume**: a VM (DigitalOcean/EC2/Hetzner), or a
> container platform with a mounted disk (Render, Railway, Fly.io). Put HTTPS in
> front (the host's TLS, or Caddy/nginx). The DB, uploads, and backups live under
> the directory named by `RALLY_DATA_DIR` (default `./data`) — that path must be
> on the persistent volume and must survive redeploys.

### Deploying

Two ready-made paths (both validated):

**A. Render (one blueprint).** [`render.yaml`](render.yaml) defines a web service
with a 1 GB persistent disk at `/data`. In Render: **New → Blueprint → pick this
repo**. It generates `RALLY_AUTH_SECRET` for you; set `RALLY_PASSCODE` in the
dashboard. (A persistent disk needs a paid instance type — the free tier has
none.) Railway/Fly.io are similar: root dir `webapp`, build `npm ci && npm run
build`, start `npm start`, attach a volume mounted where `RALLY_DATA_DIR` points.

**B. Docker (any VM).** [`Dockerfile`](Dockerfile) builds the app; run it with a
mounted volume and your env:

```bash
docker build -t october-rally ./webapp
docker run -d --name october-rally -p 80:3100 \
  -e RALLY_PASSCODE='your-event-passcode' \
  -e RALLY_AUTH_SECRET="$(openssl rand -hex 32)" \
  -v october-rally-data:/data \
  october-rally
```

The container honours the platform's `$PORT` and stores all data on the `/data`
volume (DB, uploads, rotating backups) — verified to survive container restarts.
Terminate TLS with the host's load balancer or a reverse proxy in front.

### Environment variables

Copy `.env.example` → `.env.local` (dev) or set these in your host:

| Variable | Purpose |
|----------|---------|
| `RALLY_PASSCODE` | Shared passcode to access the app. **Set it in production** — when set, the whole app is gated behind a login. Unset = no auth (dev/test). |
| `RALLY_AUTH_SECRET` | Random string used to sign the auth cookie. Set a distinct value in production. |
| `RALLY_DATA_DIR` | Where the DB, uploads, and backups live (must be persistent). Default `./data`. |
| `RALLY_BACKUP_MINUTES` | Auto-backup interval. Default 15 in production, off in dev. |
| `RALLY_BACKUP_KEEP` | How many rotating backups to retain. Default 48. |

## Production hardening (built in)

- **Idempotent writes** — each submission carries a `clientRequestId`; a retry
  (offline queue, or a lost response) replays the stored result instead of
  inserting again, so headcounts are never double-counted.
- **Automatic backups** — a timestamped `VACUUM INTO` snapshot is written to
  `data/backups/` on an interval and rotated (`RALLY_BACKUP_KEEP`). Run one by
  hand with `npm run db:backup`. For off-box durability, also point the data
  volume at a provider snapshot or add [Litestream](https://litestream.io).
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
