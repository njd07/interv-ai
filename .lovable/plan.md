# IntervAI — Build Plan

## Scope adjustments from your answers

- **Knowledge base**: I'll author all 60 questions (15 × 4 domains) + rubrics statically in markdown files.
- **Quiz mode**: each question gets the 4 MCQ options **plus** a "Write your own answer" path — LLM judges free-form answers against the rubric and returns a score + explanation.
- **Voice prep mode**: every turn offers both a mic button and a text input — user picks per turn.
- **Auth**: simple animated login/register page (glassmorphism cyber) using Lovable Cloud (email + password). No profile table needed unless you want one later.
- **Keys**: OpenRouter + ElevenLabs stored as Lovable Cloud secrets (server-side) — never shipped to the browser. Ollama toggle remains in Settings for users who want to run locally.

## Architecture

```text
src/
  routes/
    __root.tsx                  glass theme shell, fonts, toaster
    login.tsx                   animated glass login/register
    _authenticated.tsx          guard → redirects to /login
    _authenticated/index.tsx    Dashboard (4 domain cards)
    _authenticated/$domain.tsx  Mode selector
    _authenticated/$domain.voice.tsx   Voice/Text interview
    _authenticated/$domain.quiz.tsx    MCQ + free-answer quiz
    _authenticated/$domain.results.tsx Evaluation dashboard
    api/public/                 (none — all AI via server fns)
  knowledge/
    dsa.md  springboot.md  system_design.md  lld.md
  lib/
    knowledge.ts                raw ?raw imports + integrity check
    llm.functions.ts            server fn: callLLM (OpenRouter failover or Ollama passthrough)
    tts.functions.ts            server fn: ElevenLabs TTS → returns base64 mp3
    quiz.functions.ts           server fn: generate MCQs (with retry) + judge free answer
    evaluate.functions.ts       server fn: produce strengths/improvements/summary JSON
  components/
    GlassCard, GlowButton, GridBackground, ScoreRing, AudioQueue hook,
    MicButton (Web Speech API + text fallback), SettingsModal, ChatBubble
  store/
    session.tsx                 React Context: domain, mode, conversation, quiz, eval, settings
```

## Visual system (glassmorphism cyber)

- BG `#0a0a0f` with animated gradient mesh (cyan `#00f5ff` + violet `#7c3aed` blobs, slow drift)
- Frosted cards: `backdrop-blur-xl bg-white/5 border border-white/10`, cyan glow on hover
- Fonts: JetBrains Mono (headings/scores), Inter (body) — via Google Fonts in `__root.tsx`
- All view transitions: 300ms fade + translateY(12px→0), staggered children (50ms)
- Tokens added to `src/styles.css` (oklch) — no hardcoded colors in components

## Login / Register

- Single page, toggle between Sign In / Sign Up
- Animated grid background + floating glass card, typewriter "> IntervAI //  authenticate_" header
- Lovable Cloud email/password auth (`signUp` with `emailRedirectTo`, `signInWithPassword`)
- After auth → `/` (Dashboard)

## Dashboard

- 4 domain cards (DSA, Spring Boot, System Design, LLD) — Lucide icons, glow border, stagger-in
- Top-right: AI status dot (green/red from health check), Settings gear, Logout

## Mode selector → Voice Prep / Quiz

- Two large glass cards with descriptions and ~10 min estimate

## Voice Prep mode

- Chat UI with cyan-glow "IntervAI" avatar
- **Per turn**: user chooses mic OR textarea (both visible). Mic uses Web Speech API with live interim transcript; falls back to text input if unsupported
- Server fn `callLLM` injects domain knowledge + interviewer persona, asks 5 questions, scores each `[Score: X/10]`, ends with `INTERVIEW_COMPLETE`
- Every AI message → TTS queue (server fn returns base64 mp3, client plays sequentially via `audio.onended`)
- Waveform pulse on avatar while audio plays

## Quiz mode (MCQ + free-answer)

- Server fn generates 5 MCQs from knowledge (strict JSON, one retry, toast on second failure)
- Each question card shows:
  - 4 option buttons
  - "✍ Write your own answer instead" → expands textarea + Submit
  - On MCQ pick: lock, color-code, reveal explanation, TTS auto-play
  - On free-answer submit: server fn judges against rubric → returns `{ score: 0-10, correct: bool, feedback }` rendered same way
- Progress `Question N of 5`, Next button advances

## Evaluation Dashboard

- Animated circular ring (overall /100)
- 3 metric bars (Technical Accuracy, Communication Clarity, Domain Mastery) — 800ms fill
- LLM-generated `strengths[]` + `improvements[]` (JSON via structured output)
- 4–5 sentence summary → TTS auto-play on mount + Replay button
- Buttons: Retry Domain / Back to Dashboard

## Server functions (all in TanStack Start)

1. `callLLM({ system, messages, mode })` — routes to OpenRouter (your key as secret) with 3-model failover (Llama 3 / Mistral / Gemma free tier), 5s per-model + 50s global timeout. Returns `{ text }` or throws coded error.
2. `generateQuiz({ domain })` — calls LLM with strict JSON instruction, parses, retries once.
3. `judgeFreeAnswer({ domain, question, answer, rubric })` — returns `{ score, correct, feedback }`.
4. `evaluateSession({ conversation })` — returns `{ strengths, improvements, summary, metrics }`.
5. `tts({ text })` — calls ElevenLabs (voice `EXAVITQu4vr4xnSDxMaL`), returns base64 mp3. Silent skip if key missing.

Ollama mode: if user toggles in Settings, server fn proxies to a user-supplied URL (defaults to `http://localhost:11434`) — note this only works if the user runs the app locally; documented in README.

## Error handling (all from spec)

- Knowledge load failures → red banner per domain, card disabled
- TTS missing key → silent skip + one-time toast
- Quiz JSON parse fail → retry then toast
- OpenRouter chain exhausted → dismissible toast suggesting Ollama
- Web Speech unsupported → text input fallback with note
- No crashes under any condition

## Docs

- `README.md` (setup, Ollama instructions for Windows + Fedora, configuration)
- `WALKTHROUGH.md` (architecture, knowledge injection, LLM routing, audio queue)

## Build order

1. store the ElevenLabs + OpenRouter keys as secrets and store in a env file so that i can edit it later using a local ide too, while pushing to github i will put this in gitignore
2. also put the option to put openrouter api key for other user so they can use it, or put the option for ollama which the user has to set it up by himself, so one should able to put any openrouter key and it should work and also make sure to make it multiple model like use multiple free model, if one doesnt answer and give error then dont show the error instead just wait and change the model and wait do this for like around 50 seconds if none model reponds then give error for this like rate limitation error  
3. Theme tokens, fonts, glass primitives, animated background
4. Login/register page + auth guard
5. Knowledge `.md` files (full content) + loader
6. Dashboard + Mode selector + Settings modal
7. Server fns (llm, tts, quiz, evaluate)
8. Quiz mode (MCQ + free-answer)
9. Voice/Text interview mode with audio queue
10. Evaluation dashboard
11. README + WALKTHROUGH

## Technical notes for you

- store the api keys in a env file
- Lovable AI Gateway (Gemini, GPT) is available with zero setup — I can swap to it later if you want even simpler ops.
- Email confirmation in Lovable Cloud auth defaults to ON; I'll set it OFF for hackathon speed unless you say otherwise.

Approve to start building.