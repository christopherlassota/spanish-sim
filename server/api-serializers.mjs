// @ts-check

import { isMessageSource } from "../shared/contracts.mjs";
import { scenarios } from "./scenarios.mjs";

/** @typedef {import("../shared/contracts.mjs").ConversationTurn} ConversationTurn */
/** @typedef {import("../shared/contracts.mjs").FeedbackResponse} FeedbackResponse */
/** @typedef {import("../shared/contracts.mjs").SessionState} SessionState */
/** @typedef {import("../shared/contracts.mjs").Turn} Turn */

/**
 * @param {ConversationTurn} turn
 * @returns {Turn}
 */
function toApiTurn(turn) {
  return {
    role: turn.role,
    speaker: turn.speaker || "assistant",
    content: turn.content,
    source: isMessageSource(turn.source) ? turn.source : "fallback"
  };
}

/**
 * @param {number | null} sessionDelta
 */
function getImprovementLabel(sessionDelta) {
  return sessionDelta == null ? "No baseline yet" : sessionDelta >= 0 ? `+${sessionDelta} vs previous attempt` : `${sessionDelta} vs previous attempt`;
}

export function toScenariosResponse() {
  return {
    scenarios: Object.values(scenarios).map(scenario => ({
      id: scenario.id,
      title: scenario.title,
      objective: scenario.objective,
      openingLine: scenario.openingLine
    }))
  };
}

/**
 * @param {string} sessionId
 * @param {SessionState} session
 */
export function toSessionResponse(sessionId, session) {
  return {
    sessionId,
    session,
    openingLine: scenarios[session.scenarioId].openingLine
  };
}

/**
 * @param {SessionState} session
 * @param {ConversationTurn[]} turns
 */
export function toTurnResponse(session, turns) {
  return {
    stage: session.stage,
    completed: session.completed,
    turns: turns.map(toApiTurn)
  };
}

/**
 * @param {Omit<FeedbackResponse, "previousScore" | "delta" | "improvementLabel">} report
 * @param {{ previousScore: number | null, delta: number | null }} deltaData
 * @returns {FeedbackResponse}
 */
export function toFeedbackResponse(report, deltaData) {
  return {
    ...report,
    previousScore: deltaData.previousScore,
    delta: deltaData.delta,
    improvementLabel: getImprovementLabel(deltaData.delta)
  };
}
