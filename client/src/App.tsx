import { useEffect, useMemo, useRef, useState, type FormEvent, type KeyboardEvent } from "react";
import { createSession, fetchAnalyticsBundle, fetchFeedback, fetchScenarios, sendTurn } from "./api";
import { InsightPanel } from "./components/InsightPanel";
import { Transcript } from "./components/Transcript";
import type { Difficulty, ScenarioSummary, Turn } from "../../shared/contracts.mjs";
import type { ChatMessage, InsightPanel as InsightPanelState } from "./ui-types";

const INITIAL_DIFFICULTY: Difficulty = "standard";

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

export default function App() {
  const [scenarios, setScenarios] = useState<ScenarioSummary[]>([]);
  const [selectedScenarioId, setSelectedScenarioId] = useState("");
  const [selectedDifficulty, setSelectedDifficulty] = useState<Difficulty>(INITIAL_DIFFICULTY);
  const [sessionId, setSessionId] = useState("");
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [draft, setDraft] = useState("");
  const [isBooting, setIsBooting] = useState(true);
  const [isStartingSession, setIsStartingSession] = useState(false);
  const [isSendingTurn, setIsSendingTurn] = useState(false);
  const [isPanelLoading, setIsPanelLoading] = useState(false);
  const [panel, setPanel] = useState<InsightPanelState>({ kind: "empty" });
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
        await handleStartSession(firstScenarioId, INITIAL_DIFFICULTY);
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
    difficulty = selectedDifficulty
  ) {
    if (!scenarioId) return;

    setIsStartingSession(true);
    setError(null);
    setPanel({ kind: "empty" });

    try {
      const session = await createSession({ scenarioId, difficulty });
      setSessionId(session.sessionId);
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

  async function handleSubmitTurn(event?: FormEvent<HTMLFormElement>) {
    event?.preventDefault();

    if (!draft.trim() || !sessionId || isSendingTurn) return;

    const text = draft.trim();
    setDraft("");
    setError(null);
    setMessages(current => [...current, makeMessage("You", text, { role: "user" })]);
    setIsSendingTurn(true);

    try {
      const response = await sendTurn({ sessionId, text });
      setMessages(current => {
        const next = [...current, ...mapTurns(response.turns)];
        if (response.completed) {
          next.push(
            makeMessage("System", "Scenario complete. Tap 'Get Feedback'.", {
              variant: "system"
            })
          );
        }
        return next;
      });
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

  async function handleLoadFeedback() {
    if (!sessionId) return;

    setIsPanelLoading(true);
    setError(null);

    try {
      const feedback = await fetchFeedback(sessionId);
      setPanel({ kind: "feedback", data: feedback });
    } catch (issue) {
      setPanel({
        kind: "error",
        message: issue instanceof Error ? issue.message : "Could not load feedback."
      });
    } finally {
      setIsPanelLoading(false);
    }
  }

  async function handleLoadAnalytics() {
    setIsPanelLoading(true);
    setError(null);

    try {
      const analytics = await fetchAnalyticsBundle();
      setPanel({ kind: "analytics", data: analytics });
    } catch (issue) {
      setPanel({
        kind: "error",
        message: issue instanceof Error ? issue.message : "Could not load analytics."
      });
    } finally {
      setIsPanelLoading(false);
    }
  }

  function handleComposerKeyDown(event: KeyboardEvent<HTMLTextAreaElement>) {
    if (event.key !== "Enter" || event.shiftKey) return;
    event.preventDefault();
    void handleSubmitTurn();
  }

  return (
    <div className="app-shell">
      <header className="hero">
        <div className="hero-copy">
          <p className="eyebrow">Conversation performance trainer</p>
          <h1>Spanish Conversation Gym</h1>
          <p className="hero-text">
            Scenario reps for restaurant, taxi, and Airbnb flows with live roleplay, scoring, and local progress
            tracking.
          </p>
        </div>

        <div className="hero-status card">
          <span className={`status-pill ${sessionId ? "live" : "idle"}`}>{sessionId ? "Session live" : "Connecting"}</span>
          <p className="panel-kicker">Active objective</p>
          <h2>{selectedScenario?.title ?? "Loading scenarios"}</h2>
          <p>{selectedScenario?.objective ?? "Fetching scenario data..."}</p>
        </div>
      </header>

      <section className="control-bar card">
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
          onClick={() => void handleStartSession(selectedScenarioId, selectedDifficulty)}
          disabled={!selectedScenarioId || isBooting || isStartingSession}
        >
          {isStartingSession ? "Resetting..." : "New Session"}
        </button>
      </section>

      {error ? <p className="error-banner">{error}</p> : null}

      <main className="workspace">
        <section className="card stage-card">
          <div className="card-header">
            <div>
              <p className="panel-kicker">Live simulation</p>
              <h2>{selectedScenario?.title ?? "Session"}</h2>
            </div>
            <span className={`difficulty-pill ${selectedDifficulty}`}>{selectedDifficulty}</span>
          </div>

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
              rows={3}
              disabled={!sessionId || isStartingSession}
            />
            <button type="submit" className="primary-button" disabled={!sessionId || !draft.trim() || isSendingTurn}>
              {isSendingTurn ? "Sending..." : "Send"}
            </button>
          </form>
        </section>

        <aside className="card insight-card">
          <div className="card-header compact">
            <div>
              <p className="panel-kicker">Review lane</p>
              <h2>Feedback and analytics</h2>
            </div>
          </div>

          <InsightPanel
            panel={panel}
            isLoading={isPanelLoading}
            onLoadFeedback={() => void handleLoadFeedback()}
            onLoadAnalytics={() => void handleLoadAnalytics()}
            hasSession={Boolean(sessionId)}
          />
        </aside>
      </main>
    </div>
  );
}
