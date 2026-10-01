import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { AUTH_COOKIE } from "@/lib/auth";

export const dynamic = "force-dynamic";

async function clearAndRedirect(req: Request) {
  const jar = await cookies();
  jar.delete(AUTH_COOKIE);
  return NextResponse.redirect(new URL("/login", req.url));
}

// Support both a form POST (from the Lock button) and a direct GET.
export async function POST(req: Request) {
  return clearAndRedirect(req);
}

export async function GET(req: Request) {
  return clearAndRedirect(req);
}
