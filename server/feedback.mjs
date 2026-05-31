function clamp(n, min = 0, max = 100) {
  return Math.max(min, Math.min(max, n));
}

export const FEEDBACK_RUBRIC = {
  weights: {
    taskCompletion: 0.35,
    grammarAccuracy: 0.25,
    vocabularyRange: 0.2,
    fluencyNaturalness: 0.2
  },
  bands: {
    B2: 85,
    B1: 70,
    A2: 55
  }
};

const difficultyOrder = ["easy", "standard", "hard"];

function toBand(score) {
  if (score >= FEEDBACK_RUBRIC.bands.B2) return "B2";
  if (score >= FEEDBACK_RUBRIC.bands.B1) return "B1";
  if (score >= FEEDBACK_RUBRIC.bands.A2) return "A2";
  return "A1";
}

function getAdjacentDifficulty(currentDifficulty, direction) {
  const currentIndex = difficultyOrder.includes(currentDifficulty) ? difficultyOrder.indexOf(currentDifficulty) : difficultyOrder.indexOf("standard");
  if (direction === "up") {
    return difficultyOrder[Math.min(currentIndex + 1, difficultyOrder.length - 1)];
  }

  if (direction === "down") {
    return difficultyOrder[Math.max(currentIndex - 1, 0)];
  }

  return difficultyOrder[currentIndex];
}

function getDifficultyRecommendation(score, competencies, currentDifficulty = "standard") {
  const values = Object.values(competencies);
  const lowestCompetency = Math.min(...values);

  if (score >= 85 && lowestCompetency >= 70) {
    const targetDifficulty = getAdjacentDifficulty(currentDifficulty, "up");
    if (targetDifficulty === currentDifficulty) {
      return {
        action: "hold",
        targetDifficulty,
        reason: "You are already at the hardest setting; keep building speed and spontaneity."
      };
    }

    return {
      action: "up",
      targetDifficulty,
      reason: "Strong score with no major competency gap; increase challenge next run."
    };
  }

  if (score < 60 || lowestCompetency < 50) {
    const targetDifficulty = getAdjacentDifficulty(currentDifficulty, "down");
    if (targetDifficulty === currentDifficulty) {
      return {
        action: "hold",
        targetDifficulty,
        reason: "Stay on easy and focus on the weakest competency before increasing difficulty."
      };
    }

    return {
      action: "down",
      targetDifficulty,
      reason: "One or more core competencies need reinforcement; reduce pressure for the next run."
    };
  }

  return {
    action: "hold",
    targetDifficulty: getAdjacentDifficulty(currentDifficulty, "hold"),
    reason: "Performance is in the productive practice range; repeat once and aim for cleaner execution."
  };
}

export function scoreConversation(turns, scenarioId = "restaurant", difficulty = "standard") {
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

  const vocabularySignals = {
    restaurant: [
      /agua/,
      /bebida/,
      /taco|tacos/,
      /enchilada|enchiladas/,
      /plato/,
      /salsa/,
      /cuenta/,
      /tarjeta|efectivo|pagar|pago/
    ],
    taxi: [
      /dirección|aeropuerto|hotel|centro/,
      /ruta/,
      /tráfico/,
      /autopista|peaje/,
      /rápida|rápido/,
      /tarjeta|efectivo|pagar|pago/,
      /cuánto|total/,
      /derecha|izquierda|aquí|allá/
    ],
    airbnb: [
      /reserva|check/,
      /entrada|llaves|código/,
      /wifi|clave/,
      /toalla|calefacción|cocina|baño/,
      /ruido|frío/,
      /problema|ayuda/,
      /funciona/,
      /apartamento|estancia/
    ]
  };
  const vocabHits = (vocabularySignals[scenarioId] || []).filter(rx => rx.test(text)).length;
  const vocabularyRange = clamp(30 + vocabHits * 8);

  const avgTurnLength = userTurns.length ? tokenCount / userTurns.length : 0;
  const fluencyNaturalness = clamp(35 + Math.min(avgTurnLength * 8, 35) - englishHits * 4);

  const score = Math.round(
    taskCompletion * FEEDBACK_RUBRIC.weights.taskCompletion +
    grammarAccuracy * FEEDBACK_RUBRIC.weights.grammarAccuracy +
    vocabularyRange * FEEDBACK_RUBRIC.weights.vocabularyRange +
    fluencyNaturalness * FEEDBACK_RUBRIC.weights.fluencyNaturalness
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
    difficultyRecommendation: getDifficultyRecommendation(score, competencies, difficulty),
    summary: score >= 75
      ? "Strong control for this scenario. Push speed and spontaneity next."
      : "Good foundation. Focus on weaker competencies and retry with one concrete goal."
  };
}
