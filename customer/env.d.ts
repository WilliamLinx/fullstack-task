declare namespace NodeJS {
  interface ProcessEnv {
    SERVER_PORT: number;
    RABBITMQ_HOST: string;
    RABBITMQ_PORT: number;
    RABBITMQ_USER: string;
    RABBITMQ_PASSWORD: string;
    RABBITMQ_COMMAND_QUEUE_NAME: string;
    RABBITMQ_REPORT_QUEUE_NAME: string;
    DB_FILE_NAME: string;
  }
}
