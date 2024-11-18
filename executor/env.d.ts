declare namespace NodeJS {
  interface ProcessEnv {
    RABBITMQ_HOST: string;
    RABBITMQ_PORT: number;
    RABBITMQ_USER: string;
    RABBITMQ_PASSWORD: string;
    RABBITMQ_TASK_QUEUE_NAME: string;
    RABBITMQ_COMMAND_EXCHANGE_NAME: string;
    RABBITMQ_REPORT_QUEUE_NAME: string;
  }
}
