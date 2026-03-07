// @ts-check

import { json, readJsonBody } from "./http-utils.mjs";
import { createSession, nextTurn } from "./orchestrator.mjs";
import { scoreConversation } from "./feedback.mjs";
import { saveAttempt, saveSessionSnapshot, getPreviousAttemptDelta, getProgressSummary } from "./store.mjs";
import { parseFeedbackRequest, parseSessionRequest, parseTurnRequest } from "./api-validation.mjs";
import { toFeedbackResponse, toScenariosResponse, toSessionResponse, toTurnResponse } from "./api-serializers.mjs";

/**
 * @param {{
 *   analytics: ReturnType<import("./analytics.mjs").createAnalyticsStore>,
 *   sessions: ReturnType<import("./session-registry.mjs").createSessionRegistry>
 * }} dependencies
 */
export function createApiRouter({ analytics, sessions }) {
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
        const { scenarioId, difficulty } = parseSessionRequest(await readJsonBody(req));
        const session = createSession(scenarioId, difficulty);
        const sessionId = sessions.create(session);
        saveSessionSnapshot(sessionId, session);
        analytics.track("session_started", { scenarioId, difficulty });
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

        session.history.push({ role: "user", content: text });
        analytics.track("user_turn", {
          sessionId,
          scenarioId: session.scenarioId,
          stage: session.stage,
          difficulty: session.difficulty
        });

        const updated = await nextTurn(session, text);
        updated.turns.forEach(turn => session.history.push(turn));
        session.stage = updated.stage;
        session.completed = updated.completed;
        saveSessionSnapshot(sessionId, session);

        if (session.completed) {
          analytics.track("scenario_completed", {
            sessionId,
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

        const report = scoreConversation(session.history, session.scenarioId);
        saveAttempt(sessionId, session.scenarioId, report);
        const deltaData = getPreviousAttemptDelta(session.scenarioId);

        analytics.track("feedback_generated", {
          sessionId,
          scenarioId: session.scenarioId,
          score: report.score,
          cefrBand: report.cefrBand,
          difficulty: session.difficulty,
          delta: deltaData.delta
        });

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
      json(res, 200, getProgressSummary());
      return true;
    }

    return false;
  };
}
