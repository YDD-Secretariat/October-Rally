import type { Config } from "drizzle-kit";

// The app self-migrates at runtime (see src/db/index.ts), so drizzle-kit is
// optional — kept here for generating SQL migrations or inspecting the schema.
export default {
  schema: "./src/db/schema.ts",
  out: "./drizzle",
  dialect: "sqlite",
  dbCredentials: {
    url: "./data/rally.db",
  },
} satisfies Config;
