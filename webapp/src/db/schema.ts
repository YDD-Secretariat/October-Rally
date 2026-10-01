import { sql } from "drizzle-orm";
import { integer, sqliteTable, text } from "drizzle-orm/sqlite-core";

const now = sql`(strftime('%Y-%m-%dT%H:%M:%fZ','now'))`;

/** School headcount registrations. */
export const schools = sqliteTable("schools", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  schoolName: text("school_name").notNull(),
  location: text("location").default(""),
  coordinatorName: text("coordinator_name").default(""),
  coordinatorPhone: text("coordinator_phone").default(""),
  coordinatorLocation: text("coordinator_location").default(""),
  male: integer("male").notNull().default(0),
  female: integer("female").notNull().default(0),
  total: integer("total").notNull().default(0),
  station: text("station").default(""),
  photoCount: integer("photo_count").notNull().default(0),
  createdAt: text("created_at").notNull().default(now),
});

/** Bulk member headcounts, grouped (Group 1-4, Others / Visitors). */
export const bulkMembers = sqliteTable("bulk_members", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  groupName: text("group_name").notNull(),
  male: integer("male").notNull().default(0),
  female: integer("female").notNull().default(0),
  count: integer("count").notNull().default(0),
  station: text("station").default(""),
  submittedBy: text("submitted_by").default(""),
  createdAt: text("created_at").notNull().default(now),
});

/** Bulk workers / ministers headcounts (people not registered individually). */
export const workerBulk = sqliteTable("worker_bulk", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  male: integer("male").notNull().default(0),
  female: integer("female").notNull().default(0),
  total: integer("total").notNull().default(0),
  station: text("station").default(""),
  submittedBy: text("submitted_by").default(""),
  createdAt: text("created_at").notNull().default(now),
});

/** Pre-loaded roster of workers / ministers, searchable for individual registration. */
export const workerRoster = sqliteTable("worker_roster", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  fullName: text("full_name").notNull(),
  phone: text("phone").default(""),
  station: text("station").default(""),
  details: text("details").default(""),
  createdAt: text("created_at").notNull().default(now),
});

/** Individual worker / minister registrations (roster confirmations + walk-ins). */
export const workerRegistrations = sqliteTable("worker_registrations", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  rosterId: integer("roster_id"),
  fullName: text("full_name").notNull(),
  phone: text("phone").default(""),
  groupName: text("group_name").default(""),
  station: text("station").default(""),
  submittedBy: text("submitted_by").default(""),
  isWalkIn: integer("is_walk_in", { mode: "boolean" }).notNull().default(false),
  createdAt: text("created_at").notNull().default(now),
});

/** Visitor headcounts (counted under Members → Others / Visitors). */
export const visitors = sqliteTable("visitors", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  category: text("category").default("Visitors"),
  male: integer("male").notNull().default(0),
  female: integer("female").notNull().default(0),
  total: integer("total").notNull().default(0),
  notes: text("notes").default(""),
  station: text("station").default(""),
  createdAt: text("created_at").notNull().default(now),
});

/**
 * Idempotency keys for write requests. A client sends a stable clientRequestId;
 * if the same id arrives again (e.g. an offline retry after the first attempt
 * actually committed), the stored response is returned instead of inserting a
 * duplicate — so headcounts can't be double-counted.
 */
export const idempotencyKeys = sqliteTable("idempotency_keys", {
  key: text("key").primaryKey(),
  response: text("response").notNull(),
  createdAt: text("created_at").notNull().default(now),
});

/** Uploaded attendance-sheet photos, linked to a school. */
export const photos = sqliteTable("photos", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  schoolId: integer("school_id"),
  schoolName: text("school_name").default(""),
  fileName: text("file_name").default(""),
  storedPath: text("stored_path").notNull(),
  station: text("station").default(""),
  createdAt: text("created_at").notNull().default(now),
});
