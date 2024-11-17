import { sqliteTable, integer, text } from "drizzle-orm/sqlite-core";
import { randomUUID } from "crypto";
import { LogType, TaskStatus } from "../types/task";

export const tasks = sqliteTable("tasks", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => randomUUID()),
  status: text("status", {
    enum: [TaskStatus.DONE, TaskStatus.ERROR, TaskStatus.IN_PROGRESS, TaskStatus.PAUSED, TaskStatus.PENDING],
  }).notNull(),
  progress: integer("progress").default(0),
  error: text("error"),
  created_at: integer("created_at", { mode: "timestamp" }).$defaultFn(() => new Date()),
  updated_at: integer("updated_at", { mode: "timestamp" }).$defaultFn(() => new Date()),
});

export const logs = sqliteTable("logs", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => randomUUID()),
  taskId: text("taskId")
    .notNull()
    .references(() => tasks.id, {
      onDelete: "cascade",
    }),
  taskStatus: text("taskStatus", {
    enum: [TaskStatus.DONE, TaskStatus.ERROR, TaskStatus.IN_PROGRESS, TaskStatus.PAUSED, TaskStatus.PENDING],
  }).notNull(),
  type: text("type", { enum: [LogType.ERROR, LogType.INFO, LogType.WARNING] }).notNull(),
  message: text("message").notNull(),
  created_at: text("created_at").notNull(),
});
