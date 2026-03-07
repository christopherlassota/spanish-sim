# Spanish Sim - Current Backlog

Use this to seed GitHub issues and the project board columns (`To Do`, `In Progress`, `In Review`, `Done`).

## 1) API integration test suite for routes + SPA serving
**Type:** testing
**Goal:** protect the refactored server and frontend build flow with end-to-end request coverage.
**Acceptance Criteria:**
- Exercise `GET /api/scenarios`
- Exercise `POST /api/session`, `POST /api/turn`, `POST /api/feedback`
- Verify `GET /` serves the SPA shell and non-existent assets return the right status
- Include regression coverage for static path-boundary behavior

## 2) Add lightweight auth + user identity
**Type:** feature
**Goal:** isolate progress per user instead of global blended data.
**Acceptance Criteria:**
- Sessions and attempts persist with `userId`
- API supports user-scoped progress queries
- UI can switch/select current user in dev mode
- Existing single-user local flow still works with a default user

## 3) Per-user progress dashboard
**Type:** feature
**Goal:** show score and competency trend over time for the active user.
**Acceptance Criteria:**
- Trend chart or table by attempt timestamp
- Highlights weakest competency
- Shows improvement delta over last N attempts
- Reads from user-scoped progress data

## 4) CEFR rubric calibration pass
**Type:** scoring
**Goal:** make competency scoring less heuristic and more stable.
**Acceptance Criteria:**
- Rubric weights documented
- Add calibration fixtures (sample conversations)
- Tests assert expected score bands for fixtures
- Historical progress interpretation impact reviewed

## 5) Adaptive difficulty engine v2
**Type:** feature
**Goal:** automatically suggest difficulty changes based on performance.
**Acceptance Criteria:**
- Recommend up/down/hold after each attempt
- Rules based on competency thresholds
- UI shows recommendation and reason
- Recommendation logic is test-covered

## 6) Backend TypeScript migration
**Type:** tech-debt
**Goal:** migrate server-side modules from JSDoc-typed `.mjs` to TypeScript for stronger contract safety.
**Acceptance Criteria:**
- Server entry and route modules compile under TypeScript
- Shared contracts remain the single source of truth
- `npm run typecheck` covers client and server code
- Runtime behavior remains unchanged

## 7) Safety and fallback observability
**Type:** safety
**Goal:** make LLM fallback behavior measurable and easier to debug.
**Acceptance Criteria:**
- Track fallback count by provider/scenario
- Track sanitization rejection categories
- Add debug-safe server logs or counters
- Expose useful metrics in analytics or a debug endpoint

## 8) Storage migration to SQLite
**Type:** tech-debt
**Goal:** replace JSON file persistence for reliability and concurrency.
**Acceptance Criteria:**
- Tables for users, sessions, attempts, and events
- Backward migration path from existing JSON data
- API behavior unchanged for consumers
- Local dev remains simple

## 9) CI pipeline for test + typecheck + build
**Type:** infra
**Goal:** enforce quality gates on every PR.
**Acceptance Criteria:**
- GitHub Action runs `npm test`
- GitHub Action runs `npm run typecheck`
- GitHub Action runs `npm run build`
- Failing checks block merge

## 10) Scenario content expansion pack (x3)
**Type:** content
**Goal:** add 3 new objective-driven scenarios.
**Acceptance Criteria:**
- New scenarios follow the existing schema
- Stage progression covered by tests
- Feedback works without schema exceptions
- Frontend scenario selector picks them up without special-casing

---

## Suggested Labels
`feature`, `bug`, `testing`, `scoring`, `safety`, `analytics`, `infra`, `tech-debt`, `content`, `good-first-task`, `blocked`

## Suggested Milestones
- **M1:** Reliability + Contract Hardening
- **M2:** User System + Progress Intelligence
- **M3:** Scoring + Adaptation
- **M4:** Persistence + Delivery
