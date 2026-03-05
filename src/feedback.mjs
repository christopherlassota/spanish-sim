export function scoreConversation(turns) {
  const userTurns = turns.filter(t => t.role === "user");
  const text = userTurns.map(t => t.content.toLowerCase()).join(" ");

  const spanishSignals = ["hola", "buenas", "quiero", "me gustaría", "por favor", "gracias", "cuenta", "pagar", "tarjeta", "reserva", "problema"];
  const englishSignals = ["the", "and", "can i", "please", "i want", "bill", "where is"];

  const sHits = spanishSignals.filter(k => text.includes(k)).length;
  const eHits = englishSignals.filter(k => text.includes(k)).length;

  let score = 45 + Math.min(sHits * 6, 36) - Math.min(eHits * 5, 20);
  score = Math.max(0, Math.min(100, score));

  const corrections = [];
  if (!/(hola|buenas)/.test(text)) corrections.push("Open with a quick greeting in Spanish to sound natural.");
  if (!/(por favor|gracias)/.test(text)) corrections.push("Add politeness markers like ‘por favor’ and ‘gracias’. ");
  if (eHits > 0) corrections.push("Try staying in Spanish for full immersion and stronger fluency gains.");

  return {
    score,
    corrections: corrections.slice(0, 3),
    betterPhrases: [
      "¿Me podría ayudar con esto, por favor?",
      "Prefiero pagar con tarjeta.",
      "Muchas gracias, todo perfecto."
    ],
    summary: score >= 75
      ? "Solid conversational control. Keep pushing speed and spontaneity."
      : "Good foundation. Focus on full Spanish responses and cleaner phrasing."
  };
}
