// Runs once when the server process starts (Next.js instrumentation hook).
// Ensures the database schema exists before any request is handled.
export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    const { ensureSchema } = await import("./db");
    await ensureSchema();
  }
}
