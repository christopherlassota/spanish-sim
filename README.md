# Spanish Conversation Simulator (MVP Scaffold)

Text-first MVP for scenario-based Spanish roleplay.

## What this includes
- Scenario state machine (Restaurant, Taxi, Airbnb)
- Character personas + orchestrated turn selection
- Optional LLM responses (`openai` or `minimax`), scripted fallback if not configured
- Post-conversation feedback (basic heuristics)
- Analytics events (session start, turns, completion, feedback)
- Persistent progress store (`data/progress.json`) with retry delta tracking
- React + TypeScript frontend served by the Node app after Vite build

## Install
```bash
npm install
```

## Run
```bash
npm run start
```
`npm run start` builds the frontend, then serves the app and API on `http://localhost:8787`.

## Dev
```bash
npm run dev
```
This starts:
- the Node API on `http://localhost:8787`
- the Vite frontend on `http://localhost:5173` with `/api` proxied to the backend

## Typecheck
```bash
npm run typecheck
```

Then open:
- `http://localhost:5173` during frontend development
- `http://localhost:8787` for the built app served by Node

### Dev note (common local issue)
If you see `EADDRINUSE: 8787`, the server is already running in another session.
- Reuse the existing tab at `http://localhost:8787`, or
- start on another port:
```bash
$env:PORT=8788; npm run start
```

## Optional: enable live LLM replies
Set env vars before running:
- `LLM_PROVIDER` (`openai` or `minimax`, default `openai`)
- OpenAI (when `LLM_PROVIDER=openai`):
  - `OPENAI_API_KEY`
  - optional `OPENAI_MODEL` (default: `gpt-4o-mini`)
  - optional `OPENAI_BASE_URL`
- MiniMax (when `LLM_PROVIDER=minimax`):
  - `MINIMAX_API_KEY`
  - optional `MINIMAX_MODEL` (default: `MiniMax-M2.5`)
  - optional `MINIMAX_BASE_URL` (default: `https://api.minimax.io/v1`)

## API endpoints
- `GET /api/scenarios`
- `POST /api/session`
- `POST /api/turn` -> `{ stage, completed, turns: [{ role, speaker, content, source }] }`
  - `source` is `llm` when model output is used, or `fallback` when scripted response is used
- `POST /api/feedback`
- `GET /api/analytics`
- `GET /api/progress`

## Frontend structure
- `client/src/App.tsx`: app shell, state, session lifecycle, panel loading
- `client/src/api.ts`: typed browser API helpers
- `client/src/ui-types.ts`: UI-only state types that compose shared API contracts
- `client/src/components/Transcript.tsx`: conversation transcript rendering
- `client/src/components/InsightPanel.tsx`: feedback and analytics presentation

## Shared contracts
- `shared/contracts.mjs`: shared runtime helpers for difficulty and payload validation
- `shared/contracts.d.mts`: shared request/response types used by the React app and backend JSDoc imports

## Backend structure
- `src/server.mjs`: startup and top-level request dispatch only
- `src/api-router.mjs`: API route handling
- `src/api-validation.mjs`: request parsing and validation
- `src/api-serializers.mjs`: response shaping for stable payloads
- `src/session-registry.mjs`: in-memory session lookup
- `src/static-client.mjs`: built SPA asset serving
- `src/http-utils.mjs`: HTTP response/body helpers

## Next build targets
1. Replace heuristic scoring with CEFR-style rubric scoring
2. Add user accounts and per-user progress baselines
3. Add speech input/output once retention signal is validated
