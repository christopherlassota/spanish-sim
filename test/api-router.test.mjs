import test from "node:test";
import assert from "node:assert/strict";
import { EventEmitter } from "node:events";
import { createAnalyticsStore } from "../server/analytics.mjs";
import { createApiRouter } from "../server/api-router.mjs";
import { createSession } from "../server/orchestrator.mjs";
import { createSessionRegistry } from "../server/session-registry.mjs";

function createRequest(method, body, url = "/api/test") {
  const req = new EventEmitter();
  req.method = method;
  req.url = url;

  queueMicrotask(() => {
    if (body !== undefined) req.emit("data", JSON.stringify(body));
    req.emit("end");
  });

  return req;
}

function createResponse() {
  return {
    statusCode: null,
    body: "",
    writeHead(statusCode) {
      this.statusCode = statusCode;
    },
    end(chunk = "") {
      this.body += chunk;
    },
    json() {
      return JSON.parse(this.body || "{}");
    }
  };
}

function createMemoryStore() {
  let savedAttempts = 0;
  let lastSessionUserId = null;
  let lastAttemptUserId = null;
  let lastProgressUserId = null;

  return {
    store: {
      saveSessionSnapshot(_sessionId, session) {
        lastSessionUserId = session.userId;
      },
      saveAttempt(_sessionId, _scenarioId, _report, userId) {
        savedAttempts += 1;
        lastAttemptUserId = userId;
      },
      getPreviousAttemptDelta() {
        return { previousScore: null, delta: null };
      },
      getProgressSummary(userId) {
        lastProgressUserId = userId;
        return {
          userId,
          totalSessions: 0,
          attemptsByScenario: {},
          recentAttempts: [],
          weakestCompetency: null,
          recentDelta: null
        };
      }
    },
    getSavedAttempts() {
      return savedAttempts;
    },
    getLastSessionUserId() {
      return lastSessionUserId;
    },
    getLastAttemptUserId() {
      return lastAttemptUserId;
    },
    getLastProgressUserId() {
      return lastProgressUserId;
    }
  };
}

test("turn route rejects completed sessions without mutating history", async () => {
  const analytics = createAnalyticsStore();
  const sessions = createSessionRegistry();
  const memory = createMemoryStore();
  const router = createApiRouter({ analytics, sessions, store: memory.store });
  const session = createSession("restaurant", "standard");
  session.completed = true;
  session.stage = "close";
  session.history.push({ role: "user", content: "la cuenta por favor" });
  const sessionId = sessions.create(session);

  const res = createResponse();
  const handled = await router(createRequest("POST", { sessionId, text: "otra cosa" }), res, "/api/turn");

  assert.equal(handled, true);
  assert.equal(res.statusCode, 409);
  assert.deepEqual(res.json(), { error: "Scenario already completed" });
  assert.equal(session.history.length, 1);
});

test("feedback route requires completion and saves one attempt per session", async () => {
  const analytics = createAnalyticsStore();
  const sessions = createSessionRegistry();
  const memory = createMemoryStore();
  const router = createApiRouter({ analytics, sessions, store: memory.store });

  const incomplete = createSession("restaurant", "standard");
  incomplete.history.push({ role: "user", content: "agua por favor" });
  const incompleteId = sessions.create(incomplete);

  const incompleteRes = createResponse();
  await router(createRequest("POST", { sessionId: incompleteId }), incompleteRes, "/api/feedback");

  assert.equal(incompleteRes.statusCode, 409);
  assert.deepEqual(incompleteRes.json(), { error: "Scenario is not complete" });
  assert.equal(memory.getSavedAttempts(), 0);

  const complete = createSession("restaurant", "standard");
  complete.completed = true;
  complete.stage = "close";
  complete.history.push({ role: "user", content: "agua tacos y la cuenta por favor" });
  const completeId = sessions.create(complete);

  const firstRes = createResponse();
  await router(createRequest("POST", { sessionId: completeId }), firstRes, "/api/feedback");
  const secondRes = createResponse();
  await router(createRequest("POST", { sessionId: completeId }), secondRes, "/api/feedback");

  assert.equal(firstRes.statusCode, 200);
  assert.equal(secondRes.statusCode, 200);
  assert.equal(memory.getSavedAttempts(), 1);
});

test("session, attempt, and progress calls preserve user scope", async () => {
  const analytics = createAnalyticsStore();
  const sessions = createSessionRegistry();
  const memory = createMemoryStore();
  const router = createApiRouter({ analytics, sessions, store: memory.store });

  const sessionRes = createResponse();
  await router(createRequest("POST", { userId: "ana", scenarioId: "restaurant", difficulty: "standard" }), sessionRes, "/api/session");
  assert.equal(sessionRes.statusCode, 200);
  assert.equal(sessionRes.json().session.userId, "ana");
  assert.equal(memory.getLastSessionUserId(), "ana");

  const complete = createSession("restaurant", "standard", "ana");
  complete.completed = true;
  complete.stage = "close";
  complete.history.push({ role: "user", content: "agua tacos y la cuenta por favor" });
  const completeId = sessions.create(complete);

  const feedbackRes = createResponse();
  await router(createRequest("POST", { sessionId: completeId }), feedbackRes, "/api/feedback");
  assert.equal(feedbackRes.statusCode, 200);
  assert.equal(memory.getLastAttemptUserId(), "ana");

  const progressRes = createResponse();
  await router(createRequest("GET", undefined, "/api/progress?userId=ana"), progressRes, "/api/progress");
  assert.equal(progressRes.statusCode, 200);
  assert.equal(progressRes.json().userId, "ana");
  assert.equal(memory.getLastProgressUserId(), "ana");
});
