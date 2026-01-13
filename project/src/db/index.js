import path from "node:path";
import { createSqliteDb } from "./sqlite.js";
import { createPostgresDb } from "./postgres.js";

function isPostgresUrl(databaseUrl) {
  return (
    databaseUrl.startsWith("postgres://") || databaseUrl.startsWith("postgresql://")
  );
}

function isSqliteUrl(databaseUrl) {
  return databaseUrl.startsWith("sqlite:");
}

function parseSqliteUrl(databaseUrl) {
  const raw = databaseUrl.slice("sqlite:".length);
  if (raw === ":memory:" || raw === ":memory") return ":memory:";
  if (raw.trim() === "") return path.resolve("./data/pr-buddy.sqlite");
  return path.resolve(raw);
}

export async function createDb({ databaseUrl }) {
  if (!databaseUrl) {
    return createSqliteDb({ filename: path.resolve("./data/pr-buddy.sqlite") });
  }

  if (isSqliteUrl(databaseUrl)) {
    return createSqliteDb({ filename: parseSqliteUrl(databaseUrl) });
  }

  if (isPostgresUrl(databaseUrl)) {
    return createPostgresDb({ databaseUrl });
  }

  throw new Error(`Unsupported DATABASE_URL: ${databaseUrl}`);
}

