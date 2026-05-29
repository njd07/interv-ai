import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const MessageSchema = z.object({
  role: z.enum(["system", "user", "assistant"]),
  content: z.string(),
});

const Input = z.object({
  messages: z.array(MessageSchema).min(1),
  jsonMode: z.boolean().optional(),
  userOpenRouterKey: z.string().optional(),
  temperature: z.number().optional(),
  // Ollama settings — passed from client-side Settings
  useOllama: z.boolean().optional(),
  ollamaUrl: z.string().optional(),
  ollamaModel: z.string().optional(),
});

const FALLBACK_MODELS = [
  "meta-llama/llama-3.1-8b-instruct:free",
  "mistralai/mistral-7b-instruct:free",
  "google/gemma-2-9b-it:free",
  "qwen/qwen-2-7b-instruct:free",
];

/**
 * Try Ollama local inference.
 * Returns { ok, text, modelUsed } on success, or null to signal "fall through to OpenRouter".
 */
async function tryOllama(
  ollamaUrl: string,
  ollamaModel: string,
  messages: { role: string; content: string }[],
  temperature: number,
  jsonMode?: boolean,
): Promise<{ ok: true; text: string; modelUsed: string } | null> {
  try {
    const controller = new AbortController();
    const t = setTimeout(() => controller.abort(), 90_000); // generous timeout for local model

    const body: Record<string, unknown> = {
      model: ollamaModel,
      messages,
      stream: false,
      options: {
        temperature,
        num_predict: 512,   // cap output length for speed
        num_ctx: 4096,      // reduce context window for speed
      },
    };
    if (jsonMode) body.format = "json";

    console.log(`[Ollama] POST ${ollamaUrl}/api/chat model=${ollamaModel}`);
    const start = Date.now();

    const res = await fetch(`${ollamaUrl}/api/chat`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
      signal: controller.signal,
    });
    clearTimeout(t);
    console.log(`[Ollama] response ${res.status} in ${Date.now() - start}ms`);

    if (!res.ok) {
      console.error(`[Ollama] HTTP ${res.status}: ${(await res.text()).slice(0, 200)}`);
      return null;
    }

    const json = await res.json();
    const text = json?.message?.content;
    if (typeof text !== "string" || !text.trim()) {
      console.error("[Ollama] empty response body");
      return null;
    }
    return { ok: true, text, modelUsed: `ollama/${ollamaModel}` };
  } catch (e) {
    console.error(`[Ollama] ${(e as Error).message}`);
    return null;
  }
}

export const callOpenRouter = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => Input.parse(d))
  .handler(async ({ data }) => {
    // ─── Ollama branch ───────────────────────────────────────────
    if (data.useOllama) {
      const url = (data.ollamaUrl || "http://localhost:11434").replace(/\/+$/, "");
      const model = data.ollamaModel || "mistral:7b-instruct-q3_K_M";
      const result = await tryOllama(
        url,
        model,
        data.messages,
        data.temperature ?? 0.6,
        data.jsonMode,
      );
      if (result) return result;
      // If Ollama fails, fall through to OpenRouter as a safety net
      console.warn("[LLM] Ollama failed, falling through to OpenRouter");
    }

    // ─── OpenRouter branch ───────────────────────────────────────
    const apiKey = data.userOpenRouterKey?.trim() || process.env.OPENROUTER_API_KEY;
    if (!apiKey) {
      return { ok: false as const, error: "NO_KEY", message: "No OpenRouter API key configured. Add one in Settings or enable Ollama." };
    }

    const globalDeadline = Date.now() + 50_000;
    let lastErr = "";

    for (const model of FALLBACK_MODELS) {
      if (Date.now() > globalDeadline) break;
      const controller = new AbortController();
      const t = setTimeout(() => controller.abort(), 12_000);
      try {
        const body: Record<string, unknown> = {
          model,
          messages: data.messages,
          temperature: data.temperature ?? 0.6,
        };
        if (data.jsonMode) body.response_format = { type: "json_object" };

        const res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${apiKey}`,
            "HTTP-Referer": "https://intervai.lovable.app",
            "X-Title": "IntervAI",
          },
          body: JSON.stringify(body),
          signal: controller.signal,
        });
        clearTimeout(t);

        if (res.status === 429 || res.status >= 500) {
          lastErr = `Model ${model} → HTTP ${res.status}`;
          continue;
        }
        if (!res.ok) {
          lastErr = `Model ${model} → HTTP ${res.status}: ${(await res.text()).slice(0, 200)}`;
          continue;
        }

        const json = await res.json();
        const text = json?.choices?.[0]?.message?.content;
        if (typeof text !== "string" || !text.trim()) {
          lastErr = `Model ${model} → empty response`;
          continue;
        }
        return { ok: true as const, text, modelUsed: model };
      } catch (e) {
        clearTimeout(t);
        lastErr = `Model ${model} → ${(e as Error).message}`;
        continue;
      }
    }

    return {
      ok: false as const,
      error: "CHAIN_EXHAUSTED",
      message: "Cloud AI gateway rate limit reached. Please try again in a moment or switch to Local Ollama in Settings.",
      detail: lastErr,
    };
  });
