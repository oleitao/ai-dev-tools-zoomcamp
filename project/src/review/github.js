import { HttpError } from "../errors.js";

function parseGithubPrUrl(prUrl) {
  const url = new URL(prUrl);
  if (url.hostname !== "github.com") return null;

  const parts = url.pathname.split("/").filter(Boolean);
  if (parts.length < 4) return null;
  const [owner, repo, pullLiteral, number] = parts;
  if (pullLiteral !== "pull") return null;
  if (!/^\d+$/.test(number)) return null;

  return { owner, repo, number };
}

export async function fetchGithubPrDiff({ prUrl, githubToken }) {
  const parsed = parseGithubPrUrl(prUrl);
  if (!parsed) {
    throw new HttpError(400, "invalid_pr_url", "Invalid GitHub PR URL");
  }

  const token =
    typeof githubToken === "string" && githubToken.trim().length > 0
      ? githubToken.trim()
      : null;

  if (token) {
    const apiUrl = `https://api.github.com/repos/${parsed.owner}/${parsed.repo}/pulls/${parsed.number}`;
    const res = await fetch(apiUrl, {
      headers: {
        authorization: `Bearer ${token}`,
        accept: "application/vnd.github.v3.diff",
        "user-agent": "pr-buddy"
      }
    });

    if (!res.ok) {
      throw new HttpError(502, "github_fetch_failed", `GitHub API error: ${res.status}`);
    }

    return await res.text();
  }

  const diffUrl = `https://github.com/${parsed.owner}/${parsed.repo}/pull/${parsed.number}.diff`;
  let res;
  try {
    res = await fetch(diffUrl, {
      headers: { accept: "text/plain", "user-agent": "pr-buddy" }
    });
  } catch {
    throw new HttpError(502, "github_fetch_failed", "Failed to fetch diff from GitHub");
  }

  const contentType = (res.headers.get("content-type") ?? "").split(";")[0].trim();
  if (!res.ok || contentType === "text/html") {
    throw new HttpError(
      400,
      "github_token_missing",
      "GITHUB_TOKEN is required for source=github (private repo or restricted access)"
    );
  }

  return await res.text();
}
