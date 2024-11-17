import { drizzle } from "drizzle-orm/libsql";
import * as schema from "./schema";

export const tables = schema;
export const db = drizzle(process.env.DB_FILE_NAME, { schema });
