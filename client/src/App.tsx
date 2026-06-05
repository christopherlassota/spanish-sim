import { useEffect, useMemo, useRef, useState, type FormEvent, type KeyboardEvent } from "react";
import { createSession, fetchAnalyticsBundle, fetchFeedback, fetchScenarios, sendTurn } from "./api";
import { Transcript } from "./components/Transcript";
import {
  DEFAULT_USER_ID,
  type AnalyticsSummary,
  type Difficulty,
  type FeedbackResponse,
  type ProgressSummary,
  type ScenarioSummary,
  type Turn
} from "../../shared/contracts.mjs";
import type { ChatMessage } from "./ui-types";

const INITIAL_DIFFICULTY: Difficulty = "standard";
const DEV_USERS = [
  { id: DEFAULT_USER_ID, label: "Demo" },
  { id: "ana", label: "Ana" },
  { id: "chris", label: "Chris" }
];

type CompletionInsights =
  | { kind: "empty" }
  | { kind: "loading" }
  | { kind: "ready"; feedback: FeedbackResponse; analytics: AnalyticsSummary; progress: ProgressSummary }
  | { kind: "error"; message: string };

const COMPETENCY_LABELS: Array<{ key: keyof FeedbackResponse["competencies"]; label: string }> = [
  { key: "taskCompletion", label: "Task completion" },
  { key: "grammarAccuracy", label: "Grammar accuracy" },
  { key: "vocabularyRange", label: "Vocabulary range" },
  { key: "fluencyNaturalness", label: "Fluency and naturalness" }
];

function makeMessage(
  speaker: string,
  content: string,
  options: Partial<Pick<ChatMessage, "role" | "source" | "variant">> = {}
): ChatMessage {
  return {
    id: crypto.randomUUID(),
    role: options.role ?? "assistant",
    speaker,
    content,
    source: options.source ?? null,
    variant: options.variant ?? "standard"
  };
}

function mapTurns(turns: Turn[]): ChatMessage[] {
  return turns.map(turn =>
    makeMessage(turn.speaker, turn.content, {
      role: turn.role,
      source: turn.source ?? null
    })
  );
}

function formatAttemptDate(value: string): string {
  if (!value) return "Unknown time";
  return new Intl.DateTimeFormat(undefined, {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit"
  }).format(new Date(value));
}

function formatDelta(value: number | null): string {
  if (value == null) return "No baseline";
  if (value >= 0) return `+${value}`;
  return String(value);
}

export default function App() {
  const [scenarios, setScenarios] = useState<ScenarioSummary[]>([]);
  const [selectedScenarioId, setSelectedScenarioId] = useState("");
  const [selectedDifficulty, setSelectedDifficulty] = useState<Difficulty>(INITIAL_DIFFICULTY);
  const [activeUserId, setActiveUserId] = useState<string>(DEFAULT_USER_ID);
  const [sessionId, setSessionId] = useState("");
  const [sessionCompleted, setSessionCompleted] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [draft, setDraft] = useState("");
  const [isBooting, setIsBooting] = useState(true);
  const [isStartingSession, setIsStartingSession] = useState(false);
  const [isSendingTurn, setIsSendingTurn] = useState(false);
  const [completionInsights, setCompletionInsights] = useState<CompletionInsights>({ kind: "empty" });
  const [error, setError] = useState<string | null>(null);
  const hasBootstrapped = useRef(false);

  const selectedScenario = useMemo(
    () => scenarios.find(scenario => scenario.id === selectedScenarioId) ?? scenarios[0] ?? null,
    [scenarios, selectedScenarioId]
  );

  useEffect(() => {
    if (hasBootstrapped.current) return;
    hasBootstrapped.current = true;

    async function bootstrap() {
      try {
        const nextScenarios = await fetchScenarios();
        setScenarios(nextScenarios);

        if (!nextScenarios.length) {
          setError("No scenarios are available.");
          return;
        }

        const firstScenarioId = nextScenarios[0].id;
        setSelectedScenarioId(firstScenarioId);
      } catch (issue) {
        setError(issue instanceof Error ? issue.message : "Could not load the simulator.");
      } finally {
        setIsBooting(false);
      }
    }

    void bootstrap();
  }, []);

  async function handleStartSession(
    scenarioId = selectedScenarioId || selectedScenario?.id || "",
    difficulty = selectedDifficulty,
    userId = activeUserId
  ) {
    if (!scenarioId) return;

    setIsStartingSession(true);
    setError(null);
    setCompletionInsights({ kind: "empty" });

    try {
      const session = await createSession({ userId, scenarioId, difficulty });
      setSessionId(session.sessionId);
      setSessionCompleted(session.session.completed);
      setMessages([
        makeMessage("Scene", `${session.openingLine} [${difficulty.toUpperCase()}]`, {
          variant: "scene"
        })
      ]);
      setDraft("");
    } catch (issue) {
      setError(issue instanceof Error ? issue.message : "Could not start a new session.");
    } finally {
      setIsStartingSession(false);
    }
  }

  async function loadCompletionInsights(targetSessionId: string, userId = activeUserId) {
    setCompletionInsights({ kind: "loading" });
    setError(null);

    try {
      const [feedback, analyticsBundle] = await Promise.all([
        fetchFeedback(targetSessionId),
        fetchAnalyticsBundle(userId)
      ]);
      setCompletionInsights({
        kind: "ready",
        feedback,
        analytics: analyticsBundle.analytics,
        progress: analyticsBundle.progress
      });
    } catch (issue) {
      setCompletionInsights({
        kind: "error",
        message: issue instanceof Error ? issue.message : "Could not load session report."
      });
    }
  }

  async function handleSubmitTurn(event?: FormEvent<HTMLFormElement>) {
    event?.preventDefault();

    if (!draft.trim() || !sessionId || sessionCompleted || isSendingTurn) return;

    const text = draft.trim();
    setDraft("");
    setError(null);
    setMessages(current => [...current, makeMessage("You", text, { role: "user" })]);
    setIsSendingTurn(true);

    try {
      const response = await sendTurn({ sessionId, text });
      setSessionCompleted(response.completed);
      setMessages(current => {
        const next = [...current, ...mapTurns(response.turns)];
        if (response.completed) {
          next.push(
            makeMessage("System", "Scenario complete. Loading your report.", {
              variant: "system"
            })
          );
        }
        return next;
      });
      if (response.completed) {
        void loadCompletionInsights(sessionId, activeUserId);
      }
    } catch (issue) {
      const message = issue instanceof Error ? issue.message : "Could not generate a response. Try again.";
      setError(message);
      setMessages(current => [
        ...current,
        makeMessage("System", "Could not generate a response. Try again.", {
          variant: "system"
        })
      ]);
    } finally {
      setIsSendingTurn(false);
    }
  }

  function handleComposerKeyDown(event: KeyboardEvent<HTMLTextAreaElement>) {
    if (event.key !== "Enter" || event.shiftKey) return;
    event.preventDefault();
    void handleSubmitTurn();
  }

  function handleActiveUserChange(userId: string) {
    setActiveUserId(userId);
  }

  function handleResetToSetup() {
    setSessionId("");
    setSessionCompleted(false);
    setMessages([]);
    setDraft("");
    setCompletionInsights({ kind: "empty" });
    setError(null);
  }

  let statusLabel = "Ready";
  if (isBooting) statusLabel = "Connecting";
  if (sessionId) statusLabel = "Session live";
  if (sessionCompleted) statusLabel = "Complete";

  const isSetupMode = !sessionId;
  const isChatMode = Boolean(sessionId) && !sessionCompleted;
  const isReportMode = Boolean(sessionId) && sessionCompleted;
  let cardKicker = "Session setup";
  if (isChatMode) cardKicker = "Live simulation";
  if (isReportMode) cardKicker = "Session report";

  return (
    <div className="app-shell">
      <header className="app-header">
        <div className="brand-lockup">
          <p className="eyebrow">Conversation performance trainer</p>
          <h1>Spanish Conversation Gym</h1>
        </div>

        <div className="objective-strip">
          <span className={`status-pill ${sessionId ? "live" : "idle"}`}>{statusLabel}</span>
          <div className="objective-copy">
            <span>{selectedScenario?.objective ?? "Fetching scenario data..."}</span>
          </div>
        </div>
      </header>

      {error ? <p className="error-banner">{error}</p> : null}

      <main className="workspace">
        <section className="card stage-card">
          <div className="card-header">
            <div>
              <p className="panel-kicker">{cardKicker}</p>
              <h2>{selectedScenario?.title ?? "Spanish Conversation Gym"}</h2>
            </div>
            {!isSetupMode ? <span className={`difficulty-pill ${selectedDifficulty}`}>{selectedDifficulty}</span> : null}
          </div>

          {isSetupMode ? (
            <div className="setup-panel">
              <div className="setup-copy">
                <h3>Choose your rep.</h3>
                <p>{selectedScenario?.objective ?? "Pick a scenario and difficulty to start practicing."}</p>
              </div>

              <div className="setup-grid">
                <label className="field">
                  <span>User</span>
                  <select
                    value={activeUserId}
                    onChange={event => handleActiveUserChange(event.target.value)}
                    disabled={isBooting || isStartingSession}
                  >
                    {DEV_USERS.map(user => (
                      <option key={user.id} value={user.id}>
                        {user.label}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="field">
                  <span>Scenario</span>
                  <select
                    value={selectedScenarioId}
                    onChange={event => setSelectedScenarioId(event.target.value)}
                    disabled={isBooting || isStartingSession}
                  >
                    {scenarios.map(scenario => (
                      <option key={scenario.id} value={scenario.id}>
                        {scenario.title}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="field">
                  <span>Difficulty</span>
                  <select
                    value={selectedDifficulty}
                    onChange={event => setSelectedDifficulty(event.target.value as Difficulty)}
                    disabled={isBooting || isStartingSession}
                  >
                    <option value="easy">Easy</option>
                    <option value="standard">Standard</option>
                    <option value="hard">Hard</option>
                  </select>
                </label>

                <button
                  type="button"
                  className="primary-button"
                  onClick={() => void handleStartSession(selectedScenarioId, selectedDifficulty, activeUserId)}
                  disabled={!selectedScenarioId || isBooting || isStartingSession}
                >
                  {isStartingSession ? "Starting..." : "Start Session"}
                </button>
              </div>
            </div>
          ) : null}

          {isChatMode ? (
            <>
              <Transcript messages={messages} isPending={isSendingTurn} />

              <form className="composer" onSubmit={event => void handleSubmitTurn(event)}>
                <label className="composer-label" htmlFor="userInput">
                  Your line
                </label>
                <textarea
                  id="userInput"
                  value={draft}
                  onChange={event => setDraft(event.target.value)}
                  onKeyDown={handleComposerKeyDown}
                  placeholder="Type in Spanish..."
                  lang="es"
                  spellCheck={true}
                  rows={3}
                  disabled={!sessionId || sessionCompleted || isStartingSession}
                />
                <button type="submit" className="primary-button" disabled={!sessionId || sessionCompleted || !draft.trim() || isSendingTurn}>
                  {isSendingTurn ? "Sending..." : "Send"}
                </button>
              </form>
            </>
          ) : null}

          {isReportMode ? (
            <div className="completion-panel">
              {completionInsights.kind === "loading" ? (
                <div className="panel-loading">
                  <span className="spinner" aria-hidden="true" />
                  <span>Loading session report...</span>
                </div>
              ) : null}

              {completionInsights.kind === "error" ? (
                <div className="report-empty">
                  <p className="panel-error">{completionInsights.message}</p>
                  <button type="button" className="ghost-button" onClick={() => void loadCompletionInsights(sessionId, activeUserId)}>
                    Retry Report
                  </button>
                </div>
              ) : null}

              {completionInsights.kind === "ready" ? (
                <div className="report-grid">
                  <section className="score-card">
                    <p className="panel-kicker">Latest evaluation</p>
                    <div className="score-row">
                      <strong>{completionInsights.feedback.score}</strong>
                      <span>/ 100</span>
                    </div>
                    <p className="band-pill">{completionInsights.feedback.cefrBand}</p>
                    <p>{completionInsights.feedback.summary}</p>
                    <p className="delta-copy">{completionInsights.feedback.improvementLabel}</p>
                    <div className="recommendation-box">
                      <span>Next difficulty: {completionInsights.feedback.difficultyRecommendation.targetDifficulty}</span>
                      <strong>{completionInsights.feedback.difficultyRecommendation.action}</strong>
                      <p>{completionInsights.feedback.difficultyRecommendation.reason}</p>
                    </div>
                  </section>

                  <section className="detail-block">
                    <h3>Competencies</h3>
                    <div className="stats-grid">
                      {COMPETENCY_LABELS.map(item => (
                        <div key={item.key} className="stat-tile">
                          <span>{item.label}</span>
                          <strong>{completionInsights.feedback.competencies[item.key]}</strong>
                        </div>
                      ))}
                    </div>
                  </section>

                  <section className="detail-block">
                    <h3>Retry goals</h3>
                    <ul>
                      {completionInsights.feedback.retryGoals.map(goal => (
                        <li key={goal}>{goal}</li>
                      ))}
                    </ul>
                  </section>

                  <section className="detail-block">
                    <h3>Progress analytics</h3>
                    <div className="stats-grid">
                      <div className="stat-tile">
                        <span>Total sessions</span>
                        <strong>{completionInsights.progress.totalSessions}</strong>
                      </div>
                      <div className="stat-tile">
                        <span>Recent delta</span>
                        <strong>{formatDelta(completionInsights.progress.recentDelta)}</strong>
                      </div>
                    </div>
                    {completionInsights.progress.recentAttempts.length ? (
                      <div className="trend-table" role="table" aria-label="Recent attempts">
                        <div className="trend-row head" role="row">
                          <span role="columnheader">Time</span>
                          <span role="columnheader">Scenario</span>
                          <span role="columnheader">Score</span>
                        </div>
                        {completionInsights.progress.recentAttempts.slice(0, 5).map(attempt => (
                          <div key={`${attempt.scenarioId}-${attempt.at}-${attempt.score}`} className="trend-row" role="row">
                            <span role="cell">{formatAttemptDate(attempt.at)}</span>
                            <span role="cell">{attempt.scenarioId}</span>
                            <strong role="cell">
                              {attempt.score} {attempt.cefrBand}
                            </strong>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p>No attempt trend yet.</p>
                    )}
                  </section>
                </div>
              ) : null}

              <button type="button" className="primary-button" onClick={handleResetToSetup}>
                Start New Session
              </button>
            </div>
          ) : null}
        </section>
      </main>
    </div>
  );
}
