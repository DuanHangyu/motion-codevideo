import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// Interactive classroom MVP. Lessons are the same Remotion compositions rendered live in the browser.
export default defineConfig({
  root: "classroom",
  publicDir: "../public",
  plugins: [react()],
  server: { port: 5180, strictPort: true, host: "127.0.0.1" },
  build: { outDir: "../out/classroom", emptyOutDir: true, chunkSizeWarningLimit: 4000 },
  test: { root: ".", include: ["classroom/**/*.test.ts", "src/alexnet/**/*.test.ts"] },
});
