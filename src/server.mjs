import "dotenv/config";
import http from "node:http";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { getLlmConfig, hasApiConfig } from "./llm.mjs";
import { createAnalyticsStore } from "./analytics.mjs";
import { json } from "./http-utils.mjs";
import { createClientAppHandler } from "./static-client.mjs";
import { createSessionRegistry } from "./session-registry.mjs";
import { createApiRouter } from "./api-router.mjs";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const clientDir = path.join(__dirname, "..", "dist");
const analytics = createAnalyticsStore();
const sessions = createSessionRegistry();
const handleApiRequest = createApiRouter({ analytics, sessions });
const serveClientApp = createClientAppHandler({ clientDir });

const server = http.createServer(async (req, res) => {
  const pathname = new URL(req.url || "/", "http://localhost").pathname;

  if (pathname.startsWith("/api/")) {
    const handled = await handleApiRequest(req, res, pathname);
    if (handled) return;
    json(res, 404, { error: "Route not found" });
    return;
  }

  if (req.method === "GET") {
    serveClientApp(res, pathname);
    return;
  }

  json(res, 404, { error: "Route not found" });
});

const PORT = process.env.PORT || 8787;
server.listen(PORT, () => {
  const llm = getLlmConfig();
  console.log(`Spanish Sim MVP running on http://localhost:${PORT}`);
  if (!hasApiConfig()) console.log(`LLM key for provider '${llm.provider}' not set: using fallback scripted responses.`);
});
