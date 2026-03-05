const MODEL = process.env.OPENAI_MODEL || "gpt-4o-mini";
const BASE_URL = process.env.OPENAI_BASE_URL || "https://api.openai.com/v1";

function hasApiConfig() {
  return Boolean(process.env.OPENAI_API_KEY);
}

export async function generateCharacterReply({ scenario, stage, speakerKey, speaker, userText, history }) {
  if (!hasApiConfig()) return null;

  const system = `You are roleplaying a Spanish-learning scenario.
Return only natural Spanish dialogue for the character.
Keep responses 1-2 short lines.
Stay in character.
Scenario: ${scenario.title}
Objective: ${scenario.objective}
Current stage: ${stage}
Character: ${speaker.name}
Tone: ${speaker.tone}
Style: ${speaker.style}`;

  const recent = history.slice(-8).map(t => `${t.role.toUpperCase()}${t.speaker ? `(${t.speaker})` : ""}: ${t.content}`).join("\n");

  const user = `Conversation so far:\n${recent}\n\nLatest learner message: ${userText}\n\nRespond as ${speakerKey}.`;

  const res = await fetch(`${BASE_URL}/chat/completions`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${process.env.OPENAI_API_KEY}`
    },
    body: JSON.stringify({
      model: MODEL,
      temperature: 0.7,
      messages: [
        { role: "system", content: system },
        { role: "user", content: user }
      ]
    })
  });

  if (!res.ok) return null;
  const data = await res.json();
  return data?.choices?.[0]?.message?.content?.trim() || null;
}
