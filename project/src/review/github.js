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
  if (!githubToken) {
    throw new HttpError(
      400,
      "github_token_missing",
      "GITHUB_TOKEN é obrigatório para source=github"
    );
  }

  const parsed = parseGithubPrUrl(prUrl);
  if (!parsed) {
    throw new HttpError(400, "invalid_pr_url", "URL de PR do GitHub inválida");
  }

  const apiUrl = `https://api.github.com/repos/${parsed.owner}/${parsed.repo}/pulls/${parsed.number}`;
  const res = await fetch(apiUrl, {
    headers: {
      authorization: `Bearer ${githubToken}`,
      accept: "application/vnd.github.v3.diff",
      "user-agent": "pr-buddy"
    }
  });

  if (!res.ok) {
    throw new HttpError(502, "github_fetch_failed", `GitHub API error: ${res.status}`);
  }

  return await res.text();
}

