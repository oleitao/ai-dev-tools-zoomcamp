import { HttpError } from "./errors.js";

export async function readRequestBody(req, { maxBytes }) {
  const chunks = [];
  let size = 0;

  for await (const chunk of req) {
    size += chunk.length;
    if (size > maxBytes) {
      throw new HttpError(413, "payload_too_large", "Request body is too large");
    }
    chunks.push(chunk);
  }

  return Buffer.concat(chunks);
}

export async function readJson(req, { maxBytes }) {
  const contentType = (req.headers["content-type"] ?? "").split(";")[0].trim();
  if (contentType !== "application/json") {
    throw new HttpError(
      415,
      "unsupported_media_type",
      "Expected Content-Type: application/json"
    );
  }

  const raw = await readRequestBody(req, { maxBytes });
  if (raw.length === 0) {
    throw new HttpError(400, "invalid_json", "Empty JSON body");
  }

  try {
    return JSON.parse(raw.toString("utf-8"));
  } catch {
    throw new HttpError(400, "invalid_json", "Malformed JSON");
  }
}

export function sendJson(res, statusCode, payload) {
  const body = JSON.stringify(payload);
  res.writeHead(statusCode, {
    "content-type": "application/json; charset=utf-8",
    "content-length": Buffer.byteLength(body),
    "cache-control": "no-store"
  });
  res.end(body);
}

export function sendText(res, statusCode, text, contentType = "text/plain; charset=utf-8") {
  res.writeHead(statusCode, {
    "content-type": contentType,
    "content-length": Buffer.byteLength(text),
    "cache-control": "no-store"
  });
  res.end(text);
}

