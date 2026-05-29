# IntervAI — Full Project Walkthrough

> This document is the single source of truth for the project. It is written for **another LLM / AI agent** picking up the codebase cold — every architectural decision, file contract, data flow, and known limitation is captured here so you do not need to read every source file to make changes.

---

## 1. What this project is

**IntervAI** is a single-page web app that lets a candidate practice technical interviews with an AI interviewer in 4 domains: **DSA, Spring Boot, System Design, LLD**.

Two modes per domain:
- **Mock Interview** — 5-turn conversational session. Candidate answers via typed text or voice (Web Speech API → transcript). Interviewer replies with text + ElevenLabs TTS audio. Ends with a multi-metric evaluation report.
- **MCQ Quiz** — 5 AI-generated multiple-choice questions. Each question also exposes a "Write your own answer" path where the LLM judges the free-form answer against a rubric and returns `{score 0-10, correct, feedback}`.

Visual identity: **glassmorphism cyber** — dark `#0a0a0f` background, animated grid, frosted cards (`backdrop-blur-xl bg-white/5`), cyan `#00f5ff` + violet `#7c3aed` accents, JetBrains Mono headings, Inter body.

---

## 2. Stack & runtime

| Layer | Choice |
|---|---|
| Framework | TanStack Start v1 (file-based routing under `src/routes/`) |
| UI runtime | React 19 |
| Build | Vite 7 + Bun |
| Styling | Tailwind CSS v4, design tokens (`oklch`) in `src/styles.css` |
| Icons | `lucide-react` |
| Auth | Supabase email/password via Lovable Cloud (`src/integrations/supabase/client.ts`) |
| Server logic | TanStack `createServerFn` — **never** Supabase Edge Functions on this stack |
| LLM | OpenRouter free tier with 4-model failover, 50s global deadline |
| TTS | ElevenLabs (server-side, returns base64 MP3) |
| ASR | Browser-native Web Speech API (no server cost) |

**Hard rule:** every API call that uses a secret happens inside a `createServerFn` handler. Secrets are read from `process.env` *inside* the handler — never at module scope and never with `VITE_` prefix.

---

## 3. Directory map (only meaningful files)

```
src/
├── routes/
│   ├── __root.tsx           Shell: fonts (Google), GridBackground, Toaster, <Outlet/>
│   ├── index.tsx            Redirect: → /dashboard if signed in, → /login otherwise
│   ├── login.tsx            Glass auth form (signin/signup toggle) + admin bypass
│   ├── dashboard.tsx        4 domain cards, settings gear, logout
│   ├── domain.$domain.tsx   Mode selector (Interview vs Quiz)
│   ├── interview.$domain.tsx Conversational interview UI
│   ├── quiz.$domain.tsx     MCQ + free-answer UI
│   └── evaluation.tsx       Score rings + strengths/weaknesses/transcript
├── knowledge/
│   ├── dsa.md  springboot.md  system_design.md  lld.md
│   └─ (each file: 15 Q&A entries + rubric notes, ~6KB)
├── lib/
│   ├── knowledge.ts         ?raw imports + Domain type + DOMAIN_META + verifyKnowledge()
│   ├── llm.functions.ts     callOpenRouter — 4-model failover, 50s deadline
│   ├── tts.functions.ts     synthesizeSpeech — ElevenLabs → base64 MP3
│   ├── quiz.functions.ts    generateQuiz, judgeFreeAnswer
│   └── evaluate.functions.ts nextInterviewerTurn, evaluateInterview
├── components/
│   ├── GlassCard.tsx        Frosted card primitive
│   ├── GlowButton.tsx       Cyan-glow CTA button
│   ├── GridBackground.tsx   Animated grid + drifting gradient blobs
│   ├── ScoreRing.tsx        SVG circular progress (used on evaluation page)
│   └── SettingsModal.tsx    Tabs: AI Engine / Voice / About
├── store/
│   └── session.tsx          React Context: Supabase session + Settings (localStorage)
├── integrations/supabase/   (auto-generated, do not edit)
│   ├── client.ts            Browser client (publishable key)
│   ├── client.server.ts     Admin client (service role) — server only
│   ├── auth-middleware.ts   requireSupabaseAuth
│   └── auth-attacher.ts     attaches Bearer token to serverFn RPCs
└── styles.css               oklch tokens + base styles
```

---

## 4. Routing

File-based — flat dot-separated names map to URL segments:

| File | URL |
|---|---|
| `index.tsx` | `/` (redirect) |
| `login.tsx` | `/login` |
| `dashboard.tsx` | `/dashboard` |
| `domain.$domain.tsx` | `/domain/:domain` |
| `interview.$domain.tsx` | `/interview/:domain` |
| `quiz.$domain.tsx` | `/quiz/:domain` |
| `evaluation.tsx` | `/evaluation` |

`:domain` is typed as `"dsa" | "springboot" | "system_design" | "lld"` (the `Domain` type in `src/lib/knowledge.ts`).

**Auth guard:** there is no `_authenticated` layout route. Instead, each protected page calls `useSession()` and redirects to `/login` if `session` is null and `loading` is false. The admin bypass (see §8) sets a fake session that satisfies this check without touching Supabase.

---

## 5. Auth & session store (`src/store/session.tsx`)

`SessionProvider` (mounted in `__root.tsx`) exposes:

```ts
{
  session: Session | null,
  loading: boolean,
  settings: Settings,
  setSettings: (partial) => void,
  signOut: () => Promise<void>,
}
```

`Settings` (persisted in `localStorage` under `intervai:settings`):

```ts
{
  voice: boolean,              // master TTS toggle
  voiceId: string,             // ElevenLabs voice ID (default: EXAVITQu4vr4xnSDxMaL "Sarah")
  useOllama: boolean,          // UI toggle — NOT yet wired in llm.functions.ts
  ollamaUrl: string,           // for future Ollama branch
  ollamaModel: string,
  userOpenRouterKey: string,   // overrides env key when present
}
```

**Admin bypass:** if `localStorage["intervai:admin"] === "1"`, the provider synthesises a fake `Session` (`user.id = "admin-local"`, `user.email = "admin@intervai.local"`) without calling Supabase. `signOut()` clears that key before calling `supabase.auth.signOut()`.

The login page sets the flag when the user types `admin` / `admin123`:

```ts
// src/routes/login.tsx submit handler
if (email === "admin" && password === "admin123") {
  localStorage.setItem("intervai:admin", "1");
  navigate({ to: "/dashboard" });
  return;
}
```

The hint is **not visible in the UI** (intentional — documented in README only).

---

## 6. Knowledge base

Each domain has a markdown file in `src/knowledge/` with ~15 Q&A entries and rubric notes. They are imported via Vite's `?raw` suffix:

```ts
// src/lib/knowledge.ts
import dsaData from "../knowledge/dsa.md?raw";
// ...
export const knowledgeBase: Record<Domain, string> = { dsa: dsaData, ... };
```

`verifyKnowledge()` does a sanity check (length > 500) and logs per-domain status. Called once at app boot for debugging.

**When the LLM is prompted, the first ~6000 chars of the domain's knowledge string are injected into the system prompt.** This is the entire "RAG" — there is no vector DB, no chunking, no embeddings. The corpus is small enough to fit in context.

---

## 7. Server functions — contracts

All server fns live in `src/lib/*.functions.ts`. They are called from the client via `useServerFn(fn)` or directly inside event handlers. The auth attacher (`src/integrations/supabase/auth-attacher.ts`) auto-injects the bearer token, but **none of these server fns require auth** (they're protected at the route level instead — admin bypass works seamlessly).

### 7.1 `callOpenRouter` (`src/lib/llm.functions.ts`)

```ts
input: {
  messages: { role: "system"|"user"|"assistant", content: string }[],
  jsonMode?: boolean,           // sets response_format: { type: "json_object" }
  userOpenRouterKey?: string,   // overrides process.env.OPENROUTER_API_KEY
  temperature?: number,         // default 0.6
}
returns:
  | { ok: true, text: string, modelUsed: string }
  | { ok: false, error: "NO_KEY"|"CHAIN_EXHAUSTED", message: string, detail?: string }
```

**Failover order** (all free tier):
1. `meta-llama/llama-3.1-8b-instruct:free`
2. `mistralai/mistral-7b-instruct:free`
3. `google/gemma-2-9b-it:free`
4. `qwen/qwen-2-7b-instruct:free`

Per-model timeout: 12s. Global deadline: 50s from start. On HTTP 429 / 5xx / empty response, continues to the next model. On chain exhaustion, returns `CHAIN_EXHAUSTED` with a friendly message suggesting the user switch to Ollama or paste their own key.

**Ollama branch is NOT wired here yet.** The Settings toggle exists; to enable, add a check at the top of the handler:

```ts
if (settings.useOllama) {
  // POST to `${settings.ollamaUrl}/api/chat`
  // body: { model: settings.ollamaModel, messages, stream: false }
  // map response → { ok: true, text: ... }
}
```

Pass `settings` through from the caller (currently only `userOpenRouterKey` is plumbed through).

### 7.2 `nextInterviewerTurn` (`src/lib/evaluate.functions.ts`)

```ts
input: { domain, history: {role: "interviewer"|"candidate", content}[], questionIndex, userOpenRouterKey? }
returns: { ok: true, text } | { ok: false, error }
```

Builds an interviewer persona prompt + the domain KB + the conversation history, calls `callOpenRouter`. Q#5 is the wrap-up turn.

### 7.3 `evaluateInterview` (`src/lib/evaluate.functions.ts`)

```ts
input: { domain, transcript, userOpenRouterKey? }
returns: { ok: true, evaluation: Evaluation } | { ok: false, error }

type Evaluation = {
  overallScore: number,         // 0-100
  technicalDepth: number,       // 0-100
  communication: number,        // 0-100
  problemSolving: number,       // 0-100
  strengths: string[],
  weaknesses: string[],
  recommendations: string[],
  summary: string,
}
```

Uses `jsonMode: true` + low temperature. Parses with try/catch — returns a `Failed to parse evaluation` error if the model emits invalid JSON.

### 7.4 `generateQuiz` & `judgeFreeAnswer` (`src/lib/quiz.functions.ts`)

```ts
generateQuiz({ domain, userOpenRouterKey? }) → {
  ok: true, questions: { id, question, options: string[4], correctIndex, explanation, rubric }[]
}

judgeFreeAnswer({ domain, question, rubric, answer, userOpenRouterKey? }) → {
  ok: true, score: 0-10, correct: boolean, feedback: string
}
```

`generateQuiz` retries once on JSON parse failure, then surfaces a toast.

### 7.5 `synthesizeSpeech` (`src/lib/tts.functions.ts`)

```ts
input: { text: string, voiceId?: string }
returns: { ok: true, audioBase64: string } | { ok: false, error }
```

Calls ElevenLabs `/v1/text-to-speech/{voiceId}`. If `ELEVENLABS_API_KEY` is missing, returns `{ ok: false, error: "NO_KEY" }` silently — the UI skips audio and shows a one-time toast.

The client decodes base64 → Blob → `new Audio(URL.createObjectURL(blob))` and plays via an `onended`-chained queue so multi-sentence replies play sequentially.

---

## 8. Page-by-page flow

### `/login`
- Toggle Sign In / Sign Up. Email + password (text input, not `email`, so `admin` works).
- On submit: admin bypass check first → Supabase `signInWithPassword` or `signUp`.
- Helper text reads: "4 domains · TTS model" (intentionally vendor-agnostic).

### `/dashboard`
- Renders 4 `GlassCard`s for the domains (icons + tagline from `DOMAIN_META`).
- Top-right: AI status dot (green if any server fn succeeded recently), Settings gear → `SettingsModal`, Logout.
- Click a card → `navigate({ to: "/domain/$domain", params })`.

### `/domain/:domain`
- Two large glass cards: **Mock Interview** vs **MCQ Quiz**. Routes to `/interview/$domain` or `/quiz/$domain`.

### `/interview/:domain`
- Chat-style UI. Local state: `messages: {role, content}[]`, `questionIndex`, `inputMode: "TEXT"|"VOICE"`.
- On mount: calls `nextInterviewerTurn` with empty history → interviewer's greeting + Q1, queues TTS audio.
- Candidate answers (text submit or voice via Web Speech API — falls back to text if `window.SpeechRecognition` is missing).
- After each candidate turn: calls `nextInterviewerTurn` again with updated history. After Q5 or on "End session & evaluate" button: pushes transcript into the `session` store and `navigate({ to: "/evaluation" })`.

### `/quiz/:domain`
- On mount: `generateQuiz({ domain })`. Shows "Question N of 5" + progress bar.
- Each question: 4 option buttons + "✍ Write your own answer instead" toggle.
- On MCQ pick: locks, color-codes (green/red), reveals explanation, plays TTS.
- On free-answer submit: `judgeFreeAnswer` → renders score + verdict + feedback.
- "Next" advances. Final screen: total score + per-question breakdown.

### `/evaluation`
- Reads transcript from session store. Redirects to `/dashboard` if empty.
- Calls `evaluateInterview` on mount → shows 4 `ScoreRing`s (overall + 3 metrics), three bulleted lists (strengths / weaknesses / recommendations), summary paragraph, expandable transcript accordion.
- Buttons: **Retry Domain** / **Back to Dashboard**.

---

## 9. Design tokens

`src/styles.css`:

```css
:root {
  --background: oklch(0.08 0.02 270);     /* #0a0a0f-ish */
  --foreground: oklch(0.95 0.02 200);
  --primary: oklch(0.78 0.18 200);        /* cyan #00f5ff */
  --accent: oklch(0.55 0.25 290);         /* violet #7c3aed */
  --glow-cyan: 0 0 40px oklch(0.78 0.18 200 / 0.4);
  --glass: 0 1px 0 oklch(1 0 0 / 0.05) inset, 0 0 0 1px oklch(1 0 0 / 0.08);
  /* ... */
}
```

Use semantic Tailwind classes: `bg-background`, `text-foreground`, `border-border`, `text-primary`, `shadow-[var(--glow-cyan)]`. **Never hardcode colors in components** — add a new token first.

Fonts loaded via Google Fonts CDN in `__root.tsx`:
- Display / mono: **JetBrains Mono**
- Body: **Inter**

Animations: simple CSS keyframes (`fadeUp 300ms`, gradient blob drift) — no framer-motion to keep bundle lean.

---

## 10. Error handling matrix

| Failure | Surfaced as |
|---|---|
| Knowledge file missing/short | Red banner on dashboard card, card disabled |
| OpenRouter `NO_KEY` | Toast: "Add an OpenRouter key in Settings" |
| OpenRouter `CHAIN_EXHAUSTED` | Toast: "Cloud AI rate-limited. Try again or switch to Ollama." |
| ElevenLabs `NO_KEY` | Silent skip + one-time toast on first attempt |
| Quiz JSON parse fail | Retried once, then toast |
| Web Speech API unsupported | Voice button disabled, hint to use text mode |
| Empty transcript on `/evaluation` | Redirect to `/dashboard` |

There are **no unhandled promise rejections in any user flow** — every server fn returns `{ ok: true, ... } | { ok: false, error, message }` and callers branch on `.ok`.

---

## 11. Known gaps & next steps

These are intentional or pending; safe to extend:

1. **Ollama branch in `callOpenRouter`** — Settings toggle exists, server fn does not yet check it. ~20 lines (see §7.1).
2. **Streaming responses** — currently all LLM calls are non-streaming. For better UX, swap `streamText` from the AI SDK and stream into the chat bubble.
3. **Persistence** — interview transcripts live in React state only. To save history, add a `sessions` table in Supabase and write from a `createServerFn` after evaluation completes.
4. **Tests** — none. Add Vitest if you want CI.
5. **Admin bypass** — remove before public launch (delete the `intervai:admin` check in `session.tsx` and the credential check in `login.tsx`).
6. **Quiz domain prompts could be tightened** — sometimes the LLM picks options that are too obviously wrong. Adjust the system prompt in `generateQuiz`.

---

## 12. Environment / secrets

Server-side only (read inside server fn handlers):
- `OPENROUTER_API_KEY` — required for any LLM call (unless user pastes their own in Settings)
- `ELEVENLABS_API_KEY` — optional; TTS gracefully degrades when absent

Client-side (already in `.env`, safe to ship):
- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_PUBLISHABLE_KEY`
- `VITE_SUPABASE_PROJECT_ID`

The Supabase service-role key is **never** required — there are no privileged DB operations in this project.

---

## 13. Conventions for future edits

- **Never edit** `src/integrations/supabase/client.ts`, `client.server.ts`, `auth-middleware.ts`, `auth-attacher.ts`, `types.ts`, `.env`, `supabase/config.toml` (auto-generated).
- **Never edit** `src/routeTree.gen.ts` — Vite plugin regenerates it.
- New page → create `src/routes/<name>.tsx` with `createFileRoute("/<name>")`. The route tree regenerates automatically.
- New server fn → create `src/lib/<name>.functions.ts`. Use `createServerFn({ method: "POST" }).inputValidator(zod).handler(async ({data}) => ...)`. Read secrets *inside* the handler.
- New UI primitive → add to `src/components/`, style with design tokens only.
- Domain knowledge change → edit the markdown file. No rebuild step needed beyond Vite HMR.

---

End of walkthrough. If something here is out of date, fix the doc in the same PR as the code change.
