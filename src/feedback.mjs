function clamp(n, min = 0, max = 100) {
  return Math.max(min, Math.min(max, n));
}

function toBand(score) {
  if (score >= 85) return "B2";
  if (score >= 70) return "B1";
  if (score >= 55) return "A2";
  return "A1";
}

export function scoreConversation(turns, scenarioId = "restaurant") {
  const userTurns = turns.filter(t => t.role === "user");
  const text = userTurns.map(t => t.content.toLowerCase()).join(" ");
  const tokenCount = text.split(/\s+/).filter(Boolean).length;

  const englishSignals = ["the", "and", "can i", "please", "i want", "bill", "where is"];
  const englishHits = englishSignals.filter(k => text.includes(k)).length;

  const taskSignals = {
    restaurant: [/(agua|bebida|tomar|jugo|cerveza)/, /(taco|enchilada|comida|plato|quiero|me gustaría)/, /(cuenta|cobrar|pagar)/],
    taxi: [/(a |al |hasta |voy|lléveme|quiero ir)/, /(ruta|rápida|tráfico|autopista|por aquí|por allá)/, /(cuánto|tarjeta|efectivo|pagar|cobrar)/],
    airbnb: [/(reserva|check|llegué|entrada|llaves)/, /(wifi|clave|toalla|calefacción|cocina|baño)/, /(problema|no funciona|ruido|frío|ayuda)/]
  };

  const taskHits = (taskSignals[scenarioId] || []).reduce((acc, rx) => acc + (rx.test(text) ? 1 : 0), 0);
  const taskCompletion = clamp(40 + taskHits * 20);

  const grammarMarkers = ["quiero", "me gustaría", "podría", "por favor", "gracias", "¿", "¡"];
  const grammarHits = grammarMarkers.filter(k => text.includes(k)).length;
  const grammarAccuracy = clamp(35 + grammarHits * 8 - englishHits * 4);

  const vocabBuckets = ["comida", "pago", "dirección", "reserva", "problema", "ruta", "tarjeta", "cuenta"];
  const vocabHits = vocabBuckets.filter(k => text.includes(k)).length;
  const vocabularyRange = clamp(30 + vocabHits * 10);

  const avgTurnLength = userTurns.length ? tokenCount / userTurns.length : 0;
  const fluencyNaturalness = clamp(35 + Math.min(avgTurnLength * 8, 35) - englishHits * 4);

  const score = Math.round(
    taskCompletion * 0.35 +
    grammarAccuracy * 0.25 +
    vocabularyRange * 0.2 +
    fluencyNaturalness * 0.2
  );

  const competencies = {
    taskCompletion: Math.round(taskCompletion),
    grammarAccuracy: Math.round(grammarAccuracy),
    vocabularyRange: Math.round(vocabularyRange),
    fluencyNaturalness: Math.round(fluencyNaturalness)
  };

  const sortedWeak = Object.entries(competencies).sort((a, b) => a[1] - b[1]);
  const weakest = sortedWeak[0]?.[0];

  const retryGoalMap = {
    taskCompletion: "Hit all scenario objectives in one run (drink+food+bill / destination+route+payment / check-in+questions+issue).",
    grammarAccuracy: "Use at least 3 complete request structures (e.g., ‘Me gustaría…’, ‘¿Podría…?’).",
    vocabularyRange: "Use 5 scenario-specific nouns/verbs without repeating the same phrase.",
    fluencyNaturalness: "Answer in fuller lines (8-12 words) and avoid English fallbacks."
  };

  const corrections = [];
  if (competencies.taskCompletion < 70) corrections.push("Cover all objective steps before ending the scenario.");
  if (competencies.grammarAccuracy < 70) corrections.push("Use more complete Spanish request forms and politeness markers.");
  if (competencies.vocabularyRange < 70) corrections.push("Broaden vocabulary with scenario-specific terms.");
  if (competencies.fluencyNaturalness < 70) corrections.push("Use longer natural responses and minimize English fallback.");

  return {
    score,
    cefrBand: toBand(score),
    competencies,
    retryGoals: [retryGoalMap[weakest]].filter(Boolean),
    corrections: corrections.slice(0, 3),
    betterPhrases: [
      "¿Me podría ayudar con esto, por favor?",
      "Prefiero pagar con tarjeta.",
      "Muchas gracias, todo perfecto."
    ],
    summary: score >= 75
      ? "Strong control for this scenario. Push speed and spontaneity next."
      : "Good foundation. Focus on weaker competencies and retry with one concrete goal."
  };
}
