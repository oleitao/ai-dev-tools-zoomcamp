import test from "node:test";
import assert from "node:assert/strict";
import { createSqliteDb } from "../../src/db/sqlite.js";
import { runReview } from "../../src/review/engine.js";

test("review workflow persists review and updates metrics (SQLite)", async () => {
  const db = createSqliteDb({ filename: ":memory:" });
  await db.migrate();

  const policy = await db.getDefaultPolicy();
  assert.ok(policy);

  const diff = [
    "diff --git a/src/math.js b/src/math.js",
    "--- a/src/math.js",
    "+++ b/src/math.js",
    "@@ -1,1 +1,2 @@",
    "+export const add = (a, b) => a + b;",
    "+console.log('debug');"
  ].join("\n");

  const run = await runReview({
    source: "diff",
    diff,
    prUrl: null,
    options: { maxCommentsPerFile: 10 },
    policy,
    githubToken: null
  });

  const createdAt = new Date().toISOString();
  const stored = await db.createReview({
    id: run.id,
    createdAt,
    source: "diff",
    prUrl: null,
    request: { source: "diff", diff, prUrl: null, options: { maxCommentsPerFile: 10 } },
    result: run.result
  });

  assert.equal(stored.id, run.id);
  assert.equal(stored.result.policy.passed, false);

  const fetched = await db.getReview(run.id);
  assert.equal(fetched.id, run.id);

  const list = await db.listReviews({ limit: 10, offset: 0 });
  assert.equal(list.total, 1);

  const metrics = await db.getMetrics();
  assert.equal(metrics.totalReviews, 1);
  assert.equal(metrics.missingTestsReviews, 1);
});

