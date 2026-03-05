# Spanish Conversation Simulator (MVP Scaffold)

Text-first MVP for scenario-based Spanish roleplay.

## What this includes
- Scenario state machine (Restaurant)
- Character personas (waiter + friend)
- Turn orchestration (single orchestrator, multi-character illusion)
- Post-conversation feedback (basic heuristics)
- Minimal browser UI

## Run
```bash
cd apps/spanish-sim
npm run start
```
Then open: http://localhost:8787

## Next build targets
1. Plug real LLM responses in `src/orchestrator.mjs`
2. Add Taxi + Airbnb scenarios
3. Add persistent user profiles + analytics events
4. Add speech in/out when text retention is validated
