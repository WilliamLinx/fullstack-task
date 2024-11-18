import amqp, { Connection, Channel, ConsumeMessage } from "amqplib";

import { db, eq, tables } from "../db";
import { Command, ErrorReport, ProgressReport, ReportType, TaskStatus, Report } from "shared/types/task";

let connection: Connection | null = null;
let channel: Channel | null = null;

export async function connectToRabbitMQ() {
  // Connect to RabbitMQ
  connection = await amqp.connect(
    `amqp://${process.env.RABBITMQ_USER}:${process.env.RABBITMQ_PASSWORD}@${process.env.RABBITMQ_HOST}:${process.env.RABBITMQ_PORT}`
  );
  channel = await connection.createChannel();

  // Prepare a queue for distributing tasks
  channel.assertQueue(process.env.RABBITMQ_TASK_QUEUE_NAME, { durable: true });

  // Prepare exchange for sending commands
  channel.assertExchange(process.env.RABBITMQ_COMMAND_EXCHANGE_NAME, "direct", { durable: true });

  // Prepare a queue for consuming report updates and start consuming
  channel.assertQueue(process.env.RABBITMQ_REPORT_QUEUE_NAME, { durable: true });
  channel.consume(process.env.RABBITMQ_REPORT_QUEUE_NAME, (msg) => handleReport(msg), { noAck: true });

  console.log("Connected to RabbitMQ");
}

export async function sendCommandToQueue(command: Command, taskId: string) {
  if (!channel) throw new Error("Channel is not initialized");
  channel.publish(process.env.RABBITMQ_COMMAND_EXCHANGE_NAME, taskId, Buffer.from(JSON.stringify(command)), {
    persistent: true,
  });
}

export async function sendTaskToQueue(taskId: string) {
  if (!channel) throw new Error("Channel is not initialized");
  channel.sendToQueue(process.env.RABBITMQ_TASK_QUEUE_NAME, Buffer.from(JSON.stringify({ taskId })), {
    persistent: true,
  });
}

async function handleReport(msg: ConsumeMessage | null) {
  if (!msg) {
    console.error("Received empty message");
    return;
  }
  const report = JSON.parse(msg.content.toString()) as Report;
  console.log("Received report: ", report);

  switch (report.type) {
    case ReportType.STARTED:
      await db
        .update(tables.tasks)
        .set({ status: TaskStatus.IN_PROGRESS, updated_at: new Date(msg.properties.timestamp) })
        .where(eq(tables.tasks.id, report.taskId));
      await db.insert(tables.logs).values({
        taskId: report.taskId,
        taskStatus: TaskStatus.IN_PROGRESS,
        message: "Task has started",
        created_at: new Date(msg.properties.timestamp),
      });
      break;
    case ReportType.PROGRESS:
      const progressReport = report as ProgressReport;
      await db
        .update(tables.tasks)
        .set({
          status: TaskStatus.IN_PROGRESS,
          progress: progressReport.progress,
          updated_at: new Date(msg.properties.timestamp),
        })
        .where(eq(tables.tasks.id, report.taskId));
      await db.insert(tables.logs).values({
        taskId: report.taskId,
        taskStatus: TaskStatus.IN_PROGRESS,
        message: `Task progress: ${progressReport.progress}%`,
        created_at: new Date(msg.properties.timestamp),
      });
      break;
    case ReportType.COMPLETED:
      await db
        .update(tables.tasks)
        .set({ status: TaskStatus.DONE, updated_at: new Date(msg.properties.timestamp) })
        .where(eq(tables.tasks.id, report.taskId));
      await db.insert(tables.logs).values({
        taskId: report.taskId,
        taskStatus: TaskStatus.DONE,
        message: "Task has completed",
        created_at: new Date(msg.properties.timestamp),
      });
      break;
    case ReportType.ERROR:
      const errorReport = report as ErrorReport;
      await db
        .update(tables.tasks)
        .set({ status: TaskStatus.ERROR, error: errorReport.error, updated_at: new Date(msg.properties.timestamp) })
        .where(eq(tables.tasks.id, report.taskId));
      await db.insert(tables.logs).values({
        taskId: report.taskId,
        taskStatus: TaskStatus.ERROR,
        message: `Task has failed: ${errorReport.error}`,
        created_at: new Date(msg.properties.timestamp),
      });
      break;
    case ReportType.PAUSED:
      await db
        .update(tables.tasks)
        .set({ status: TaskStatus.PAUSED, updated_at: new Date(msg.properties.timestamp) })
        .where(eq(tables.tasks.id, report.taskId));
      await db.insert(tables.logs).values({
        taskId: report.taskId,
        taskStatus: TaskStatus.PAUSED,
        message: "Task has paused",
        created_at: new Date(msg.properties.timestamp),
      });
      break;
    case ReportType.RESUMED:
      await db
        .update(tables.tasks)
        .set({ status: TaskStatus.IN_PROGRESS, updated_at: new Date(msg.properties.timestamp) })
        .where(eq(tables.tasks.id, report.taskId));
      await db.insert(tables.logs).values({
        taskId: report.taskId,
        taskStatus: TaskStatus.IN_PROGRESS,
        message: "Task has resumed",
        created_at: new Date(msg.properties.timestamp),
      });
      break;
    case ReportType.CANCELLED:
      await db
        .update(tables.tasks)
        .set({ status: TaskStatus.CANCELLED, updated_at: new Date(msg.properties.timestamp) })
        .where(eq(tables.tasks.id, report.taskId));
      await db.insert(tables.logs).values({
        taskId: report.taskId,
        taskStatus: TaskStatus.CANCELLED,
        message: "Task has been cancelled",
        created_at: new Date(msg.properties.timestamp),
      });
      break;
    case ReportType.RESTARTED:
      await db.insert(tables.logs).values({
        taskId: report.taskId,
        taskStatus: TaskStatus.PENDING,
        message: "Task has been restarted",
        created_at: new Date(msg.properties.timestamp),
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

// Graceful shutdown
process.on("SIGINT", closeConnection); // Ctrl + C handler
process.on("SIGTERM", closeConnection); // kill PID handler
