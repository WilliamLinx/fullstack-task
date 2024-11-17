export enum TaskStatus {
  PENDING = "PENDING",
  IN_PROGRESS = "IN_PROGRESS",
  PAUSED = "PAUSED",
  DONE = "DONE",
  ERROR = "ERROR",
}

export enum LogType {
  INFO = "INFO",
  WARNING = "WARNING",
  ERROR = "ERROR",
}

export enum CommandType {
  CREATE_TASK = "CREATE_TASK",
  CANCEL_TASK = "CANCEL_TASK",
  PAUSE_TASK = "PAUSE_TASK",
  RESUME_TASK = "RESUME_TASK",
  RESTART_TASK = "RESTART_TASK",
}

export interface Command {
  type: CommandType;
  taskId: string;
}
