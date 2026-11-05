import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

export default defineConfig({
  build: { emptyOutDir: true, outDir: "dist-demo" },
  plugins: [react()],
  server: { port: 5178 },
});
