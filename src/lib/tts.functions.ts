import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const Input = z.object({
  text: z.string().min(1).max(4000),
  voiceId: z.string().optional(),
  userElevenLabsKey: z.string().optional(),
});

export const synthesizeSpeech = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => Input.parse(d))
  .handler(async ({ data }) => {
    const apiKey = data.userElevenLabsKey || process.env.ELEVENLABS_API_KEY;
    if (!apiKey) return { ok: false as const, error: "NO_KEY" };

    const voiceId = data.voiceId || "EXAVITQu4vr4xnSDxMaL";
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
        return { ok: false as const, error: `HTTP_${res.status}` };
      }
      const buf = await res.arrayBuffer();
      const b64 = Buffer.from(buf).toString("base64");
      return { ok: true as const, audioBase64: b64 };
    } catch (e) {
      return { ok: false as const, error: (e as Error).message };
    }
  });
