# Spanish Conversation Simulator (MVP Scaffold)

Text-first MVP for scenario-based Spanish roleplay.

## What this includes
- Scenario state machine (Restaurant, Taxi, Airbnb)
- Character personas + orchestrated turn selection
- Optional LLM responses (`OPENAI_API_KEY`), scripted fallback if not configured
- Post-conversation feedback (basic heuristics)
- Analytics events (session start, turns, completion, feedback)
- Persistent progress store (`data/progress.json`) with retry delta tracking
- Minimal browser UI

## Run
```bash
cd apps/spanish-sim
npm run start
```
Then open: http://localhost:8787

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

## Next build targets
1. Replace heuristic scoring with CEFR-style rubric scoring
2. Add user accounts and per-user progress baselines
3. Add speech input/output once retention signal is validated
