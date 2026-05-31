# Voice Roadmap - Spanish Sim

Purpose: define a practical path from the current text-first simulator to voice conversations where the learner speaks and the scenario agent replies with voice.

## 1) Product Goal
Enable a learner to:
- press record or hold to talk
- speak their turn naturally
- have speech transcribed into the current scenario turn
- receive the agent reply as synthesized audio plus visible transcript text

Primary success metric:
- a learner can complete a full scenario with voice input and voice output without falling back to manual text controls

## 2) Non-Goals for the First Voice Release
- no full duplex "talk over each other" conversation on day one
- no production-grade telephony integration
- no always-on microphone streaming
- no permanent raw-audio storage by default

The first release should be turn-based voice, not realtime voice chat.

## 3) Recommended Delivery Strategy
Start with push-to-talk voice turns layered on top of the existing text orchestrator.

Why this path:
- lowest implementation risk
- preserves current scenario progression logic
- keeps scoring and analytics compatible
- avoids solving interruption, barge-in, echo cancellation, and live streaming all at once

Recommended v1 flow:
1. user records one turn in the browser
2. frontend uploads audio to the backend
3. backend performs speech-to-text
4. backend passes transcript into the existing turn pipeline
5. backend synthesizes the agent reply to audio
6. frontend plays the returned audio and shows transcript text

## 4) Target User Experience

### Phase 1 Experience
- user taps `Hold to Talk`
- waveform or level meter confirms microphone input
- recording stops on release
- transcript preview appears
- agent reply arrives as:
  - text in the transcript
  - audio playback with a visible speaker state
- learner can replay the last agent audio turn
- fallback path remains available:
  - edit transcript before submit
  - use text input if microphone permissions fail

### Phase 2 Experience
- user can choose voice persona or accent per scenario character
- lower latency between user stop and agent response
- optional auto-play next turn
- optional "tap to interrupt playback" before the next user turn

### Phase 3 Experience
- streaming input/output
- partial transcription while recording
- partial agent speech playback while generation finishes
- barge-in and interruption handling

## 5) Architecture Direction

### Frontend
Add a dedicated voice UI layer in React:
- microphone permission prompt and device selection
- recording control state
- waveform or input-level indicator
- transcript preview and edit-before-send
- playback queue for agent audio
- replay control for last turn

Suggested frontend modules:
- `client/src/components/VoiceComposer.tsx`
- `client/src/components/AudioPlayer.tsx`
- `client/src/lib/audio-capture.ts`
- `client/src/lib/audio-playback.ts`

### Backend
Keep the existing text orchestrator as the source of truth for scenario logic.

Add a voice pipeline around it:
- speech-to-text adapter
- text-to-speech adapter
- voice-specific route handling
- audio file or buffer response handling

Suggested backend modules:
- `server/voice-router.mjs`
- `server/voice-validation.mjs`
- `server/stt.mjs`
- `server/tts.mjs`
- `server/voice-serializers.mjs`

### Shared Contracts
Add additive voice contracts in `shared/contracts.*`:
- `VoiceTurnRequest`
- `VoiceTurnResponse`
- `TranscriptCandidate`
- `VoiceSettings`
- `AudioFormat`

Keep voice endpoints additive. Do not break current text endpoints.

## 6) API Plan

### Phase 1: additive voice endpoint
Add:
- `POST /api/voice/turn`

Suggested request:
- multipart form data or binary upload plus JSON metadata
- fields:
  - `sessionId`
  - `audio`
  - optional `mimeType`
  - optional `language`

Suggested response:
- `transcript`
- `stage`
- `completed`
- `turns`
- `audio` reference or inline payload for the assistant turn
- `source`
- optional `durations`

Alternative split design if easier operationally:
- `POST /api/voice/transcribe`
- `POST /api/voice/speak`

Recommendation:
- start with one server-owned `POST /api/voice/turn` endpoint so the browser has one round-trip and the backend controls ordering

## 7) Provider Strategy
Abstract speech services the same way LLM providers are abstracted.

Needed interfaces:
- speech-to-text provider
- text-to-speech provider

Initial capability requirements:
- Spanish transcription quality
- low enough latency for turn-based conversation
- controllable voice output
- predictable pricing

Do not hard-code one provider into route logic.

## 8) Data and Persistence

### Persist in v1
- final transcript text
- audio metadata:
  - duration
  - mime type
  - whether transcription succeeded
  - whether synthesis succeeded
- optional latency metrics

### Do not persist by default in v1
- raw user audio blobs
- synthesized audio blobs long-term

Reason:
- privacy and storage complexity go up quickly
- text transcript is enough for scoring and progress in the first version

## 9) Safety Rules for Voice
- never speak hidden reasoning or provider metadata
- run the same sanitized text through TTS, not raw provider output
- if synthesis fails, show text and allow replay retry
- if transcription confidence is poor, let the learner edit before submit
- keep a text transcript visible even in voice mode
- maintain scripted fallback when LLM or speech services fail

## 10) Phased Delivery Plan

### Phase 0 - Decisions and technical spikes
Goal: remove uncertainty before UI work.

Deliverables:
- choose STT and TTS provider strategy
- choose audio upload format
- define latency budget
- document privacy defaults in `DECISIONS.md`

Exit criteria:
- provider decision made
- voice API contract draft written
- one local proof-of-concept can transcribe and synthesize a short Spanish turn

### Phase 1 - Push-to-talk MVP
Goal: complete a scenario with voice turns end to end.

Scope:
- microphone capture in browser
- upload one audio turn
- backend transcription
- transcript preview and optional edit
- use existing orchestrator for reply generation
- synthesize assistant reply to audio
- playback in browser

Exit criteria:
- learner can complete at least one full scenario by voice
- transcript stays visible and accurate enough for scoring
- fallback to text works when permissions or providers fail
- analytics capture transcription and synthesis success rates

### Phase 2 - Multi-scenario voice release
Goal: make voice mode a real product surface, not a demo.

Scope:
- support all scenarios and difficulties
- voice toggle in the main UI
- replay last agent turn
- configurable agent voice per character
- improved loading and latency states

Exit criteria:
- restaurant, taxi, and airbnb all work in voice mode
- median turn latency is acceptable for practice
- no major accessibility blockers

### Phase 3 - Voice quality and coaching improvements
Goal: make voice mode more useful for learning, not just more immersive.

Scope:
- pronunciation notes or confidence heuristics
- detect when transcription differs materially from what the learner intended
- better analytics for voice completion and dropout
- optional per-turn transcript confirmation for low confidence

Exit criteria:
- feedback remains coherent for voice sessions
- voice-specific analytics inform retention and quality

### Phase 4 - Realtime conversation mode
Goal: move from turn-based voice to a more natural spoken interaction loop.

Scope:
- streaming transcription
- streaming synthesis
- interruption and barge-in handling
- audio turn state machine
- stronger latency monitoring

Exit criteria:
- stable streaming sessions
- interruption works without corrupting session state
- fallback to turn-based mode remains available

## 11) Milestones and Suggested Order

### M1 - Voice Foundations
- provider decision
- API contract draft
- STT/TTS adapters
- proof-of-concept endpoint

### M2 - Voice MVP
- React recording controls
- `POST /api/voice/turn`
- transcript preview and edit
- assistant audio playback

### M3 - Voice Release Readiness
- analytics and observability
- all scenarios supported
- mobile browser checks
- reliability hardening

### M4 - Realtime R&D
- streaming prototype
- interruption model
- latency optimization

## 12) Suggested Issue Breakdown
- voice provider decision record
- shared voice contracts
- browser microphone capture component
- backend STT adapter
- backend TTS adapter
- `POST /api/voice/turn`
- transcript preview and correction UX
- assistant audio playback and replay
- voice analytics and observability
- mobile browser compatibility pass

## 13) Acceptance Metrics
- first voice reply after user stop feels responsive
- full-scenario completion rate in voice mode is close to text mode
- transcription error rate is low enough that correction is occasional, not constant
- fallback rate is measurable and debuggable
- learners can understand the agent audio without replaying every turn

## 14) Immediate Next Tasks
If voice work starts now, do these first:
1. Write the shared voice contracts in `shared/contracts.*`
2. Add a backend provider abstraction for STT and TTS
3. Build a minimal `POST /api/voice/turn` proof of concept
4. Add a simple React push-to-talk control with transcript preview
5. Add analytics for voice success, latency, and fallback
