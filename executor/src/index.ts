import "dotenv/config";
import amqp, { Connection, Channel, ConsumeMessage } from "amqplib";
import EventEmitter from "events";

import { Command, CommandType, ErrorReport, Report, ReportType, CreateTask, ProgressReport } from "shared";

class Task extends EventEmitter {
  taskId: string;
  progress: number;
  isRunning: boolean;
  isPaused: boolean;
  interval: NodeJS.Timeout | null;
  duration: number;

  constructor(taskId: string) {
    super();
    this.taskId = taskId;
    this.progress = 0;
    this.isRunning = false;
    this.isPaused = false;
    this.interval = null;
    this.duration = Math.floor(Math.random() * (120 - 5 + 1) + 5) * 1000; // Random duration between 5 and 120 seconds
  }

  start() {
    if (this.isRunning) {
      return;
    }
    this.isRunning = true;
    this.isPaused = false;

    // update loop simulation
    const interval = this.duration / 10;
    let elapsedTime = 0;

    this.interval = setInterval(() => {
      if (this.isPaused) {
        return;
      }
      // 5% chance of random error
      if (Math.random() < 0.05) {
        // Would be a try catch block in a real task
        this.error(new Error("Random task error occurred"));
        return;
      }

      elapsedTime += interval;
      this.progress += 10;
      this.emit("progress");

      if (elapsedTime >= this.duration) {
        clearInterval(this.interval!);
        this.emit("complete");
      }
    }, interval);

    this.emit("start");
  }

  pause() {
    if (this.isRunning && !this.isPaused) {
      this.isPaused = true;
      this.emit("pause");
    }
  }

  resume() {
    if (this.isRunning && this.isPaused) {
      this.isPaused = false;
      this.emit("resume");
    }
  }

  cancel() {
    if (this.isRunning && this.interval) {
      clearInterval(this.interval);
      this.isRunning = false;
      this.emit("cancel");
    }
  }

  error(error: Error) {
    if (this.interval) {
      clearInterval(this.interval);
    }
    this.emit("error", error);
  }

  restart() {
    if (this.interval) {
      clearInterval(this.interval);
      this.progress = 0;
      this.isRunning = false;
    }
    this.emit("restart");
    this.start();
  }
}

class Executor {
  currentTask: Task | null;
  connection: Connection | null;
  channel: Channel | null;
  commandChannel: Channel | null;
  commandQueueUnbindCB: (() => void) | null;

  constructor() {
    this.currentTask = null;
    this.connection = null;
    this.channel = null;
    this.commandChannel = null;
    this.commandQueueUnbindCB = null;
  }

  async init() {
    // Connect to RabbitMQ
    this.connection = await amqp.connect(
      `amqp://${process.env.RABBITMQ_USER}:${process.env.RABBITMQ_PASSWORD}@${process.env.RABBITMQ_HOST}:${process.env.RABBITMQ_PORT}`
    );
    this.channel = await this.connection.createChannel();

    // Prepare a queue for receiving new tasks
    this.channel.assertQueue(process.env.RABBITMQ_TASK_QUEUE_NAME, { durable: true, maxPriority: 5 });
    this.channel.prefetch(1); // Allow only one task to be sent to an executor at a time
    this.channel.assertQueue(process.env.RABBITMQ_REPORT_QUEUE_NAME, { durable: true });

    this.channel.consume(process.env.RABBITMQ_TASK_QUEUE_NAME, (msg) => this.handleTask(msg), { noAck: false });

    console.log(`Executor is listening for tasks from RabbitMQ on queue ${process.env.RABBITMQ_TASK_QUEUE_NAME}`);

    // Prepare exchange for receiving commands
    this.commandChannel = await this.connection.createChannel();
    this.commandChannel.assertExchange(process.env.RABBITMQ_COMMAND_EXCHANGE_NAME, "direct", { durable: true });

    // Graceful shutdown
    process.on("SIGINT", () => this.closeConnection()); // Ctrl + C handler
    process.on("SIGTERM", () => this.closeConnection()); // kill PID handler
  }

  handleTask(msg: ConsumeMessage | null) {
    if (!msg) {
      return;
    }
    const { taskId } = JSON.parse(msg.content.toString()) as CreateTask;

    if (!this.currentTask && taskId) {
      this.currentTask = new Task(taskId);
      this.attachTaskEvents(this.currentTask, async () => {
        this.channel?.ack(msg);
        if (this.commandQueueUnbindCB) {
          await this.commandQueueUnbindCB();
          this.commandQueueUnbindCB = null;
        }
      });
      this.listenForCommands(taskId);
      this.currentTask.start();
    }
  }

  async listenForCommands(taskId: string) {
    if (!this.commandChannel) throw new Error("Command channel is not initialized");

    // Call unbind fn if listing for commands for another task
    if (this.commandQueueUnbindCB) {
      await this.commandQueueUnbindCB();
      this.commandQueueUnbindCB = null;
    }

    // Create a new queue for each task to receive control commands
    const safeQueue = await this.commandChannel.assertQueue("", { exclusive: true, durable: false });
    await this.commandChannel.bindQueue(safeQueue.queue, process.env.RABBITMQ_COMMAND_EXCHANGE_NAME, taskId);
    // Create unbind fn for latter call
    this.commandQueueUnbindCB = async () => {
      await this.commandChannel?.unbindQueue(safeQueue.queue, process.env.RABBITMQ_COMMAND_EXCHANGE_NAME, taskId);
      await this.commandChannel?.deleteQueue(safeQueue.queue);
    };

    this.commandChannel.consume(safeQueue.queue, (msg) => this.handleCommand(msg), { noAck: false });
  }

  handleCommand(msg: ConsumeMessage | null) {
    if (!msg) {
      return;
    }
    if (!this.currentTask) {
      this.commandChannel?.ack(msg);
      return;
    }
    const command = JSON.parse(msg.content.toString()) as Command;
    const { type } = command;

    switch (type) {
      case CommandType.PAUSE_TASK:
        if (this.currentTask) this.currentTask.pause();
        this.commandChannel?.ack(msg);
        break;
      case CommandType.RESUME_TASK:
        if (this.currentTask) this.currentTask.resume();
        this.commandChannel?.ack(msg);
        break;
      case CommandType.CANCEL_TASK:
        if (this.currentTask) this.currentTask.cancel();
        this.commandChannel?.ack(msg);
        break;
      case CommandType.RESTART_TASK:
        if (this.currentTask) this.currentTask.restart();
        this.commandChannel?.ack(msg);
        break;
      default:
        console.error("Unknown command type: ", type);
        this.commandChannel?.ack(msg); // Acknowledge unknown commands to remove it from queue
    }
  }

  attachTaskEvents(task: Task, finishCallback: () => void) {
    task.on("start", () => {
      console.log(`Task ${task.taskId} started`);
      this.sendReport({ type: ReportType.STARTED, taskId: task.taskId });
    });

    task.on("progress", () => {
      this.sendReport({
        type: ReportType.PROGRESS,
        taskId: task.taskId,
        progress: task.progress,
        timestamp: Date.now(),
      } as ProgressReport);
    });

    task.on("pause", () => {
      console.log(`Task ${task.taskId} paused`);
      this.sendReport({ type: ReportType.PAUSED, taskId: task.taskId });
    });

    task.on("resume", () => {
      console.log(`Task ${task.taskId} resumed`);
      this.sendReport({ type: ReportType.RESUMED, taskId: task.taskId });
    });

    task.on("complete", () => {
      console.log(`Task ${task.taskId} completed`);
      this.sendReport({ type: ReportType.COMPLETED, taskId: task.taskId });
      finishCallback();
      this.currentTask = null;
    });

    task.on("cancel", () => {
      console.warn(`Task ${task.taskId} cancelled`);
      this.sendReport({ type: ReportType.CANCELLED, taskId: task.taskId });
      finishCallback();
      this.currentTask = null;
    });

    task.on("restart", () => {
      console.warn(`Task ${task.taskId} restarted`);
      this.sendReport({ type: ReportType.RESTARTED, taskId: task.taskId });
    });

    task.on("error", (error: Error) => {
      console.error(`Task ${task.taskId} failed: ${error.message}`);
      this.sendReport({
        type: ReportType.ERROR,
        taskId: task.taskId,
        error: error.message,
      } as ErrorReport);
      finishCallback();
      this.currentTask = null;
    });
  }

  sendReport(report: Report) {
    if (!this.channel) throw new Error("Channel is not initialized");
    this.channel.sendToQueue(process.env.RABBITMQ_REPORT_QUEUE_NAME, Buffer.from(JSON.stringify(report)), {
      timestamp: Date.now(),
    });
  }

  async closeConnection() {
    if (this.currentTask) this.currentTask.error(new Error("Executor is forced to shut down"));
    if (this.channel) await this.channel.close();
    if (this.commandChannel) await this.commandChannel.close();
    if (this.connection) await this.connection.close();
    console.log("Diconnected from RabbitMQ");
    process.exit(0);
  }
}

// Create and start the executor instance
const executor = new Executor();
executor.init();
