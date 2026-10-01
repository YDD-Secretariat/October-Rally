import type { Config } from "drizzle-kit";

// The app self-migrates at runtime (see ensureSchema in src/db/index.ts), so
// drizzle-kit is optional — kept here for generating SQL or inspecting the
// schema. Uses Turso when configured, else a local libSQL file.
export default {
  schema: "./src/db/schema.ts",
  out: "./drizzle",
  dialect: "turso",
  dbCredentials: {
    url: process.env.TURSO_DATABASE_URL || "file:./data/rally.db",
    authToken: process.env.TURSO_AUTH_TOKEN,
  },
} satisfies Config;
