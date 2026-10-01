import { NextResponse } from "next/server";
import fs from "node:fs/promises";
import path from "node:path";
import { eq, sql } from "drizzle-orm";
import { db, UPLOADS_DIR } from "@/db";
import { photos, schools } from "@/db/schema";
import { withIdempotency, readJson, type HandlerResult } from "@/lib/idempotency";

export const dynamic = "force-dynamic";

// Keep uploads bounded — the client already compresses, but guard the server too.
const MAX_BYTES = 8 * 1024 * 1024;

export async function POST(req: Request) {
  const { body, error } = await readJson(req);
  if (error) return NextResponse.json(error.body, { status: error.status });
  return withIdempotency(body.clientRequestId, () => storePhoto(body));
}

async function storePhoto(body: any): Promise<HandlerResult> {
  const base64 = String(body.base64Data || "");
  const match = /^data:(image\/[a-z.+-]+);base64,(.+)$/i.exec(base64);
  if (!match) {
    return { status: 400, body: { success: false, error: "Invalid image data." } };
  }

  const buffer = Buffer.from(match[2], "base64");
  if (buffer.byteLength > MAX_BYTES) {
    return { status: 413, body: { success: false, error: "Image too large." } };
  }

  const schoolId = body.schoolId != null ? parseInt(body.schoolId) : null;
  const schoolName = String(body.schoolName || "").trim();
  const safeName = `${Date.now()}_${Math.random().toString(36).slice(2)}.jpg`;
  const storedPath = path.join(UPLOADS_DIR, safeName);
  await fs.writeFile(storedPath, buffer);

  db.insert(photos)
    .values({
      schoolId: Number.isFinite(schoolId) ? schoolId : null,
      schoolName,
      fileName: String(body.fileName || safeName),
      storedPath,
      station: String(body.station || "").trim(),
    })
    .run();

  if (Number.isFinite(schoolId)) {
    db.update(schools)
      .set({ photoCount: sql`${schools.photoCount} + 1` })
      .where(eq(schools.id, schoolId as number))
      .run();
  }

  return { status: 200, body: { success: true, fileName: safeName } };
}
