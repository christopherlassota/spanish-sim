import test from "node:test";
import assert from "node:assert/strict";
import { normalizeDifficulty } from "../shared/contracts.mjs";
import { parseFeedbackRequest, parseProgressRequest, parseSessionRequest, parseTurnRequest } from "../server/api-validation.mjs";

test("normalizeDifficulty falls back to standard for unknown values", () => {
  assert.equal(normalizeDifficulty("expert"), "standard");
  assert.equal(normalizeDifficulty("hard"), "hard");
});

test("parseSessionRequest validates scenario and normalizes difficulty", () => {
  assert.deepEqual(parseSessionRequest({ scenarioId: "taxi", difficulty: "hard" }), {
    userId: "demo",
    scenarioId: "taxi",
    difficulty: "hard"
  });

  assert.deepEqual(parseSessionRequest({ userId: " ana ", scenarioId: "restaurant", difficulty: "extreme" }), {
    userId: "ana",
    scenarioId: "restaurant",
    difficulty: "standard"
  });

  assert.throws(() => parseSessionRequest({ scenarioId: "museum" }));
});

test("turn and feedback payload parsers require non-empty ids and text", () => {
  assert.deepEqual(parseTurnRequest({ sessionId: " abc ", text: " hola " }), {
    sessionId: "abc",
    text: "hola"
  });
  assert.deepEqual(parseFeedbackRequest({ sessionId: " xyz " }), { sessionId: "xyz" });
  assert.throws(() => parseTurnRequest({ sessionId: "", text: "hola" }));
  assert.throws(() => parseFeedbackRequest({}));
});

test("progress parser scopes to a normalized user id", () => {
  assert.deepEqual(parseProgressRequest(new URLSearchParams("userId= chris ")), { userId: "chris" });
  assert.deepEqual(parseProgressRequest(new URLSearchParams()), { userId: "demo" });
});
