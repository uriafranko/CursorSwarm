import { fileURLToPath } from "node:url";

import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

export default defineConfig({
  // Recharts is most of the bundle; fine for a demo.
  build: { chunkSizeWarningLimit: 1000, emptyOutDir: true, outDir: "dist-demo" },
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: { "@": fileURLToPath(new URL("src", import.meta.url)) },
  },
  server: { port: 5179 },
});
