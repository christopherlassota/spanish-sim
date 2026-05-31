import test from "node:test";
import assert from "node:assert/strict";
import { FEEDBACK_RUBRIC, scoreConversation } from "../server/feedback.mjs";
import { feedbackCalibrationFixtures } from "../test-support/feedback-fixtures.mjs";

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
  assert.ok(Array.isArray(report.betterPhrases));
  assert.equal(typeof report.difficultyRecommendation.reason, "string");
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

test("rubric weights stay explicit and normalized", () => {
  const totalWeight = Object.values(FEEDBACK_RUBRIC.weights).reduce((total, weight) => total + weight, 0);
  assert.equal(totalWeight, 1);
  assert.equal(FEEDBACK_RUBRIC.bands.B2, 85);
  assert.equal(FEEDBACK_RUBRIC.bands.B1, 70);
  assert.equal(FEEDBACK_RUBRIC.bands.A2, 55);
});

for (const fixture of feedbackCalibrationFixtures) {
  test(`calibration fixture: ${fixture.name}`, () => {
    const report = scoreConversation(fixture.turns, fixture.scenarioId);
    assert.equal(report.cefrBand, fixture.expectedBand);
    assert.ok(
      report.score >= fixture.scoreRange[0] && report.score <= fixture.scoreRange[1],
      `${report.score} should be within ${fixture.scoreRange[0]}-${fixture.scoreRange[1]}`
    );
  });
}

test("adaptive difficulty recommends up, down, or hold from performance", () => {
  const strong = scoreConversation(
    [
      { role: "user", content: "Buenas tardes, me gustaría tomar agua mineral, por favor." },
      { role: "user", content: "También quiero el plato de enchiladas con salsa verde." },
      { role: "user", content: "¿Me podría traer la cuenta? Prefiero pagar con tarjeta. Muchas gracias." }
    ],
    "restaurant",
    "standard"
  );
  assert.equal(strong.difficultyRecommendation.action, "up");
  assert.equal(strong.difficultyRecommendation.targetDifficulty, "hard");

  const weak = scoreConversation([{ role: "user", content: "the bill please" }], "restaurant", "standard");
  assert.equal(weak.difficultyRecommendation.action, "down");
  assert.equal(weak.difficultyRecommendation.targetDifficulty, "easy");

  const developing = scoreConversation(
    [
      { role: "user", content: "Hola, agua por favor" },
      { role: "user", content: "Quiero tacos por favor" },
      { role: "user", content: "La cuenta por favor gracias" }
    ],
    "restaurant",
    "standard"
  );
  assert.equal(developing.difficultyRecommendation.action, "hold");
  assert.equal(developing.difficultyRecommendation.targetDifficulty, "standard");
});
