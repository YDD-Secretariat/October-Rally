import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { workerRegistrations, workerRoster } from "@/db/schema";
import { MEMBER_GROUPS } from "@/lib/types";
import { withIdempotency, readJson, type HandlerResult } from "@/lib/idempotency";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const { body, error } = await readJson(req);
  if (error) return NextResponse.json(error.body, { status: error.status });
  return withIdempotency(body.clientRequestId, () => registerWorker(body));
}

function registerWorker(body: any): HandlerResult {
  const group = String(body.group || "").trim();
  const phone = String(body.phone || "").replace(/\D/g, "");
  const submittedBy = String(body.submittedBy || body.station || "").trim();

  if (!MEMBER_GROUPS.includes(group as (typeof MEMBER_GROUPS)[number])) {
    return { status: 400, body: { success: false, error: "Choose a group or Others." } };
  }
  if (phone.length < 10) {
    return { status: 400, body: { success: false, error: "Enter a valid phone number." } };
  }

  const isWalkIn = !body.rowId;
  let fullName = String(body.name || "").trim();
  let rosterId: number | null = null;

  if (!isWalkIn) {
    const rosterId_ = parseInt(body.rowId);
    const person = db.select().from(workerRoster).where(eq(workerRoster.id, rosterId_)).get();
    if (!person) {
      return { status: 404, body: { success: false, error: "Roster entry not found." } };
    }
    const already = db
      .select()
      .from(workerRegistrations)
      .where(eq(workerRegistrations.rosterId, rosterId_))
      .get();
    if (already) {
      return { status: 200, body: { success: false, duplicate: true, error: `${person.fullName} is already registered.` } };
    }
    rosterId = rosterId_;
    fullName = person.fullName;
  }

  if (fullName.length < 2) {
    return { status: 400, body: { success: false, error: "Enter a full name." } };
  }

  db.insert(workerRegistrations)
    .values({
      rosterId,
      fullName,
      phone,
      groupName: group,
      station: String(body.station || group).trim(),
      submittedBy,
      isWalkIn,
    })
    .run();

  return { status: 200, body: { success: true, fullName, group } };
}
