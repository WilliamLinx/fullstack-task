import express from "express";
import { validateRequest } from "zod-express-middleware";

import { createTaskSchema } from "../schemas/task";
import { db, tables } from "../db";
import { Command, CommandType, TaskStatus } from "../types/task";
import { sendCommandToQueue } from "../utils/rabbitMQ";

const taskRouter = express.Router();

taskRouter.post("/", validateRequest({ body: createTaskSchema }), async (req, res) => {
  const createdTasks = await db
    .insert(tables.tasks)
    .values({
      status: TaskStatus.PENDING,
    })
    .returning();
  sendCommandToQueue({ type: CommandType.CREATE_TASK, taskId: createdTasks[0].id } as Command);
  res.json({ taskId: createdTasks[0].id });
});

taskRouter.get("/:id", async (req, res) => {
  console.log("get task");
});

taskRouter.delete("/:id", async (req, res) => {
  console.log("delete task");
});

taskRouter.get("/all", async (req, res) => {
  console.log("get all tasks");
  res.json({ tasks: [] });
});

taskRouter.post("/:id/cancel", async (req, res) => {
  console.log("cancel task");
});

taskRouter.post("/:id/pause", async (req, res) => {
  console.log("pause task");
});

taskRouter.post("/:id/resume", async (req, res) => {
  console.log("resume task");
});

taskRouter.post("/:id/restart", async (req, res) => {
  console.log("restart task");
});

export default taskRouter;
