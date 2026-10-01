import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { AUTH_COOKIE, AUTH_MAX_AGE, authEnabled, expectedToken } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  // When auth is disabled there is nothing to log into.
  if (!authEnabled()) return NextResponse.json({ success: true });

  let passcode = "";
  try {
    passcode = String((await req.json()).passcode || "");
  } catch {
    return NextResponse.json({ success: false, error: "Invalid request." }, { status: 400 });
  }

  if (passcode !== process.env.RALLY_PASSCODE) {
    return NextResponse.json({ success: false, error: "Incorrect passcode." }, { status: 401 });
  }

  const jar = await cookies();
  jar.set(AUTH_COOKIE, await expectedToken(), {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: AUTH_MAX_AGE,
  });
  return NextResponse.json({ success: true });
}
