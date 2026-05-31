// @ts-check

import {
  DEFAULT_DIFFICULTY,
  DEFAULT_SCENARIO_ID,
  DEFAULT_USER_ID,
  isNonEmptyString,
  isRecord,
  normalizeDifficulty,
  normalizeUserId
} from "../shared/contracts.mjs";
import { scenarios } from "./scenarios.mjs";

/**
 * @param {unknown} body
 */
export function parseSessionRequest(body) {
  if (!isRecord(body)) {
    return {
      userId: DEFAULT_USER_ID,
      scenarioId: DEFAULT_SCENARIO_ID,
      difficulty: DEFAULT_DIFFICULTY
    };
  }

  const scenarioId = body.scenarioId == null ? DEFAULT_SCENARIO_ID : body.scenarioId;
  if (!isNonEmptyString(scenarioId) || !scenarios[scenarioId]) throw new Error("Unknown scenario");

  return {
    userId: normalizeUserId(body.userId),
    scenarioId,
    difficulty: normalizeDifficulty(body.difficulty)
  };
}

/**
 * @param {unknown} body
 */
export function parseTurnRequest(body) {
  if (!isRecord(body) || !isNonEmptyString(body.sessionId) || !isNonEmptyString(body.text)) {
    throw new Error("Bad request");
  }

  return {
    sessionId: body.sessionId.trim(),
    text: body.text.trim()
  };
}

/**
 * @param {unknown} body
 */
export function parseFeedbackRequest(body) {
  if (!isRecord(body) || !isNonEmptyString(body.sessionId)) throw new Error("Bad request");
  return { sessionId: body.sessionId.trim() };
}

/**
 * @param {URLSearchParams} searchParams
 */
export function parseProgressRequest(searchParams) {
  return { userId: normalizeUserId(searchParams.get("userId")) };
}
