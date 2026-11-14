// Builds src/content/guide-text.json (note 101): the cleared one-line blurbs of the wiki text
// (docs/wiki-text), by category and id, so the game can import them. Draft text is left out.
//   node scripts/guide/text.mjs          write the file
//   node scripts/guide/text.mjs --check  fail if the file is stale
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { format } from "prettier";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "../..");
const CATEGORIES = ["crops", "fish", "forage", "people", "items"];
const out = {};
for (const c of CATEGORIES) {
  const d = JSON.parse(
    readFileSync(join(root, `docs/wiki-text/${c}.json`), "utf8"),
  );
  out[c] = {};
  for (const [id, v] of Object.entries(d)) {
    if (v && typeof v.text === "string" && !v.draft) out[c][id] = v.text;
  }
}
const file = join(root, "src/content/guide-text.json");
const text = await format(JSON.stringify(out), { parser: "json" });
if (process.argv.includes("--check")) {
  if (!existsSync(file) || readFileSync(file, "utf8") !== text) {
    console.error(
      "src/content/guide-text.json is stale: run npm run guide:text",
    );
    process.exit(1);
  }
} else writeFileSync(file, text);
