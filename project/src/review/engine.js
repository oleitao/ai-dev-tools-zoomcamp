import crypto from "node:crypto";
import { HttpError } from "../errors.js";
import { parseUnifiedDiff } from "./diff.js";
import { analyzeParsedDiff } from "./heuristics.js";
import { evaluatePolicy } from "./policy.js";
import { fetchGithubPrDiff } from "./github.js";
import { reviewDiffWithOpenAI } from "./providers/openai.js";

export async function runReview({
  source,
  diff,
  prUrl,
  options,
  policy,
  githubToken,
  openaiApiKey,
  openaiModel
}) {
  let diffText = diff ?? "";

  if (source === "github") {
    diffText = await fetchGithubPrDiff({ prUrl, githubToken });
  }

  const provider = options?.provider ?? "heuristic";
  if (provider !== "heuristic" && provider !== "openai") {
    throw new HttpError(400, "invalid_provider", "options.provider must be heuristic|openai");
  }

  if (typeof diffText !== "string" || diffText.trim().length === 0) {
    throw new HttpError(400, "diff_required", "diff is required (or the PR must have an accessible diff)");
  }

  const parsed = parseUnifiedDiff(diffText);
  if (!parsed.files.length) {
    throw new HttpError(
      400,
      "diff_empty",
      "Could not detect files in the diff (expected unified diff format)"
    );
  }

  const maxCommentsPerFileRaw = options?.maxCommentsPerFile;
  const maxCommentsPerFile =
    Number.isFinite(maxCommentsPerFileRaw) && maxCommentsPerFileRaw > 0
      ? Math.min(50, Math.max(1, Math.trunc(maxCommentsPerFileRaw)))
      : 15;

  const analysis =
    provider === "openai"
      ? await reviewDiffWithOpenAI({ diffText, openaiApiKey, openaiModel })
      : analyzeParsedDiff(parsed, { maxCommentsPerFile });

  const policyEvaluation = evaluatePolicy(policy, analysis);

  return {
    id: crypto.randomUUID(),
    result: {
      summary: analysis.summary,
      files: analysis.files,
      checklist: analysis.checklist,
      policy: policyEvaluation
    }
  };
}
