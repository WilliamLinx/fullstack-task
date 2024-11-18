import { drizzle } from "drizzle-orm/libsql";
import * as schema from "./schema";

export { sql, eq, and, or } from "drizzle-orm";

export const tables = schema;
export const db = drizzle(process.env.DB_FILE_NAME, { schema });
