import test from "node:test";
import assert from "node:assert/strict";
import { evaluatePolicy } from "../../src/review/policy.js";

test("policy fails when tests are required but missing", () => {
  const policy = {
    id: "p1",
    rules: { requireTestsForSourceChanges: true, blockMergeOnPolicyFailure: false }
  };
  const analysis = { summary: { missingTests: ["missing tests"] } };

  const result = evaluatePolicy(policy, analysis);
  assert.equal(result.passed, false);
  assert.equal(result.policyId, "p1");
  assert.ok(result.blockers.length >= 1);
});

