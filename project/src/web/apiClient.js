const DEFAULT_HEADERS = {
  "content-type": "application/json"
};

async function request(path, { method = "GET", body } = {}) {
  const res = await fetch(path, {
    method,
    headers: DEFAULT_HEADERS,
    body: body ? JSON.stringify(body) : undefined
  });

  const contentType = (res.headers.get("content-type") ?? "").split(";")[0].trim();
  const isJson = contentType === "application/json";
  const payload = isJson ? await res.json() : await res.text();

  if (!res.ok) {
    const message =
      typeof payload?.error?.message === "string"
        ? payload.error.message
        : `Request failed (${res.status})`;
    const code = typeof payload?.error?.code === "string" ? payload.error.code : "request_failed";
    const error = new Error(message);
    error.code = code;
    error.status = res.status;
    throw error;
  }

  return payload;
}

export const api = {
  health: () => request("/api/health"),
  openapi: () => fetch("/api/openapi.yaml").then((r) => r.text()),
  createReview: ({ source, diff, prUrl, options }) =>
    request("/api/reviews", { method: "POST", body: { source, diff, prUrl, options } }),
  listReviews: ({ limit = 20, offset = 0 } = {}) =>
    request(`/api/reviews?limit=${encodeURIComponent(limit)}&offset=${encodeURIComponent(offset)}`),
  getReview: (id) => request(`/api/reviews/${encodeURIComponent(id)}`),
  listPolicies: () => request("/api/policies"),
  upsertPolicy: (policy) => request("/api/policies", { method: "POST", body: policy }),
  metrics: () => request("/api/metrics")
};

