import { createFileRoute, Link, Navigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { ArrowLeft, Loader2, Check, X, Sparkles } from "lucide-react";
import { useSession } from "@/store/session";
import { GlassCard } from "@/components/GlassCard";
import { GlowButton } from "@/components/GlowButton";
import { DOMAIN_META, type Domain } from "@/lib/knowledge";
import { generateQuiz, judgeFreeAnswer, type QuizQuestion } from "@/lib/quiz.functions";

export const Route = createFileRoute("/quiz/$domain")({
  head: () => ({ meta: [{ title: "Quiz — IntervAI" }] }),
  component: QuizPage,
});

type Result = {
  question: QuizQuestion;
  pickedIndex: number | null;
  freeAnswer: string;
  judged?: { score: number; verdict: "correct" | "partial" | "incorrect"; feedback: string };
};

function QuizPage() {
  const { session, loading, settings } = useSession();
  const { domain } = Route.useParams();
  const d = domain as Domain;
  const genQuiz = useServerFn(generateQuiz);
  const judge = useServerFn(judgeFreeAnswer);

  const [questions, setQuestions] = useState<QuizQuestion[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [i, setI] = useState(0);
  const [mode, setMode] = useState<"mcq" | "free">("mcq");
  const [picked, setPicked] = useState<number | null>(null);
  const [free, setFree] = useState("");
  const [judging, setJudging] = useState(false);
  const [results, setResults] = useState<Result[]>([]);
  const [revealed, setRevealed] = useState(false);
  const [currentJudge, setCurrentJudge] = useState<Result["judged"] | null>(null);

  useEffect(() => {
    if (loading || !session) return;
    void (async () => {
      const r = await genQuiz({ data: {
        domain: d, count: 5,
        userOpenRouterKey: settings.userOpenRouterKey || undefined,
        useOllama: settings.useOllama,
        ollamaUrl: settings.ollamaUrl,
        ollamaModel: settings.ollamaModel,
      } });
      if (!r.ok) setError(r.error);
      else setQuestions(r.questions);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loading, session]);

  if (loading) return null;
  if (!session) return <Navigate to="/login" />;
  const meta = DOMAIN_META[d];
  if (!meta) return <Navigate to="/dashboard" />;

  async function submit() {
    if (!questions) return;
    const q = questions[i];
    if (mode === "mcq") {
      if (picked === null) return;
      setRevealed(true);
    } else {
      if (!free.trim()) return;
      setJudging(true);
      const r = await judge({ data: {
        domain: d, question: q.question, userAnswer: free,
        referenceExplanation: q.explanation,
        userOpenRouterKey: settings.userOpenRouterKey || undefined,
        useOllama: settings.useOllama,
        ollamaUrl: settings.ollamaUrl,
        ollamaModel: settings.ollamaModel,
      } });
      setJudging(false);
      if (!r.ok) { setError(r.error); return; }
      setCurrentJudge({ score: r.score, verdict: r.verdict, feedback: r.feedback });
      setRevealed(true);
    }
  }

  function next() {
    if (!questions) return;
    const q = questions[i];
    const result: Result = { question: q, pickedIndex: mode === "mcq" ? picked : null, freeAnswer: mode === "free" ? free : "", judged: currentJudge ?? undefined };
    const nextResults = [...results, result];
    setResults(nextResults);
    setPicked(null); setFree(""); setRevealed(false); setCurrentJudge(null); setMode("mcq");
    if (i + 1 >= questions.length) {
      setI(i + 1);
    } else { setI(i + 1); }
  }

  // Results screen
  if (questions && i >= questions.length) {
    const mcqCorrect = results.filter((r) => r.pickedIndex !== null && r.pickedIndex === r.question.correctIndex).length;
    const freeScore = results.filter((r) => r.judged).reduce((a, r) => a + (r.judged?.score || 0), 0);
    const freeCount = results.filter((r) => r.judged).length;
    const total = mcqCorrect * 10 + freeScore;
    const max = results.length * 10;
    const pct = Math.round((total / max) * 100);
    return (
      <div className="min-h-screen p-6 md:p-10">
        <div className="max-w-3xl mx-auto animate-fade-up">
          <div className="font-mono text-xs text-muted-foreground mb-2">// quiz complete</div>
          <h1 className="font-mono text-4xl font-bold mb-4">Score: <span className="text-[var(--cyan)]">{pct}%</span></h1>
          <p className="text-muted-foreground mb-6 font-mono text-sm">
            MCQ: {mcqCorrect}/{results.length - freeCount} correct · Free-form: {freeScore}/{freeCount * 10}
          </p>
          <div className="space-y-3 mb-6">
            {results.map((r, idx) => {
              const correct = r.pickedIndex !== null ? r.pickedIndex === r.question.correctIndex : (r.judged?.verdict === "correct");
              return (
                <GlassCard key={idx} className="!p-4">
                  <div className="flex items-start gap-3">
                    <div className={`p-2 rounded ${correct ? "bg-[color-mix(in_oklch,var(--success)_20%,transparent)] text-[var(--success)]" : "bg-destructive/15 text-destructive"}`}>
                      {correct ? <Check className="h-4 w-4" /> : <X className="h-4 w-4" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-mono text-sm font-semibold">{r.question.question}</div>
                      {r.pickedIndex !== null ? (
                        <div className="text-xs mt-1 text-muted-foreground">
                          Your pick: {r.question.options[r.pickedIndex]} · Correct: <span className="text-[var(--cyan)]">{r.question.options[r.question.correctIndex]}</span>
                        </div>
                      ) : (
                        <div className="text-xs mt-1 text-muted-foreground">
                          Score: <span className="text-[var(--cyan)]">{r.judged?.score}/10</span> · {r.judged?.feedback}
                        </div>
                      )}
                      <div className="text-xs mt-2 text-muted-foreground italic">{r.question.explanation}</div>
                    </div>
                  </div>
                </GlassCard>
              );
            })}
          </div>
          <div className="flex gap-3">
            <Link to="/dashboard"><GlowButton variant="ghost">Dashboard</GlowButton></Link>
            <Link to="/domain/$domain" params={{ domain: d }}><GlowButton>Try Again</GlowButton></Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen p-6 md:p-10">
      <Link to="/domain/$domain" params={{ domain: d }} className="inline-flex items-center gap-2 font-mono text-xs text-muted-foreground hover:text-[var(--cyan)] mb-6">
        <ArrowLeft className="h-4 w-4" /> exit
      </Link>
      <div className="max-w-2xl mx-auto">
        <div className="font-mono text-xs text-muted-foreground mb-2 flex justify-between">
          <span>// {meta.title} quiz</span>
          <span>Q{i + 1}/{questions?.length || 5}</span>
        </div>

        {!questions && !error && (
          <GlassCard className="text-center py-12 animate-fade-up">
            <Loader2 className="h-8 w-8 mx-auto animate-spin text-[var(--cyan)] mb-3" />
            <p className="font-mono text-sm text-muted-foreground cursor-blink">generating questions</p>
          </GlassCard>
        )}

        {error && (
          <GlassCard className="border-destructive/40">
            <p className="font-mono text-sm text-destructive">{error}</p>
            <Link to="/domain/$domain" params={{ domain: d }}><GlowButton className="mt-4">Back</GlowButton></Link>
          </GlassCard>
        )}

        {questions && (
          <GlassCard className="animate-fade-up" key={i}>
            <h2 className="font-mono text-lg font-semibold mb-4">{questions[i].question}</h2>

            <div className="flex gap-1 mb-4 p-1 bg-input rounded-md w-fit">
              {(["mcq", "free"] as const).map((m) => (
                <button key={m} onClick={() => { if (!revealed) setMode(m); }} disabled={revealed}
                  className={`px-3 py-1 font-mono text-[10px] uppercase tracking-wider rounded ${
                    mode === m ? "bg-[var(--cyan)] text-background" : "text-muted-foreground"
                  }`}>{m === "mcq" ? "Multiple Choice" : "Write Your Own"}</button>
              ))}
            </div>

            {mode === "mcq" ? (
              <div className="space-y-2">
                {questions[i].options.map((opt, oi) => {
                  const isCorrect = revealed && oi === questions[i].correctIndex;
                  const isWrong = revealed && picked === oi && oi !== questions[i].correctIndex;
                  return (
                    <button key={oi} onClick={() => !revealed && setPicked(oi)} disabled={revealed}
                      className={`w-full text-left p-3 rounded-md border font-mono text-sm transition-all ${
                        isCorrect ? "border-[var(--success)] bg-[color-mix(in_oklch,var(--success)_15%,transparent)]"
                          : isWrong ? "border-destructive bg-destructive/15"
                          : picked === oi ? "border-[var(--cyan)] bg-[color-mix(in_oklch,var(--cyan)_12%,transparent)]"
                          : "border-border hover:border-[var(--cyan)]/60"
                      }`}>
                      <span className="text-muted-foreground mr-2">[{String.fromCharCode(65 + oi)}]</span>{opt}
                    </button>
                  );
                })}
              </div>
            ) : (
              <textarea value={free} onChange={(e) => setFree(e.target.value)} disabled={revealed} rows={5}
                placeholder="Write your answer here. AI will judge it against the rubric."
                className="w-full p-3 bg-input rounded-md font-mono text-sm border border-border focus:outline-none focus:border-[var(--cyan)] resize-none" />
            )}

            {revealed && (
              <div className="mt-4 p-4 rounded-md glass border-l-2 border-[var(--cyan)] animate-fade-up">
                <div className="font-mono text-[10px] uppercase tracking-wider text-[var(--cyan)] mb-1 flex items-center gap-1">
                  <Sparkles className="h-3 w-3" /> {mode === "free" && currentJudge ? `${currentJudge.verdict} · ${currentJudge.score}/10` : "explanation"}
                </div>
                <div className="text-sm">
                  {mode === "free" && currentJudge ? currentJudge.feedback : questions[i].explanation}
                </div>
              </div>
            )}

            <div className="mt-5 flex justify-end gap-2">
              {!revealed ? (
                <GlowButton onClick={submit} disabled={judging || (mode === "mcq" ? picked === null : !free.trim())}>
                  {judging ? <Loader2 className="h-4 w-4 animate-spin" /> : "Submit"}
                </GlowButton>
              ) : (
                <GlowButton variant="violet" onClick={next}>
                  {i + 1 >= (questions?.length || 0) ? "See Results" : "Next →"}
                </GlowButton>
              )}
            </div>
          </GlassCard>
        )}
      </div>
    </div>
  );
}
