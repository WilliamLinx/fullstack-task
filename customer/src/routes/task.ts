import express from "express";
import { validateRequest } from "zod-express-middleware";

import { allTasksSchema, createTaskSchema, taskIdSchema, taskStatsSchema } from "../schemas/task";
import { count, db, desc, eq, tables, and, gte, lte } from "../db";
import { CommandType, TaskStatus } from "shared/types/task";
import type { TaskStatsResponse, GetAllTasksResponse, Task, TaskLogResponse } from "shared/types/response";
import { sendCommandToQueue, sendTaskToQueue } from "../utils/rabbitMQ";

const taskRouter = express.Router();

taskRouter.post("/create", validateRequest({ body: createTaskSchema }), async (req, res) => {
  const createdTasks = await db
    .insert(tables.tasks)
    .values({
      status: TaskStatus.PENDING,
    })
    .returning();
  await db.insert(tables.logs).values({
    taskId: createdTasks[0].id,
    taskStatus: TaskStatus.PENDING,
    message: "Task has been created",
    createdAt: new Date(),
  });
  sendTaskToQueue(createdTasks[0].id, req.body.priority || 0);
  res.json({ taskId: createdTasks[0].id });
});

taskRouter.get("/all", validateRequest({ query: allTasksSchema }), async (req, res) => {
  const taskCount = await db.select({ total: count() }).from(tables.tasks);
  const tasks = await db
    .select()
    .from(tables.tasks)
    .limit(Number(req.query.limit))
    .offset(Number(req.query.offset))
    .orderBy(desc(tables.tasks.createdAt));
  res.json({ total: taskCount[0].total, tasks } as GetAllTasksResponse);
});

taskRouter.get("/stats", validateRequest({ query: taskStatsSchema }), async (req, res) => {
  const taskLogs = await db
    .select()
    .from(tables.logs)
    .where(
      and(
        gte(tables.logs.createdAt, new Date(Number(req.query.from))),
        lte(tables.logs.createdAt, new Date(Number(req.query.to)))
      )
    );
  const tasks = await db
    .select()
    .from(tables.tasks)
    .where(
      and(
        gte(tables.tasks.createdAt, new Date(Number(req.query.from))),
        lte(tables.tasks.createdAt, new Date(Number(req.query.to)))
      )
    );

  // Initialize stats
  let successful = 0;
  let failed = 0;
  let pending = 0;
  let inProgress = 0;
  let total = tasks.length;
  let totalDurations = 0;
  let max_duration = 0;
  let average_duration = 0;

  if (taskLogs.length === 0) {
    res.json({
      pending,
      in_progress: inProgress,
      successful,
      failed,
      total,
      average_duration,
      max_duration,
    } as TaskStatsResponse);
    return;
  }

  for (const task of tasks) {
    // Fetch logs for each task
    const taskLogs = await db
      .select()
      .from(tables.logs)
      .where(eq(tables.logs.taskId, task.id))
      .orderBy(tables.logs.createdAt);

    if (task.status === TaskStatus.DONE) successful++;
    if (task.status === TaskStatus.ERROR) failed++;
    if (task.status === TaskStatus.PENDING) pending++;
    if (task.status === TaskStatus.IN_PROGRESS) inProgress++;

    // Calculate task duration if DONE status
    if (task.status === TaskStatus.DONE && taskLogs.length > 0) {
      const firstLog = taskLogs[0];
      const lastLog = taskLogs[taskLogs.length - 1];
      const duration = new Date(lastLog.createdAt).getTime() - new Date(firstLog.createdAt).getTime();
      totalDurations += duration;
      if (duration > max_duration) max_duration = duration / 1000;
    }
  }

  average_duration = total > 0 ? totalDurations / successful / 1000 : 0;

  res.json({
    pending,
    in_progress: inProgress,
    successful,
    failed,
    total,
    average_duration,
    max_duration,
  } as TaskStatsResponse);
});

taskRouter.get("/:id", validateRequest({ params: taskIdSchema }), async (req, res) => {
  const taskLogs = await db
    .select()
    .from(tables.logs)
    .where(eq(tables.logs.taskId, req.params.id))
    .orderBy(tables.logs.createdAt);
  if (taskLogs.length === 0) {
    res.status(404).json({ error: "No logs for task has been found" });
    return;
  }
  res.json({ logs: taskLogs } as TaskLogResponse);
});

taskRouter.delete("/:id", validateRequest({ params: taskIdSchema }), async (req, res) => {
  const tasks = await db.delete(tables.tasks).where(eq(tables.tasks.id, req.params.id)).returning();
  if (tasks.length === 0) {
    res.status(404).json({ error: "Task not found" });
    return;
  }
  // If the task is not finished, cancel it
  if (tasks[0].status !== TaskStatus.DONE && tasks[0].status !== TaskStatus.ERROR) {
    sendCommandToQueue({ type: CommandType.CANCEL_TASK }, req.params.id);
  }
  res.json({ message: "Task deleted" });
});

taskRouter.post("/:id/cancel", validateRequest({ params: taskIdSchema }), async (req, res) => {
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

taskRouter.post("/:id/pause", validateRequest({ params: taskIdSchema }), async (req, res) => {
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

taskRouter.post("/:id/resume", validateRequest({ params: taskIdSchema }), async (req, res) => {
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

taskRouter.post("/:id/restart", validateRequest({ params: taskIdSchema }), async (req, res) => {
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
