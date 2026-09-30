import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// Interactive web player. `web/` holds the page; scenes are shared with the Remotion MP4 render in `src/`.
export default defineConfig({
  root: "web",
  publicDir: "../public",
  plugins: [react()],
  server: { port: 5178, strictPort: true, host: "127.0.0.1" },
  build: { outDir: "../out/web", emptyOutDir: true, chunkSizeWarningLimit: 4000 },
});
