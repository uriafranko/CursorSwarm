import { defineConfig } from "tsup";

export default defineConfig({
  entry: ["src/index.ts"],
  format: ["esm", "cjs"],
  target: "es2020",
  dts: true,
  clean: true,
  sourcemap: true,
  external: ["react"],
  // Lets the components be imported straight from React Server Components trees (Next.js app router).
  banner: { js: '"use client";' },
});
