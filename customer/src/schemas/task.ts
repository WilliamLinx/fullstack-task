import { z } from "zod";

export const createTaskSchema = z
  .object({
    priority: z.number().int().min(1).max(5).default(1),
  })
  .strict();

export const allTasksSchema = z
  .object({
    limit: z.string(),
    offset: z.string(),
  })
  .strict();

export const taskStatsSchema = z
  .object({
    from: z.string(),
    to: z.string(),
  })
  .strict();

export const taskIdSchema = z
  .object({
    id: z.string(),
  })
  .strict();
