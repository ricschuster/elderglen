// Codebase size report: the largest source files, files over the line limit, and what the
// production bundle is made of. Run `npm run size`. Warns only; it never fails.
//   node scripts/size/report.mjs            lines only
//   node scripts/size/report.mjs --bundle   also builds with source maps into a temp folder
//                                           and attributes the JS bytes to source folders
import { execFileSync } from "node:child_process";
import {
  mkdtempSync,
  readFileSync,
  readdirSync,
  statSync,
  rmSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join, relative, resolve } from "node:path";
import { gzipSync } from "node:zlib";

const ROOT = new URL("../../", import.meta.url).pathname;
const LIMIT = 1500; // lines; a warning, not a failure
// Known big files with a plan to split (FarmScene: note 106).
const EXEMPT = new Map([
  ["src/scenes/FarmScene.ts", "split planned, note 106"],
]);

function walk(dir, out = []) {
  for (const n of readdirSync(dir)) {
    if (n === "node_modules" || n === "dist" || n.startsWith(".")) continue;
    const p = join(dir, n);
    const s = statSync(p);
    if (s.isDirectory()) walk(p, out);
    else if (/\.(ts|mjs)$/.test(n)) out.push(p);
  }
  return out;
}
const kb = (n) => `${(n / 1024).toFixed(1)} KB`;

const files = ["src", "tests", "scripts"].flatMap((d) => walk(join(ROOT, d)));
const lines = files
  .map((f) => [
    relative(ROOT, f),
    readFileSync(f, "utf8").split("\n").length - 1,
  ])
  .sort((a, b) => b[1] - a[1]);

const byDir = {};
for (const [f, n] of lines) {
  const k = f
    .split("/")
    .slice(0, f.startsWith("src/") ? 2 : 1)
    .join("/");
  byDir[k] = (byDir[k] ?? 0) + n;
}
console.log("Lines by folder");
for (const [k, n] of Object.entries(byDir).sort((a, b) => b[1] - a[1]))
  console.log(`  ${String(n).padStart(7)}  ${k}`);

console.log("\nLargest files");
for (const [f, n] of lines.slice(0, 12))
  console.log(`  ${String(n).padStart(7)}  ${f}`);

const over = lines.filter(([f, n]) => n > LIMIT && !EXEMPT.has(f));
console.log(`\nOver ${LIMIT} lines (excluding planned splits)`);
if (over.length === 0) console.log("  none");
for (const [f, n] of over) console.log(`  WARN ${n}  ${f}`);
for (const [f, why] of EXEMPT) console.log(`  exempt  ${f} (${why})`);

if (process.argv.includes("--bundle")) {
  const out = mkdtempSync(join(tmpdir(), "elderglen-size-"));
  try {
    execFileSync(
      "npx",
      ["vite", "build", "--outDir", out, "--emptyOutDir", "--sourcemap"],
      { cwd: ROOT, stdio: "ignore" },
    );
    const assets = join(out, "assets");
    console.log("\nBuilt files");
    for (const n of readdirSync(assets)) {
      if (n.endsWith(".map")) continue;
      const b = readFileSync(join(assets, n));
      console.log(
        `  ${kb(b.length).padStart(10)}  ${kb(gzipSync(b).length).padStart(10)} gz  ${n}`,
      );
    }
    for (const n of readdirSync(assets).filter((x) => x.endsWith(".js.map"))) {
      const map = JSON.parse(readFileSync(join(assets, n), "utf8"));
      // Attribute each source's share of the code by its original text length
      // (an estimate: the map gives sources, not minified bytes per source).
      const sizes = new Map();
      map.sources.forEach((s, i) => {
        const len = (map.sourcesContent?.[i] ?? "").length;
        const m = s.includes("node_modules/")
          ? s.slice(s.lastIndexOf("node_modules/"))
          : relative(ROOT, resolve(assets, s));
        const k = m.includes("node_modules/")
          ? "node_modules/" + m.split("node_modules/").pop().split("/")[0]
          : m
              .split("/")
              .slice(0, m.startsWith("src/") ? 2 : 1)
              .join("/");
        sizes.set(k, (sizes.get(k) ?? 0) + len);
      });
      const total = [...sizes.values()].reduce((a, b) => a + b, 0);
      console.log(
        `\nSource share of ${n.replace(".map", "")} (original text, estimate)`,
      );
      for (const [k, v] of [...sizes].sort((a, b) => b[1] - a[1]).slice(0, 12))
        console.log(
          `  ${kb(v).padStart(10)}  ${((100 * v) / total).toFixed(0).padStart(3)}%  ${k}`,
        );
    }
  } finally {
    rmSync(out, { recursive: true, force: true });
  }
}
