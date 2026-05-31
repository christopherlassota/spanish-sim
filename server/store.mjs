import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { DEFAULT_USER_ID, normalizeUserId } from "../shared/contracts.mjs";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const dataDir = path.join(__dirname, "..", "data");
const dbPath = path.join(dataDir, "progress.json");
const competencyKeys = ["taskCompletion", "grammarAccuracy", "vocabularyRange", "fluencyNaturalness"];

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

function belongsToUser(record, userId) {
  return normalizeUserId(record?.userId) === userId;
}

function getScenarioAttempts(db, scenarioId, userId) {
  return (db.attempts[scenarioId] || []).filter(attempt => belongsToUser(attempt, userId));
}

function getCompetencyAverages(list) {
  return Object.fromEntries(
    competencyKeys.map(key => [
      key,
      Math.round((list.reduce((total, attempt) => total + (attempt.competencies?.[key] || 0), 0) / list.length) || 0)
    ])
  );
}

function getWeakestCompetency(list) {
  if (!list.length) return null;
  const averages = getCompetencyAverages(list);
  const [key, score] = Object.entries(averages).sort((a, b) => a[1] - b[1])[0];
  return { key, score };
}

function toProgressAttempt(scenarioId, attempt) {
  return {
    scenarioId,
    score: attempt.score,
    cefrBand: attempt.cefrBand,
    at: attempt.at || "",
    competencies: attempt.competencies
  };
}

export function saveSessionSnapshot(sessionId, session) {
  const db = readDb();
  db.sessions[sessionId] = {
    userId: normalizeUserId(session.userId),
    scenarioId: session.scenarioId,
    difficulty: session.difficulty,
    stage: session.stage,
    completed: session.completed,
    turnCount: session.history.length,
    updatedAt: new Date().toISOString()
  };
  writeDb(db);
}

export function saveAttempt(sessionId, scenarioId, report, userId = DEFAULT_USER_ID) {
  const db = readDb();
  if (!db.attempts[scenarioId]) db.attempts[scenarioId] = [];
  db.attempts[scenarioId].push({
    userId: normalizeUserId(userId),
    sessionId,
    score: report.score,
    cefrBand: report.cefrBand,
    competencies: report.competencies,
    at: new Date().toISOString()
  });
  writeDb(db);
}

export function getPreviousAttemptDelta(scenarioId, userId = DEFAULT_USER_ID) {
  const db = readDb();
  const list = getScenarioAttempts(db, scenarioId, normalizeUserId(userId));
  if (list.length < 2) return { previousScore: null, delta: null };

  const prev = list[list.length - 2].score;
  const curr = list[list.length - 1].score;
  return { previousScore: prev, delta: curr - prev };
}

export function getProgressSummary(userId = DEFAULT_USER_ID) {
  const db = readDb();
  const scopedUserId = normalizeUserId(userId);
  const allAttempts = Object.entries(db.attempts).flatMap(([scenarioId, attempts]) =>
    attempts
      .filter(attempt => belongsToUser(attempt, scopedUserId))
      .map(attempt => toProgressAttempt(scenarioId, attempt))
  );
  const chronologicalAttempts = [...allAttempts].sort((a, b) => a.at.localeCompare(b.at));
  const recentAttempts = chronologicalAttempts.slice(-10).reverse();
  const lastAttempt = chronologicalAttempts[chronologicalAttempts.length - 1] || null;
  const previousAttempt = chronologicalAttempts[chronologicalAttempts.length - 2] || null;
  const recentDelta = lastAttempt && previousAttempt ? lastAttempt.score - previousAttempt.score : null;
  const attemptsByScenario = Object.fromEntries(
    Object.entries(db.attempts).map(([scenarioId, attempts]) => {
      const list = attempts.filter(attempt => belongsToUser(attempt, scopedUserId));
      const last = list[list.length - 1] || null;
      return [
        scenarioId,
        {
          attempts: list.length,
          avgScore: avg(list, "score"),
          lastScore: last?.score ?? null,
          lastCefrBand: last?.cefrBand ?? null,
          competencyAverages: getCompetencyAverages(list)
        }
      ];
    }).filter(([, details]) => details.attempts > 0)
  );

  return {
    userId: scopedUserId,
    totalSessions: Object.values(db.sessions).filter(session => belongsToUser(session, scopedUserId)).length,
    attemptsByScenario,
    recentAttempts,
    weakestCompetency: getWeakestCompetency(allAttempts),
    recentDelta
  };
}
