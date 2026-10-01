/**
 * One-time migration: pull the current counts from the legacy Google Apps
 * Script endpoint (the old static app's backend) into this SQLite database.
 *
 *   npm run db:import              # import into empty tables (safe)
 *   npm run db:import -- --force   # clear & re-import the migrated tables
 *
 * Source URL: RALLY_IMPORT_URL env, else the legacy endpoint below.
 *
 * Imports schools, bulk members, visitors, and the bulk worker/minister total.
 * Individual worker registrations are NOT migrated — the legacy backend exposes
 * no endpoint that lists them (and in the current sheet there are 0 of them).
 */
import { db } from "./index";
import { bulkMembers, schools, visitors, workerBulk } from "./schema";

const URL_BASE =
  process.env.RALLY_IMPORT_URL ||
  "https://script.google.com/macros/s/AKfycbzQlvK0M-rvpSn-B6cLw2hwb0f9PhRkJiQpy6kq8B8u98x-MnDmg1Z4zfG0VlrrFxDs/exec";

const FORCE = process.argv.includes("--force");
const int = (v: unknown) => Math.max(0, parseInt(String(v ?? "0")) || 0);

async function fetchAction(action: string): Promise<any> {
  let lastErr: unknown;
  for (let attempt = 1; attempt <= 4; attempt++) {
    try {
      const ctrl = new AbortController();
      const t = setTimeout(() => ctrl.abort(), 45000);
      const res = await fetch(`${URL_BASE}?action=${action}`, { signal: ctrl.signal, redirect: "follow" });
      clearTimeout(t);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      if (data?.error) throw new Error(data.error);
      return data;
    } catch (err) {
      lastErr = err;
      await new Promise((r) => setTimeout(r, 2000 * attempt));
    }
  }
  throw new Error(`Failed to fetch ${action}: ${lastErr instanceof Error ? lastErr.message : lastErr}`);
}

async function main() {
  const existing =
    db.select().from(schools).all().length +
    db.select().from(bulkMembers).all().length +
    db.select().from(visitors).all().length +
    db.select().from(workerBulk).all().length;

  if (existing > 0 && !FORCE) {
    console.error(
      `Refusing to import: migrated tables already hold ${existing} rows.\n` +
        `Re-run with --force to clear and re-import them.`,
    );
    process.exit(1);
  }

  console.log(`Fetching from ${URL_BASE} …`);
  const [schoolsRes, bulkRes, visRes, workerRes] = await Promise.all([
    fetchAction("getSchools"),
    fetchAction("getBulkStats"),
    fetchAction("getVisitorStats"),
    fetchAction("getWorkerStats"),
  ]);

  const schoolRows = (schoolsRes.schools || []).map((s: any) => {
    const male = int(s.Male);
    const female = int(s.Female);
    return {
      schoolName: String(s.SchoolName || "").trim() || "(unnamed)",
      location: String(s.Location || ""),
      coordinatorName: String(s.CoordinatorName || ""),
      coordinatorPhone: String(s.CoordinatorPhone || ""),
      coordinatorLocation: String(s.CoordinatorLocation || ""),
      male,
      female,
      total: int(s.Total) || male + female,
      station: String(s.Station || ""),
      createdAt: String(s.Timestamp || new Date().toISOString()),
    };
  });

  const groupRows = (bulkRes.groups || []).map((g: any) => ({
    groupName: String(g.group || g.name || "Others"),
    male: int(g.male),
    female: int(g.female),
    count: int(g.count ?? g.total),
    station: "",
    submittedBy: "import",
  }));

  const visitorRows = (visRes.visitors || []).map((v: any) => ({
    category: String(v.Category || "Visitors"),
    male: int(v.Male),
    female: int(v.Female),
    total: int(v.Total) || int(v.Male) + int(v.Female),
    notes: String(v.Notes || ""),
    station: String(v.Station || ""),
    createdAt: String(v.RegisteredAt || new Date().toISOString()),
  }));

  const wm = workerRes.workersMinisters || {};
  const workerRows: Array<typeof workerBulk.$inferInsert> = [];
  if (int(wm.bulkTotal) > 0) {
    workerRows.push({ male: int(wm.bulkMale), female: int(wm.bulkFemale), total: int(wm.bulkTotal), submittedBy: "import" });
  }
  if (int(wm.individualTotal) > 0) {
    // No per-person data available; carry the count with unknown gender.
    workerRows.push({ male: 0, female: 0, total: int(wm.individualTotal), submittedBy: "import (individuals)" });
  }

  db.transaction((tx) => {
    if (FORCE) {
      tx.delete(schools).run();
      tx.delete(bulkMembers).run();
      tx.delete(visitors).run();
      tx.delete(workerBulk).run();
    }
    if (schoolRows.length) tx.insert(schools).values(schoolRows).run();
    if (groupRows.length) tx.insert(bulkMembers).values(groupRows).run();
    if (visitorRows.length) tx.insert(visitors).values(visitorRows).run();
    if (workerRows.length) tx.insert(workerBulk).values(workerRows).run();
  });

  const students = schoolRows.reduce((a: number, s: any) => a + s.total, 0);
  const members = groupRows.reduce((a: number, g: any) => a + g.count, 0);
  const visitorsTotal = visitorRows.reduce((a: number, v: any) => a + v.total, 0);
  const workersTotal = workerRows.reduce((a, w) => a + Number(w.total || 0), 0);

  console.log("\nImported:");
  console.log(`  Schools:        ${schoolRows.length} (${students} students)`);
  console.log(`  Member groups:  ${groupRows.length} (${members} members)`);
  console.log(`  Visitor rows:   ${visitorRows.length} (${visitorsTotal} visitors)`);
  console.log(`  Worker rows:    ${workerRows.length} (${workersTotal} workers)`);
  console.log(`  GRAND TOTAL:    ${students + members + visitorsTotal + workersTotal}`);
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
