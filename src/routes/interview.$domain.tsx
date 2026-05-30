import { createFileRoute, Link, Navigate, useNavigate } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { ArrowLeft, Mic, MicOff, Send, Loader2, Volume2, VolumeX, Square } from "lucide-react";
import { useSession } from "@/store/session";
import { GlassCard } from "@/components/GlassCard";
import { GlowButton } from "@/components/GlowButton";
import { DOMAIN_META, type Domain } from "@/lib/knowledge";
import { nextInterviewerTurn } from "@/lib/evaluate.functions";

export const Route = createFileRoute("/interview/$domain")({
  head: () => ({ meta: [{ title: "Interview — IntervAI" }] }),
  component: InterviewPage,
});

type Turn = { role: "interviewer" | "candidate"; content: string };

function InterviewPage() {
  const { session, loading, settings } = useSession();
  const { domain } = Route.useParams();
  const d = domain as Domain;
  const navigate = useNavigate();
  const nextTurn = useServerFn(nextInterviewerTurn);
  // TTS is called directly from the browser — no server hop needed, simpler and more reliable

  const [transcript, setTranscript] = useState<Turn[]>([]);
  const [input, setInput] = useState("");
  const [thinking, setThinking] = useState(false);
  const [inputMode, setInputMode] = useState<"voice" | "text">("text");
  const [listening, setListening] = useState(false);
  const [speaking, setSpeaking] = useState(false);
  // Derive muted from settings.voice so toggling voice in Settings takes effect immediately
  const muted = !settings.voice;
  const [questionIndex, setQuestionIndex] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [started, setStarted] = useState(false); // requires user click for autoplay policy

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const recognitionRef = useRef<any>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const startedRef = useRef(false);

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: "smooth" }); }, [transcript, thinking]);

  // Start interview — only after user clicks (required for browser autoplay policy)
  useEffect(() => {
    if (!started || loading || !session || startedRef.current) return;
    startedRef.current = true;
    void ask([]);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [started, loading, session]);

  async function speak(text: string) {
    if (muted) return;
    setSpeaking(true);

    // Cancel any pending browser TTS first so extensions can't stack on top of ElevenLabs
    if (typeof window !== "undefined" && window.speechSynthesis) {
      window.speechSynthesis.cancel();
    }

    // Priority: 1) User's own key from Settings, 2) Global key baked in at build time from Render env var
    const key = settings.userElevenLabsKey?.trim() || (typeof __ELEVENLABS_API_KEY__ !== "undefined" ? __ELEVENLABS_API_KEY__ : "") || "";
    console.log(`[TTS] using key prefix=${key.slice(0,8)||"(none)"}`);

    if (key) {
      try {
        const voiceId = (settings.voiceId || "EXAVITQu4vr4xnSDxMaL").trim();
        const res = await fetch(
          `https://api.elevenlabs.io/v1/text-to-speech/${voiceId}?output_format=mp3_44100_128`,
          {
            method: "POST",
            headers: { "xi-api-key": key, "Content-Type": "application/json" },
            body: JSON.stringify({
              text,
              model_id: "eleven_turbo_v2_5",
              voice_settings: { stability: 0.5, similarity_boost: 0.75 },
            }),
          }
        );
        if (res.ok) {
          const blob = await res.blob();
          const url = URL.createObjectURL(blob);
          const audio = new Audio(url);
          audioRef.current = audio;
          audio.onended = () => { setSpeaking(false); URL.revokeObjectURL(url); };
          audio.onerror = (e) => {
            console.error("[TTS] Audio element error:", e);
            setSpeaking(false); URL.revokeObjectURL(url); fallbackTTS(text);
          };
          try {
            await audio.play();
            audio.onerror = null; // ← clear so a late Chrome onerror doesn't double-trigger browser TTS
            return;
          } catch (playErr) {
            console.error("[TTS] audio.play() failed:", playErr);
            URL.revokeObjectURL(url);
          }
        } else {
          const err = await res.text();
          console.warn(`[TTS] ElevenLabs HTTP ${res.status}:`, err.slice(0, 200));
        }
      } catch (e) {
        console.error("[TTS] ElevenLabs fetch error:", e);
      }
    }

    // Fallback to browser TTS if no key or ElevenLabs failed
    fallbackTTS(text);
  }

  function fallbackTTS(text: string) {
    if (!window.speechSynthesis) {
      setSpeaking(false);
      return;
    }
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = "en-US";
    utterance.onend = () => setSpeaking(false);
    utterance.onerror = () => setSpeaking(false);
    window.speechSynthesis.speak(utterance);
  }

  function stopSpeaking() {
    audioRef.current?.pause();
    audioRef.current = null;
    if (window.speechSynthesis) window.speechSynthesis.cancel();
    setSpeaking(false);
  }

  async function ask(history: Turn[]) {
    setThinking(true);
    setError(null);
    try {
      const r = await nextTurn({ data: {
        domain: d, history, questionIndex,
        userOpenRouterKey: settings.userOpenRouterKey || undefined,
        useOllama: settings.useOllama,
        ollamaUrl: settings.ollamaUrl,
        ollamaModel: settings.ollamaModel,
      } });
      if (!r.ok) { setError(r.error); setThinking(false); return; }
      const next: Turn = { role: "interviewer", content: r.text };
      setTranscript((t) => [...t, next]);
      setQuestionIndex((q) => q + 1);
      void speak(r.text);
    } catch (e) {
      setError((e as Error).message);
    } finally { setThinking(false); }
  }

  function submitAnswer() {
    const text = input.trim();
    if (!text || thinking) return;
    const newTurn: Turn = { role: "candidate", content: text };
    const next = [...transcript, newTurn];
    setTranscript(next);
    setInput("");
    if (questionIndex >= 5) {
      navigate({ to: "/evaluation", search: { domain: d } as any, state: { transcript: next } as any });
      return;
    }
    void ask(next);
  }

  function toggleListen() {
    const SR: any = (window as any).webkitSpeechRecognition || (window as any).SpeechRecognition;
    if (!SR) {
      const isFirefox = navigator.userAgent.toLowerCase().includes("firefox");
      setError(
        isFirefox
          ? "Voice input is not supported in Firefox. Please use Google Chrome or Microsoft Edge for voice mode, or use text mode below."
          : "Speech recognition is not supported in this browser. Please use Google Chrome or Microsoft Edge for voice mode, or type your answer below."
      );
      setInputMode("text");
      return;
    }
    if (listening) {
      recognitionRef.current?.stop();
      setListening(false);
      return;
    }
    const rec = new SR();
    rec.continuous = false;
    rec.interimResults = true;
    rec.lang = "en-US";
    rec.onresult = (e: any) => {
      let interim = ""; let final = "";
      for (let i = e.resultIndex; i < e.results.length; i++) {
        const t = e.results[i][0].transcript;
        if (e.results[i].isFinal) final += t; else interim += t;
      }
      setInput((prev) => (final ? (prev + " " + final).trim() : prev || interim));
    };
    rec.onend = () => setListening(false);
    rec.onerror = (e: any) => {
      setListening(false);
      if (e.error === "not-allowed") {
        setError("Microphone access denied. Please allow microphone access in your browser settings.");
      }
    };
    recognitionRef.current = rec;
    rec.start();
    setListening(true);
  }

  function finish() {
    navigate({ to: "/evaluation", search: { domain: d } as any, state: { transcript } as any });
  }

  if (loading) return null;
  if (!session) return <Navigate to="/login" />;
  const meta = DOMAIN_META[d];
  if (!meta) return <Navigate to="/dashboard" />;

  // Click-to-start screen: required so browser grants autoplay permission for ElevenLabs audio
  if (!started) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-6 p-8">
        <div className="glass-strong rounded-2xl p-10 max-w-md w-full text-center space-y-6">
          <div className="font-mono text-[var(--cyan)] text-2xl">{meta.title}</div>
          <p className="font-mono text-sm text-muted-foreground">You will be asked 5 questions. Answer verbally or by typing. The AI interviewer will speak each question aloud.</p>
          <GlowButton className="w-full text-lg py-4" onClick={async () => {
            // Unlock AudioContext in Chrome — must happen inside a click handler
            try { const ctx = new AudioContext(); await ctx.resume(); ctx.close(); } catch {}
            setStarted(true);
          }}>
            Begin Interview
          </GlowButton>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen p-4 md:p-8 flex flex-col">
      <header className="flex items-center justify-between mb-4">
        <Link to="/domain/$domain" params={{ domain: d }} className="inline-flex items-center gap-2 font-mono text-xs text-muted-foreground hover:text-[var(--cyan)]">
          <ArrowLeft className="h-4 w-4" /> exit
        </Link>
        <div className="font-mono text-xs text-muted-foreground">
          {meta.title} · Q{Math.min(questionIndex, 5)}/5
        </div>
        <div className="flex gap-2">
          <GlowButton variant="ghost" size="sm" onClick={() => { setSettings({ voice: muted }); if (!muted) stopSpeaking(); }}>
            {muted ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
          </GlowButton>
          {speaking && (
            <GlowButton variant="ghost" size="sm" onClick={stopSpeaking}>
              <Square className="h-4 w-4" />
            </GlowButton>
          )}
        </div>
      </header>

      <div className="flex-1 max-w-3xl w-full mx-auto flex flex-col">
        <div className="flex-1 overflow-auto space-y-3 pb-4">
          {transcript.map((t, i) => (
            <div key={i} className={`flex ${t.role === "candidate" ? "justify-end" : "justify-start"} animate-fade-up`}>
              <div className={`max-w-[85%] p-4 rounded-2xl font-mono text-sm ${
                t.role === "interviewer"
                  ? "glass border-l-2 border-[var(--cyan)]"
                  : "bg-[color-mix(in_oklch,var(--violet)_18%,transparent)] border border-[color-mix(in_oklch,var(--violet)_40%,transparent)]"
              }`}>
                <div className="text-[10px] uppercase tracking-wider mb-1 opacity-60">
                  {t.role === "interviewer" ? "interviewer" : "you"}
                  {t.role === "interviewer" && speaking && i === transcript.length - 1 && (
                    <span className="ml-2 inline-flex gap-0.5 items-end">
                      {[0,1,2,3].map((b) => (
                        <span key={b} className="w-0.5 bg-[var(--cyan)] inline-block"
                          style={{ height: 10, animation: `waveform 0.${5+b}s ease-in-out infinite`, animationDelay: `${b*0.1}s`, transformOrigin: "bottom" }} />
                      ))}
                    </span>
                  )}
                </div>
                <div className="whitespace-pre-wrap">{t.content}</div>
              </div>
            </div>
          ))}
          {thinking && (
            <div className="flex items-center gap-2 text-muted-foreground font-mono text-xs animate-fade-up">
              <Loader2 className="h-3 w-3 animate-spin" /> thinking<span className="cursor-blink"></span>
            </div>
          )}
          {error && (
            <div className="font-mono text-xs text-destructive p-3 rounded bg-destructive/10 border border-destructive/30">{error}</div>
          )}
          <div ref={bottomRef} />
        </div>

        <GlassCard className="!p-4 mt-2">
          <div className="flex gap-1 mb-3 p-1 bg-input rounded-md w-fit">
            {(["text", "voice"] as const).map((m) => (
              <button key={m} onClick={() => setInputMode(m)}
                className={`px-3 py-1 font-mono text-[10px] uppercase tracking-wider rounded ${
                  inputMode === m ? "bg-[var(--cyan)] text-background" : "text-muted-foreground"
                }`}>{m}</button>
            ))}
          </div>
          <div className="flex gap-2 items-end">
            <textarea value={input} onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); submitAnswer(); } }}
              placeholder={inputMode === "voice" ? (listening ? "listening..." : "press mic and speak") : "type your answer..."}
              rows={2}
              className="flex-1 px-3 py-2 bg-input rounded-md font-mono text-sm border border-border focus:outline-none focus:border-[var(--cyan)] resize-none" />
            {inputMode === "voice" && (
              <GlowButton variant={listening ? "danger" : "violet"} onClick={toggleListen} disabled={thinking}
                className={listening ? "animate-pulse-ring" : ""}>
                {listening ? <MicOff className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
              </GlowButton>
            )}
            <GlowButton onClick={submitAnswer} disabled={!input.trim() || thinking}>
              <Send className="h-4 w-4" />
            </GlowButton>
          </div>
          {transcript.length >= 2 && (
            <div className="mt-3 text-right">
              <button onClick={finish} className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground hover:text-[var(--cyan)]">
                end session & evaluate →
              </button>
            </div>
          )}
        </GlassCard>
      </div>
    </div>
  );
}
