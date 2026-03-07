# Ready-to-Paste Issue Drafts

Copy each block into a new GitHub issue.

---

## Issue 1 - [TESTING] Add API integration tests for the server and built SPA

## Objective
Add integration coverage for the refactored Node API and static SPA serving flow.

## Context
The project recently moved to a React/Vite frontend plus a modularized backend. Unit tests cover a lot of business logic, but we still lack end-to-end coverage across route parsing, serialization, and built-app serving.

## Scope
- In scope:
  - Hit `GET /api/scenarios`
  - Hit `POST /api/session`, `POST /api/turn`, `POST /api/feedback`
  - Verify `GET /` serves the built app shell
  - Verify missing assets and invalid paths return expected statuses
- Out of scope:
  - Browser automation
  - Full visual regression testing

## Acceptance Criteria
- [ ] Integration tests cover the main API loop
- [ ] SPA shell serving is verified
- [ ] Static path-boundary behavior is verified
- [ ] Existing unit tests still pass

## Implementation Notes
- `src/server.mjs`: use the live server entry for smoke-level coverage where practical
- `src/api-router.mjs`: validate route orchestration assumptions
- `src/api-validation.mjs`: confirm request parsing behavior through live requests
- `src/api-serializers.mjs`: confirm response shape through live requests
- `src/static-client.mjs`: verify built asset and fallback routing behavior
- `test/*`: add integration coverage without weakening existing unit tests

## Test Plan
- [ ] `npm test` passes
- [ ] `npm run typecheck` passes
- [ ] `npm run build` passes
- [ ] Manual check: app still loads at `http://localhost:8787`

## Deliverables
- [ ] Code changes
- [ ] Tests added or updated
- [ ] Docs updated if commands or test workflow change

---

## Issue 2 - [FEATURE] Add lightweight auth + user identity (dev-safe)

## Objective
Add a minimal user identity layer so session and attempt progress is isolated per user instead of blended globally.

## Context
Current progress is stored globally. This blocks meaningful analytics and makes competency trends noisy.

## Scope
- In scope:
  - Add `userId` to sessions and attempts in storage
  - Add dev-safe identity mechanism (simple selector or seeded users)
  - Update APIs to accept or derive user context
  - Update frontend state and requests to carry user context
- Out of scope:
  - Production OAuth provider integration
  - Password auth flows

## Acceptance Criteria
- [ ] Every new session is associated with a `userId`
- [ ] Every attempt and feedback record is associated with a `userId`
- [ ] `/api/progress` can return user-scoped results
- [ ] Existing app behavior remains functional in single-user mode

## Implementation Notes
- `shared/contracts.*`: update request and response contracts first if payloads change
- `src/store.mjs`: extend schema and read/write helpers
- `src/api-router.mjs`: apply user scoping at the API layer
- `src/session-registry.mjs`: ensure session identity and user identity stay aligned
- `client/src/App.tsx`: add active-user state
- `client/src/api.ts`: pass user context where required
- `test/*`: add tests for user isolation

## Test Plan
- [ ] `npm test` passes
- [ ] `npm run typecheck` passes
- [ ] `npm run build` passes
- [ ] Manual check: User A and User B have distinct progress summaries

## Deliverables
- [ ] Code changes
- [ ] Tests added or updated
- [ ] Docs updated (`README.md`, `AGENTS.md`, shared contracts if needed)

---

## Issue 3 - [FEATURE] Per-user progress dashboard (competency trends)

## Objective
Create a "My Progress" view showing score and competency trends over time for the active user.

## Context
We currently show summaries and analytics, but not a focused longitudinal view for an individual learner.

## Scope
- In scope:
  - Trend display for total score over attempts
  - Trend display for each competency
  - Highlight weakest competency and recent delta
  - Show user-scoped progress history
- Out of scope:
  - Heavy charting infrastructure if a simple table or compact trend view is enough

## Acceptance Criteria
- [ ] Progress view is user-scoped
- [ ] Shows last N attempts with timestamps and total score
- [ ] Shows competency trend values
- [ ] Highlights weakest competency for the selected period

## Implementation Notes
- `shared/contracts.*`: add contract types if progress payload shape expands
- `src/store.mjs`: add user-scoped trend query helper
- `src/api-router.mjs`: add endpoint or extend `/api/progress`
- `client/src/App.tsx`: add panel state for the view
- `client/src/components/InsightPanel.tsx`: render trend UI

## Test Plan
- [ ] `npm test` passes
- [ ] `npm run typecheck` passes
- [ ] `npm run build` passes
- [ ] Manual check: trend updates after each feedback submission

## Deliverables
- [ ] Code changes
- [ ] Tests added or updated
- [ ] README endpoint or UI notes updated

---

## Issue 4 - [SCORING] CEFR rubric calibration + fixture-based tests

## Objective
Stabilize CEFR-style scoring by calibrating rubric weights with fixed conversation fixtures.

## Context
Current rubric is a strong starting point but still heuristic-heavy. Calibration reduces drift and improves trust in feedback.

## Scope
- In scope:
  - Define baseline fixture conversations (weak, average, strong)
  - Tune scoring thresholds or weights
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
- `src/feedback.mjs`: adjust scoring or threshold logic
- `test/feedback.test.mjs`: add fixture assertions
- `test/fixtures/*`: add sample conversations if needed
- `DECISIONS.md`: record any rubric direction changes

## Test Plan
- [ ] `npm test` passes
- [ ] `npm run typecheck` passes
- [ ] Fixture assertions pass reliably
- [ ] No regression in existing feedback response shape

## Deliverables
- [ ] Code changes
- [ ] Tests added or updated
- [ ] `DECISIONS.md` entry added for calibration strategy
