import { useState } from "react";
import { X } from "lucide-react";
import { useSession } from "@/store/session";
import { GlowButton } from "./GlowButton";

export function SettingsModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { settings, setSettings } = useSession();
  const [tab, setTab] = useState<"engine" | "voice" | "about">("engine");
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-up">
      <div className="glass-strong rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-auto relative">
        <button onClick={onClose} className="absolute top-4 right-4 p-2 rounded-md hover:bg-muted">
          <X className="h-5 w-5" />
        </button>
        <div className="p-6 border-b border-border">
          <h2 className="font-mono text-xl text-[var(--cyan)]">[ SETTINGS ]</h2>
        </div>
        <div className="flex gap-1 px-6 pt-4 border-b border-border">
          {(["engine", "voice", "about"] as const).map((t) => (
            <button key={t} onClick={() => setTab(t)}
              className={`px-4 py-2 font-mono text-xs uppercase tracking-wider border-b-2 transition-colors ${
                tab === t ? "border-[var(--cyan)] text-[var(--cyan)]" : "border-transparent text-muted-foreground"
              }`}>
              {t}
            </button>
          ))}
        </div>

        <div className="p-6 space-y-4">
          {tab === "engine" && (
            <>
              <div>
                <label className="font-mono text-xs uppercase text-muted-foreground">Your OpenRouter API Key (optional)</label>
                <input type="password" value={settings.userOpenRouterKey}
                  onChange={(e) => setSettings({ userOpenRouterKey: e.target.value })}
                  placeholder="sk-or-v1-..."
                  className="w-full mt-1 px-3 py-2 bg-input rounded-md font-mono text-sm border border-border focus:outline-none focus:border-[var(--cyan)]" />
                <p className="text-xs text-muted-foreground mt-1">If empty, uses the built-in server key.</p>
              </div>
              <label className="flex items-center gap-3 cursor-pointer">
                <input type="checkbox" checked={settings.useOllama}
                  onChange={(e) => setSettings({ useOllama: e.target.checked })} />
                <span className="font-mono text-sm">Use Local Ollama (browser → localhost)</span>
              </label>
              {settings.useOllama && (
                <>
                  <input value={settings.ollamaUrl} onChange={(e) => setSettings({ ollamaUrl: e.target.value })}
                    className="w-full px-3 py-2 bg-input rounded-md font-mono text-sm border border-border" placeholder="http://localhost:11434" />
                  <input value={settings.ollamaModel} onChange={(e) => setSettings({ ollamaModel: e.target.value })}
                    className="w-full px-3 py-2 bg-input rounded-md font-mono text-sm border border-border" placeholder="llama3.1" />
                </>
              )}
            </>
          )}
          {tab === "voice" && (
            <>
              <label className="flex items-center gap-3 cursor-pointer">
                <input type="checkbox" checked={settings.voice}
                  onChange={(e) => setSettings({ voice: e.target.checked })} />
                <span className="font-mono text-sm">Enable voice (ElevenLabs TTS)</span>
              </label>
              <div>
                <label className="font-mono text-xs uppercase text-muted-foreground">Voice ID</label>
                <input value={settings.voiceId} onChange={(e) => setSettings({ voiceId: e.target.value })}
                  className="w-full mt-1 px-3 py-2 bg-input rounded-md font-mono text-sm border border-border" />
                <p className="text-xs text-muted-foreground mt-1">Default: Bella (EXAVITQu4vr4xnSDxMaL)</p>
              </div>
              <div className="pt-2">
                <label className="font-mono text-xs uppercase text-muted-foreground">Your ElevenLabs API Key</label>
                <input type="password" value={settings.userElevenLabsKey} onChange={(e) => setSettings({ userElevenLabsKey: e.target.value })}
                  className="w-full mt-1 px-3 py-2 bg-input rounded-md font-mono text-sm border border-border" placeholder="sk_..." />
                <p className="text-xs text-muted-foreground mt-1">Required if you want to use your own credits. Otherwise falls back to browser TTS.</p>
              </div>
            </>
          )}
          {tab === "about" && (
            <div className="font-mono text-sm space-y-3 text-muted-foreground">
              <p><span className="text-[var(--cyan)]">IntervAI v1.0</span> — AI-powered mock interview platform</p>
              <p>4 domains · Voice + text interviews · MCQ quizzes with free-form judging · ElevenLabs TTS</p>
              <p>Built for hackathon. LLM via OpenRouter with multi-model failover.</p>
            </div>
          )}
        </div>

        <div className="p-6 pt-0 flex justify-end">
          <GlowButton onClick={onClose}>Close</GlowButton>
        </div>
      </div>
    </div>
  );
}
