import { HttpError } from "../../errors.js";

function normalizeRisk(value) {
  if (value === "high" || value === "medium" || value === "low") return value;
  const v = String(value ?? "").toLowerCase();
  if (v.includes("high")) return "high";
  if (v.includes("medium")) return "medium";
  return "low";
}

function ensureArray(value) {
  return Array.isArray(value) ? value : [];
}

function normalizeReviewResult(raw) {
  const summary = raw?.summary ?? {};
  const files = ensureArray(raw?.files).map((f) => ({
    path: String(f?.path ?? ""),
    risk: normalizeRisk(f?.risk),
    comments: ensureArray(f?.comments).map((c) => ({
      type: ["risk", "suggestion", "nitpick"].includes(c?.type) ? c.type : "suggestion",
      message: String(c?.message ?? ""),
      line: Number.isFinite(c?.line) ? c.line : null
    })),
    missingTests: ensureArray(f?.missingTests).map((x) => String(x))
  }));

  return {
    summary: {
      risk: normalizeRisk(summary?.risk),
      highlights: ensureArray(summary?.highlights).map((x) => String(x)),
      missingTests: ensureArray(summary?.missingTests).map((x) => String(x))
    },
    files,
    checklist: ensureArray(raw?.checklist).map((x) => String(x))
  };
}

export async function reviewDiffWithOpenAI({ diffText, openaiApiKey, openaiModel }) {
  if (!openaiApiKey) {
    throw new HttpError(400, "openai_api_key_missing", "OPENAI_API_KEY é obrigatório");
  }

  const prompt = [
    "És o PR Buddy, um revisor de Pull Requests.",
    "Objetivo: devolver um review acionável e estruturado.",
    "",
    "Regras:",
    "- Responder APENAS com JSON válido (sem markdown).",
    "- Risco deve ser: low | medium | high.",
    "- Cada comentário deve ter: type (risk|suggestion|nitpick), message e line (ou null).",
    "",
    "Schema esperado:",
    "{",
    '  "summary": {"risk":"low|medium|high","highlights":[...],"missingTests":[...]},',
    '  "files": [{"path":"...","risk":"low|medium|high","comments":[...],"missingTests":[...]}],',
    '  "checklist": ["..."]',
    "}"
  ].join("\n");

  const res = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      authorization: `Bearer ${openaiApiKey}`,
      "content-type": "application/json"
    },
    body: JSON.stringify({
      model: openaiModel,
      temperature: 0.2,
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: prompt },
        { role: "user", content: `Diff:\n\n${diffText}` }
      ]
    })
  });

  if (!res.ok) {
    const text = await res.text();
    throw new HttpError(502, "openai_failed", `OpenAI error: ${res.status} ${text}`);
  }

  const data = await res.json();
  const content = data?.choices?.[0]?.message?.content;
  if (typeof content !== "string" || content.trim().length === 0) {
    throw new HttpError(502, "openai_invalid_response", "OpenAI returned an empty response");
  }

  let parsed;
  try {
    parsed = JSON.parse(content);
  } catch {
    throw new HttpError(502, "openai_invalid_json", "OpenAI response was not valid JSON");
  }

  return normalizeReviewResult(parsed);
}

