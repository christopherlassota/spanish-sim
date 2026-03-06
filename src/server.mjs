import "dotenv/config";
import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createSession, nextTurn } from "./orchestrator.mjs";
import { scoreConversation } from "./feedback.mjs";
import { scenarios } from "./scenarios.mjs";
import { createAnalyticsStore } from "./analytics.mjs";
import { saveSessionSnapshot, saveAttempt, getPreviousAttemptDelta, getProgressSummary } from "./store.mjs";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const publicDir = path.join(__dirname, "..", "public");

const sessions = new Map();
const analytics = createAnalyticsStore();

function json(res, status, data) {
  res.writeHead(status, { "Content-Type": "application/json" });
  res.end(JSON.stringify(data));
}

function serveStatic(req, res) {
  const cleanUrl = req.url === "/" ? "/index.html" : req.url;
  const filePath = path.join(publicDir, cleanUrl);
  if (!filePath.startsWith(publicDir)) return json(res, 403, { error: "Forbidden" });

  fs.readFile(filePath, (err, data) => {
    if (err) return json(res, 404, { error: "Not found" });
    const ext = path.extname(filePath);
    const type = ext === ".js" ? "text/javascript" : ext === ".css" ? "text/css" : "text/html";
    res.writeHead(200, { "Content-Type": type });
    res.end(data);
  });
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    let body = "";
    req.on("data", chunk => (body += chunk));
    req.on("end", () => {
      try { resolve(JSON.parse(body || "{}")); }
      catch { reject(new Error("Bad JSON")); }
    });
  });
}

const server = http.createServer(async (req, res) => {
  if (req.method === "GET" && (req.url === "/" || req.url.endsWith(".js") || req.url.endsWith(".css"))) return serveStatic(req, res);

  if (req.method === "GET" && req.url === "/api/scenarios") {
    return json(res, 200, {
      scenarios: Object.values(scenarios).map(s => ({ id: s.id, title: s.title, objective: s.objective, openingLine: s.openingLine }))
    });
  }

  if (req.method === "POST" && req.url === "/api/session") {
    try {
      const { scenarioId = "restaurant", difficulty = "standard" } = await readBody(req);
      const id = crypto.randomUUID();
      const session = createSession(scenarioId, difficulty);
      sessions.set(id, session);
      saveSessionSnapshot(id, session);
      analytics.track("session_started", { scenarioId, difficulty });
      return json(res, 200, { sessionId: id, session, openingLine: scenarios[scenarioId].openingLine });
    } catch {
      return json(res, 400, { error: "Bad request" });
    }
  }

  if (req.method === "POST" && req.url === "/api/turn") {
    try {
      const { sessionId, text } = await readBody(req);
      const session = sessions.get(sessionId);
      if (!session) return json(res, 404, { error: "Session not found" });

      session.history.push({ role: "user", content: text });
      analytics.track("user_turn", { sessionId, scenarioId: session.scenarioId, stage: session.stage, difficulty: session.difficulty });

      const updated = await nextTurn(session, text);
      updated.turns.forEach(t => session.history.push(t));
      session.stage = updated.stage;
      session.completed = updated.completed;
      saveSessionSnapshot(sessionId, session);

      if (session.completed) analytics.track("scenario_completed", { sessionId, scenarioId: session.scenarioId, difficulty: session.difficulty });

      return json(res, 200, { stage: session.stage, completed: session.completed, turns: updated.turns });
    } catch {
      return json(res, 400, { error: "Bad request" });
    }
  }

  if (req.method === "POST" && req.url === "/api/feedback") {
    try {
      const { sessionId } = await readBody(req);
      const session = sessions.get(sessionId);
      if (!session) return json(res, 404, { error: "Session not found" });

      const report = scoreConversation(session.history, session.scenarioId);
      saveAttempt(sessionId, session.scenarioId, report);
      const { previousScore, delta } = getPreviousAttemptDelta(session.scenarioId);

      analytics.track("feedback_generated", {
        sessionId,
        scenarioId: session.scenarioId,
        score: report.score,
        cefrBand: report.cefrBand,
        difficulty: session.difficulty,
        delta
      });

      return json(res, 200, {
        ...report,
        previousScore,
        delta,
        improvementLabel: delta == null ? "No baseline yet" : delta >= 0 ? `+${delta} vs previous attempt` : `${delta} vs previous attempt`
      });
    } catch {
      return json(res, 400, { error: "Bad request" });
    }
  }

  if (req.method === "GET" && req.url === "/api/analytics") return json(res, 200, analytics.summary());
  if (req.method === "GET" && req.url === "/api/progress") return json(res, 200, getProgressSummary());

  return json(res, 404, { error: "Route not found" });
});

const PORT = process.env.PORT || 8787;
server.listen(PORT, () => {
  console.log(`Spanish Sim MVP running on http://localhost:${PORT}`);
  if (!process.env.OPENAI_API_KEY) console.log("OPENAI_API_KEY not set: using fallback scripted responses.");
});
