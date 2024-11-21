import type { TaskStatus } from "./task";

export interface TaskStatsResponse {
  pending: number;
  in_progress: number;
  successful: number;
  failed: number;
  total: number;
  average_duration: number;
  max_duration: number;
}

export interface GetAllTasksResponse {
  tasks: Task[];
  total: number;
}

export interface Task {
  id: string;
  status: TaskStatus;
  progress: number;
  createdAt: string | null;
  updatedAt: string | null;
}

export interface TaskLogResponse {
  logs: TaskLog[];
}

export interface TaskLog {
  id: string;
  taskId: string;
  taskStatus: string;
  message: string;
  createdAt: string | Date;
}

export interface TaskCreateResponse {
  taskId: string;
}

export interface GeneralResponse {
  message: string;
}
