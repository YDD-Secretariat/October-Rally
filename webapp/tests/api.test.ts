import { test, before } from "node:test";
import assert from "node:assert/strict";

const BASE = process.env.BASE || "http://localhost:3101";

type Json = Record<string, any>;

async function get(path: string): Promise<{ status: number; body: Json }> {
  const res = await fetch(BASE + path, { cache: "no-store" });
  return { status: res.status, body: await res.json() };
}

async function post(path: string, body: unknown): Promise<{ status: number; body: Json }> {
  const res = await fetch(BASE + path, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  return { status: res.status, body: await res.json().catch(() => ({})) };
}

const dashboard = async () => (await get("/api/dashboard")).body;

before(async () => {
  // Ensure the server is reachable before the suite runs.
  const res = await get("/api/summary");
  assert.equal(res.status, 200);
});

/* ---------------- Schools ---------------- */

test("POST /api/schools registers a school and updates all totals", async () => {
  const before = await dashboard();
  const res = await post("/api/schools", {
    schoolName: "Delta Valley School",
    location: "Ikeja",
    coordinatorName: "Mrs. Coordinator",
    coordinatorPhone: "08011112222",
    male: 40,
    female: 55,
    station: "Station A",
    confirmedNotDuplicate: true,
  });
  assert.equal(res.status, 200);
  assert.equal(res.body.success, true);
  assert.ok(typeof res.body.id === "number");

  const after = await dashboard();
  assert.equal(after.stats.totalStudents - before.stats.totalStudents, 95);
  assert.equal(after.stats.totalMale - before.stats.totalMale, 40);
  assert.equal(after.stats.totalFemale - before.stats.totalFemale, 55);
  assert.equal(after.stats.totalSchools - before.stats.totalSchools, 1);
  assert.equal(after.summary.grandTotal - before.summary.grandTotal, 95);
});

test("GET /api/schools returns the registered school", async () => {
  const { body } = await get("/api/schools");
  assert.ok(Array.isArray(body.schools));
  assert.ok(body.schools.some((s: Json) => s.schoolName === "Delta Valley School"));
});

test("fuzzy duplicate is flagged when not confirmed", async () => {
  await post("/api/schools", { schoolName: "Riverside Grammar School", male: 10, female: 10, coordinatorName: "A", coordinatorPhone: "08000000001", confirmedNotDuplicate: true });
  const res = await post("/api/schools", { schoolName: "Riverside Grammar Schl", male: 1, female: 1, coordinatorName: "B", coordinatorPhone: "08000000002" });
  assert.equal(res.body.success, false);
  assert.equal(res.body.duplicate, true);
  assert.ok(Array.isArray(res.body.matches) && res.body.matches.length >= 1);
  assert.ok(res.body.matches[0].similarity >= 80);
  assert.ok(res.body.matches[0].schoolName.length > 0);
});

test("duplicate can be overridden with confirmedNotDuplicate", async () => {
  const res = await post("/api/schools", { schoolName: "Riverside Grammar Schl", male: 1, female: 1, coordinatorName: "B", coordinatorPhone: "08000000002", confirmedNotDuplicate: true });
  assert.equal(res.body.success, true);
});

test("school name is required", async () => {
  const res = await post("/api/schools", { schoolName: "   ", male: 5, female: 5, confirmedNotDuplicate: true });
  assert.equal(res.status, 400);
  assert.equal(res.body.success, false);
});

test("negative / non-numeric counts are coerced to 0", async () => {
  const res = await post("/api/schools", { schoolName: "Coercion Test School", male: -5, female: "abc", confirmedNotDuplicate: true });
  assert.equal(res.body.success, true);
  const { body } = await get("/api/schools");
  const school = body.schools.find((s: Json) => s.schoolName === "Coercion Test School");
  assert.equal(school.male, 0);
  assert.equal(school.female, 0);
  assert.equal(school.total, 0);
});

test("GET /api/schools/recent respects limit and is newest-first", async () => {
  const { body } = await get("/api/schools/recent?limit=2");
  assert.ok(body.recent.length <= 2);
  if (body.recent.length === 2) {
    assert.ok(body.recent[0].createdAt >= body.recent[1].createdAt);
  }
});

/* ---------------- Members ---------------- */

test("POST /api/members adds to the member total", async () => {
  const before = await dashboard();
  const res = await post("/api/members", { group: "Group 2", male: 3, female: 4, station: "Desk 1" });
  assert.equal(res.body.success, true);
  assert.equal(res.body.count, 7);
  const after = await dashboard();
  assert.equal(after.bulk.totalMembers - before.bulk.totalMembers, 7);
  assert.equal(after.summary.grandTotal - before.summary.grandTotal, 7);
});

test("members rejects an invalid group", async () => {
  const res = await post("/api/members", { group: "Group 9", male: 1, female: 1 });
  assert.equal(res.status, 400);
  assert.equal(res.body.success, false);
});

test("members rejects an empty headcount", async () => {
  const res = await post("/api/members", { group: "Group 1", male: 0, female: 0 });
  assert.equal(res.status, 400);
  assert.equal(res.body.success, false);
});

/* ---------------- Bulk workers ---------------- */

test("bulk workers requires the exclusion confirmation", async () => {
  const res = await post("/api/workers/bulk", { male: 5, female: 5 });
  assert.equal(res.status, 400);
  assert.equal(res.body.success, false);
});

test("bulk workers adds to worker total when confirmed", async () => {
  const before = await dashboard();
  const res = await post("/api/workers/bulk", { confirmedExcludesIndividuals: true, male: 8, female: 7, station: "Desk 2" });
  assert.equal(res.body.success, true);
  const after = await dashboard();
  assert.equal(after.workers.bulkTotal - before.workers.bulkTotal, 15);
  assert.equal(after.summary.workerTotal - before.summary.workerTotal, 15);
});

test("bulk workers rejects an empty headcount", async () => {
  const res = await post("/api/workers/bulk", { confirmedExcludesIndividuals: true, male: 0, female: 0 });
  assert.equal(res.status, 400);
});

/* ---------------- Individual workers (roster) ---------------- */

test("roster search finds a seeded person, then registration marks them done", async () => {
  const search = await get("/api/workers/search?q=Grace");
  assert.ok(search.body.workers.length >= 1);
  const grace = search.body.workers.find((w: Json) => w.fullName.includes("Grace"));
  assert.ok(grace, "expected seeded 'Grace' in roster");
  assert.equal(grace.alreadyRegistered, false);

  const beforeCount = (await dashboard()).workers.individualTotal;
  const reg = await post("/api/workers", { rowId: grace.rowId, phone: "08030000001", group: "Group 1", station: "Desk 2" });
  assert.equal(reg.body.success, true);

  const afterCount = (await dashboard()).workers.individualTotal;
  assert.equal(afterCount - beforeCount, 1);

  const search2 = await get("/api/workers/search?q=Grace");
  const grace2 = search2.body.workers.find((w: Json) => w.rowId === grace.rowId);
  assert.equal(grace2.alreadyRegistered, true);
});

test("re-registering the same roster person is a soft duplicate", async () => {
  const search = await get("/api/workers/search?q=Grace");
  const grace = search.body.workers.find((w: Json) => w.fullName.includes("Grace"));
  const res = await post("/api/workers", { rowId: grace.rowId, phone: "08030000001", group: "Group 1" });
  assert.equal(res.body.success, false);
  assert.equal(res.body.duplicate, true);
});

test("walk-in registration succeeds with valid details", async () => {
  const before = (await dashboard()).workers.individualTotal;
  const res = await post("/api/workers", { name: "Walk In Person", phone: "08099998888", group: "Others", station: "Others" });
  assert.equal(res.body.success, true);
  const after = (await dashboard()).workers.individualTotal;
  assert.equal(after - before, 1);
});

test("worker registration rejects a short phone number", async () => {
  const res = await post("/api/workers", { name: "Bad Phone", phone: "123", group: "Group 1" });
  assert.equal(res.status, 400);
  assert.equal(res.body.success, false);
});

test("worker registration rejects an invalid group", async () => {
  const res = await post("/api/workers", { name: "Bad Group", phone: "08012345678", group: "Group 99" });
  assert.equal(res.status, 400);
});

/* ---------------- Visitors ---------------- */

test("POST /api/visitors adds to visitor + grand totals", async () => {
  const before = await dashboard();
  const res = await post("/api/visitors", { male: 4, female: 6, notes: "Invited", station: "Gate" });
  assert.equal(res.body.success, true);
  const after = await dashboard();
  assert.equal(after.visitors.totalVisitors - before.visitors.totalVisitors, 10);
  assert.equal(after.summary.visitorTotal - before.summary.visitorTotal, 10);
  assert.equal(after.summary.grandTotal - before.summary.grandTotal, 10);
});

test("visitors rejects an empty headcount", async () => {
  const res = await post("/api/visitors", { male: 0, female: 0 });
  assert.equal(res.status, 400);
});

/* ---------------- Uploads ---------------- */

test("upload stores a photo and increments the school's photo count", async () => {
  const school = await post("/api/schools", { schoolName: "Photo Target School", male: 1, female: 1, coordinatorName: "C", coordinatorPhone: "08011110000", confirmedNotDuplicate: true });
  const schoolId = school.body.id;

  const res = await post("/api/uploads", {
    schoolId,
    schoolName: "Photo Target School",
    fileName: "sheet.jpg",
    base64Data: "data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD/2wBD",
    station: "Upload Desk",
  });
  assert.equal(res.body.success, true);

  const { body } = await get("/api/schools");
  const school2 = body.schools.find((s: Json) => s.id === schoolId);
  assert.equal(school2.photoCount, 1);
});

test("upload rejects a non-data-URL payload", async () => {
  const res = await post("/api/uploads", { schoolId: 1, base64Data: "not-a-data-url" });
  assert.equal(res.status, 400);
  assert.equal(res.body.success, false);
});

/* ---------------- Idempotency (no double-counting) ---------------- */

test("a retried write with the same clientRequestId is counted once", async () => {
  const before = await dashboard();
  const rid = "test-rid-" + Date.now() + "-" + Math.random().toString(36).slice(2);
  const payload = { male: 3, female: 2, notes: "Idempotent", station: "X", clientRequestId: rid };

  const r1 = await post("/api/visitors", payload);
  const r2 = await post("/api/visitors", payload); // simulated retry — same id
  assert.equal(r1.body.success, true);
  assert.equal(r2.body.success, true);

  const after = await dashboard();
  // 5 added once, NOT 10 — the retry replayed the stored response.
  assert.equal(after.visitors.totalVisitors - before.visitors.totalVisitors, 5);
});

test("writes without a clientRequestId are independent (not deduped)", async () => {
  const before = await dashboard();
  await post("/api/visitors", { male: 1, female: 0, station: "Y" });
  await post("/api/visitors", { male: 1, female: 0, station: "Y" });
  const after = await dashboard();
  assert.equal(after.visitors.totalVisitors - before.visitors.totalVisitors, 2);
});

/* ---------------- Aggregation invariants ---------------- */

test("dashboard totals are internally consistent", async () => {
  const d = await dashboard();
  assert.equal(
    d.summary.grandTotal,
    d.summary.studentTotal + d.summary.memberTotal + d.summary.visitorTotal + d.summary.workerTotal,
  );
  assert.equal(d.workers.total, d.workers.bulkTotal + d.workers.individualTotal);
  assert.equal(d.stats.totalStudents, d.schools.reduce((a: number, s: Json) => a + s.total, 0));
  assert.equal(d.bulk.totalMembers, d.bulk.groups.reduce((a: number, g: Json) => a + g.total, 0));
  assert.equal(d.visitors.totalVisitors, d.visitors.visitors.reduce((a: number, v: Json) => a + v.total, 0));
});

test("summary endpoint matches dashboard summary", async () => {
  const d = await dashboard();
  const { body: s } = await get("/api/summary");
  assert.equal(s.grandTotal, d.summary.grandTotal);
  assert.equal(s.studentTotal, d.summary.studentTotal);
  assert.equal(s.workerTotal, d.summary.workerTotal);
});
