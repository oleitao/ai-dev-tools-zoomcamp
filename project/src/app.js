import path from "node:path";
import { fileURLToPath } from "node:url";
import fs from "node:fs/promises";
import { HttpError, toErrorResponse } from "./errors.js";
import { readJson, sendJson, sendText } from "./http.js";
import { tryServeStatic } from "./static.js";
import { runReview } from "./review/engine.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const WEB_ROOT = path.join(__dirname, "web");

function clampInt(value, { min, max, fallback }) {
  const n = parseInt(value ?? "", 10);
  if (!Number.isFinite(n)) return fallback;
  return Math.max(min, Math.min(max, n));
}

export function createApp({ db, config }) {
  return async function handle(req, res) {
    try {
      const url = new URL(req.url ?? "/", "http://local");

      if (url.pathname === "/api/health" && req.method === "GET") {
        return sendJson(res, 200, { status: "ok", version: "0.1.0" });
      }

      if (url.pathname === "/api/openapi.yaml" && req.method === "GET") {
        const openapiPath = path.resolve("./openapi.yaml");
        const spec = await fs.readFile(openapiPath, "utf-8");
        return sendText(res, 200, spec, "text/yaml; charset=utf-8");
      }

      if (url.pathname === "/api/reviews" && req.method === "POST") {
        const body = await readJson(req, { maxBytes: config.maxBodyBytes });
        const source = body?.source;
        if (source !== "diff" && source !== "github") {
          throw new HttpError(400, "invalid_source", "source must be diff|github");
        }

        const options = body?.options ?? {};
        const diff = body?.diff ?? null;
        const prUrl = body?.prUrl ?? null;

        if (source === "diff" && typeof diff !== "string") {
          throw new HttpError(400, "diff_required", "diff is required when source=diff");
        }
        if (source === "github" && typeof prUrl !== "string") {
          throw new HttpError(400, "pr_url_required", "prUrl is required when source=github");
        }

        const policy =
          typeof options?.policyId === "string"
            ? await db.getPolicy(options.policyId)
            : await db.getDefaultPolicy();

        const reviewRun = await runReview({
          source,
          diff,
          prUrl,
          options,
          policy,
          githubToken: config.githubToken,
          openaiApiKey: config.openaiApiKey,
          openaiModel: config.openaiModel
        });

        const createdAt = new Date().toISOString();
        const stored = await db.createReview({
          id: reviewRun.id,
          createdAt,
          source,
          prUrl,
          request: { source, diff: source === "diff" ? diff : null, prUrl, options },
          result: reviewRun.result
        });

        return sendJson(res, 201, { review: stored });
      }

      if (url.pathname === "/api/reviews" && req.method === "GET") {
        const limit = clampInt(url.searchParams.get("limit"), {
          min: 1,
          max: 200,
          fallback: 20
        });
        const offset = clampInt(url.searchParams.get("offset"), {
          min: 0,
          max: 1_000_000,
          fallback: 0
        });

        const list = await db.listReviews({ limit, offset });
        return sendJson(res, 200, list);
      }

      if (url.pathname.startsWith("/api/reviews/") && req.method === "GET") {
        const id = url.pathname.split("/").at(-1);
        const review = await db.getReview(id);
        if (!review) {
          throw new HttpError(404, "not_found", "Review not found");
        }
        return sendJson(res, 200, { review });
      }

      if (url.pathname === "/api/policies" && req.method === "GET") {
        const policies = await db.listPolicies();
        return sendJson(res, 200, { policies });
      }

      if (url.pathname === "/api/policies" && req.method === "POST") {
        const body = await readJson(req, { maxBytes: config.maxBodyBytes });
        const name = body?.name;
        const rules = body?.rules;
        if (typeof name !== "string" || name.trim().length === 0) {
          throw new HttpError(400, "invalid_name", "name is required");
        }
        if (typeof rules !== "object" || rules === null) {
          throw new HttpError(400, "invalid_rules", "rules is required");
        }

        const policy = await db.upsertPolicy({
          id: typeof body?.id === "string" ? body.id : undefined,
          name,
          rules,
          makeDefault: Boolean(body?.makeDefault)
        });

        return sendJson(res, 200, { policy });
      }

      if (url.pathname === "/api/metrics" && req.method === "GET") {
        const metrics = await db.getMetrics();
        return sendJson(res, 200, { metrics });
      }

      if (await tryServeStatic({ req, res, rootDir: WEB_ROOT })) return;

      sendJson(res, 404, { error: { code: "not_found", message: "Not found" } });
    } catch (error) {
      const { statusCode, body } = toErrorResponse(error);
      sendJson(res, statusCode, body);
    }
  };
}
