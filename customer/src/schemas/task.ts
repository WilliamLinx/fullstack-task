import { z } from "zod";

export const createTaskSchema = z.object({
  priority: z.number().int().min(1).max(5).default(1),
});
