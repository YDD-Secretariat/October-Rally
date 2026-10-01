import { NextResponse } from "next/server";
import { db } from "@/db";
import { schools } from "@/db/schema";
import { getSchoolRows } from "@/lib/aggregate";
import { similarityPercent } from "@/lib/similarity";
import { withIdempotency, readJson, type HandlerResult } from "@/lib/idempotency";
import type { DuplicateMatch } from "@/lib/types";

export const dynamic = "force-dynamic";

const DUPLICATE_THRESHOLD = 80;

export async function GET() {
  return NextResponse.json({ schools: getSchoolRows() });
}

export async function POST(req: Request) {
  const { body, error } = await readJson(req);
  if (error) return NextResponse.json(error.body, { status: error.status });
  return withIdempotency(body.clientRequestId, () => registerSchool(body));
}

function registerSchool(body: any): HandlerResult {
  const schoolName = String(body.schoolName || "").trim();
  if (!schoolName) {
    return { status: 400, body: { success: false, error: "School name is required." } };
  }

  const male = Math.max(0, parseInt(body.male) || 0);
  const female = Math.max(0, parseInt(body.female) || 0);
  const total = male + female;

  // Fuzzy duplicate guard unless the desk confirmed it's different.
  if (!body.confirmedNotDuplicate) {
    const existing = db.select().from(schools).all();
    const matches: DuplicateMatch[] = existing
      .map((s) => ({
        schoolName: s.schoolName,
        similarity: similarityPercent(schoolName, s.schoolName),
        coordinatorName: s.coordinatorName || "",
        coordinatorPhone: s.coordinatorPhone || "",
        total: s.total,
        male: s.male,
        female: s.female,
        station: s.station || "",
      }))
      .filter((m) => m.similarity >= DUPLICATE_THRESHOLD)
      .sort((a, b) => b.similarity - a.similarity)
      .slice(0, 3);

    if (matches.length) {
      return { status: 200, body: { success: false, duplicate: true, matches } };
    }
  }

  const inserted = db
    .insert(schools)
    .values({
      schoolName,
      location: String(body.location || "").trim(),
      coordinatorName: String(body.coordinatorName || "").trim(),
      coordinatorPhone: String(body.coordinatorPhone || "").trim(),
      coordinatorLocation: String(body.coordinatorLocation || "").trim(),
      male,
      female,
      total,
      station: String(body.station || "").trim(),
    })
    .returning()
    .get();

  return { status: 200, body: { success: true, schoolName, id: inserted.id } };
}
