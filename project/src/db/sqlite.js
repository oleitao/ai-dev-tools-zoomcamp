import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { DatabaseSync } from "node:sqlite";

function toIso(now = new Date()) {
  return now.toISOString();
}

export function createSqliteDb({ filename }) {
  if (filename !== ":memory:") {
    fs.mkdirSync(path.dirname(filename), { recursive: true });
  }

  const db = new DatabaseSync(filename);

  async function migrate() {
    db.exec(`
      PRAGMA journal_mode = WAL;
      PRAGMA foreign_keys = ON;

      CREATE TABLE IF NOT EXISTS reviews (
        id TEXT PRIMARY KEY,
        created_at TEXT NOT NULL,
        source TEXT NOT NULL,
        pr_url TEXT,
        request_json TEXT NOT NULL,
        result_json TEXT NOT NULL,
        risk TEXT NOT NULL,
        has_missing_tests INTEGER NOT NULL
      );

      CREATE INDEX IF NOT EXISTS idx_reviews_created_at
        ON reviews(created_at DESC);

      CREATE TABLE IF NOT EXISTS policies (
        id TEXT PRIMARY KEY,
        created_at TEXT NOT NULL,
        name TEXT NOT NULL,
        rules_json TEXT NOT NULL,
        is_default INTEGER NOT NULL DEFAULT 0
      );
    `);

    const policyCountRow = db.prepare("SELECT COUNT(*) as c FROM policies").get();
    if ((policyCountRow?.c ?? 0) === 0) {
      const defaultPolicy = {
        requireTestsForSourceChanges: true,
        blockMergeOnPolicyFailure: false
      };
      db.prepare(
        `
        INSERT INTO policies (id, created_at, name, rules_json, is_default)
        VALUES (?, ?, ?, ?, 1)
      `
      ).run(
        crypto.randomUUID(),
        toIso(),
        "Default policy",
        JSON.stringify(defaultPolicy)
      );
    }
  }

  async function close() {
    db.close();
  }

  async function upsertPolicy({ id, name, rules, makeDefault = false }) {
    const policyId = id ?? crypto.randomUUID();
    const existing = await getPolicy(policyId);
    const createdAt = existing?.createdAt ?? toIso();
    const rulesJson = JSON.stringify(rules);
    const isDefault = makeDefault ? 1 : existing?.isDefault ? 1 : 0;

    db.exec("BEGIN");
    try {
      if (makeDefault) {
        db.prepare("UPDATE policies SET is_default=0").run();
      }

      if (existing) {
        db.prepare(
          `
          UPDATE policies
          SET name=?, rules_json=?, is_default=?
          WHERE id=?
        `
        ).run(name, rulesJson, isDefault, policyId);
      } else {
        db.prepare(
          `
          INSERT INTO policies (id, created_at, name, rules_json, is_default)
          VALUES (?, ?, ?, ?, ?)
        `
        ).run(policyId, createdAt, name, rulesJson, isDefault);
      }

      db.exec("COMMIT");
    } catch (error) {
      db.exec("ROLLBACK");
      throw error;
    }

    return (await getPolicy(policyId)) ?? null;
  }

  async function getPolicy(id) {
    const row = db
      .prepare(
        `
        SELECT id, created_at, name, rules_json, is_default
        FROM policies
        WHERE id=?
      `
      )
      .get(id);
    if (!row) return null;

    return {
      id: row.id,
      createdAt: row.created_at,
      name: row.name,
      rules: JSON.parse(row.rules_json),
      isDefault: Boolean(row.is_default)
    };
  }

  async function getDefaultPolicy() {
    const row = db
      .prepare(
        `
        SELECT id, created_at, name, rules_json, is_default
        FROM policies
        WHERE is_default=1
        LIMIT 1
      `
      )
      .get();
    if (!row) return null;

    return {
      id: row.id,
      createdAt: row.created_at,
      name: row.name,
      rules: JSON.parse(row.rules_json),
      isDefault: Boolean(row.is_default)
    };
  }

  async function listPolicies() {
    const rows = db
      .prepare(
        `
        SELECT id, created_at, name, rules_json, is_default
        FROM policies
        ORDER BY is_default DESC, created_at DESC
      `
      )
      .all();

    return rows.map((row) => ({
      id: row.id,
      createdAt: row.created_at,
      name: row.name,
      rules: JSON.parse(row.rules_json),
      isDefault: Boolean(row.is_default)
    }));
  }

  async function createReview({ id, createdAt, source, prUrl, request, result }) {
    const risk = result?.summary?.risk ?? "low";
    const hasMissingTests =
      Array.isArray(result?.summary?.missingTests) && result.summary.missingTests.length > 0;

    db.prepare(
      `
      INSERT INTO reviews (
        id, created_at, source, pr_url, request_json, result_json, risk, has_missing_tests
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `
    ).run(
      id,
      createdAt,
      source,
      prUrl ?? null,
      JSON.stringify(request),
      JSON.stringify(result),
      risk,
      hasMissingTests ? 1 : 0
    );

    return (await getReview(id)) ?? null;
  }

  async function getReview(id) {
    const row = db
      .prepare(
        `
        SELECT id, created_at, source, pr_url, result_json
        FROM reviews
        WHERE id=?
      `
      )
      .get(id);
    if (!row) return null;

    return {
      id: row.id,
      createdAt: row.created_at,
      source: row.source,
      prUrl: row.pr_url,
      result: JSON.parse(row.result_json)
    };
  }

  async function listReviews({ limit, offset }) {
    const totalRow = db.prepare("SELECT COUNT(*) as c FROM reviews").get();
    const total = totalRow?.c ?? 0;

    const rows = db
      .prepare(
        `
        SELECT id, created_at, source, pr_url, result_json
        FROM reviews
        ORDER BY created_at DESC
        LIMIT ? OFFSET ?
      `
      )
      .all(limit, offset);

    return {
      reviews: rows.map((row) => ({
        id: row.id,
        createdAt: row.created_at,
        source: row.source,
        prUrl: row.pr_url,
        result: JSON.parse(row.result_json)
      })),
      total,
      limit,
      offset
    };
  }

  async function getMetrics() {
    const totalRow = db.prepare("SELECT COUNT(*) as c FROM reviews").get();
    const total = totalRow?.c ?? 0;

    const riskRows = db
      .prepare(
        `
        SELECT risk, COUNT(*) as c
        FROM reviews
        GROUP BY risk
      `
      )
      .all();

    const riskCounts = { low: 0, medium: 0, high: 0 };
    for (const row of riskRows) {
      if (row.risk in riskCounts) riskCounts[row.risk] = row.c;
    }

    const missingTestsRow = db
      .prepare("SELECT COUNT(*) as c FROM reviews WHERE has_missing_tests=1")
      .get();

    return {
      totalReviews: total,
      riskCounts,
      missingTestsReviews: missingTestsRow?.c ?? 0
    };
  }

  return {
    migrate,
    close,
    upsertPolicy,
    getPolicy,
    getDefaultPolicy,
    listPolicies,
    createReview,
    getReview,
    listReviews,
    getMetrics
  };
}
