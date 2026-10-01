import { NextResponse } from "next/server";
import { getSummary } from "@/lib/aggregate";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    return NextResponse.json(getSummary());
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to load summary" },
      { status: 500 },
    );
  }
}
