import "server-only";
import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { idempotencyKeys } from "@/db/schema";

export type HandlerResult = { status: number; body: Record<string, unknown> };

/**
 * Runs a write handler at most once per clientRequestId. If the same id has
 * already produced a successful response, that stored response is replayed
 * instead of re-running the insert — preventing double-counted headcounts when
 * an offline retry re-sends a write that actually committed the first time.
 *
 * Only successful writes are cached; validation failures are not, so a user can
 * correct and resubmit.
 */
export async function withIdempotency(
  key: unknown,
  compute: () => Promise<HandlerResult> | HandlerResult,
): Promise<NextResponse> {
  const k = typeof key === "string" && key.length > 0 && key.length <= 200 ? key : null;

  if (k) {
    const prior = await db.select().from(idempotencyKeys).where(eq(idempotencyKeys.key, k)).get();
    if (prior) {
      try {
        return NextResponse.json(JSON.parse(prior.response));
      } catch {
        /* corrupt cache entry — fall through and recompute */
      }
    }
  }

  const { status, body } = await compute();

  if (k && status < 300 && body?.success === true) {
    try {
      await db.insert(idempotencyKeys).values({ key: k, response: JSON.stringify(body) }).run();
    } catch {
      /* unique conflict from a concurrent duplicate — safe to ignore */
    }
  }

  return NextResponse.json(body, { status });
}

/** Parse a JSON request body, returning a typed error result on malformed input. */
export async function readJson(req: Request): Promise<{ body: any; error?: HandlerResult }> {
  try {
    return { body: await req.json() };
  } catch {
    return { body: null, error: { status: 400, body: { success: false, error: "Invalid request body." } } };
  }
}
