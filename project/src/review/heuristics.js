const TEST_FILE_RE =
  /(^|\/)(__tests__|tests|test|spec)(\/|$)|(\.test\.|\.spec\.)/i;

const HIGH_RISK_PATTERNS = [
  { re: /\beval\s*\(/, message: "Use of `eval()` can enable arbitrary code execution." },
  {
    re: /\bchild_process\b|\bexecSync\s*\(|\bexec\s*\(/,
    message: "System command execution should be validated/sanitized."
  },
  {
    re: /\bpassword\b|\bsecret\b|\bapi[_-]?key\b/i,
    message: "Possible exposure of credentials/secrets; ensure they are not hardcoded."
  }
];

const NITPICK_PATTERNS = [
  { re: /\bconsole\.log\s*\(/, message: "Remove `console.log()` before merging." },
  { re: /\bdebugger\b/, message: "Remove `debugger`." },
  { re: /\s+$/, message: "Remove trailing whitespace." }
];

const SUGGESTION_PATTERNS = [
  { re: /\bTODO\b|\bFIXME\b/, message: "Resolve/justify TODO/FIXME or create a tracking issue." }
];

function isTestFile(path) {
  return TEST_FILE_RE.test(path);
}

function riskMax(a, b) {
  const order = { low: 0, medium: 1, high: 2 };
  return order[a] >= order[b] ? a : b;
}

function classifyFileRisk({ addedLines, changedLines }) {
  let risk = "low";

  if (changedLines > 200) risk = riskMax(risk, "medium");
  if (changedLines > 600) risk = riskMax(risk, "high");

  for (const { content } of addedLines) {
    for (const pattern of HIGH_RISK_PATTERNS) {
      if (pattern.re.test(content)) return "high";
    }
  }

  return risk;
}

export function analyzeParsedDiff(parsed, { maxCommentsPerFile = 15 } = {}) {
  const filesChanged = parsed.files.map((f) => f.path);
  const testFilesChanged = filesChanged.filter(isTestFile);
  const hasTestChanges = testFilesChanged.length > 0;

  const fileReviews = [];
  const missingTestsSummary = [];
  const highlights = [];

  for (const file of parsed.files) {
    const comments = [];
    const missingTests = [];

    const addedLines = [];
    let changedLines = 0;
    for (const hunk of file.hunks) {
      for (const line of hunk.lines) {
        if (line.type === "add") addedLines.push(line);
        if (line.type === "add" || line.type === "del") changedLines += 1;
      }
    }

    const risk = classifyFileRisk({ addedLines, changedLines });

    for (const line of addedLines) {
      for (const pattern of HIGH_RISK_PATTERNS) {
        if (!pattern.re.test(line.content)) continue;
        comments.push({ type: "risk", message: pattern.message, line: line.newLine });
      }

      for (const pattern of SUGGESTION_PATTERNS) {
        if (!pattern.re.test(line.content)) continue;
        comments.push({ type: "suggestion", message: pattern.message, line: line.newLine });
      }

      for (const pattern of NITPICK_PATTERNS) {
        if (!pattern.re.test(line.content)) continue;
        comments.push({ type: "nitpick", message: pattern.message, line: line.newLine });
      }

      if (comments.length >= maxCommentsPerFile) break;
    }

    const fileIsTest = isTestFile(file.path);
    if (!fileIsTest && !hasTestChanges && changedLines > 0) {
      missingTests.push(`Add/update tests to cover changes in \`${file.path}\`.`);
      missingTestsSummary.push(`No test changes despite changes in \`${file.path}\`.`);
    }

    if (risk === "high") {
      highlights.push(`High risk in \`${file.path}\` (validate security/impact).`);
    }

    fileReviews.push({
      path: file.path,
      risk,
      comments: comments.slice(0, maxCommentsPerFile),
      missingTests
    });
  }

  let overallRisk = "low";
  for (const fr of fileReviews) overallRisk = riskMax(overallRisk, fr.risk);

  const checklist = [
    "Confirm expected behavior (happy path and edge cases).",
    "Check error handling and input validation.",
    "Ensure there is no debug/log code in production.",
    "Update documentation/README if applicable."
  ];
  if (missingTestsSummary.length > 0) checklist.unshift("Add/update tests for the changes.");

  return {
    summary: {
      risk: overallRisk,
      highlights: highlights.length > 0 ? highlights : ["No obvious risks detected by heuristics."],
      missingTests: missingTestsSummary
    },
    files: fileReviews,
    checklist,
    meta: {
      filesChanged,
      testFilesChanged
    }
  };
}
