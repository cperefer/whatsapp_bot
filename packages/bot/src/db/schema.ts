import { sqliteTable, integer, text, real } from "drizzle-orm/sqlite-core";

export const users = sqliteTable("users", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  phone: text("phone").notNull().unique(),
  name: text("name").notNull(),
  createdAt: integer("created_at").notNull(),
});

export const shoppingItems = sqliteTable("shopping_items", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  item: text("item").notNull(),
  quantity: integer("quantity").notNull(),
  addedBy: integer("added_by")
    .notNull()
    .references(() => users.id),
  addedAt: integer("added_at").notNull(),
  checked: integer("checked").notNull().default(0),
  checkedAt: integer("checked_at"),
});

export const crossfitSessions = sqliteTable("crossfit_sessions", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  userId: integer("user_id")
    .notNull()
    .references(() => users.id),
  date: text("date").notNull(),
  notes: text("notes"),
  rpe: text("rpe"),
  createdAt: integer("created_at").notNull(),
});

export const crossfitExercises = sqliteTable("crossfit_exercises", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  sessionId: integer("session_id")
    .notNull()
    .references(() => crossfitSessions.id),
  name: text("name").notNull(),
  sets: integer("sets").notNull(),
  reps: integer("reps").notNull(),
  weightKg: real("weight_kg").notNull(),
});

export const crossfitPrs = sqliteTable("crossfit_prs", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  userId: integer("user_id")
    .notNull()
    .references(() => users.id),
  name: text("name").notNull(),
  reps: integer("reps").notNull(),
  result: real("result").notNull(),
  unit: text("unit").notNull(),
});
