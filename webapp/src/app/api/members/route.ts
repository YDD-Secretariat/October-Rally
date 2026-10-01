import { NextResponse } from "next/server";
import { db } from "@/db";
import { bulkMembers } from "@/db/schema";
import { MEMBER_GROUPS } from "@/lib/types";
import { withIdempotency, readJson, type HandlerResult } from "@/lib/idempotency";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const { body, error } = await readJson(req);
  if (error) return NextResponse.json(error.body, { status: error.status });
  return withIdempotency(body.clientRequestId, () => registerMembers(body));
}

function registerMembers(body: any): HandlerResult {
  const groupName = String(body.group || "").trim();
  if (!MEMBER_GROUPS.includes(groupName as (typeof MEMBER_GROUPS)[number])) {
    return { status: 400, body: { success: false, error: "Select a valid group." } };
  }
  const male = Math.max(0, parseInt(body.male) || 0);
  const female = Math.max(0, parseInt(body.female) || 0);
  const count = male + female;
  if (count <= 0) {
    return { status: 400, body: { success: false, error: "Enter at least one member." } };
  }

  db.insert(bulkMembers)
    .values({
      groupName,
      male,
      female,
      count,
      station: String(body.station || "").trim(),
      submittedBy: String(body.submittedBy || body.station || "").trim(),
    })
    .run();

  return { status: 200, body: { success: true, group: groupName, count } };
}
