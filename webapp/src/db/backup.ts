import fs from "node:fs";
import path from "node:path";
import { DATA_DIR, backupDatabase, pruneIdempotencyKeys } from "./index";

const BACKUP_DIR = path.join(DATA_DIR, "backups");
const KEEP = Number(process.env.RALLY_BACKUP_KEEP || 48);

/** Write one timestamped backup and prune to the most recent KEEP copies. */
export function runBackup(): string {
  if (!fs.existsSync(BACKUP_DIR)) fs.mkdirSync(BACKUP_DIR, { recursive: true });
  const ts = new Date().toISOString().replace(/[:.]/g, "-");
  const dest = path.join(BACKUP_DIR, `rally-${ts}.db`);
  backupDatabase(dest);

  const files = fs
    .readdirSync(BACKUP_DIR)
    .filter((f) => f.startsWith("rally-") && f.endsWith(".db"))
    .sort();
  while (files.length > KEEP) {
    const old = files.shift();
    if (old) {
      try {
        fs.unlinkSync(path.join(BACKUP_DIR, old));
      } catch {
        /* ignore */
      }
    }
  }
  return dest;
}

/**
 * Start periodic backups. Interval (minutes) comes from RALLY_BACKUP_MINUTES,
 * defaulting to 15 in production and off in dev/test. Idempotent across hot
 * reloads via a global guard.
 */
export function startBackupScheduler() {
  const g = globalThis as unknown as { __rallyBackup?: boolean };
  if (g.__rallyBackup) return;

  const minutes = Number(
    process.env.RALLY_BACKUP_MINUTES ?? (process.env.NODE_ENV === "production" ? 15 : 0),
  );
  if (!Number.isFinite(minutes) || minutes <= 0) return;

  g.__rallyBackup = true;
  const tick = () => {
    try {
      const dest = runBackup();
      pruneIdempotencyKeys();
      console.log(`[backup] wrote ${dest}`);
    } catch (err) {
      console.error("[backup] failed:", err);
    }
  };
  tick();
  const timer = setInterval(tick, minutes * 60_000);
  timer.unref?.();
}
