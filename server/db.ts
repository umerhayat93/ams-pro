
import { drizzle } from "drizzle-orm/node-postgres";
import pg from "pg";
import * as schema from "@shared/schema";

const { Pool } = pg;

// If `DATABASE_URL` is not set, fall back to the provided Render database URL.
// NOTE: embedding credentials in source is not recommended for security — consider
// setting `DATABASE_URL` in your Render environment variables instead.
const FALLBACK_DATABASE_URL =
  process.env.FALLBACK_DATABASE_URL ||
  "postgresql://ams_database_y96l_user:KJWgqj4yPwWMF9QqmMaVkFlpQGFq2aCS@dpg-d76he17fte5s73ejvsdg-a/ams_database_y96l";

const connectionString = process.env.DATABASE_URL || FALLBACK_DATABASE_URL;

if (!connectionString) {
  throw new Error(
    "DATABASE_URL must be set. Did you forget to provision a database?",
  );
}

if (!process.env.DATABASE_URL) {
  console.warn("WARNING: using embedded fallback DATABASE_URL. Set DATABASE_URL in env for production.");
}

// Some hosted Postgres providers (like Render) require TLS; enable it when
// the connection string points to a Render host or when DB_SSL env var is set.
const shouldUseSSL = process.env.DB_SSL === "true" || /render\.com/.test(connectionString);

const poolOptions: any = { connectionString };
if (shouldUseSSL) {
  poolOptions.ssl = { rejectUnauthorized: false };
  // allow self-signed certs from managed postgres providers
}

export const pool = new Pool(poolOptions);

pool.on("error", (err) => {
  console.error("Unexpected Postgres client error", err);
});

export const db = drizzle(pool, { schema });
