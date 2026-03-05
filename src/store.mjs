import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const dataDir = path.join(__dirname, "..", "data");
const dbPath = path.join(dataDir, "progress.json");

function ensureDb() {
  if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });
  if (!fs.existsSync(dbPath)) {
    fs.writeFileSync(dbPath, JSON.stringify({ sessions: {}, attempts: {} }, null, 2), "utf8");
  }
}

function readDb() {
  ensureDb();
  return JSON.parse(fs.readFileSync(dbPath, "utf8"));
}

function writeDb(db) {
  fs.writeFileSync(dbPath, JSON.stringify(db, null, 2), "utf8");
}

function avg(list, key) {
  if (!list.length) return null;
  return Math.round(list.reduce((a, b) => a + (b[key] || 0), 0) / list.length);
}

export function saveSessionSnapshot(sessionId, session) {
  const db = readDb();
  db.sessions[sessionId] = {
    scenarioId: session.scenarioId,
    difficulty: session.difficulty,
    stage: session.stage,
    completed: session.completed,
    turnCount: session.history.length,
    updatedAt: new Date().toISOString()
  };
  writeDb(db);
}

export function saveAttempt(sessionId, scenarioId, report) {
  const db = readDb();
  if (!db.attempts[scenarioId]) db.attempts[scenarioId] = [];
  db.attempts[scenarioId].push({
    sessionId,
    score: report.score,
    cefrBand: report.cefrBand,
    competencies: report.competencies,
    at: new Date().toISOString()
  });
  writeDb(db);
}

export function getPreviousAttemptDelta(scenarioId) {
  const db = readDb();
  const list = db.attempts[scenarioId] || [];
  if (list.length < 2) return { previousScore: null, delta: null };

  const prev = list[list.length - 2].score;
  const curr = list[list.length - 1].score;
  return { previousScore: prev, delta: curr - prev };
}

export function getProgressSummary() {
  const db = readDb();
  const attemptsByScenario = Object.fromEntries(
    Object.entries(db.attempts).map(([scenarioId, list]) => {
      const last = list[list.length - 1] || null;
      return [
        scenarioId,
        {
          attempts: list.length,
          avgScore: avg(list, "score"),
          lastScore: last?.score ?? null,
          lastCefrBand: last?.cefrBand ?? null,
          competencyAverages: {
            taskCompletion: Math.round((list.reduce((a, b) => a + (b.competencies?.taskCompletion || 0), 0) / list.length) || 0),
            grammarAccuracy: Math.round((list.reduce((a, b) => a + (b.competencies?.grammarAccuracy || 0), 0) / list.length) || 0),
            vocabularyRange: Math.round((list.reduce((a, b) => a + (b.competencies?.vocabularyRange || 0), 0) / list.length) || 0),
            fluencyNaturalness: Math.round((list.reduce((a, b) => a + (b.competencies?.fluencyNaturalness || 0), 0) / list.length) || 0)
          }
        }
      ];
    })
  );

  return {
    totalSessions: Object.keys(db.sessions).length,
    attemptsByScenario
  };
}
