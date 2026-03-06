# Ready-to-Paste Issue Drafts

Copy each block into a new GitHub issue.

---

## Issue 1 — [FEATURE] Add lightweight auth + user identity (dev-safe)

## Objective
Add a minimal user identity layer so session/attempt progress is isolated per user instead of blended globally.

## Context
Current progress is stored globally. This blocks meaningful analytics and makes competency trends noisy.

## Scope
- In scope:
  - Add `userId` to sessions and attempts in storage
  - Add dev-safe identity mechanism (simple user selector or seeded users)
  - Update APIs to accept/use user context
- Out of scope:
  - Production OAuth provider integration
  - Password auth flows

## Acceptance Criteria
- [ ] Every new session is associated with a `userId`
- [ ] Every attempt and feedback record is associated with a `userId`
- [ ] `/api/progress` can return user-scoped results
- [ ] Existing app behavior remains functional in single-user mode

## Implementation Notes
- `src/store.mjs`: extend schema and read/write helpers
- `src/server.mjs`: session creation and progress query scoping
- `public/app.js`: dev user selector + pass user context
- `test/*`: add tests for user isolation

## Test Plan
- [ ] `npm test` passes
- [ ] Manual check: User A and User B have distinct progress summaries
- [ ] Regression check: existing scenarios still run normally

## Deliverables
- [ ] Code changes
- [ ] Tests added/updated
- [ ] Docs updated (`README.md`, `AGENTS.md` if needed)

---

## Issue 2 — [FEATURE] Per-user progress dashboard (competency trends)

## Objective
Create a “My Progress” view showing score and competency trends over time for the active user.

## Context
We currently show raw progress summaries. Users need readable trend insight to stay engaged and improve intentionally.

## Scope
- In scope:
  - Trend display for total score over attempts
  - Trend display for each competency
  - Highlight weakest competency and recent delta
- Out of scope:
  - Advanced chart libraries (keep simple table/mini trend list first)

## Acceptance Criteria
- [ ] Progress view is user-scoped
- [ ] Shows last N attempts with timestamps and total score
- [ ] Shows competency trend values
- [ ] Highlights weakest competency for current period

## Implementation Notes
- `src/store.mjs`: add user-scoped trend query helper
- `src/server.mjs`: add endpoint for trend payload (or extend `/api/progress`)
- `public/app.js`: add “My Progress” panel

## Test Plan
- [ ] `npm test` passes
- [ ] Manual check: trend updates after each feedback submission
- [ ] Manual check: switching user changes trend dataset

## Deliverables
- [ ] Code changes
- [ ] Tests added/updated
- [ ] README endpoint/UI notes updated

---

## Issue 3 — [SCORING] CEFR rubric calibration + fixture-based tests

## Objective
Stabilize CEFR-style scoring by calibrating rubric weights with fixed conversation fixtures.

## Context
Current rubric is a strong starting point but still heuristic-heavy. Calibration reduces drift and improves trust in feedback.

## Scope
- In scope:
  - Define baseline fixture conversations (weak/average/strong)
  - Tune scoring thresholds/weights
  - Add tests asserting expected score ranges and CEFR bands
- Out of scope:
  - ML-based grading model
  - Human evaluator tooling

## Acceptance Criteria
- [ ] Fixture set added for at least 3 quality tiers
- [ ] Tests verify expected CEFR bands for fixtures
- [ ] Competency subscores remain present and valid
- [ ] Rubric decisions documented in `DECISIONS.md`

## Implementation Notes
- `src/feedback.mjs`: adjust scoring/threshold logic
- `test/feedback.test.mjs`: add fixture assertions
- optional `test/fixtures/*.json`: store sample conversations

## Test Plan
- [ ] `npm test` passes
- [ ] Fixture assertions pass reliably
- [ ] No regression in existing feedback response shape

## Deliverables
- [ ] Code changes
- [ ] Tests added/updated
- [ ] `DECISIONS.md` entry added for calibration strategy
