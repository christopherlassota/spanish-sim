export const DEFAULT_SCENARIO_ID = "restaurant";
export const DEFAULT_DIFFICULTY = "standard";
export const DEFAULT_USER_ID = "demo";
export const DIFFICULTIES = ["easy", "standard", "hard"];
export const MESSAGE_SOURCES = ["llm", "fallback"];

export function isDifficulty(value) {
  return DIFFICULTIES.includes(value);
}

export function normalizeDifficulty(value) {
  return isDifficulty(value) ? value : DEFAULT_DIFFICULTY;
}

export function normalizeUserId(value) {
  if (!isNonEmptyString(value)) return DEFAULT_USER_ID;
  return value.trim();
}

export function isMessageSource(value) {
  return MESSAGE_SOURCES.includes(value);
}

export function isRecord(value) {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

export function isNonEmptyString(value) {
  return typeof value === "string" && value.trim().length > 0;
}
