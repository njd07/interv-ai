import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const Input = z.object({
  text: z.string().min(1).max(4000),
  voiceId: z.string().optional(),
  userElevenLabsKey: z.string().optional(),
});

// Keep this as a server function so the browser can call it via RPC —
// it needs to stay as createServerFn because it's called directly from the UI.
// The key fix is that callOpenRouter (server-to-server) was converted to a plain fn.
export const synthesizeSpeech = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => Input.parse(d))
  .handler(async ({ data }) => {
    const apiKey = (data.userElevenLabsKey || "").trim() || process.env.ELEVENLABS_API_KEY;
    if (!apiKey) {
      console.warn("[TTS] No ElevenLabs API key found, returning NO_KEY");
      return { ok: false as const, error: "NO_KEY" };
    }

    const voiceId = data.voiceId || "EXAVITQu4vr4xnSDxMaL";
    console.log(`[TTS] Calling ElevenLabs voiceId=${voiceId}, keyPrefix=${apiKey.slice(0, 8)}...`);
    try {
      const res = await fetch(
        `https://api.elevenlabs.io/v1/text-to-speech/${voiceId}?output_format=mp3_44100_128`,
        {
          method: "POST",
          headers: {
            "xi-api-key": apiKey,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            text: data.text,
            model_id: "eleven_turbo_v2_5",
            voice_settings: { stability: 0.5, similarity_boost: 0.75 },
          }),
        }
      );
      if (!res.ok) {
        const errBody = await res.text();
        console.error(`[TTS] ElevenLabs HTTP ${res.status}: ${errBody.slice(0, 200)}`);
        return { ok: false as const, error: `HTTP_${res.status}`, detail: errBody.slice(0, 200) };
      }
      const buf = await res.arrayBuffer();
      const b64 = Buffer.from(buf).toString("base64");
      console.log(`[TTS] Success, audio size=${buf.byteLength} bytes`);
      return { ok: true as const, audioBase64: b64 };
    } catch (e) {
      console.error("[TTS] Fetch error:", (e as Error).message);
      return { ok: false as const, error: (e as Error).message };
    }
  });
