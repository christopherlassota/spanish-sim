let sessionId = null;
let scenarios = [];
let loadingEl = null;

const chat = document.getElementById("chat");
const form = document.getElementById("composer");
const input = document.getElementById("input");
const feedback = document.getElementById("feedback");
const feedbackBtn = document.getElementById("feedbackBtn");
const analyticsBtn = document.getElementById("analyticsBtn");
const scenarioSelect = document.getElementById("scenarioSelect");
const difficultySelect = document.getElementById("difficultySelect");
const newSessionBtn = document.getElementById("newSessionBtn");
const objective = document.getElementById("objective");

function escapeHtml(value) {
  return String(value).replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;").replaceAll("'", "&#39;");
}

function renderList(items) {
  return items.map(item => `<li>${escapeHtml(item)}</li>`).join("");
}

function addMessage(role, speaker, content, source = null) {
  const sourceLabel = source === "llm" ? " [LLM]" : source === "fallback" ? " [Fallback]" : "";
  const el = document.createElement("div");
  el.className = `msg ${role}`;
  el.innerHTML = `<div class="meta">${escapeHtml(speaker)}${escapeHtml(sourceLabel)}</div><div>${escapeHtml(content)}</div>`;
  chat.appendChild(el);
  chat.scrollTop = chat.scrollHeight;
}

function showLoadingIndicator() {
  // Replace any stale spinner so repeated submits never stack placeholders in the transcript.
  removeLoadingIndicator();
  const el = document.createElement("div");
  el.className = "msg assistant thinking";
  el.innerHTML = `<div class="meta">Assistant</div><div class="thinking-row"><span class="spinner" aria-hidden="true"></span><span>Thinking...</span></div>`;
  chat.appendChild(el);
  chat.scrollTop = chat.scrollHeight;
  loadingEl = el;
}

function removeLoadingIndicator() {
  if (!loadingEl) return;
  loadingEl.remove();
  loadingEl = null;
}

function clearChat() {
  chat.innerHTML = "";
  feedback.innerHTML = "";
  loadingEl = null;
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
  const difficulty = difficultySelect.value;
  const res = await fetch("/api/session", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ scenarioId, difficulty })
  });
  const data = await res.json();
  sessionId = data.sessionId;
  addMessage("assistant", "Scene", `${data.openingLine} [${difficulty.toUpperCase()}]`);
}

form.addEventListener("submit", async (e) => {
  e.preventDefault();
  const text = input.value.trim();
  if (!text || !sessionId) return;

  addMessage("user", "You", text);
  input.value = "";
  showLoadingIndicator();

  try {
    const res = await fetch("/api/turn", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ sessionId, text })
    });

    const data = await res.json();
    for (const t of data.turns) addMessage("assistant", t.speaker, t.content, t.source);
    if (data.completed) addMessage("assistant", "System", "Scenario complete. Tap 'Get Feedback'.");
  } catch {
    addMessage("assistant", "System", "Could not generate a response. Try again.");
  } finally {
    removeLoadingIndicator();
  }
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
    <p><strong>Score:</strong> ${escapeHtml(data.score)}/100 (${escapeHtml(data.cefrBand)})</p>
    <p><strong>Improvement:</strong> ${escapeHtml(data.improvementLabel)}</p>
    <p>${escapeHtml(data.summary)}</p>
    <p><strong>Competencies</strong></p>
    <ul>
      <li>Task completion: ${escapeHtml(data.competencies.taskCompletion)}</li>
      <li>Grammar accuracy: ${escapeHtml(data.competencies.grammarAccuracy)}</li>
      <li>Vocabulary range: ${escapeHtml(data.competencies.vocabularyRange)}</li>
      <li>Fluency/naturalness: ${escapeHtml(data.competencies.fluencyNaturalness)}</li>
    </ul>
    <p><strong>Retry goal</strong></p>
    <ul>${renderList(data.retryGoals)}</ul>
    <p><strong>Corrections</strong></p>
    <ul>${renderList(data.corrections)}</ul>
  `;
});

analyticsBtn.addEventListener("click", async () => {
  const [aRes, pRes] = await Promise.all([fetch("/api/analytics"), fetch("/api/progress")]);
  const analytics = await aRes.json();
  const progress = await pRes.json();
  feedback.innerHTML = `
    <h3>Analytics (MVP)</h3>
    <p><strong>Total events:</strong> ${escapeHtml(analytics.totalEvents)}</p>
    <pre>${escapeHtml(JSON.stringify(analytics.counts, null, 2))}</pre>
    <h3>Learning Progress</h3>
    <p><strong>Total sessions:</strong> ${escapeHtml(progress.totalSessions)}</p>
    <pre>${escapeHtml(JSON.stringify(progress.attemptsByScenario, null, 2))}</pre>
  `;
});

scenarioSelect.addEventListener("change", updateObjective);
newSessionBtn.addEventListener("click", initSession);

await loadScenarios();
await initSession();
