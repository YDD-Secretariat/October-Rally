import { NextResponse } from "next/server";
import { searchRoster } from "@/lib/aggregate";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const q = new URL(req.url).searchParams.get("q") || "";
  return NextResponse.json({ workers: searchRoster(q) });
}
