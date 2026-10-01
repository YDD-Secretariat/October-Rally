// Shared-passcode auth. Enabled only when RALLY_PASSCODE is set, so local dev
// and the test suite run without friction. Works in both the Edge middleware
// and Node route handlers (Web Crypto only — no Buffer / node:crypto).

export const AUTH_COOKIE = "rally_auth";
export const AUTH_MAX_AGE = 60 * 60 * 12; // 12 hours

export function authEnabled(): boolean {
  return !!process.env.RALLY_PASSCODE;
}

function secret(): string {
  return process.env.RALLY_AUTH_SECRET || process.env.RALLY_PASSCODE || "";
}

function toHex(buf: ArrayBuffer): string {
  return Array.from(new Uint8Array(buf))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

/** The cookie value a correctly-authenticated client holds. */
export async function expectedToken(): Promise<string> {
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret()),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const sig = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode("rally-authorized-v1"));
  return toHex(sig);
}

/** Constant-time-ish comparison of two equal-length hex strings. */
export function safeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}
