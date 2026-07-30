import { sqliteTable, integer, text, real, uniqueIndex } from "drizzle-orm/sqlite-core";

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

// Cardio/other-sport sessions (running, cycling, swimming, hiking...) — kept
// separate from crossfit_sessions because the shape is different (distance/
// pace/duration vs. sets/reps/weight per exercise).
export const activitySessions = sqliteTable("activity_sessions", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  userId: integer("user_id")
    .notNull()
    .references(() => users.id),
  type: text("type").notNull(),
  date: text("date").notNull(),
  distanceKm: real("distance_km"),
  durationSeconds: integer("duration_seconds"),
  pace: text("pace"),
  notes: text("notes"),
  rpe: text("rpe"),
  createdAt: integer("created_at").notNull(),
});

// Raw conversation turns (user message text / assistant reply text, not the
// intermediate tool_use/tool_result exchanges within a turn) used to give the
// agent short-term memory across separate WhatsApp messages. See
// conversationMessages.ts for the idle-window logic that decides how much of
// this to replay on the next message.
export const conversationMessages = sqliteTable("conversation_messages", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  userId: integer("user_id")
    .notNull()
    .references(() => users.id),
  role: text("role").notNull(),
  content: text("content").notNull(),
  createdAt: integer("created_at").notNull(),
});

// Tracks inbound WhatsApp message ids already handled by the agent, keyed per
// session. Persisted (rather than an in-memory Set) so a process restart
// doesn't forget what it already replied to — Baileys can redeliver the last
// message via messages.upsert on reconnect, and without this the bot would
// process and reply to it again.
export const processedMessages = sqliteTable(
  "processed_messages",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    sessionName: text("session_name").notNull(),
    messageId: text("message_id").notNull(),
    processedAt: integer("processed_at").notNull(),
  },
  (table) => ({
    sessionMessageUnique: uniqueIndex("processed_messages_session_message_unique").on(
      table.sessionName,
      table.messageId,
    ),
  }),
);
