export function getConfig(env) {
  const port = parseInt(env.PORT ?? "3000", 10);
  if (!Number.isFinite(port) || port <= 0 || port > 65535) {
    throw new Error(`Invalid PORT: ${env.PORT}`);
  }

  const host = env.HOST ?? "127.0.0.1";
  const databaseUrl = env.DATABASE_URL ?? "sqlite:./data/pr-buddy.sqlite";

  const maxBodyBytes = parseInt(env.MAX_BODY_BYTES ?? "2000000", 10);
  if (!Number.isFinite(maxBodyBytes) || maxBodyBytes <= 0) {
    throw new Error(`Invalid MAX_BODY_BYTES: ${env.MAX_BODY_BYTES}`);
  }

  const githubToken =
    typeof env.GITHUB_TOKEN === "string" && env.GITHUB_TOKEN.trim() !== ""
      ? env.GITHUB_TOKEN.trim()
      : null;

  const openaiApiKey =
    typeof env.OPENAI_API_KEY === "string" && env.OPENAI_API_KEY.trim() !== ""
      ? env.OPENAI_API_KEY.trim()
      : null;

  return {
    port,
    host,
    databaseUrl,
    githubToken,
    openaiApiKey,
    openaiModel: env.OPENAI_MODEL ?? "gpt-4o-mini",
    maxBodyBytes,
    publicBaseUrl: env.PUBLIC_BASE_URL ?? null
  };
}
