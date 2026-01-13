import test from "node:test";
import assert from "node:assert/strict";
import { fetchGithubPrDiff } from "../../src/review/github.js";

test("fetchGithubPrDiff falls back to .diff URL when no token is provided", async (t) => {
  const originalFetch = globalThis.fetch;
  t.after(() => {
    globalThis.fetch = originalFetch;
  });

  /** @type {any[]} */
  const calls = [];
  globalThis.fetch = async (url, init) => {
    calls.push({ url, init });
    return {
      ok: true,
      status: 200,
      headers: {
        get: () => "text/plain; charset=utf-8"
      },
      text: async () => "diff --git a/a b/a\n"
    };
  };

  const diff = await fetchGithubPrDiff({
    prUrl: "https://github.com/foo/bar/pull/1",
    githubToken: null
  });

  assert.equal(diff.startsWith("diff --git"), true);
  assert.equal(calls.length, 1);
  assert.equal(calls[0].url, "https://github.com/foo/bar/pull/1.diff");
});

test("fetchGithubPrDiff errors with github_token_missing when public diff is not accessible", async (t) => {
  const originalFetch = globalThis.fetch;
  t.after(() => {
    globalThis.fetch = originalFetch;
  });

  globalThis.fetch = async () => ({
    ok: true,
    status: 200,
    headers: {
      get: () => "text/html; charset=utf-8"
    },
    text: async () => "<html>login</html>"
  });

  await assert.rejects(
    fetchGithubPrDiff({
      prUrl: "https://github.com/foo/bar/pull/1",
      githubToken: ""
    }),
    (err) => err?.code === "github_token_missing"
  );
});

