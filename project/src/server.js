import http from "node:http";
import { loadEnvFile } from "./env.js";
import { getConfig } from "./config.js";
import { createDb } from "./db/index.js";
import { createApp } from "./app.js";

await loadEnvFile(".env");

const config = getConfig(process.env);
const db = await createDb(config);
await db.migrate();

const app = createApp({ db, config });
const server = http.createServer((req, res) => void app(req, res));

server.on("error", (error) => {
  console.error("Server error:", error?.message ?? error);
  process.exit(1);
});

server.listen(config.port, config.host, () => {
  console.log(`PR Buddy running on http://${config.host}:${config.port}`);
});

function shutdown(signal) {
  console.log(`\nReceived ${signal}. Shutting down...`);
  server.close(async () => {
    await db.close();
    process.exit(0);
  });
}

process.on("SIGINT", () => shutdown("SIGINT"));
process.on("SIGTERM", () => shutdown("SIGTERM"));
