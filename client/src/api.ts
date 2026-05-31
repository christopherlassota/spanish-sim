import type {
  AnalyticsSummary,
  Difficulty,
  FeedbackResponse,
  ProgressSummary,
  ScenarioSummary,
  SessionResponse,
  TurnResponse
} from "../../shared/contracts.mjs";

async function requestJson<T>(input: string, init?: RequestInit): Promise<T> {
  const response = await fetch(input, init);
  const payload = await response.json().catch(() => null);

  if (!response.ok) {
    const detail = payload && typeof payload.error === "string" ? payload.error : `Request failed (${response.status})`;
    throw new Error(detail);
  }

  return payload as T;
}

export async function fetchScenarios(): Promise<ScenarioSummary[]> {
  const data = await requestJson<{ scenarios: ScenarioSummary[] }>("/api/scenarios");
  return data.scenarios;
}

export async function createSession(input: { userId: string; scenarioId: string; difficulty: Difficulty }): Promise<SessionResponse> {
  return requestJson<SessionResponse>("/api/session", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input)
  });
}

export async function sendTurn(input: { sessionId: string; text: string }): Promise<TurnResponse> {
  return requestJson<TurnResponse>("/api/turn", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input)
  });
}

export async function fetchFeedback(sessionId: string): Promise<FeedbackResponse> {
  return requestJson<FeedbackResponse>("/api/feedback", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ sessionId })
  });
}

export async function fetchAnalyticsBundle(userId: string): Promise<{ analytics: AnalyticsSummary; progress: ProgressSummary }> {
  const progressParams = new URLSearchParams({ userId });
  const [analytics, progress] = await Promise.all([
    requestJson<AnalyticsSummary>("/api/analytics"),
    requestJson<ProgressSummary>(`/api/progress?${progressParams.toString()}`)
  ]);

  return { analytics, progress };
}
