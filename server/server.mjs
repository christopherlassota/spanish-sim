import "dotenv/config";
import http from "node:http";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { getLlmConfig, hasApiConfig } from "./llm.mjs";
import { createAnalyticsStore } from "./analytics.mjs";
import { json } from "./http-utils.mjs";
import { createClientAppHandler } from "./static-client.mjs";
import { createSessionRegistry } from "./session-registry.mjs";
import { createApiRouter } from "./api-router.mjs";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const defaultClientDir = path.join(__dirname, "..", "dist");

/**
 * @param {{
 *   clientDir?: string,
 *   analytics?: ReturnType<import("./analytics.mjs").createAnalyticsStore>,
 *   sessions?: ReturnType<import("./session-registry.mjs").createSessionRegistry>,
 *   store?: Parameters<typeof createApiRouter>[0]["store"]
 * }} [options]
 */
export function createHttpServer(options = {}) {
  const clientDir = options.clientDir || defaultClientDir;
  const analytics = options.analytics || createAnalyticsStore();
  const sessions = options.sessions || createSessionRegistry();
  const handleApiRequest = createApiRouter({ analytics, sessions, store: options.store });
  const serveClientApp = createClientAppHandler({ clientDir });

  return http.createServer(async (req, res) => {
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
}

/**
 * @param {{ port?: string | number, clientDir?: string }} [options]
 */
export function startServer(options = {}) {
  const port = options.port || process.env.PORT || 8787;
  const server = createHttpServer({ clientDir: options.clientDir });

  server.listen(port, () => {
    const llm = getLlmConfig();
    console.log(`Spanish Sim MVP running on http://localhost:${port}`);
    if (!hasApiConfig()) console.log(`LLM key for provider '${llm.provider}' not set: using fallback scripted responses.`);
  });

  return server;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  startServer();
}
