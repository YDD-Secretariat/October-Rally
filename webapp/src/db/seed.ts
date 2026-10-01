/**
 * Optional seed: load a worker/minister roster so the individual-registration
 * search has names to match. Run with `npm run db:seed`. Safe to re-run — it
 * only inserts when the roster is empty.
 */
import { db, ensureSchema } from "./index";
import { workerRoster } from "./schema";

const ROSTER: Array<{ fullName: string; phone?: string; station?: string; details?: string }> = [
  { fullName: "Grace Adebayo", phone: "08030000001", station: "Anthony Group 1", details: "Choir" },
  { fullName: "Samuel Okafor", phone: "08030000002", station: "Anthony Group 2", details: "Ushering" },
  { fullName: "Blessing Eze", phone: "08030000003", station: "Anthony Group 3", details: "Protocol" },
  { fullName: "Daniel Johnson", phone: "08030000004", station: "Anthony Group 4", details: "Technical" },
  { fullName: "Mary Williams", phone: "08030000005", station: "Anthony Group 1", details: "Children" },
  { fullName: "Peter Nwosu", phone: "08030000006", station: "Anthony Group 2", details: "Security" },
  { fullName: "Esther Bello", phone: "08030000007", station: "Anthony Group 3", details: "Welfare" },
  { fullName: "John Abiodun", phone: "08030000008", station: "Anthony Group 4", details: "Media" },
];

async function main() {
  await ensureSchema();
  const existing = await db.select().from(workerRoster).all();
  if (existing.length > 0) {
    console.log(`Roster already has ${existing.length} entries — skipping seed.`);
  } else {
    await db.insert(workerRoster).values(ROSTER).run();
    console.log(`Seeded ${ROSTER.length} roster entries.`);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
