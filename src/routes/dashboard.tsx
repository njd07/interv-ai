import { createFileRoute, Link, Navigate } from "@tanstack/react-router";
import { useState } from "react";
import { Code2, Layers, Network, Boxes, Settings as SettingsIcon, LogOut, Terminal } from "lucide-react";
import { useSession } from "@/store/session";
import { GlassCard } from "@/components/GlassCard";
import { GlowButton } from "@/components/GlowButton";
import { SettingsModal } from "@/components/SettingsModal";
import { DOMAIN_META, type Domain } from "@/lib/knowledge";

export const Route = createFileRoute("/dashboard")({
  head: () => ({ meta: [{ title: "Dashboard — IntervAI" }] }),
  component: Dashboard,
});

const ICONS: Record<Domain, React.ComponentType<{ className?: string }>> = {
  dsa: Code2,
  springboot: Layers,
  system_design: Network,
  lld: Boxes,
};

const COLORS: Record<Domain, "cyan" | "violet"> = {
  dsa: "cyan",
  springboot: "violet",
  system_design: "cyan",
  lld: "violet",
};

function Dashboard() {
  const { session, loading, signOut } = useSession();
  const [settingsOpen, setSettingsOpen] = useState(false);
  if (loading) return null;
  if (!session) return <Navigate to="/login" />;

  return (
    <div className="min-h-screen p-6 md:p-10">
      <header className="flex items-center justify-between mb-10 animate-fade-up">
        <div className="flex items-center gap-2 font-mono text-xl font-bold text-[var(--cyan)]">
          <Terminal className="h-6 w-6" />
          INTERV<span className="text-[oklch(0.9_0.15_295)]">AI</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="hidden md:block font-mono text-xs text-muted-foreground">{session.user.email}</span>
          <GlowButton variant="ghost" size="sm" onClick={() => setSettingsOpen(true)}>
            <SettingsIcon className="h-4 w-4" />
          </GlowButton>
          <GlowButton variant="ghost" size="sm" onClick={signOut}>
            <LogOut className="h-4 w-4" />
          </GlowButton>
        </div>
      </header>

      <div className="max-w-5xl mx-auto animate-fade-up" style={{ animationDelay: "60ms" }}>
        <h1 className="font-mono text-3xl md:text-4xl font-bold mb-2">
          <span className="text-muted-foreground">{">"}</span> Select Domain<span className="cursor-blink"></span>
        </h1>
        <p className="text-muted-foreground mb-10 font-mono text-sm">// Choose your interview track. 15 curated questions per domain.</p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {(Object.keys(DOMAIN_META) as Domain[]).map((d, i) => {
            const Icon = ICONS[d];
            const meta = DOMAIN_META[d];
            return (
              <Link key={d} to="/domain/$domain" params={{ domain: d }} className="animate-fade-up"
                style={{ animationDelay: `${120 + i * 60}ms` }}>
                <GlassCard glow={COLORS[d]} className="h-full cursor-pointer group">
                  <div className="flex items-start gap-4">
                    <div className={`p-3 rounded-lg ${COLORS[d] === "cyan" ? "bg-[color-mix(in_oklch,var(--cyan)_15%,transparent)] text-[var(--cyan)]" : "bg-[color-mix(in_oklch,var(--violet)_15%,transparent)] text-[oklch(0.85_0.18_295)]"}`}>
                      <Icon className="h-6 w-6" />
                    </div>
                    <div className="flex-1">
                      <h3 className="font-mono text-xl font-bold">{meta.title}</h3>
                      <p className="text-sm text-muted-foreground mt-1">{meta.tagline}</p>
                      <div className="mt-4 font-mono text-xs text-muted-foreground group-hover:text-[var(--cyan)] transition-colors">
                        ./start --domain={d} →
                      </div>
                    </div>
                  </div>
                </GlassCard>
              </Link>
            );
          })}
        </div>
      </div>

      <SettingsModal open={settingsOpen} onClose={() => setSettingsOpen(false)} />
    </div>
  );
}
