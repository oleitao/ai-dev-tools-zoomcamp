import test from "node:test";
import assert from "node:assert/strict";
import { fileItems, formatRisk, summarizeReview } from "../../src/web/viewModel.js";

test("formatRisk maps risk to label+className", () => {
  assert.deepEqual(formatRisk("low"), { label: "LOW", className: "low" });
  assert.deepEqual(formatRisk("medium"), { label: "MEDIUM", className: "medium" });
  assert.deepEqual(formatRisk("high"), { label: "HIGH", className: "high" });
});

test("summarizeReview and fileItems are resilient to missing fields", () => {
  const review = {
    id: "r1",
    result: {
      summary: { risk: "low", highlights: ["h"], missingTests: [] },
      files: [{ path: "src/a.js", risk: "low", comments: [], missingTests: [] }],
      checklist: ["c"]
    }
  };

  assert.equal(summarizeReview(review).id, "r1");
  assert.equal(fileItems(review).length, 1);
});

