import { NextResponse } from "next/server";
import { desc, eq } from "drizzle-orm";
import { db } from "@/db";
import { photos } from "@/db/schema";

export const dynamic = "force-dynamic";

// List photo metadata (not the bytes) for a school.
export async function GET(req: Request) {
  const schoolId = parseInt(new URL(req.url).searchParams.get("schoolId") || "");
  if (!Number.isFinite(schoolId)) {
    return NextResponse.json({ photos: [] });
  }
  const rows = db
    .select({ id: photos.id, fileName: photos.fileName, createdAt: photos.createdAt })
    .from(photos)
    .where(eq(photos.schoolId, schoolId))
    .orderBy(desc(photos.createdAt))
    .all();
  return NextResponse.json({ photos: rows });
}
