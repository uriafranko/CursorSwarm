import { defineConfig } from "tsup";

export default defineConfig({
  // Lets the components be imported straight from React Server Components trees (Next.js app router).
  banner: { js: '"use client";' },
  clean: true,
  dts: true,
  entry: ["src/index.ts"],
  external: ["react"],
  format: ["esm", "cjs"],
  sourcemap: true,
  target: "es2020",
});
