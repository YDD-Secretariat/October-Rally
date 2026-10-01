import { NextResponse } from "next/server";
import { db } from "@/db";
import { workerBulk } from "@/db/schema";
import { withIdempotency, readJson, type HandlerResult } from "@/lib/idempotency";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const { body, error } = await readJson(req);
  if (error) return NextResponse.json(error.body, { status: error.status });
  return withIdempotency(body.clientRequestId, () => registerBulkWorkers(body));
}

async function registerBulkWorkers(body: any): Promise<HandlerResult> {
  if (!body.confirmedExcludesIndividuals) {
    return { status: 400, body: { success: false, error: "Confirm this count excludes individual registrations." } };
  }
  const male = Math.max(0, parseInt(body.male) || 0);
  const female = Math.max(0, parseInt(body.female) || 0);
  const total = male + female;
  if (total <= 0) {
    return { status: 400, body: { success: false, error: "Enter at least one worker / minister." } };
  }

  await db.insert(workerBulk)
    .values({
      male,
      female,
      total,
      station: String(body.station || "").trim(),
      submittedBy: String(body.submittedBy || body.station || "").trim(),
    })
    .run();

  return { status: 200, body: { success: true, total } };
}
