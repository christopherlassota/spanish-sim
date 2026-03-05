# AGENTS.md — Spanish Sim Project Playbook

Purpose: keep development fast, consistent, and testable for the Spanish Conversation Simulator.

## 1) Product North Star
Build a conversation-performance trainer (not a flashcard app).
Primary outcome: learners improve real-world speaking performance in scenario simulations.

## 2) Current Scope (MVP+)
- Scenarios: `restaurant`, `taxi`, `airbnb`
- Modes: text-first, difficulty (`easy|standard|hard`)
- Engine: single orchestrator with character-role simulation
- Feedback: CEFR-style score + competency subscores + retry goal
- Persistence: local JSON store (`data/progress.json`)
- Analytics: local event counters + progress summaries

## 3) Architecture Boundaries
- `src/orchestrator.mjs`
  - Owns stage progression, turn generation, safety fallback logic
  - Do NOT add scoring logic here
- `src/feedback.mjs`
  - Owns scoring rubric, CEFR mapping, corrections/retry goals
  - Do NOT mutate session state here
- `src/store.mjs`
  - Owns persistence (session snapshots, attempts, progress summaries)
  - Keep schema migrations backward-compatible when possible
- `src/server.mjs`
  - API wiring, request validation, response composition
  - Keep endpoint contracts stable
- `public/app.js`
  - UI rendering and API calls only (no scoring logic)

## 4) API Contracts (keep stable)
- `GET /api/scenarios`
- `POST /api/session` body: `{ scenarioId?, difficulty? }`
- `POST /api/turn` body: `{ sessionId, text }`
- `POST /api/feedback` body: `{ sessionId }`
- `GET /api/analytics`
- `GET /api/progress`

When changing response shapes, update UI and README in same change.

## 5) Prompt + Safety Rules
- Character responses should remain in Spanish by default.
- If model output leaks obvious English, sanitize and fallback to scripted response.
- Keep character turns concise (1–2 lines).
- Preserve persona + scenario context.

## 6) Scoring Rules
The feedback response must always include:
- `score` (0–100)
- `cefrBand` (A1/A2/B1/B2)
- `competencies`:
  - `taskCompletion`
  - `grammarAccuracy`
  - `vocabularyRange`
  - `fluencyNaturalness`
- `retryGoals` (>=1 goal when possible)

Avoid frequent rubric changes unless you also:
1) document why,
2) add/adjust tests,
3) verify historical progress interpretation impact.

## 7) Testing Standard (required)
Run before marking work complete:
```bash
npm test
```

Minimum for new features:
- add/adjust at least one test for changed behavior
- keep all existing tests passing

Current test focus:
- scenario stage progression
- hard-mode stricter behavior
- safety sanitization
- scoring/rubric shape + English penalty behavior

## 8) Definition of Done (DoD)
A change is done only if:
1. Feature works end-to-end in local UI
2. `npm test` passes
3. README updated if behavior/config/endpoints changed
4. No obvious regression in scenario progression or feedback payload

## 9) Roadmap Priorities (near-term)
1. Per-user identity + isolated progress baselines
2. CEFR rubric refinement with calibration set
3. Better adaptive difficulty using competency history
4. Voice I/O (after text retention signal is strong)
5. Production-grade DB (SQLite/Postgres) replacing JSON file store

## 10) Dev Notes
- If port 8787 is busy, run:
```powershell
$env:PORT=8788; npm run start
```
- Keep commits small and atomic by feature area.
- Prefer explicit, readable logic over clever abstractions at this stage.
