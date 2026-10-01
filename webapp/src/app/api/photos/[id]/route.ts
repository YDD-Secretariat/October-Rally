import { NextResponse } from "next/server";
import fs from "node:fs/promises";
import path from "node:path";
import { eq } from "drizzle-orm";
import { db, UPLOADS_DIR } from "@/db";
import { photos } from "@/db/schema";

export const dynamic = "force-dynamic";

// Serve the image bytes for one stored photo. Auth is enforced by middleware.
// Keeps the image behind auth whether it lives on disk or in Vercel Blob.
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const photoId = parseInt(id);
  if (!Number.isFinite(photoId)) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const row = await db.select().from(photos).where(eq(photos.id, photoId)).get();
  if (!row) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const headers = { "Content-Type": "image/jpeg", "Cache-Control": "private, max-age=3600" };

  // Blob-stored photo: proxy the bytes so the blob URL stays behind auth.
  if (/^https?:\/\//.test(row.storedPath)) {
    try {
      const res = await fetch(row.storedPath);
      if (!res.ok) throw new Error(`blob ${res.status}`);
      return new NextResponse(res.body, { headers });
    } catch {
      return NextResponse.json({ error: "File missing" }, { status: 404 });
    }
  }

  // Disk-stored photo: only ever serve files inside the uploads directory.
  const resolved = path.resolve(row.storedPath);
  if (resolved !== path.resolve(UPLOADS_DIR, path.basename(resolved))) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  try {
    const buffer = await fs.readFile(resolved);
    return new NextResponse(new Uint8Array(buffer), { headers });
  } catch {
    return NextResponse.json({ error: "File missing" }, { status: 404 });
  }
}
