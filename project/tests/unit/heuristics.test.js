import test from "node:test";
import assert from "node:assert/strict";
import { parseUnifiedDiff } from "../../src/review/diff.js";
import { analyzeParsedDiff } from "../../src/review/heuristics.js";

test("heuristics detect missing tests when only source changes", () => {
  const diff = [
    "diff --git a/src/math.js b/src/math.js",
    "--- a/src/math.js",
    "+++ b/src/math.js",
    "@@ -1,1 +1,2 @@",
    "-export const add = (a, b) => a + b;",
    "+export const add = (a, b) => {",
    "+  return a + b;",
    "+};"
  ].join("\n");

  const analysis = analyzeParsedDiff(parseUnifiedDiff(diff));
  assert.equal(analysis.summary.missingTests.length, 1);
  assert.equal(analysis.files[0].missingTests.length, 1);
});

test("heuristics flag console.log as nitpick", () => {
  const diff = [
    "diff --git a/src/a.js b/src/a.js",
    "--- a/src/a.js",
    "+++ b/src/a.js",
    "@@ -1,1 +1,1 @@",
    "+console.log('debug');"
  ].join("\n");

  const analysis = analyzeParsedDiff(parseUnifiedDiff(diff));
  const comments = analysis.files[0].comments;
  assert.ok(comments.some((c) => c.type === "nitpick"));
});

test("heuristics flag eval as high risk", () => {
  const diff = [
    "diff --git a/src/a.js b/src/a.js",
    "--- a/src/a.js",
    "+++ b/src/a.js",
    "@@ -1,1 +1,1 @@",
    "+eval('2+2');"
  ].join("\n");

  const analysis = analyzeParsedDiff(parseUnifiedDiff(diff));
  assert.equal(analysis.files[0].risk, "high");
  assert.equal(analysis.summary.risk, "high");
});

