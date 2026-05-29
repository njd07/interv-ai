import { createFileRoute, Link, Navigate, useRouter } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { Loader2, TrendingUp, TrendingDown, Lightbulb } from "lucide-react";
import { z } from "zod";
import { useSession } from "@/store/session";
import { GlassCard } from "@/components/GlassCard";
import { GlowButton } from "@/components/GlowButton";
import { ScoreRing } from "@/components/ScoreRing";
import { DOMAIN_META, type Domain } from "@/lib/knowledge";
import { evaluateInterview, type Evaluation } from "@/lib/evaluate.functions";

const SearchSchema = z.object({ domain: z.enum(["dsa", "springboot", "system_design", "lld"]) });

export const Route = createFileRoute("/evaluation")({
  head: () => ({ meta: [{ title: "Evaluation — IntervAI" }] }),
  validateSearch: (s) => SearchSchema.parse(s),
  component: EvalPage,
});

function EvalPage() {
  const { session, loading, settings } = useSession();
  const { domain } = Route.useSearch();
  const router = useRouter();
  const evalFn = useServerFn(evaluateInterview);
  const [eval_, setEval] = useState<Evaluation | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Pull transcript from router location.state
  const transcript = (router.state.location.state as any)?.transcript as { role: "interviewer" | "candidate"; content: string }[] | undefined;

  useEffect(() => {
    if (loading || !session || !transcript || transcript.length === 0) return;
    void (async () => {
      const r = await evalFn({ data: {
        domain, transcript,
        userOpenRouterKey: settings.userOpenRouterKey || undefined,
        useOllama: settings.useOllama,
        ollamaUrl: settings.ollamaUrl,
        ollamaModel: settings.ollamaModel,
      } });
      if (!r.ok) setError(r.error);
      else setEval(r.evaluation);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loading, session]);

  if (loading) return null;
  if (!session) return <Navigate to="/login" />;
  if (!transcript || transcript.length === 0) return <Navigate to="/dashboard" />;

  const meta = DOMAIN_META[domain as Domain];

  return (
    <div className="min-h-screen p-6 md:p-10">
      <div className="max-w-4xl mx-auto">
        <div className="font-mono text-xs text-muted-foreground mb-2">// evaluation_report</div>
        <h1 className="font-mono text-3xl md:text-4xl font-bold mb-2">Session Report</h1>
        <p className="text-muted-foreground mb-8 font-mono text-sm">{meta.title} · {transcript.length} turns analyzed</p>

        {!eval_ && !error && (
          <GlassCard className="text-center py-16 animate-fade-up">
            <Loader2 className="h-10 w-10 mx-auto animate-spin text-[var(--cyan)] mb-4" />
            <p className="font-mono text-sm text-muted-foreground cursor-blink">analyzing transcript</p>
          </GlassCard>
        )}

        {error && (
          <GlassCard className="border-destructive/40">
            <p className="font-mono text-sm text-destructive">{error}</p>
          </GlassCard>
        )}

        {eval_ && (
          <div className="space-y-5">
            <GlassCard className="animate-fade-up">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-6 items-center">
                <div className="flex flex-col items-center">
                  <ScoreRing value={eval_.overallScore} label="overall" size={160} />
                </div>
                <div className="flex flex-col items-center"><ScoreRing value={eval_.technicalDepth} label="technical" size={120} /></div>
                <div className="flex flex-col items-center"><ScoreRing value={eval_.communication} label="comms" size={120} /></div>
                <div className="flex flex-col items-center"><ScoreRing value={eval_.problemSolving} label="problem" size={120} /></div>
              </div>
              <p className="mt-6 text-sm leading-relaxed text-muted-foreground italic">{eval_.summary}</p>
            </GlassCard>

            <div className="grid md:grid-cols-2 gap-5">
              <GlassCard glow="cyan" className="animate-fade-up" style={{ animationDelay: "80ms" }}>
                <div className="flex items-center gap-2 mb-3"><TrendingUp className="h-5 w-5 text-[var(--success)]" />
                  <h3 className="font-mono font-bold">Strengths</h3></div>
                <ul className="space-y-2 text-sm">
                  {eval_.strengths.map((s, i) => <li key={i} className="flex gap-2"><span className="text-[var(--cyan)]">▸</span>{s}</li>)}
                </ul>
              </GlassCard>
              <GlassCard glow="violet" className="animate-fade-up" style={{ animationDelay: "120ms" }}>
                <div className="flex items-center gap-2 mb-3"><TrendingDown className="h-5 w-5 text-destructive" />
                  <h3 className="font-mono font-bold">Weaknesses</h3></div>
                <ul className="space-y-2 text-sm">
                  {eval_.weaknesses.map((s, i) => <li key={i} className="flex gap-2"><span className="text-destructive">▸</span>{s}</li>)}
                </ul>
              </GlassCard>
            </div>

            <GlassCard className="animate-fade-up" style={{ animationDelay: "160ms" }}>
              <div className="flex items-center gap-2 mb-3"><Lightbulb className="h-5 w-5 text-[oklch(0.85_0.18_295)]" />
                <h3 className="font-mono font-bold">Recommendations</h3></div>
              <ul className="space-y-2 text-sm">
                {eval_.recommendations.map((s, i) => <li key={i} className="flex gap-2"><span className="text-[oklch(0.85_0.18_295)]">▸</span>{s}</li>)}
              </ul>
            </GlassCard>

            <details className="animate-fade-up" style={{ animationDelay: "200ms" }}>
              <summary className="font-mono text-xs uppercase tracking-wider text-muted-foreground cursor-pointer hover:text-[var(--cyan)]">
                view transcript ({transcript.length} turns)
              </summary>
              <div className="mt-3 space-y-2 max-h-96 overflow-auto">
                {transcript.map((t, i) => (
                  <div key={i} className={`p-3 rounded text-xs font-mono ${t.role === "interviewer" ? "glass border-l-2 border-[var(--cyan)]" : "bg-[color-mix(in_oklch,var(--violet)_15%,transparent)]"}`}>
                    <div className="text-[10px] uppercase opacity-60 mb-1">{t.role}</div>
                    <div>{t.content}</div>
                  </div>
                ))}
              </div>
            </details>

            <div className="flex gap-3 pt-4">
              <Link to="/dashboard"><GlowButton variant="ghost">Dashboard</GlowButton></Link>
              <Link to="/domain/$domain" params={{ domain: domain as Domain }}><GlowButton>Try Another Session</GlowButton></Link>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
