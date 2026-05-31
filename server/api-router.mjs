// @ts-check

import { json, readJsonBody } from "./http-utils.mjs";
import { createSession, nextTurn } from "./orchestrator.mjs";
import { scoreConversation } from "./feedback.mjs";
import { getLlmConfig } from "./llm.mjs";
import { saveAttempt, saveSessionSnapshot, getPreviousAttemptDelta, getProgressSummary } from "./store.mjs";
import { parseFeedbackRequest, parseProgressRequest, parseSessionRequest, parseTurnRequest } from "./api-validation.mjs";
import { toFeedbackResponse, toScenariosResponse, toSessionResponse, toTurnResponse } from "./api-serializers.mjs";

const defaultStore = {
  saveAttempt,
  saveSessionSnapshot,
  getPreviousAttemptDelta,
  getProgressSummary
};

/**
 * @param {{
 *   analytics: ReturnType<import("./analytics.mjs").createAnalyticsStore>,
 *   sessions: ReturnType<import("./session-registry.mjs").createSessionRegistry>,
 *   store?: typeof defaultStore
 * }} dependencies
 */
export function createApiRouter({ analytics, sessions, store = defaultStore }) {
  const feedbackSessions = new Set();

  /**
   * @param {import("node:http").IncomingMessage} req
   * @param {import("node:http").ServerResponse} res
   * @param {string} pathname
   */
  return async function handleApiRequest(req, res, pathname) {
    if (req.method === "GET" && pathname === "/api/scenarios") {
      json(res, 200, toScenariosResponse());
      return true;
    }

    if (req.method === "POST" && pathname === "/api/session") {
      try {
        const { userId, scenarioId, difficulty } = parseSessionRequest(await readJsonBody(req));
        const session = createSession(scenarioId, difficulty, userId);
        const sessionId = sessions.create(session);
        store.saveSessionSnapshot(sessionId, session);
        analytics.track("session_started", { userId, scenarioId, difficulty });
        json(res, 200, toSessionResponse(sessionId, session));
      } catch {
        json(res, 400, { error: "Bad request" });
      }
      return true;
    }

    if (req.method === "POST" && pathname === "/api/turn") {
      try {
        const { sessionId, text } = parseTurnRequest(await readJsonBody(req));
        const session = sessions.get(sessionId);
        if (!session) {
          json(res, 404, { error: "Session not found" });
          return true;
        }

        if (session.completed) {
          json(res, 409, { error: "Scenario already completed" });
          return true;
        }

        session.history.push({ role: "user", content: text });
        analytics.track("user_turn", {
          sessionId,
          userId: session.userId,
          scenarioId: session.scenarioId,
          stage: session.stage,
          difficulty: session.difficulty
        });

        const updated = await nextTurn(session, text);
        updated.turns.forEach(turn => session.history.push(turn));
        const llm = getLlmConfig();
        updated.turns
          .filter(turn => turn.role === "assistant" && turn.source === "fallback")
          .forEach(turn => {
            analytics.track("assistant_fallback", {
              provider: llm.provider,
              userId: session.userId,
              scenarioId: session.scenarioId,
              stage: updated.stage,
              speaker: turn.speaker,
              reason: turn.fallbackReason || updated.fallbackReason || "scripted"
            });
          });
        session.stage = updated.stage;
        session.completed = updated.completed;
        store.saveSessionSnapshot(sessionId, session);

        if (session.completed) {
          analytics.track("scenario_completed", {
            sessionId,
            userId: session.userId,
            scenarioId: session.scenarioId,
            difficulty: session.difficulty
          });
        }

        json(res, 200, toTurnResponse(session, updated.turns));
      } catch {
        json(res, 400, { error: "Bad request" });
      }
      return true;
    }

    if (req.method === "POST" && pathname === "/api/feedback") {
      try {
        const { sessionId } = parseFeedbackRequest(await readJsonBody(req));
        const session = sessions.get(sessionId);
        if (!session) {
          json(res, 404, { error: "Session not found" });
          return true;
        }

        if (!session.completed) {
          json(res, 409, { error: "Scenario is not complete" });
          return true;
        }

        const report = scoreConversation(session.history, session.scenarioId, session.difficulty);
        let savedAttempt = false;
        if (!feedbackSessions.has(sessionId)) {
          store.saveAttempt(sessionId, session.scenarioId, report, session.userId);
          feedbackSessions.add(sessionId);
          savedAttempt = true;
        }

        const deltaData = store.getPreviousAttemptDelta(session.scenarioId, session.userId);

        if (savedAttempt) {
          analytics.track("feedback_generated", {
            sessionId,
            userId: session.userId,
            scenarioId: session.scenarioId,
            score: report.score,
            cefrBand: report.cefrBand,
            difficulty: session.difficulty,
            delta: deltaData.delta
          });
        }

        json(res, 200, toFeedbackResponse(report, deltaData));
      } catch {
        json(res, 400, { error: "Bad request" });
      }
      return true;
    }

    if (req.method === "GET" && pathname === "/api/analytics") {
      json(res, 200, analytics.summary());
      return true;
    }

    if (req.method === "GET" && pathname === "/api/progress") {
      const requestUrl = new URL(req.url || "/", "http://localhost");
      const { userId } = parseProgressRequest(requestUrl.searchParams);
      json(res, 200, store.getProgressSummary(userId));
      return true;
    }

    return false;
  };
}
