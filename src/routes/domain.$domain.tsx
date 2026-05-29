import { createFileRoute, Link, Navigate } from "@tanstack/react-router";
import { Mic, ListChecks, ArrowLeft } from "lucide-react";
import { useSession } from "@/store/session";
import { GlassCard } from "@/components/GlassCard";
import { GlowButton } from "@/components/GlowButton";
import { DOMAIN_META, type Domain } from "@/lib/knowledge";

export const Route = createFileRoute("/domain/$domain")({
  head: () => ({ meta: [{ title: "Select Mode — IntervAI" }] }),
  component: DomainPage,
});

function DomainPage() {
  const { session, loading } = useSession();
  const { domain } = Route.useParams();
  if (loading) return null;
  if (!session) return <Navigate to="/login" />;
  const d = domain as Domain;
  const meta = DOMAIN_META[d];
  if (!meta) return <Navigate to="/dashboard" />;

  return (
    <div className="min-h-screen p-6 md:p-10">
      <Link to="/dashboard" className="inline-flex items-center gap-2 font-mono text-xs text-muted-foreground hover:text-[var(--cyan)] mb-8">
        <ArrowLeft className="h-4 w-4" /> back
      </Link>
      <div className="max-w-3xl mx-auto animate-fade-up">
        <div className="font-mono text-xs text-muted-foreground mb-2">// domain: {d}</div>
        <h1 className="font-mono text-3xl md:text-4xl font-bold mb-2">{meta.title}</h1>
        <p className="text-muted-foreground mb-10">{meta.tagline} · Choose your interview mode</p>

        <div className="grid md:grid-cols-2 gap-5">
          <Link to="/interview/$domain" params={{ domain: d }} className="animate-fade-up">
            <GlassCard glow="cyan" className="h-full cursor-pointer">
              <Mic className="h-8 w-8 text-[var(--cyan)] mb-3" />
              <h3 className="font-mono text-lg font-bold">Mock Interview</h3>
              <p className="text-sm text-muted-foreground mt-1">5 questions · voice or text · live AI interviewer</p>
              <GlowButton variant="cyan" size="sm" className="mt-4">Start Session →</GlowButton>
            </GlassCard>
          </Link>
          <Link to="/quiz/$domain" params={{ domain: d }} className="animate-fade-up" style={{ animationDelay: "80ms" }}>
            <GlassCard glow="violet" className="h-full cursor-pointer">
              <ListChecks className="h-8 w-8 text-[oklch(0.85_0.18_295)] mb-3" />
              <h3 className="font-mono text-lg font-bold">MCQ Quiz</h3>
              <p className="text-sm text-muted-foreground mt-1">5 questions · multiple choice or write your own</p>
              <GlowButton variant="violet" size="sm" className="mt-4">Launch Quiz →</GlowButton>
            </GlassCard>
          </Link>
        </div>
      </div>
    </div>
  );
}
