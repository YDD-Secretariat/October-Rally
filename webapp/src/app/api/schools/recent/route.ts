import { NextResponse } from "next/server";
import { desc } from "drizzle-orm";
import { db } from "@/db";
import { schools } from "@/db/schema";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const limit = Math.min(50, parseInt(new URL(req.url).searchParams.get("limit") || "8") || 8);
  const recent = db.select().from(schools).orderBy(desc(schools.createdAt)).limit(limit).all();
  return NextResponse.json({ recent });
}
