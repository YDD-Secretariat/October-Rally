// Runs once when the server process starts (Next.js instrumentation hook).
export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    const { startBackupScheduler } = await import("./db/backup");
    startBackupScheduler();
  }
}
