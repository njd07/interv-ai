import { createFileRoute, Navigate, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { Terminal, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useSession } from "@/store/session";
import { GlowButton } from "@/components/GlowButton";

export const Route = createFileRoute("/login")({
  head: () => ({ meta: [{ title: "Login — IntervAI" }] }),
  component: LoginPage,
});

function LoginPage() {
  const { session } = useSession();
  const navigate = useNavigate();
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  if (session) return <Navigate to="/dashboard" />;

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true); setErr(null);
    try {
      const fn = mode === "signin"
        ? supabase.auth.signInWithPassword({ email, password })
        : supabase.auth.signUp({ email, password, options: { emailRedirectTo: `${window.location.origin}/` } });
      const { error } = await fn;
      if (error) throw error;
      navigate({ to: "/dashboard" });
    } catch (e) {
      setErr((e as Error).message);
    } finally { setBusy(false); }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="w-full max-w-md animate-fade-up">
        <div className="text-center mb-6">
          <div className="inline-flex items-center gap-2 font-mono text-[var(--cyan)] text-2xl font-bold">
            <Terminal className="h-7 w-7" />
            <span>INTERV<span className="text-[oklch(0.9_0.15_295)]">AI</span></span>
          </div>
          <p className="font-mono text-xs text-muted-foreground mt-2 cursor-blink">
            $ ./initialize-interview-protocol
          </p>
        </div>

        <div className="glass-strong rounded-2xl p-8">
          <div className="flex gap-1 mb-6 p-1 bg-input rounded-lg">
            {(["signin", "signup"] as const).map((m) => (
              <button key={m} onClick={() => setMode(m)} type="button"
                className={`flex-1 py-2 font-mono text-xs uppercase tracking-wider rounded-md transition-all ${
                  mode === m ? "bg-[color-mix(in_oklch,var(--cyan)_22%,transparent)] text-[var(--cyan)] glow-cyan" : "text-muted-foreground"
                }`}>
                {m === "signin" ? "Sign In" : "Sign Up"}
              </button>
            ))}
          </div>

          <form onSubmit={submit} className="space-y-4">
            <div>
              <label className="font-mono text-xs uppercase tracking-wider text-muted-foreground">Email / Username</label>
              <input type="text" required value={email} onChange={(e) => setEmail(e.target.value)}
                className="w-full mt-1 px-3 py-2.5 bg-input rounded-md font-mono text-sm border border-border focus:outline-none focus:border-[var(--cyan)] focus:shadow-[0_0_0_3px_color-mix(in_oklch,var(--cyan)_18%,transparent)] transition-all"
                placeholder="admin or dev@intervai.io" />
            </div>
            <div>
              <label className="font-mono text-xs uppercase tracking-wider text-muted-foreground">Password</label>
              <input type="password" required minLength={3} value={password} onChange={(e) => setPassword(e.target.value)}
                className="w-full mt-1 px-3 py-2.5 bg-input rounded-md font-mono text-sm border border-border focus:outline-none focus:border-[var(--cyan)] focus:shadow-[0_0_0_3px_color-mix(in_oklch,var(--cyan)_18%,transparent)] transition-all"
                placeholder="••••••••" />
            </div>
            {err && <div className="font-mono text-xs text-destructive p-2 rounded bg-destructive/10 border border-destructive/30">{err}</div>}
            <GlowButton type="submit" disabled={busy} className="w-full" size="lg">
              {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : mode === "signin" ? "Connect" : "Initialize Account"}
            </GlowButton>
          </form>

        </div>


        <p className="text-center mt-4 font-mono text-xs text-muted-foreground">
          // Voice + text mock interviews · 4 domains · TTS model
        </p>
      </div>
    </div>
  );
}
