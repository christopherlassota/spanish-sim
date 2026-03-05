import { scenarios } from "./scenarios.mjs";
import { generateCharacterReply } from "./llm.mjs";

const ENGLISH_LEAK = /(\bthe\b|\band\b|\bplease\b|\bi want\b|\bcan i\b|\bwhere is\b|\bsure\b|\bhelp\b|\bwith that\b)/i;

export function sanitizeCharacterReply(text) {
  if (!text) return null;
  const clean = String(text).trim();
  if (!clean) return null;
  if (clean.length > 260) return clean.slice(0, 260);
  if (ENGLISH_LEAK.test(clean)) return null;
  return clean;
}

export function detectProgress(scenarioId, text, difficulty = "standard") {
  const t = text.toLowerCase();

  const base = (() => {
    if (scenarioId === "restaurant") {
      return {
        p1: /(agua|bebida|tomar|jugo|cerveza)/.test(t),
        p2: /(taco|enchilada|comida|plato|quiero|me gustaría)/.test(t),
        p3: /(cuenta|cobrar|pagar)/.test(t)
      };
    }

    if (scenarioId === "taxi") {
      return {
        p1: /(a |al |hasta |voy|lléveme|quiero ir)/.test(t),
        p2: /(ruta|rápida|tráfico|autopista|por aquí|por allá)/.test(t),
        p3: /(cuánto|tarjeta|efectivo|pagar|cobrar)/.test(t)
      };
    }

    return {
      p1: /(reserva|check|llegué|entrada|llaves)/.test(t),
      p2: /(wifi|clave|toalla|calefacción|cocina|baño)/.test(t),
      p3: /(problema|no funciona|ruido|frío|ayuda)/.test(t)
    };
  })();

  if (difficulty !== "hard") return base;

  // Hard mode requires slightly richer intent markers
  return {
    p1: base.p1 && t.split(/\s+/).length >= 3,
    p2: base.p2 && t.split(/\s+/).length >= 4,
    p3: base.p3 && t.split(/\s+/).length >= 3
  };
}

function fallbackReply(scenarioId, stage, progress, difficulty = "standard") {
  const suffix = difficulty === "hard" ? "" : " Por favor.";

  if (scenarioId === "restaurant") {
    if (stage === "greeting") return "Buenas tardes. ¿Ya saben qué van a pedir?";
    if (stage === "order_drink") return progress.p1 ? "Perfecto. ¿Y para comer?" : `¿Qué le traigo para tomar?${suffix}`;
    if (stage === "order_food") return progress.p2 ? "Muy bien. ¿Algo más?" : "¿Qué plato principal va a pedir?";
    if (stage === "ask_bill") return progress.p3 ? "Claro, aquí tiene la cuenta." : "Cuando guste, me avisa y le traigo la cuenta.";
    return "Gracias, que tengan buena tarde.";
  }

  if (scenarioId === "taxi") {
    if (stage === "destination") return progress.p1 ? "Listo. ¿Prefiere ruta rápida o sin peajes?" : "¿A qué dirección exactamente?";
    if (stage === "route") return progress.p2 ? "Perfecto, tomo esa ruta." : "Hay tráfico. ¿Cómo prefiere que vayamos?";
    if (stage === "payment") return progress.p3 ? "Se puede pagar con tarjeta, no hay problema." : "Al llegar le digo el total.";
    if (stage === "close") return "Llegamos. Que tenga buen día.";
    return "Buenas, ¿a dónde vamos?";
  }

  if (stage === "checkin") return progress.p1 ? "Perfecto, te explico el acceso." : "¿Tienes el código de reserva?";
  if (stage === "questions") return progress.p2 ? "Claro, te paso los detalles ahora." : "¿Qué te gustaría saber del apartamento?";
  if (stage === "issue") return progress.p3 ? "Gracias por avisar, lo soluciono enseguida." : "Si hay cualquier problema, avísame.";
  if (stage === "close") return "Bienvenida, que disfrutes tu estancia.";
  return "Hola, soy Ana, tu anfitriona. ¿Todo bien con tu llegada?";
}

export function advanceStage(currentStage, scenarioId, progress) {
  const path = scenarios[scenarioId].stages;
  const idx = path.indexOf(currentStage);
  if (idx < 0 || idx >= path.length - 1) return currentStage;

  if (currentStage === "greeting") return path[idx + 1];
  if ((currentStage === "order_drink" || currentStage === "destination" || currentStage === "checkin") && progress.p1) return path[idx + 1];
  if ((currentStage === "order_food" || currentStage === "route" || currentStage === "questions") && progress.p2) return path[idx + 1];
  if ((currentStage === "ask_bill" || currentStage === "payment" || currentStage === "issue") && progress.p3) return path[idx + 1];

  return currentStage;
}

export async function nextTurn(state, userText) {
  const scenario = scenarios[state.scenarioId];
  const difficulty = state.difficulty || "standard";
  const progress = detectProgress(state.scenarioId, userText, difficulty);

  const stage = advanceStage(state.stage, state.scenarioId, progress);
  const primarySpeakerKey = Object.keys(scenario.characters)[0];
  const primarySpeaker = scenario.characters[primarySpeakerKey];

  const raw = await generateCharacterReply({
    scenario,
    stage,
    speakerKey: primarySpeakerKey,
    speaker: primarySpeaker,
    userText,
    history: state.history,
    difficulty
  });

  let content = sanitizeCharacterReply(raw);
  if (!content) content = fallbackReply(state.scenarioId, stage, progress, difficulty);

  const turns = [{ role: "assistant", speaker: primarySpeakerKey, content }];

  if (state.scenarioId === "restaurant" && stage === "order_food" && difficulty !== "easy" && Math.random() > 0.5) {
    turns.push({ role: "assistant", speaker: "friend", content: "Pide los tacos, aquí son buenísimos." });
  }

  return {
    ...state,
    stage,
    completed: stage === "close",
    turns
  };
}

export function createSession(scenarioId = "restaurant", difficulty = "standard") {
  if (!scenarios[scenarioId]) throw new Error("Unknown scenario");
  return {
    scenarioId,
    difficulty,
    stage: "greeting",
    completed: false,
    history: []
  };
}
