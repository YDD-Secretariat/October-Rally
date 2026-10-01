import { NextResponse } from "next/server";
import { db } from "@/db";
import { visitors } from "@/db/schema";
import { withIdempotency, readJson, type HandlerResult } from "@/lib/idempotency";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const { body, error } = await readJson(req);
  if (error) return NextResponse.json(error.body, { status: error.status });
  return withIdempotency(body.clientRequestId, () => registerVisitors(body));
}

function registerVisitors(body: any): HandlerResult {
  const male = Math.max(0, parseInt(body.male) || 0);
  const female = Math.max(0, parseInt(body.female) || 0);
  const total = male + female;
  if (total <= 0) {
    return { status: 400, body: { success: false, error: "Enter at least one visitor." } };
  }

  db.insert(visitors)
    .values({
      category: String(body.category || "Visitors").trim(),
      male,
      female,
      total,
      notes: String(body.notes || "").trim(),
      station: String(body.station || "").trim(),
    })
    .run();

  return { status: 200, body: { success: true, total } };
}
