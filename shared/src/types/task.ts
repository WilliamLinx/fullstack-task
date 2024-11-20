export enum TaskStatus {
  PENDING = "PENDING",
  IN_PROGRESS = "IN_PROGRESS",
  PAUSED = "PAUSED",
  DONE = "DONE",
  ERROR = "ERROR",
  CANCELLED = "CANCELLED",
}

export enum CommandType {
  CANCEL_TASK = "CANCEL_TASK",
  PAUSE_TASK = "PAUSE_TASK",
  RESUME_TASK = "RESUME_TASK",
  RESTART_TASK = "RESTART_TASK",
}

export enum ReportType {
  STARTED = "STARTED",
  PAUSED = "PAUSED",
  RESUMED = "RESUMED",
  COMPLETED = "COMPLETED",
  CANCELLED = "CANCELLED",
  ERROR = "ERROR",
  PROGRESS = "PROGRESS",
  RESTARTED = "RESTARTED",
}

export interface CreateTask {
  taskId: string;
}

export interface Command {
  type: CommandType;
}

export interface Report {
  type: ReportType;
  taskId: string;
}

export interface ProgressReport extends Report {
  type: ReportType.PROGRESS;
  progress: number;
}

export interface ErrorReport extends Report {
  type: ReportType.ERROR;
  error: string;
}
