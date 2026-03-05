let sessionId = null;
let scenarios = [];

const chat = document.getElementById("chat");
const form = document.getElementById("composer");
const input = document.getElementById("input");
const feedback = document.getElementById("feedback");
const feedbackBtn = document.getElementById("feedbackBtn");
const analyticsBtn = document.getElementById("analyticsBtn");
const scenarioSelect = document.getElementById("scenarioSelect");
const newSessionBtn = document.getElementById("newSessionBtn");
const objective = document.getElementById("objective");

function addMessage(role, speaker, content) {
  const el = document.createElement("div");
  el.className = `msg ${role}`;
  el.innerHTML = `<div class="meta">${speaker}</div><div>${content}</div>`;
  chat.appendChild(el);
  chat.scrollTop = chat.scrollHeight;
}

function clearChat() {
  chat.innerHTML = "";
  feedback.innerHTML = "";
}

async function loadScenarios() {
  const res = await fetch("/api/scenarios");
  const data = await res.json();
  scenarios = data.scenarios;
  scenarioSelect.innerHTML = scenarios.map(s => `<option value="${s.id}">${s.title}</option>`).join("");
  updateObjective();
}

function updateObjective() {
  const s = scenarios.find(x => x.id === scenarioSelect.value) || scenarios[0];
  objective.textContent = s ? `Objective: ${s.objective}` : "";
}

async function initSession() {
  clearChat();
  const scenarioId = scenarioSelect.value;
  const res = await fetch("/api/session", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ scenarioId })
  });
  const data = await res.json();
  sessionId = data.sessionId;
  addMessage("assistant", "Scene", data.openingLine);
}

form.addEventListener("submit", async (e) => {
  e.preventDefault();
  const text = input.value.trim();
  if (!text || !sessionId) return;

  addMessage("user", "You", text);
  input.value = "";

  const res = await fetch("/api/turn", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ sessionId, text })
  });

  const data = await res.json();
  for (const t of data.turns) addMessage("assistant", t.speaker, t.content);
  if (data.completed) addMessage("assistant", "System", "Scenario complete. Tap ‘Get Feedback’.");
});

feedbackBtn.addEventListener("click", async () => {
  if (!sessionId) return;
  const res = await fetch("/api/feedback", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ sessionId })
  });
  const data = await res.json();
  feedback.innerHTML = `
    <h3>Feedback</h3>
    <p><strong>Score:</strong> ${data.score}/100</p>
    <p>${data.summary}</p>
    <p><strong>Corrections</strong></p>
    <ul>${data.corrections.map(c => `<li>${c}</li>`).join("")}</ul>
    <p><strong>Native-like alternatives</strong></p>
    <ul>${data.betterPhrases.map(c => `<li>${c}</li>`).join("")}</ul>
  `;
});

analyticsBtn.addEventListener("click", async () => {
  const res = await fetch("/api/analytics");
  const data = await res.json();
  feedback.innerHTML = `
    <h3>Analytics (MVP)</h3>
    <p><strong>Total events:</strong> ${data.totalEvents}</p>
    <pre>${JSON.stringify(data.counts, null, 2)}</pre>
  `;
});

scenarioSelect.addEventListener("change", updateObjective);
newSessionBtn.addEventListener("click", initSession);

await loadScenarios();
await initSession();
