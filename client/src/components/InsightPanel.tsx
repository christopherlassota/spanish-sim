import type { Competencies } from "../../../shared/contracts.mjs";
import type { InsightPanel as InsightPanelState } from "../ui-types";

interface InsightPanelProps {
  panel: InsightPanelState;
  isLoading: boolean;
  onLoadFeedback: () => void;
  onLoadAnalytics: () => void;
  canLoadFeedback: boolean;
}

const COMPETENCY_LABELS: Array<{ key: Extract<keyof Competencies, string>; label: string }> = [
  { key: "taskCompletion", label: "Task completion" },
  { key: "grammarAccuracy", label: "Grammar accuracy" },
  { key: "vocabularyRange", label: "Vocabulary range" },
  { key: "fluencyNaturalness", label: "Fluency and naturalness" }
];

function getCompetencyLabel(key: string): string {
  return COMPETENCY_LABELS.find(item => item.key === key)?.label ?? key;
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

function EmptyState() {
  return (
    <div className="panel-empty">
      <p className="panel-kicker">Session intelligence</p>
      <h3>Pull feedback when a scenario ends, or inspect analytics mid-run.</h3>
      <p>
        Feedback scores the current conversation. Analytics summarize total usage and scenario-level progress history.
      </p>
    </div>
  );
}

function FeedbackView({ panel }: { panel: Extract<InsightPanelState, { kind: "feedback" }> }) {
  const { data } = panel;

  return (
    <div className="panel-stack">
      <div className="score-card">
        <p className="panel-kicker">Latest evaluation</p>
        <div className="score-row">
          <strong>{data.score}</strong>
          <span>/ 100</span>
        </div>
        <p className="band-pill">{data.cefrBand}</p>
        <p>{data.summary}</p>
        <p className="delta-copy">{data.improvementLabel}</p>
        <div className="recommendation-box">
          <span>Next difficulty: {data.difficultyRecommendation.targetDifficulty}</span>
          <strong>{data.difficultyRecommendation.action}</strong>
          <p>{data.difficultyRecommendation.reason}</p>
        </div>
      </div>

      <div className="stats-grid">
        {COMPETENCY_LABELS.map(item => {
          const value = data.competencies[item.key];
          return (
            <div key={item.key} className="stat-tile">
              <span>{item.label}</span>
              <strong>{value}</strong>
            </div>
          );
        })}
      </div>

      <section className="detail-block">
        <h3>Retry goals</h3>
        <ul>
          {data.retryGoals.map(goal => (
            <li key={goal}>{goal}</li>
          ))}
        </ul>
      </section>

      <section className="detail-block">
        <h3>Corrections</h3>
        <ul>
          {data.corrections.map(correction => (
            <li key={correction}>{correction}</li>
          ))}
        </ul>
      </section>

      <section className="detail-block">
        <h3>Better phrases</h3>
        <ul>
          {data.betterPhrases.map(phrase => (
            <li key={phrase}>{phrase}</li>
          ))}
        </ul>
      </section>
    </div>
  );
}

function AnalyticsView({ panel }: { panel: Extract<InsightPanelState, { kind: "analytics" }> }) {
  const { analytics, progress } = panel.data;
  const scenarioEntries = Object.entries(progress.attemptsByScenario);
  const weakestLabel = progress.weakestCompetency ? getCompetencyLabel(progress.weakestCompetency.key) : "No attempts yet";
  const deltaLabel = progress.recentDelta == null ? "No baseline" : progress.recentDelta >= 0 ? `+${progress.recentDelta}` : String(progress.recentDelta);

  return (
    <div className="panel-stack">
      <div className="stats-grid">
        <div className="stat-tile">
          <span>Total events</span>
          <strong>{analytics.totalEvents}</strong>
        </div>
        <div className="stat-tile">
          <span>Total sessions</span>
          <strong>{progress.totalSessions}</strong>
        </div>
        <div className="stat-tile">
          <span>Active user</span>
          <strong>{progress.userId}</strong>
        </div>
        <div className="stat-tile">
          <span>Recent delta</span>
          <strong>{deltaLabel}</strong>
        </div>
      </div>

      <section className="detail-block">
        <h3>Progress focus</h3>
        <p>
          Weakest competency: {weakestLabel}
          {progress.weakestCompetency ? ` (${progress.weakestCompetency.score})` : ""}
        </p>
      </section>

      <section className="detail-block">
        <h3>Event counts</h3>
        <div className="chip-grid">
          {Object.entries(analytics.counts).map(([key, value]) => (
            <span key={key} className="metric-chip">
              {key}: {value}
            </span>
          ))}
        </div>
      </section>

      <section className="detail-block">
        <h3>Fallbacks</h3>
        <p>Total fallback turns: {analytics.fallbacks.total}</p>
        <div className="chip-grid">
          {Object.entries(analytics.fallbacks.byReason).map(([key, value]) => (
            <span key={key} className="metric-chip">
              {key}: {value}
            </span>
          ))}
        </div>
      </section>

      <section className="detail-block">
        <h3>Recent attempts</h3>
        {progress.recentAttempts.length ? (
          <div className="trend-table" role="table" aria-label="Recent attempts">
            <div className="trend-row head" role="row">
              <span role="columnheader">Time</span>
              <span role="columnheader">Scenario</span>
              <span role="columnheader">Score</span>
            </div>
            {progress.recentAttempts.map(attempt => (
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

      <section className="detail-block">
        <h3>Scenario progress</h3>
        <div className="scenario-list">
          {scenarioEntries.length ? (
            scenarioEntries.map(([scenarioId, details]) => (
              <article key={scenarioId} className="scenario-card">
                <div className="scenario-card-head">
                  <h4>{scenarioId}</h4>
                  <span>{details.lastCefrBand ?? "No CEFR yet"}</span>
                </div>
                <p>
                  Attempts {details.attempts} · Avg {details.avgScore ?? "n/a"} · Last {details.lastScore ?? "n/a"}
                </p>
                <div className="chip-grid">
                  {COMPETENCY_LABELS.map(item => (
                    <span key={item.key} className="metric-chip">
                      {item.label}: {details.competencyAverages[item.key]}
                    </span>
                  ))}
                </div>
              </article>
            ))
          ) : (
            <p>No saved attempts yet.</p>
          )}
        </div>
      </section>
    </div>
  );
}

export function InsightPanel({ panel, isLoading, onLoadFeedback, onLoadAnalytics, canLoadFeedback }: InsightPanelProps) {
  return (
    <>
      <div className="panel-actions">
        <button type="button" className="ghost-button" onClick={onLoadFeedback} disabled={!canLoadFeedback || isLoading}>
          Get Feedback
        </button>
        <button type="button" className="ghost-button" onClick={onLoadAnalytics} disabled={isLoading}>
          View Analytics
        </button>
      </div>

      {isLoading ? (
        <div className="panel-loading">
          <span className="spinner" aria-hidden="true" />
          <span>Loading insight...</span>
        </div>
      ) : null}

      {!isLoading && panel.kind === "empty" ? <EmptyState /> : null}
      {!isLoading && panel.kind === "error" ? <p className="panel-error">{panel.message}</p> : null}
      {!isLoading && panel.kind === "feedback" ? <FeedbackView panel={panel} /> : null}
      {!isLoading && panel.kind === "analytics" ? <AnalyticsView panel={panel} /> : null}
    </>
  );
}
