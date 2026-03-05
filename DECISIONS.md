# DECISIONS.md — Spanish Sim

Tracks key product/engineering decisions so future changes stay intentional.

---

## 2026-03-05 — Product positioning
**Decision:** Build as a conversation-performance trainer (simulation-first), not lesson-first.
**Why:** Differentiates from memorization apps and aligns with real-world speaking outcomes.
**Implication:** Prioritize scenario completion, fluency under pressure, and post-conversation coaching.

## 2026-03-05 — MVP interaction mode
**Decision:** Text-first MVP with optional model-driven dialogue; postpone realtime voice.
**Why:** Lower latency/cost complexity and faster validation loop.
**Implication:** Voice enters roadmap only after retention and learning signal are proven.

## 2026-03-05 — Architecture pattern
**Decision:** Single orchestrator simulates multi-character environment.
**Why:** Lower cost and implementation complexity than true multi-agent runtime.
**Implication:** Character turns are selected centrally by scenario state + heuristics.

## 2026-03-05 — Scenario set for initial validation
**Decision:** Start with 3 scenarios: restaurant, taxi, airbnb.
**Why:** High-frequency travel/life interactions with clear objective checkpoints.
**Implication:** Expansion should follow same objective-driven schema.

## 2026-03-05 — Scoring model direction
**Decision:** Use CEFR-style composite scoring with competency breakdowns.
**Why:** Better learning signal than a single generic score.
**Implication:** Feedback payload must include task completion, grammar, vocabulary, fluency subscores.

## 2026-03-05 — Persistence strategy
**Decision:** Use JSON file store (`data/progress.json`) during MVP.
**Why:** Zero infra friction, fast local iteration.
**Implication:** Plan migration path to SQLite/Postgres before production scale.

## 2026-03-05 — Difficulty system
**Decision:** Implement `easy|standard|hard` at session level.
**Why:** Needed for progression and realistic challenge control.
**Implication:** Hard mode uses stricter progression thresholds and higher response variability.

## 2026-03-05 — Safety fallback
**Decision:** Add sanitization for obvious English leakage in character responses with scripted fallback.
**Why:** Preserve immersion and consistency in Spanish practice.
**Implication:** Safety behavior must remain covered by tests.

## 2026-03-05 — Testing baseline
**Decision:** Require `npm test` pass for completion; include tests for progression, rubric shape, and safety.
**Why:** Prevent regressions as orchestration and scoring evolve quickly.
**Implication:** Any rubric or progression change should include corresponding test updates.

## 2026-03-05 — Business model direction
**Decision:** Standard SaaS billing model (not user ChatGPT subscription passthrough).
**Why:** Simpler product control and monetization clarity.
**Implication:** Future work should include usage limits and model-routing for margin control.

---

## Template for future entries

## YYYY-MM-DD — <decision title>
**Decision:** <what was decided>
**Why:** <key reasoning>
**Implication:** <what this changes going forward>
