export function evaluatePolicy(policy, analysis) {
  if (!policy) {
    return { policyId: null, passed: true, blockers: [], warnings: [] };
  }

  const blockers = [];
  const warnings = [];

  const requireTests = Boolean(policy.rules?.requireTestsForSourceChanges);
  const missingTests = Array.isArray(analysis?.summary?.missingTests)
    ? analysis.summary.missingTests
    : [];

  if (requireTests && missingTests.length > 0) {
    blockers.push("Missing tests for production code changes.");
  }

  if (policy.rules?.blockMergeOnPolicyFailure && blockers.length > 0) {
    blockers.push("Merge must be blocked (policy).");
  }

  return {
    policyId: policy.id,
    passed: blockers.length === 0,
    blockers,
    warnings
  };
}
