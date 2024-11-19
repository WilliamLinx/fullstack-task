import { drizzle } from "drizzle-orm/libsql";
import * as schema from "./schema";

export { sql, eq, and, or, count, desc, gt, gte, lt, lte } from "drizzle-orm";

export const tables = schema;
export const db = drizzle(process.env.DB_FILE_NAME, { schema });
