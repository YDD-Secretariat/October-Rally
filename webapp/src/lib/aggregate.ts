import "server-only";
import { desc, like } from "drizzle-orm";
import { db } from "@/db";
import {
  bulkMembers,
  schools,
  visitors,
  workerBulk,
  workerRegistrations,
  workerRoster,
} from "@/db/schema";
import { MEMBER_GROUPS } from "./types";
import type {
  BulkStats,
  DashboardPayload,
  RosterMatch,
  SchoolRow,
  SchoolStats,
  Summary,
  VisitorStats,
  WorkerStats,
} from "./types";

function sum<T extends object>(rows: readonly T[], key: keyof T): number {
  return rows.reduce((acc, r) => acc + Number((r[key] as unknown) ?? 0), 0);
}

export async function getSchoolRows(): Promise<SchoolRow[]> {
  return (await db.select().from(schools).orderBy(desc(schools.createdAt)).all()) as SchoolRow[];
}

export function getSchoolStats(rows: SchoolRow[]): SchoolStats {
  return {
    totalStudents: sum(rows, "total"),
    totalSchools: rows.length,
    totalMale: sum(rows, "male"),
    totalFemale: sum(rows, "female"),
  };
}

export async function getBulkStats(): Promise<BulkStats> {
  const rows = await db.select().from(bulkMembers).all();
  const groups = MEMBER_GROUPS.map((name) => {
    const matching = rows.filter((r) => r.groupName === name);
    return {
      name,
      male: sum(matching, "male"),
      female: sum(matching, "female"),
      total: sum(matching, "count"),
    };
  }).filter((g) => g.total > 0 || g.male > 0 || g.female > 0);

  return {
    totalMembers: sum(rows, "count"),
    totalMale: sum(rows, "male"),
    totalFemale: sum(rows, "female"),
    groups,
  };
}

export async function getWorkerStats(): Promise<WorkerStats> {
  const bulkRows = await db.select().from(workerBulk).all();
  const individualRows = await db.select().from(workerRegistrations).all();
  const bulkTotal = sum(bulkRows, "total");
  const individualTotal = individualRows.length;
  return {
    bulkTotal,
    bulkMale: sum(bulkRows, "male"),
    bulkFemale: sum(bulkRows, "female"),
    individualTotal,
    total: bulkTotal + individualTotal,
  };
}

export async function getVisitorStats(): Promise<VisitorStats> {
  const rows = await db.select().from(visitors).orderBy(desc(visitors.createdAt)).all();
  return {
    totalVisitors: sum(rows, "total"),
    totalMale: sum(rows, "male"),
    totalFemale: sum(rows, "female"),
    visitors: rows.map((r) => ({
      id: r.id,
      category: r.category || "Visitors",
      male: r.male,
      female: r.female,
      total: r.total,
      notes: r.notes || "",
      station: r.station || "",
      createdAt: r.createdAt,
    })),
  };
}

export function buildSummary(
  stats: SchoolStats,
  bulk: BulkStats,
  workers: WorkerStats,
  vis: VisitorStats,
  schoolRows: SchoolRow[],
): Summary {
  const studentTotal = stats.totalStudents;
  const memberTotal = bulk.totalMembers;
  const visitorTotal = vis.totalVisitors;
  const workerTotal = workers.total;

  // Individual worker registrations have no gender split, so gender totals use
  // the gendered sources: schools, bulk members, worker bulk, and visitors.
  const totalMale = stats.totalMale + bulk.totalMale + workers.bulkMale + vis.totalMale;
  const totalFemale = stats.totalFemale + bulk.totalFemale + workers.bulkFemale + vis.totalFemale;

  return {
    studentTotal,
    memberTotal,
    visitorTotal,
    workerTotal,
    grandTotal: studentTotal + memberTotal + visitorTotal + workerTotal,
    totalMale,
    totalFemale,
    groups: bulk.groups,
    schools: schoolRows.map((s) => ({ name: s.schoolName, total: s.total })),
    workers,
  };
}

/** Single-pass dashboard payload — replaces six separate network round trips. */
export async function getDashboard(): Promise<DashboardPayload> {
  const schoolRows = await getSchoolRows();
  const [bulk, workers, vis] = await Promise.all([getBulkStats(), getWorkerStats(), getVisitorStats()]);
  const stats = getSchoolStats(schoolRows);
  const summary = buildSummary(stats, bulk, workers, vis, schoolRows);
  return {
    stats,
    schools: schoolRows,
    bulk,
    workers,
    visitors: vis,
    summary,
    generatedAt: new Date().toISOString(),
  };
}

export async function getSummary(): Promise<Summary> {
  const schoolRows = await getSchoolRows();
  const [bulk, workers, vis] = await Promise.all([getBulkStats(), getWorkerStats(), getVisitorStats()]);
  return buildSummary(getSchoolStats(schoolRows), bulk, workers, vis, schoolRows);
}

/** Roster search for individual worker/minister registration. */
export async function searchRoster(query: string): Promise<RosterMatch[]> {
  const q = query.trim();
  if (q.length < 2) return [];
  const rosterRows = await db
    .select()
    .from(workerRoster)
    .where(like(workerRoster.fullName, `%${q}%`))
    .limit(20)
    .all();
  const regRows = await db
    .select({ rosterId: workerRegistrations.rosterId })
    .from(workerRegistrations)
    .all();
  const registered = new Set(
    regRows.map((r) => r.rosterId).filter((x): x is number => x != null),
  );
  return rosterRows.map((r) => ({
    rowId: r.id,
    fullName: r.fullName,
    phone: r.phone || "",
    station: r.station || "",
    details: r.details || "",
    alreadyRegistered: registered.has(r.id),
  }));
}
