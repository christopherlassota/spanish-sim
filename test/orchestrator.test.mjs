import test from "node:test";
import assert from "node:assert/strict";
import { detectProgress, advanceStage, sanitizeCharacterReply } from "../src/orchestrator.mjs";

test("restaurant progression advances correctly", () => {
  let stage = "greeting";
  stage = advanceStage(stage, "restaurant", detectProgress("restaurant", "hola"));
  assert.equal(stage, "order_drink");

  stage = advanceStage(stage, "restaurant", detectProgress("restaurant", "agua por favor"));
  assert.equal(stage, "order_food");

  stage = advanceStage(stage, "restaurant", detectProgress("restaurant", "quiero tacos"));
  assert.equal(stage, "ask_bill");

  stage = advanceStage(stage, "restaurant", detectProgress("restaurant", "la cuenta por favor"));
  assert.equal(stage, "close");
});

test("hard difficulty is stricter on progress", () => {
  const easy = detectProgress("taxi", "ruta", "standard");
  const hard = detectProgress("taxi", "ruta", "hard");
  assert.equal(easy.p2, true);
  assert.equal(hard.p2, false);
});

test("safety layer rejects english leak", () => {
  const safe = sanitizeCharacterReply("Buenas tardes, claro que sí.");
  const leak = sanitizeCharacterReply("Sure, I can help with that.");
  assert.equal(Boolean(safe), true);
  assert.equal(leak, null);
});
