import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import type { Session } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

export type Settings = {
  voice: boolean;
  voiceId: string;
  useOllama: boolean;
  ollamaUrl: string;
  ollamaModel: string;
  userOpenRouterKey: string;
  userElevenLabsKey: string;
};

const DEFAULTS: Settings = {
  voice: true,
  voiceId: "EXAVITQu4vr4xnSDxMaL",
  useOllama: true,
  ollamaUrl: "http://localhost:11434",
  ollamaModel: "mistral:7b-instruct-q3_K_M",
  userOpenRouterKey: "",
  userElevenLabsKey: "",
};

type Ctx = {
  session: Session | null;
  loading: boolean;
  settings: Settings;
  setSettings: (s: Partial<Settings>) => void;
  signOut: () => Promise<void>;
};

const SessionContext = createContext<Ctx | null>(null);

export function SessionProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [settings, setSettingsState] = useState<Settings>(() => {
    if (typeof window === "undefined") return DEFAULTS;
    try {
      const raw = localStorage.getItem("intervai:settings");
      return raw ? { ...DEFAULTS, ...JSON.parse(raw) } : DEFAULTS;
    } catch {
      return DEFAULTS;
    }
  });

  useEffect(() => {
    const raw = typeof window !== "undefined" ? localStorage.getItem("intervai:mock_session") : null;
    if (raw) {
      try {
        const user = JSON.parse(raw);
        setSession({ user } as unknown as Session);
      } catch {}
    }
    setLoading(false);
  }, []);

  const setSettings = (patch: Partial<Settings>) => {
    setSettingsState((prev) => {
      const next = { ...prev, ...patch };
      try { localStorage.setItem("intervai:settings", JSON.stringify(next)); } catch {}
      return next;
    });
  };

  const signOut = async () => {
    try { localStorage.removeItem("intervai:mock_session"); } catch {}
    setSession(null);
  };

  return (
    <SessionContext.Provider value={{ session, loading, settings, setSettings, signOut }}>
      {children}
    </SessionContext.Provider>
  );
}

export function useSession() {
  const ctx = useContext(SessionContext);
  if (!ctx) throw new Error("useSession must be used inside SessionProvider");
  return ctx;
}
