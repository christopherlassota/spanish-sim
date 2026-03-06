# Spanish Sim — Initial 10-Ticket Backlog

Use this to seed GitHub issues and project board columns (To Do / In Progress / In Review / Done).

## 1) Add lightweight auth + user identity
**Type:** feature
**Goal:** isolate progress per user instead of global blended data.
**Acceptance Criteria:**
- Sessions/attempts persist with `userId`
- API supports user-scoped progress queries
- UI can switch/select current user in dev mode

## 2) Per-user progress dashboard
**Type:** feature
**Goal:** show score + competency trend over time for current user.
**Acceptance Criteria:**
- Trend chart or table by attempt timestamp
- Highlights weakest competency
- Shows improvement delta over last N attempts

## 3) CEFR rubric calibration pass
**Type:** scoring
**Goal:** make competency scoring less heuristic and more stable.
**Acceptance Criteria:**
- Rubric weights documented
- Add calibration fixtures (sample conversations)
- Tests assert expected score bands for fixtures

## 4) Adaptive difficulty engine v2
**Type:** feature
**Goal:** automatically suggest difficulty changes based on performance.
**Acceptance Criteria:**
- Recommend up/down/hold after each attempt
- Rules based on competency thresholds
- UI shows recommendation + reason

## 5) Scenario content expansion pack (x3)
**Type:** content
**Goal:** add 3 new objective-driven scenarios.
**Acceptance Criteria:**
- New scenarios follow existing schema
- Stage progression covered by tests
- Feedback works without schema exceptions

## 6) Orchestrator reliability tests
**Type:** testing
**Goal:** prevent stage regression and edge-case dead-ends.
**Acceptance Criteria:**
- Add tests for invalid/short user inputs
- Add tests for all scenario close conditions
- Ensure hard-mode strictness remains enforced

## 7) Safety layer hardening
**Type:** safety
**Goal:** reduce English leakage and persona drift.
**Acceptance Criteria:**
- Expand sanitizer patterns + fallback behavior
- Add tests for leakage cases
- Add logs/flags for fallback rate monitoring

## 8) Storage migration to SQLite
**Type:** tech-debt
**Goal:** replace JSON file persistence for reliability and concurrency.
**Acceptance Criteria:**
- Tables for users/sessions/attempts/events
- Backward migration from existing JSON data
- API behavior unchanged for consumers

## 9) CI pipeline for test + lint
**Type:** infra
**Goal:** enforce quality gates on every PR.
**Acceptance Criteria:**
- GitHub Action runs `npm test`
- PR status check required before merge
- Failing tests block merge

## 10) Developer observability + debug mode
**Type:** infra
**Goal:** speed troubleshooting during rapid iteration.
**Acceptance Criteria:**
- Structured server logs by request/session
- Toggleable debug output
- Basic metrics endpoint includes fallback/sanitization counts

---

## Suggested Labels
`feature`, `bug`, `scoring`, `orchestrator`, `safety`, `analytics`, `infra`, `tech-debt`, `good-first-task`, `blocked`

## Suggested Milestones
- **M1:** Core Learning Loop Hardening
- **M2:** User System + Progress Intelligence
- **M3:** Reliability + CI + Storage Upgrade
