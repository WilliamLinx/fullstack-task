import amqp, { Connection, Channel } from "amqplib";
import { Command } from "../types/task";

let connection: Connection | null = null;
let channel: Channel | null = null;

export async function connectToRabbitMQ() {
  // Connect to RabbitMQ
  connection = await amqp.connect(
    `amqp://${process.env.RABBITMQ_USER}:${process.env.RABBITMQ_PASSWORD}@${process.env.RABBITMQ_HOST}:${process.env.RABBITMQ_PORT}`
  );
  channel = await connection.createChannel();

  // Prepare a queue for distributing tasks
  channel.assertQueue(process.env.RABBITMQ_COMMAND_QUEUE_NAME, { durable: true });
  channel.prefetch(1); // Allow only one task to be sent to an executor at a time

  // Prepare a queue for consuming status updates and start consuming
  channel.assertQueue(process.env.RABBITMQ_REPORT_QUEUE_NAME, { durable: true });
  channel.consume(process.env.RABBITMQ_REPORT_QUEUE_NAME, (msg) => {
    //TODO: separate into handler fn
    if (!msg) return;
    const status = JSON.parse(msg.content.toString());
    console.log("Received status update", status);
    channel?.ack(msg);
  });

  console.log("Connected to RabbitMQ");
}

export async function sendCommandToQueue(command: Command) {
  if (!channel) throw new Error("Channel is not initialized");
  channel.sendToQueue(process.env.RABBITMQ_COMMAND_QUEUE_NAME, Buffer.from(JSON.stringify(command)), {
    persistent: true,
  });
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
