export const DEFAULT_SCENARIO_ID: "restaurant";
export const DEFAULT_DIFFICULTY: Difficulty;
export const DIFFICULTIES: readonly Difficulty[];
export const MESSAGE_SOURCES: readonly MessageSource[];

export type Difficulty = "easy" | "standard" | "hard";
export type MessageRole = "assistant" | "user";
export type MessageSource = "llm" | "fallback";
export type MessageVariant = "standard" | "scene" | "system";

export interface ConversationTurn {
  role: MessageRole;
  speaker?: string;
  content: string;
  source?: MessageSource;
}

export interface SessionState {
  scenarioId: string;
  difficulty: Difficulty;
  stage: string;
  completed: boolean;
  history: ConversationTurn[];
}

export interface ScenarioSummary {
  id: string;
  title: string;
  objective: string;
  openingLine: string;
}

export interface SessionRequest {
  scenarioId?: string;
  difficulty?: Difficulty;
}

export interface SessionResponse {
  sessionId: string;
  openingLine: string;
  session: SessionState;
}

export interface TurnRequest {
  sessionId: string;
  text: string;
}

export interface Turn {
  role: MessageRole;
  speaker: string;
  content: string;
  source: MessageSource;
}

export interface TurnResponse {
  stage: string;
  completed: boolean;
  turns: Turn[];
}

export interface FeedbackRequest {
  sessionId: string;
}

export interface Competencies {
  taskCompletion: number;
  grammarAccuracy: number;
  vocabularyRange: number;
  fluencyNaturalness: number;
}

export interface FeedbackResponse {
  score: number;
  cefrBand: string;
  competencies: Competencies;
  retryGoals: string[];
  corrections: string[];
  summary: string;
  previousScore: number | null;
  delta: number | null;
  improvementLabel: string;
}

export interface AnalyticsEvent {
  event: string;
  payload: Record<string, unknown>;
  ts: string;
}

export interface AnalyticsSummary {
  totalEvents: number;
  counts: Record<string, number>;
  recent: AnalyticsEvent[];
}

export interface ScenarioProgress {
  attempts: number;
  avgScore: number | null;
  lastScore: number | null;
  lastCefrBand: string | null;
  competencyAverages: Competencies;
}

export interface ProgressSummary {
  totalSessions: number;
  attemptsByScenario: Record<string, ScenarioProgress>;
}

export interface ApiError {
  error: string;
}

export function isDifficulty(value: unknown): value is Difficulty;
export function normalizeDifficulty(value: unknown): Difficulty;
export function isMessageSource(value: unknown): value is MessageSource;
export function isRecord(value: unknown): value is Record<string, unknown>;
export function isNonEmptyString(value: unknown): value is string;
