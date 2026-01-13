import test from "node:test";
import assert from "node:assert/strict";
import { diffStats, parseUnifiedDiff } from "../../src/review/diff.js";

test("parseUnifiedDiff extracts files and hunks", () => {
  const diff = [
    "diff --git a/src/a.js b/src/a.js",
    "index 1111111..2222222 100644",
    "--- a/src/a.js",
    "+++ b/src/a.js",
    "@@ -1,2 +1,3 @@",
    " const x = 1;",
    "+console.log(x);",
    " const y = 2;"
  ].join("\n");

  const parsed = parseUnifiedDiff(diff);

  assert.equal(parsed.files.length, 1);
  assert.equal(parsed.files[0].path, "src/a.js");
  assert.equal(parsed.files[0].hunks.length, 1);
  assert.equal(parsed.files[0].hunks[0].lines.length, 3);
});

test("diffStats counts additions and deletions", () => {
  const diff = [
    "diff --git a/src/a.js b/src/a.js",
    "--- a/src/a.js",
    "+++ b/src/a.js",
    "@@ -1,1 +1,1 @@",
    "-const a = 1;",
    "+const a = 2;"
  ].join("\n");

  const stats = diffStats(parseUnifiedDiff(diff));
  assert.deepEqual(stats, { added: 1, deleted: 1, files: 1 });
});

