// @lovable.dev/vite-tanstack-config bundles TanStack Start, viteReact,
// tailwindcss, tsConfigPaths, sandbox detection, and env injection. We opt out
// of the Cloudflare adapter (cloudflare: false) and enable TanStack Start's
// SPA mode so the build produces a static client bundle suitable for Vercel.
import { defineConfig } from "@lovable.dev/vite-tanstack-config";

export default defineConfig({
  cloudflare: false,
  tanstackStart: {
    spa: { enabled: true },
  },
});
