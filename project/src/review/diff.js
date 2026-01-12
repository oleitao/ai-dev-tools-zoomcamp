const DIFF_GIT_RE = /^diff --git a\/(.+?) b\/(.+)$/;
const HUNK_RE = /^@@ -(\d+)(?:,(\d+))? \+(\d+)(?:,(\d+))? @@/;

export function parseUnifiedDiff(text) {
  const lines = text.split(/\r?\n/);

  /** @type {Array<{path: string, hunks: any[]}>} */
  const files = [];

  let currentFile = null;
  let currentHunk = null;
  let oldLine = 0;
  let newLine = 0;

  function ensureFile(path) {
    currentFile = { path, hunks: [] };
    files.push(currentFile);
    currentHunk = null;
  }

  for (const line of lines) {
    const diffMatch = DIFF_GIT_RE.exec(line);
    if (diffMatch) {
      const bPath = diffMatch[2];
      ensureFile(bPath);
      continue;
    }

    if (!currentFile) continue;

    const hunkMatch = HUNK_RE.exec(line);
    if (hunkMatch) {
      oldLine = parseInt(hunkMatch[1], 10);
      newLine = parseInt(hunkMatch[3], 10);
      currentHunk = {
        header: line,
        oldStart: oldLine,
        newStart: newLine,
        lines: []
      };
      currentFile.hunks.push(currentHunk);
      continue;
    }

    if (!currentHunk) continue;
    if (line.startsWith("\\ No newline at end of file")) continue;

    if (line.startsWith("+") && !line.startsWith("+++")) {
      currentHunk.lines.push({
        type: "add",
        oldLine: null,
        newLine,
        content: line.slice(1)
      });
      newLine += 1;
      continue;
    }

    if (line.startsWith("-") && !line.startsWith("---")) {
      currentHunk.lines.push({
        type: "del",
        oldLine,
        newLine: null,
        content: line.slice(1)
      });
      oldLine += 1;
      continue;
    }

    if (line.startsWith(" ")) {
      currentHunk.lines.push({
        type: "context",
        oldLine,
        newLine,
        content: line.slice(1)
      });
      oldLine += 1;
      newLine += 1;
    }
  }

  return { files };
}

export function diffStats(parsed) {
  let added = 0;
  let deleted = 0;

  for (const file of parsed.files) {
    for (const hunk of file.hunks) {
      for (const line of hunk.lines) {
        if (line.type === "add") added += 1;
        if (line.type === "del") deleted += 1;
      }
    }
  }

  return { added, deleted, files: parsed.files.length };
}

