import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error("DATABASE_URL is not set");
}

const useSsl =
  connectionString.includes("neon.tech") ||
  connectionString.includes("sslmode=require");

type SqlClient = ReturnType<typeof postgres>;

const globalForDb = globalThis as unknown as {
  __ohTaskSql?: SqlClient;
};

/** Reuse one client in dev (HMR) so we don't exhaust Postgres max_connections. */
const client =
  globalForDb.__ohTaskSql ??
  postgres(connectionString, {
    prepare: false,
    max: 5,
    idle_timeout: 20,
    max_lifetime: 60 * 30,
    ...(useSsl ? { ssl: "require" as const } : {}),
  });

if (process.env.NODE_ENV !== "production") {
  globalForDb.__ohTaskSql = client;
}

export const db = drizzle(client, { schema });
