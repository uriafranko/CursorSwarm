import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

export default defineConfig({
  plugins: [react()],
  server: { port: 5178 },
  build: { outDir: "dist-demo", emptyOutDir: true },
});
