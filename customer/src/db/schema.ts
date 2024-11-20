import { sqliteTable, integer, text } from "drizzle-orm/sqlite-core";
import { randomUUID } from "crypto";
import { TaskStatus } from "shared";

export const tasks = sqliteTable("tasks", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => randomUUID()),
  status: text("status", {
    enum: [
      TaskStatus.DONE,
      TaskStatus.ERROR,
      TaskStatus.IN_PROGRESS,
      TaskStatus.PAUSED,
      TaskStatus.PENDING,
      TaskStatus.CANCELLED,
    ],
  }).notNull(),
  progress: integer("progress").default(0),
  error: text("error"),
  createdAt: integer("created_at", { mode: "timestamp" }).$defaultFn(() => new Date()),
  updatedAt: integer("updated_at", { mode: "timestamp" }).$defaultFn(() => new Date()),
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
    enum: [
      TaskStatus.DONE,
      TaskStatus.ERROR,
      TaskStatus.IN_PROGRESS,
      TaskStatus.PAUSED,
      TaskStatus.PENDING,
      TaskStatus.CANCELLED,
    ],
  }).notNull(),
  message: text("message"),
  createdAt: integer("created_at", { mode: "timestamp" }).notNull(),
});
