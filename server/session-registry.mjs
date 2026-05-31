// @ts-check

/** @typedef {import("../shared/contracts.mjs").SessionState} SessionState */

export function createSessionRegistry() {
  /** @type {Map<string, SessionState>} */
  const sessions = new Map();

  return {
    /**
     * @param {SessionState} session
     */
    create(session) {
      const sessionId = crypto.randomUUID();
      sessions.set(sessionId, session);
      return sessionId;
    },

    /**
     * @param {string} sessionId
     */
    get(sessionId) {
      return sessions.get(sessionId) || null;
    }
  };
}
