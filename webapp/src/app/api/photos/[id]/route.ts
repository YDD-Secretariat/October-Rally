import { NextResponse } from "next/server";
import fs from "node:fs/promises";
import path from "node:path";
import { eq } from "drizzle-orm";
import { db, UPLOADS_DIR } from "@/db";
import { photos } from "@/db/schema";

export const dynamic = "force-dynamic";

// Serve the image bytes for one stored photo. Auth is enforced by middleware.
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const photoId = parseInt(id);
  if (!Number.isFinite(photoId)) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const row = db.select().from(photos).where(eq(photos.id, photoId)).get();
  if (!row) return NextResponse.json({ error: "Not found" }, { status: 404 });

  // Only ever serve files that live inside the uploads directory.
  const resolved = path.resolve(row.storedPath);
  if (resolved !== path.resolve(UPLOADS_DIR, path.basename(resolved))) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const buffer = await fs.readFile(resolved);
    return new NextResponse(new Uint8Array(buffer), {
      headers: {
        "Content-Type": "image/jpeg",
        "Cache-Control": "private, max-age=3600",
      },
    });
  } catch {
    return NextResponse.json({ error: "File missing" }, { status: 404 });
  }
}
