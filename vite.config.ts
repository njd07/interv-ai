// @lovable.dev/vite-tanstack-config already includes the following — do NOT add them manually
// or the app will break with duplicate plugins:
//   - tanstackStart, viteReact, tailwindcss, tsConfigPaths, nitro (build-only using cloudflare as a default target),
//     componentTagger (dev-only), VITE_* env injection, @ path alias, React/TanStack dedupe,
//     error logger plugins, and sandbox detection (port/host/strictPort).
// You can pass additional config via defineConfig({ vite: { ... }, etc... }) if needed.
import { defineConfig } from "@lovable.dev/vite-tanstack-config";

export default defineConfig({
  nitro: { preset: "node-server" },
  tanstackStart: {
    server: { entry: "server" },
  },
  vite: {
    define: {
      // Expose the server-side ELEVENLABS_API_KEY to the browser bundle at build time.
      // On Render: set ELEVENLABS_API_KEY in the Environment Variables dashboard.
      // This means every user gets TTS without entering their own key.
      __ELEVENLABS_API_KEY__: JSON.stringify(process.env.ELEVENLABS_API_KEY || ""),
    },
  },
});
