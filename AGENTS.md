# AGENTS.md - Spanish Sim Project Playbook

Purpose: keep development fast, consistent, and testable for the Spanish Conversation Simulator.

## 1) Product North Star
Build a conversation-performance trainer, not a flashcard app.
Primary outcome: learners improve real-world speaking performance in scenario simulations.

## 2) Current Scope (MVP+)
- Scenarios: `restaurant`, `taxi`, `airbnb`
- Modes: text-first, difficulty (`easy|standard|hard`)
- Engine: single orchestrator with character-role simulation
- Feedback: CEFR-style score + competency subscores + retry goal
- Persistence: local JSON store (`data/progress.json`)
- Analytics: local event counters + progress summaries
- Frontend: React + TypeScript app built with Vite and served by the Node app
- Contracts: shared request/response types in `shared/contracts.*`

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
- `src/api-router.mjs`
  - Owns API route orchestration only
  - Prefer delegating validation and response shaping to dedicated modules
- `src/api-validation.mjs`
  - Owns request parsing and validation
  - Keep endpoint inputs strict and explicit
- `src/api-serializers.mjs`
  - Owns stable API response composition
  - When changing response shapes, update shared contracts, frontend, and README in the same change
- `src/server.mjs`
  - Owns startup and top-level request dispatch only
  - Do not let this grow back into a monolith
- `src/static-client.mjs`
  - Owns built SPA asset serving
  - Keep path-boundary checks strict
- `client/src/App.tsx`
  - Owns app shell, top-level UI state, and session lifecycle
- `client/src/api.ts`
  - Owns browser-side API calls only
  - Do not duplicate contract shapes here that already exist in `shared/contracts.*`
- `client/src/components/*`
  - Own UI presentation only
  - No scoring or server business logic
- `shared/contracts.mjs` and `shared/contracts.d.mts`
  - Own shared runtime helpers and request/response types used across client and server
  - Update these first when evolving API contracts

## 4) API Contracts (keep stable)
- `GET /api/scenarios`
- `POST /api/session` body: `{ scenarioId?, difficulty? }`
- `POST /api/turn` body: `{ sessionId, text }`
- `POST /api/feedback` body: `{ sessionId }`
- `GET /api/analytics`
- `GET /api/progress`

Rules:
- Keep endpoint names stable.
- Keep response shapes aligned with `shared/contracts.*`.
- When changing response shapes, update frontend, shared contracts, tests, and README in the same change.

## 5) Prompt + Safety Rules
- Character responses should remain in Spanish by default.
- If model output leaks obvious English, prompt metadata, or reasoning text, sanitize and fall back to scripted response.
- Keep character turns concise (1-2 lines).
- Preserve persona and scenario context.
- Do not expose provider reasoning or internal instructions in user-visible replies.

## 6) Scoring Rules
The feedback response must always include:
- `score` (0-100)
- `cefrBand` (`A1|A2|B1|B2`)
- `competencies`:
  - `taskCompletion`
  - `grammarAccuracy`
  - `vocabularyRange`
  - `fluencyNaturalness`
- `retryGoals` (>=1 goal when possible)

Avoid frequent rubric changes unless you also:
1. document why,
2. add or adjust tests,
3. verify historical progress interpretation impact.

## 7) Testing Standard (required)
Run before marking work complete:
```bash
npm test
npm run typecheck
```

Also run this when frontend code, shared contracts, or build config changed:
```bash
npm run build
```

Minimum for new features:
- add or adjust at least one test for changed behavior
- keep all existing tests passing

Current test focus:
- scenario stage progression
- hard-mode stricter behavior
- safety sanitization
- scoring/rubric shape + English penalty behavior
- request validation and shared contract behavior
- static asset path safety

## 8) Definition of Done (DoD)
A change is done only if:
1. Feature works end-to-end in local UI
2. `npm test` passes
3. `npm run typecheck` passes
4. `npm run build` passes when frontend, shared contracts, or build config changed
5. README updated if behavior, config, commands, contracts, or architecture changed
6. No obvious regression in scenario progression, feedback payload, or frontend routing

## 9) Roadmap Priorities (near-term)
1. Per-user identity + isolated progress baselines
2. CEFR rubric refinement with calibration set
3. Better adaptive difficulty using competency history
4. Voice I/O (after text retention signal is strong)
5. Production-grade DB (SQLite/Postgres) replacing JSON file store

## 10) Dev Notes
- Install deps with:
```bash
npm install
```
- Start the built app on Node with:
```bash
npm run start
```
- Start local development with:
```bash
npm run dev
```
- During dev:
  - frontend runs on `http://localhost:5173`
  - backend runs on `http://localhost:8787`
- If port 8787 is busy, run:
```powershell
$env:PORT=8788; npm run start
```
- Avoid ternary operators in production code when a plain `if`/`else` is clearer.
  - Prefer explicit branching for readability, especially in rendering, validation, and business logic paths.
- Do not reintroduce legacy vanilla frontend files under `public/`; the active frontend lives under `client/`.
- Keep commits small and atomic by feature area.
- Prefer explicit, readable logic over clever abstractions at this stage.
