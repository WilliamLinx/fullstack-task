import amqp, { Connection, Channel, ConsumeMessage } from "amqplib";

import { db, eq, tables } from "../db";
import { Command, ErrorReport, ProgressReport, ReportType, TaskStatus, Report } from "shared";

let connection: Connection | null = null;
let channel: Channel | null = null;

export async function connectToRabbitMQ() {
  // Connect to RabbitMQ
  connection = await amqp.connect(
    `amqp://${process.env.RABBITMQ_USER}:${process.env.RABBITMQ_PASSWORD}@${process.env.RABBITMQ_HOST}:${process.env.RABBITMQ_PORT}`
  );
  channel = await connection.createChannel();

  // Prepare a queue for distributing tasks
  channel.assertQueue(process.env.RABBITMQ_TASK_QUEUE_NAME, { durable: true, maxPriority: 5 });

  // Prepare exchange for sending commands
  channel.assertExchange(process.env.RABBITMQ_COMMAND_EXCHANGE_NAME, "direct", { durable: true });

  // Prepare a queue for consuming report updates and start consuming
  channel.assertQueue(process.env.RABBITMQ_REPORT_QUEUE_NAME, { durable: true });
  channel.consume(process.env.RABBITMQ_REPORT_QUEUE_NAME, (msg) => handleReport(msg), { noAck: true });

  console.log("Connected to RabbitMQ");

  // Graceful shutdown
  process.on("SIGINT", closeConnection); // Ctrl + C handler
  process.on("SIGTERM", closeConnection); // kill PID handler
}

export async function sendCommandToQueue(command: Command, taskId: string) {
  if (!channel) throw new Error("Channel is not initialized");
  channel.publish(process.env.RABBITMQ_COMMAND_EXCHANGE_NAME, taskId, Buffer.from(JSON.stringify(command)), {
    persistent: true,
  });
}

export async function sendTaskToQueue(taskId: string, priority: number) {
  if (!channel) throw new Error("Channel is not initialized");
  channel.sendToQueue(process.env.RABBITMQ_TASK_QUEUE_NAME, Buffer.from(JSON.stringify({ taskId })), {
    persistent: true,
    priority,
  });
}

async function handleReport(msg: ConsumeMessage | null) {
  if (!msg) {
    return;
  }
  const report = JSON.parse(msg.content.toString()) as Report;

  // do not create log and update if task is not in DB
  const task = await db.select().from(tables.tasks).where(eq(tables.tasks.id, report.taskId));
  if (task.length === 0) {
    return;
  }

  switch (report.type) {
    case ReportType.STARTED:
      await db
        .update(tables.tasks)
        .set({ status: TaskStatus.IN_PROGRESS, updatedAt: new Date(msg.properties.timestamp) })
        .where(eq(tables.tasks.id, report.taskId));
      await db.insert(tables.logs).values({
        taskId: report.taskId,
        taskStatus: TaskStatus.IN_PROGRESS,
        message: "Task has started",
        createdAt: new Date(msg.properties.timestamp),
      });
      break;
    case ReportType.PROGRESS:
      const progressReport = report as ProgressReport;
      await db
        .update(tables.tasks)
        .set({
          status: TaskStatus.IN_PROGRESS,
          progress: progressReport.progress,
          updatedAt: new Date(msg.properties.timestamp),
        })
        .where(eq(tables.tasks.id, report.taskId));
      await db.insert(tables.logs).values({
        taskId: report.taskId,
        taskStatus: TaskStatus.IN_PROGRESS,
        message: `Task progress: ${progressReport.progress}%`,
        createdAt: new Date(msg.properties.timestamp),
      });
      break;
    case ReportType.COMPLETED:
      await db
        .update(tables.tasks)
        .set({ status: TaskStatus.DONE, updatedAt: new Date(msg.properties.timestamp) })
        .where(eq(tables.tasks.id, report.taskId));
      await db.insert(tables.logs).values({
        taskId: report.taskId,
        taskStatus: TaskStatus.DONE,
        message: "Task has completed",
        createdAt: new Date(msg.properties.timestamp),
      });
      break;
    case ReportType.ERROR:
      const errorReport = report as ErrorReport;
      await db
        .update(tables.tasks)
        .set({ status: TaskStatus.ERROR, error: errorReport.error, updatedAt: new Date(msg.properties.timestamp) })
        .where(eq(tables.tasks.id, report.taskId));
      await db.insert(tables.logs).values({
        taskId: report.taskId,
        taskStatus: TaskStatus.ERROR,
        message: `Task has failed: ${errorReport.error}`,
        createdAt: new Date(msg.properties.timestamp),
      });
      break;
    case ReportType.PAUSED:
      await db
        .update(tables.tasks)
        .set({ status: TaskStatus.PAUSED, updatedAt: new Date(msg.properties.timestamp) })
        .where(eq(tables.tasks.id, report.taskId));
      await db.insert(tables.logs).values({
        taskId: report.taskId,
        taskStatus: TaskStatus.PAUSED,
        message: "Task has paused",
        createdAt: new Date(msg.properties.timestamp),
      });
      break;
    case ReportType.RESUMED:
      await db
        .update(tables.tasks)
        .set({ status: TaskStatus.IN_PROGRESS, updatedAt: new Date(msg.properties.timestamp) })
        .where(eq(tables.tasks.id, report.taskId));
      await db.insert(tables.logs).values({
        taskId: report.taskId,
        taskStatus: TaskStatus.IN_PROGRESS,
        message: "Task has resumed",
        createdAt: new Date(msg.properties.timestamp),
      });
      break;
    case ReportType.CANCELLED:
      await db
        .update(tables.tasks)
        .set({ status: TaskStatus.CANCELLED, updatedAt: new Date(msg.properties.timestamp) })
        .where(eq(tables.tasks.id, report.taskId));
      await db.insert(tables.logs).values({
        taskId: report.taskId,
        taskStatus: TaskStatus.CANCELLED,
        message: "Task has been cancelled",
        createdAt: new Date(msg.properties.timestamp),
      });
      break;
    case ReportType.RESTARTED:
      await db.insert(tables.logs).values({
        taskId: report.taskId,
        taskStatus: TaskStatus.PENDING,
        message: "Task has been restarted",
        createdAt: new Date(msg.properties.timestamp),
      });
    default:
      console.error("Unknown report type: ", report);
  }
}

async function closeConnection() {
  if (channel) await channel.close();
  if (connection) await connection.close();
  console.log("Diconnected from RabbitMQ");
  process.exit(0);
}
