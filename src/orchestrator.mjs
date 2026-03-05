import { scenarios } from "./scenarios.mjs";
import { generateCharacterReply } from "./llm.mjs";

function detectProgress(scenarioId, text) {
  const t = text.toLowerCase();

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
}

function fallbackReply(scenarioId, stage, progress) {
  if (scenarioId === "restaurant") {
    if (stage === "greeting") return "Buenas tardes. ¿Ya saben qué van a pedir?";
    if (stage === "order_drink") return progress.p1 ? "Perfecto. ¿Y para comer?" : "¿Qué le traigo para tomar?";
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

function advanceStage(currentStage, scenarioId, progress) {
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
  const progress = detectProgress(state.scenarioId, userText);

  const stage = advanceStage(state.stage, state.scenarioId, progress);
  const primarySpeakerKey = Object.keys(scenario.characters)[0];
  const primarySpeaker = scenario.characters[primarySpeakerKey];

  let content = await generateCharacterReply({
    scenario,
    stage,
    speakerKey: primarySpeakerKey,
    speaker: primarySpeaker,
    userText,
    history: state.history
  });

  if (!content) content = fallbackReply(state.scenarioId, stage, progress);

  const turns = [{ role: "assistant", speaker: primarySpeakerKey, content }];

  if (state.scenarioId === "restaurant" && stage === "order_food" && Math.random() > 0.5) {
    turns.push({ role: "assistant", speaker: "friend", content: "Pide los tacos, aquí son buenísimos." });
  }

  return {
    ...state,
    stage,
    completed: stage === "close",
    turns
  };
}

export function createSession(scenarioId = "restaurant") {
  if (!scenarios[scenarioId]) throw new Error("Unknown scenario");
  return {
    scenarioId,
    stage: "greeting",
    completed: false,
    history: []
  };
}
