import { NextResponse } from "next/server";
import { getDashboard } from "@/lib/aggregate";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    return NextResponse.json(getDashboard());
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to load dashboard" },
      { status: 500 },
    );
  }
}
