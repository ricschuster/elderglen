// Bundle the Electron main process and preload into dist-electron/ (ADR 0016). Uses Vite's
// own bundler, so no extra dependency. `electron` and Node built-ins stay external.
import { build } from "vite";

const entries = [
  ["electron/main.ts", "main"],
  ["electron/preload.ts", "preload"],
];

for (const [entry, name] of entries) {
  await build({
    configFile: false,
    publicDir: false,
    logLevel: "warn",
    build: {
      ssr: entry,
      outDir: "dist-electron",
      emptyOutDir: name === "main",
      target: "node20",
      minify: false,
      rollupOptions: {
        output: { format: "cjs", entryFileNames: `${name}.cjs` },
        external: ["electron", /^node:/],
      },
    },
    ssr: { noExternal: true },
  });
}
