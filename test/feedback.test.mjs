import test from "node:test";
import assert from "node:assert/strict";
import { scoreConversation } from "../src/feedback.mjs";

test("scoring returns stable rubric shape", () => {
  const turns = [
    { role: "user", content: "Hola, quiero tacos y agua por favor" },
    { role: "assistant", content: "Claro" },
    { role: "user", content: "La cuenta por favor, gracias" }
  ];

  const report = scoreConversation(turns, "restaurant");
  assert.equal(typeof report.score, "number");
  assert.equal(typeof report.cefrBand, "string");
  assert.ok(report.competencies.taskCompletion >= 0);
  assert.ok(Array.isArray(report.retryGoals));
});

test("english fallback penalizes score", () => {
  const strongSpanish = scoreConversation([
    { role: "user", content: "Hola, me gustaría agua y tacos, la cuenta por favor" }
  ], "restaurant").score;

  const englishHeavy = scoreConversation([
    { role: "user", content: "the bill please and i want tacos" }
  ], "restaurant").score;

  assert.ok(strongSpanish > englishHeavy);
});
