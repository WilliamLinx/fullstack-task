import express from "express";
import { validateRequest } from "zod-express-middleware";

import { createTaskSchema } from "../schemas/task";
import { db, eq, tables } from "../db";
import { CommandType, TaskStatus } from "shared/types/task";
import { sendCommandToQueue, sendTaskToQueue } from "../utils/rabbitMQ";

const taskRouter = express.Router();

taskRouter.post("/", validateRequest({ body: createTaskSchema }), async (req, res) => {
  const createdTasks = await db
    .insert(tables.tasks)
    .values({
      status: TaskStatus.PENDING,
    })
    .returning();
  sendTaskToQueue(createdTasks[0].id);
  res.json({ taskId: createdTasks[0].id });
});

taskRouter.get("/:id", async (req, res) => {
  const tasks = await db.select().from(tables.tasks).where(eq(tables.tasks.id, req.params.id));
  if (tasks.length === 0) {
    res.status(404).json({ error: "Task not found" });
    return;
  }
  res.json({ task: tasks[0] });
});

taskRouter.delete("/:id", async (req, res) => {
  const tasks = await db.delete(tables.tasks).where(eq(tables.tasks.id, req.params.id)).returning();
  if (tasks.length === 0) {
    res.status(404).json({ error: "Task not found" });
    return;
  }
  res.json({ message: "Task deleted" });
});

taskRouter.get("/all", async (req, res) => {
  //TODO: add pagination in future
  const tasks = await db.select().from(tables.tasks).all();
  res.json({ tasks });
});

taskRouter.post("/:id/cancel", async (req, res) => {
  const tasks = await db.select().from(tables.tasks).where(eq(tables.tasks.id, req.params.id));
  if (tasks.length === 0) {
    res.status(404).json({ error: "Task not found" });
    return;
  }
  if (tasks[0].status === TaskStatus.DONE || tasks[0].status === TaskStatus.ERROR) {
    res.status(400).json({ error: "Task is already completed and cannot be cancelled" });
    return;
  }
  sendCommandToQueue({ type: CommandType.CANCEL_TASK }, req.params.id);
  res.json({ message: "Task cancellation command sent" });
});

taskRouter.post("/:id/pause", async (req, res) => {
  const tasks = await db.select().from(tables.tasks).where(eq(tables.tasks.id, req.params.id));
  if (tasks.length === 0) {
    res.status(404).json({ error: "Task not found" });
    return;
  }
  if (tasks[0].status !== TaskStatus.IN_PROGRESS) {
    res.status(400).json({ error: "Task is not in progress and cannot be stopped" });
    return;
  }
  sendCommandToQueue({ type: CommandType.PAUSE_TASK }, req.params.id);
  res.json({ message: "Task pause command sent" });
});

taskRouter.post("/:id/resume", async (req, res) => {
  const tasks = await db.select().from(tables.tasks).where(eq(tables.tasks.id, req.params.id));
  if (tasks.length === 0) {
    res.status(404).json({ error: "Task not found" });
    return;
  }
  if (tasks[0].status !== TaskStatus.PAUSED) {
    res.status(400).json({ error: "Task is not paused" });
    return;
  }
  sendCommandToQueue({ type: CommandType.RESUME_TASK }, req.params.id);
  res.json({ message: "Task resume command sent" });
});

taskRouter.post("/:id/restart", async (req, res) => {
  const tasks = await db.select().from(tables.tasks).where(eq(tables.tasks.id, req.params.id));
  if (tasks.length === 0) {
    res.status(404).json({ error: "Task not found" });
    return;
  }
  if (
    tasks[0].status === TaskStatus.PENDING ||
    tasks[0].status === TaskStatus.CANCELLED ||
    tasks[0].status === TaskStatus.ERROR ||
    tasks[0].status === TaskStatus.DONE
  ) {
    res.status(400).json({ error: "Task cannot be restarted" });
    return;
  }
  sendCommandToQueue({ type: CommandType.RESTART_TASK }, req.params.id);
  res.json({ message: "Task restart command sent" });
});

export default taskRouter;
