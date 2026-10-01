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

export function getSchoolRows(): SchoolRow[] {
  return db.select().from(schools).orderBy(desc(schools.createdAt)).all() as SchoolRow[];
}

export function getSchoolStats(rows = getSchoolRows()): SchoolStats {
  return {
    totalStudents: sum(rows, "total"),
    totalSchools: rows.length,
    totalMale: sum(rows, "male"),
    totalFemale: sum(rows, "female"),
  };
}

export function getBulkStats(): BulkStats {
  const rows = db.select().from(bulkMembers).all();
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

export function getWorkerStats(): WorkerStats {
  const bulkRows = db.select().from(workerBulk).all();
  const individualRows = db.select().from(workerRegistrations).all();
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

export function getVisitorStats(): VisitorStats {
  const rows = db.select().from(visitors).orderBy(desc(visitors.createdAt)).all();
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
  const totalMale =
    stats.totalMale + bulk.totalMale + workers.bulkMale + vis.totalMale;
  const totalFemale =
    stats.totalFemale + bulk.totalFemale + workers.bulkFemale + vis.totalFemale;

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
export function getDashboard(): DashboardPayload {
  const schoolRows = getSchoolRows();
  const stats = getSchoolStats(schoolRows);
  const bulk = getBulkStats();
  const workers = getWorkerStats();
  const vis = getVisitorStats();
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

export function getSummary(): Summary {
  const schoolRows = getSchoolRows();
  return buildSummary(
    getSchoolStats(schoolRows),
    getBulkStats(),
    getWorkerStats(),
    getVisitorStats(),
    schoolRows,
  );
}

/** Roster search for individual worker/minister registration. */
export function searchRoster(query: string): RosterMatch[] {
  const q = query.trim();
  if (q.length < 2) return [];
  const rosterRows = db
    .select()
    .from(workerRoster)
    .where(like(workerRoster.fullName, `%${q}%`))
    .limit(20)
    .all();
  const registered = new Set(
    db
      .select({ rosterId: workerRegistrations.rosterId })
      .from(workerRegistrations)
      .all()
      .map((r) => r.rosterId)
      .filter((x): x is number => x != null),
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
