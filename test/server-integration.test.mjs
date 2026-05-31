import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { createHttpServer } from "../server/server.mjs";

function createMemoryStore() {
  const sessionSnapshots = new Map();
  const attempts = new Map();

  return {
    saveSessionSnapshot(sessionId, session) {
      sessionSnapshots.set(sessionId, {
        userId: session.userId,
        scenarioId: session.scenarioId,
        difficulty: session.difficulty,
        stage: session.stage,
        completed: session.completed
      });
    },
    saveAttempt(sessionId, scenarioId, report) {
      const session = sessionSnapshots.get(sessionId);
      const list = attempts.get(scenarioId) || [];
      list.push({
        userId: session?.userId ?? "demo",
        sessionId,
        score: report.score,
        cefrBand: report.cefrBand,
        competencies: report.competencies
      });
      attempts.set(scenarioId, list);
    },
    getPreviousAttemptDelta(scenarioId, userId = "demo") {
      const list = (attempts.get(scenarioId) || []).filter(attempt => attempt.userId === userId);
      if (list.length < 2) return { previousScore: null, delta: null };
      const previousScore = list[list.length - 2].score;
      return { previousScore, delta: list[list.length - 1].score - previousScore };
    },
    getProgressSummary(userId = "demo") {
      const flatAttempts = Array.from(attempts.entries()).flatMap(([scenarioId, list]) =>
        list
          .filter(attempt => attempt.userId === userId)
          .map(attempt => ({ scenarioId, ...attempt }))
      );
      const scopedAttempts = Array.from(attempts.entries()).map(([scenarioId, list]) => {
        const userAttempts = list.filter(attempt => attempt.userId === userId);
        const last = userAttempts[userAttempts.length - 1] || null;
        return [
          scenarioId,
          {
            attempts: userAttempts.length,
            avgScore: userAttempts.length
              ? Math.round(userAttempts.reduce((total, attempt) => total + attempt.score, 0) / userAttempts.length)
              : null,
            lastScore: last?.score ?? null,
            lastCefrBand: last?.cefrBand ?? null,
            competencyAverages: last?.competencies ?? {
              taskCompletion: 0,
              grammarAccuracy: 0,
              vocabularyRange: 0,
              fluencyNaturalness: 0
            }
          }
        ];
      }).filter(([, details]) => details.attempts > 0);

      return {
        userId,
        totalSessions: Array.from(sessionSnapshots.values()).filter(session => session.userId === userId).length,
        attemptsByScenario: Object.fromEntries(scopedAttempts),
        recentAttempts: flatAttempts.slice(-10).reverse(),
        weakestCompetency: flatAttempts.length ? { key: "vocabularyRange", score: flatAttempts[0].competencies.vocabularyRange } : null,
        recentDelta: flatAttempts.length > 1 ? flatAttempts[flatAttempts.length - 1].score - flatAttempts[flatAttempts.length - 2].score : null
      };
    }
  };
}

async function listen(server) {
  await new Promise(resolve => server.listen(0, "127.0.0.1", resolve));
  const address = server.address();
  assert.ok(address && typeof address === "object");
  return `http://127.0.0.1:${address.port}`;
}

async function close(server) {
  await new Promise((resolve, reject) => {
    server.close(error => {
      if (error) reject(error);
      else resolve();
    });
  });
}

async function requestJson(url, options) {
  const response = await fetch(url, options);
  const body = await response.json();
  return { response, body };
}

test("live server handles the main API session loop", async t => {
  const previousProvider = process.env.LLM_PROVIDER;
  const previousOpenAiKey = process.env.OPENAI_API_KEY;
  const previousMiniMaxKey = process.env.MINIMAX_API_KEY;
  process.env.LLM_PROVIDER = "openai";
  delete process.env.OPENAI_API_KEY;
  delete process.env.MINIMAX_API_KEY;
  t.after(() => {
    if (previousProvider == null) delete process.env.LLM_PROVIDER;
    else process.env.LLM_PROVIDER = previousProvider;
    if (previousOpenAiKey == null) delete process.env.OPENAI_API_KEY;
    else process.env.OPENAI_API_KEY = previousOpenAiKey;
    if (previousMiniMaxKey == null) delete process.env.MINIMAX_API_KEY;
    else process.env.MINIMAX_API_KEY = previousMiniMaxKey;
  });

  const clientDir = fs.mkdtempSync(path.join(process.cwd(), ".tmp-client-"));
  fs.writeFileSync(path.join(clientDir, "index.html"), "<!doctype html><div id=\"root\">Spanish Sim</div>", "utf8");
  t.after(() => fs.rmSync(clientDir, { recursive: true, force: true }));

  const server = createHttpServer({ clientDir, store: createMemoryStore() });
  const baseUrl = await listen(server);
  t.after(() => close(server));

  const scenarios = await requestJson(`${baseUrl}/api/scenarios`);
  assert.equal(scenarios.response.status, 200);
  assert.ok(scenarios.body.scenarios.some(scenario => scenario.id === "restaurant"));

  const sessionResult = await requestJson(`${baseUrl}/api/session`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ userId: "ana", scenarioId: "restaurant", difficulty: "standard" })
  });
  assert.equal(sessionResult.response.status, 200);
  assert.equal(sessionResult.body.session.userId, "ana");
  assert.equal(sessionResult.body.session.scenarioId, "restaurant");

  const sessionId = sessionResult.body.sessionId;
  let lastTurn = null;
  for (const text of ["agua por favor", "quiero tacos", "la cuenta por favor"]) {
    lastTurn = await requestJson(`${baseUrl}/api/turn`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ sessionId, text })
    });
    assert.equal(lastTurn.response.status, 200);
  }

  assert.equal(lastTurn.body.stage, "close");
  assert.equal(lastTurn.body.completed, true);

  const feedback = await requestJson(`${baseUrl}/api/feedback`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ sessionId })
  });
  assert.equal(feedback.response.status, 200);
  assert.equal(typeof feedback.body.score, "number");
  assert.ok(Array.isArray(feedback.body.retryGoals));

  const progress = await requestJson(`${baseUrl}/api/progress?userId=ana`);
  assert.equal(progress.response.status, 200);
  assert.equal(progress.body.userId, "ana");
  assert.equal(progress.body.totalSessions, 1);
  assert.equal(progress.body.attemptsByScenario.restaurant.attempts, 1);
  assert.equal(progress.body.recentAttempts.length, 1);
  assert.equal(progress.body.recentAttempts[0].scenarioId, "restaurant");
  assert.equal(progress.body.weakestCompetency.key, "vocabularyRange");

  const otherProgress = await requestJson(`${baseUrl}/api/progress?userId=chris`);
  assert.equal(otherProgress.response.status, 200);
  assert.equal(otherProgress.body.totalSessions, 0);
  assert.deepEqual(otherProgress.body.attemptsByScenario, {});
  assert.deepEqual(otherProgress.body.recentAttempts, []);

  const analytics = await requestJson(`${baseUrl}/api/analytics`);
  assert.equal(analytics.response.status, 200);
  assert.ok(analytics.body.fallbacks.total >= 1);
  assert.ok(analytics.body.fallbacks.byProvider.openai >= 1);
  assert.ok(analytics.body.fallbacks.byScenario.restaurant >= 1);
  assert.ok(analytics.body.fallbacks.byReason.empty >= 1);
});

test("live server serves the SPA shell and protects static misses", async t => {
  const clientDir = fs.mkdtempSync(path.join(process.cwd(), ".tmp-client-"));
  fs.mkdirSync(path.join(clientDir, "assets"));
  fs.writeFileSync(path.join(clientDir, "index.html"), "<!doctype html><div id=\"root\">Spanish Sim Shell</div>", "utf8");
  fs.writeFileSync(path.join(clientDir, "assets", "app.js"), "console.log('ok');", "utf8");
  t.after(() => fs.rmSync(clientDir, { recursive: true, force: true }));

  const server = createHttpServer({ clientDir, store: createMemoryStore() });
  const baseUrl = await listen(server);
  t.after(() => close(server));

  const shell = await fetch(`${baseUrl}/`);
  assert.equal(shell.status, 200);
  assert.match(await shell.text(), /Spanish Sim Shell/);

  const asset = await fetch(`${baseUrl}/assets/app.js`);
  assert.equal(asset.status, 200);
  assert.match(asset.headers.get("content-type") || "", /text\/javascript/);

  const missingAsset = await fetch(`${baseUrl}/assets/missing.js`);
  assert.equal(missingAsset.status, 404);

  const nestedRoute = await fetch(`${baseUrl}/practice/session/123`);
  assert.equal(nestedRoute.status, 200);
  assert.match(await nestedRoute.text(), /Spanish Sim Shell/);

  const encodedTraversal = await fetch(`${baseUrl}/%2E%2E%2Fpackage.json`);
  assert.equal(encodedTraversal.status, 404);
});
