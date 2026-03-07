import test from "node:test";
import assert from "node:assert/strict";
import { detectProgress, advanceStage, sanitizeCharacterReply, nextTurn } from "../src/orchestrator.mjs";

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
  const safe = sanitizeCharacterReply("Buenas tardes, claro que si.");
  const leak = sanitizeCharacterReply("Sure, I can help with that.");
  const metaLeak = sanitizeCharacterReply('The user said "Hola" which means "Hello" in Spanish. I am playing Carlos.');
  assert.equal(Boolean(safe), true);
  assert.equal(leak, null);
  assert.equal(metaLeak, null);
});

test("nextTurn marks source as fallback when LLM is unavailable", async () => {
  const prevKey = process.env.OPENAI_API_KEY;
  delete process.env.OPENAI_API_KEY;

  try {
    const state = {
      scenarioId: "taxi",
      difficulty: "standard",
      stage: "destination",
      completed: false,
      history: [{ role: "user", content: "Hola" }]
    };

    const updated = await nextTurn(state, "Al aeropuerto, por favor");
    assert.equal(updated.turns[0].source, "fallback");
  } finally {
    if (prevKey == null) delete process.env.OPENAI_API_KEY;
    else process.env.OPENAI_API_KEY = prevKey;
  }
});

test("nextTurn marks source as llm when model reply is accepted", async () => {
  const prevKey = process.env.OPENAI_API_KEY;
  const prevFetch = global.fetch;
  process.env.OPENAI_API_KEY = "test-key";
  global.fetch = async () => ({
    ok: true,
    json: async () => ({ choices: [{ message: { content: "Claro, vamos por la ruta rapida." } }] })
  });

  try {
    const state = {
      scenarioId: "taxi",
      difficulty: "standard",
      stage: "destination",
      completed: false,
      history: [{ role: "user", content: "Hola" }]
    };

    const updated = await nextTurn(state, "Al aeropuerto, por favor");
    assert.equal(updated.turns[0].source, "llm");
  } finally {
    if (prevKey == null) delete process.env.OPENAI_API_KEY;
    else process.env.OPENAI_API_KEY = prevKey;
    global.fetch = prevFetch;
  }
});

test("nextTurn handles english/number/symbol inputs with fallback replies", async () => {
  const prevKey = process.env.OPENAI_API_KEY;
  delete process.env.OPENAI_API_KEY;

  const samples = [
    "Test",
    "I want tacos please",
    "1234567890",
    "@@@ ### !!! ???"
  ];

  try {
    for (const text of samples) {
      const state = {
        scenarioId: "restaurant",
        difficulty: "standard",
        stage: "greeting",
        completed: false,
        history: [{ role: "user", content: text }]
      };

      const updated = await nextTurn(state, text);
      assert.equal(updated.turns[0].source, "fallback");
      assert.equal(typeof updated.turns[0].content, "string");
      assert.ok(updated.turns[0].content.length > 0);
    }
  } finally {
    if (prevKey == null) delete process.env.OPENAI_API_KEY;
    else process.env.OPENAI_API_KEY = prevKey;
  }
});
