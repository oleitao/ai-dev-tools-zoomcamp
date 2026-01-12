import fs from "node:fs/promises";
import path from "node:path";
import { sendText } from "./http.js";

const CONTENT_TYPES_BY_EXT = new Map([
  [".html", "text/html; charset=utf-8"],
  [".css", "text/css; charset=utf-8"],
  [".js", "text/javascript; charset=utf-8"],
  [".json", "application/json; charset=utf-8"],
  [".yaml", "text/yaml; charset=utf-8"],
  [".yml", "text/yaml; charset=utf-8"],
  [".svg", "image/svg+xml"],
  [".ico", "image/x-icon"],
  [".png", "image/png"]
]);

export async function tryServeStatic({ req, res, rootDir }) {
  if (req.method !== "GET" && req.method !== "HEAD") return false;

  const url = new URL(req.url ?? "/", "http://local");
  let reqPath;
  try {
    reqPath = decodeURIComponent(url.pathname);
  } catch {
    return false;
  }
  if (reqPath === "/") reqPath = "/index.html";

  const root = path.resolve(rootDir);
  const normalized = path.posix.normalize(reqPath.replaceAll("\\", "/"));
  const safeRelPath = normalized.replace(/^\/+/, "");
  if (safeRelPath.startsWith("..")) return false;

  const fullPath = path.join(root, safeRelPath);
  if (!fullPath.startsWith(root)) return false;

  try {
    const stat = await fs.stat(fullPath);
    if (!stat.isFile()) return false;

    const ext = path.extname(fullPath).toLowerCase();
    const contentType = CONTENT_TYPES_BY_EXT.get(ext) ?? "application/octet-stream";
    const file = await fs.readFile(fullPath);

    res.writeHead(200, {
      "content-type": contentType,
      "content-length": file.length,
      "cache-control": "no-store"
    });
    if (req.method === "HEAD") {
      res.end();
      return true;
    }

    res.end(file);
    return true;
  } catch {
    if (safeRelPath === "index.html") {
      sendText(res, 404, "Frontend not built/available");
      return true;
    }
    return false;
  }
}
