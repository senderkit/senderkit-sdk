import { defineConfig } from "tsup";

export default defineConfig({
  entry: ["src/cli.ts"],
  format: ["esm"],
  target: "es2022",
  dts: false,
  sourcemap: true,
  clean: true,
  splitting: false,
  minify: false,
  banner: { js: "#!/usr/bin/env node" },
});
