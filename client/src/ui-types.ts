import type {
  AnalyticsSummary,
  FeedbackResponse,
  MessageRole,
  MessageSource,
  MessageVariant,
  ProgressSummary
} from "../../shared/contracts.mjs";

export interface ChatMessage {
  id: string;
  role: MessageRole;
  speaker: string;
  content: string;
  source: MessageSource | null;
  variant: MessageVariant;
}

export type InsightPanel =
  | { kind: "empty" }
  | { kind: "feedback"; data: FeedbackResponse }
  | { kind: "analytics"; data: { analytics: AnalyticsSummary; progress: ProgressSummary } }
  | { kind: "error"; message: string };
