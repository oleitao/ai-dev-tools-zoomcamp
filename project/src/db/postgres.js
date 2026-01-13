import crypto from "node:crypto";

export async function createPostgresDb({ databaseUrl }) {
  let pg;
  try {
    pg = await import("pg");
  } catch {
    throw new Error(
      "Postgres support requires the `pg` package. Install it with `npm install pg`."
    );
  }

  const { Pool } = pg;
  const pool = new Pool({ connectionString: databaseUrl });

  async function migrate() {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS reviews (
        id TEXT PRIMARY KEY,
        created_at TIMESTAMPTZ NOT NULL,
        source TEXT NOT NULL,
        pr_url TEXT,
        request_json JSONB NOT NULL,
        result_json JSONB NOT NULL,
        risk TEXT NOT NULL,
        has_missing_tests BOOLEAN NOT NULL
      );

      CREATE INDEX IF NOT EXISTS idx_reviews_created_at
        ON reviews(created_at DESC);

      CREATE TABLE IF NOT EXISTS policies (
        id TEXT PRIMARY KEY,
        created_at TIMESTAMPTZ NOT NULL,
        name TEXT NOT NULL,
        rules_json JSONB NOT NULL,
        is_default BOOLEAN NOT NULL DEFAULT FALSE
      );
    `);

    const res = await pool.query("SELECT COUNT(*)::int as c FROM policies");
    const count = res.rows[0]?.c ?? 0;
    if (count === 0) {
      await pool.query(
        `
        INSERT INTO policies (id, created_at, name, rules_json, is_default)
        VALUES ($1, NOW(), $2, $3, TRUE)
      `,
        [
          crypto.randomUUID(),
          "Default policy",
          { requireTestsForSourceChanges: true, blockMergeOnPolicyFailure: false }
        ]
      );
    }
  }

  async function close() {
    await pool.end();
  }

  async function upsertPolicy({ id, name, rules, makeDefault = false }) {
    const policyId = id ?? crypto.randomUUID();
    const client = await pool.connect();
    try {
      await client.query("BEGIN");
      if (makeDefault) {
        await client.query("UPDATE policies SET is_default=FALSE");
      }

      const res = await client.query(
        `
        INSERT INTO policies (id, created_at, name, rules_json, is_default)
        VALUES ($1, NOW(), $2, $3, $4)
        ON CONFLICT (id) DO UPDATE
        SET name=EXCLUDED.name,
            rules_json=EXCLUDED.rules_json,
            is_default=EXCLUDED.is_default
        RETURNING id, created_at, name, rules_json, is_default
      `,
        [policyId, name, rules, makeDefault]
      );
      await client.query("COMMIT");

      const row = res.rows[0];
      return {
        id: row.id,
        createdAt: row.created_at,
        name: row.name,
        rules: row.rules_json,
        isDefault: row.is_default
      };
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }
  }

  async function getPolicy(id) {
    const res = await pool.query(
      `
      SELECT id, created_at, name, rules_json, is_default
      FROM policies
      WHERE id=$1
    `,
      [id]
    );
    const row = res.rows[0];
    if (!row) return null;
    return {
      id: row.id,
      createdAt: row.created_at,
      name: row.name,
      rules: row.rules_json,
      isDefault: row.is_default
    };
  }

  async function getDefaultPolicy() {
    const res = await pool.query(
      `
      SELECT id, created_at, name, rules_json, is_default
      FROM policies
      WHERE is_default=TRUE
      LIMIT 1
    `
    );
    const row = res.rows[0];
    if (!row) return null;
    return {
      id: row.id,
      createdAt: row.created_at,
      name: row.name,
      rules: row.rules_json,
      isDefault: row.is_default
    };
  }

  async function listPolicies() {
    const res = await pool.query(
      `
      SELECT id, created_at, name, rules_json, is_default
      FROM policies
      ORDER BY is_default DESC, created_at DESC
    `
    );
    return res.rows.map((row) => ({
      id: row.id,
      createdAt: row.created_at,
      name: row.name,
      rules: row.rules_json,
      isDefault: row.is_default
    }));
  }

  async function createReview({ id, createdAt, source, prUrl, request, result }) {
    const risk = result?.summary?.risk ?? "low";
    const hasMissingTests =
      Array.isArray(result?.summary?.missingTests) && result.summary.missingTests.length > 0;

    await pool.query(
      `
      INSERT INTO reviews (
        id, created_at, source, pr_url, request_json, result_json, risk, has_missing_tests
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
    `,
      [id, createdAt, source, prUrl, request, result, risk, hasMissingTests]
    );

    return getReview(id);
  }

  async function getReview(id) {
    const res = await pool.query(
      `
      SELECT id, created_at, source, pr_url, result_json
      FROM reviews
      WHERE id=$1
    `,
      [id]
    );
    const row = res.rows[0];
    if (!row) return null;
    return {
      id: row.id,
      createdAt: row.created_at,
      source: row.source,
      prUrl: row.pr_url,
      result: row.result_json
    };
  }

  async function listReviews({ limit, offset }) {
    const totalRes = await pool.query("SELECT COUNT(*)::int as c FROM reviews");
    const total = totalRes.rows[0]?.c ?? 0;

    const res = await pool.query(
      `
      SELECT id, created_at, source, pr_url, result_json
      FROM reviews
      ORDER BY created_at DESC
      LIMIT $1 OFFSET $2
    `,
      [limit, offset]
    );

    return {
      reviews: res.rows.map((row) => ({
        id: row.id,
        createdAt: row.created_at,
        source: row.source,
        prUrl: row.pr_url,
        result: row.result_json
      })),
      total,
      limit,
      offset
    };
  }

  async function getMetrics() {
    const totalRes = await pool.query("SELECT COUNT(*)::int as c FROM reviews");
    const total = totalRes.rows[0]?.c ?? 0;

    const riskRes = await pool.query(
      `
      SELECT risk, COUNT(*)::int as c
      FROM reviews
      GROUP BY risk
    `
    );

    const riskCounts = { low: 0, medium: 0, high: 0 };
    for (const row of riskRes.rows) {
      if (row.risk in riskCounts) riskCounts[row.risk] = row.c;
    }

    const missingRes = await pool.query(
      "SELECT COUNT(*)::int as c FROM reviews WHERE has_missing_tests=TRUE"
    );

    return {
      totalReviews: total,
      riskCounts,
      missingTestsReviews: missingRes.rows[0]?.c ?? 0
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
