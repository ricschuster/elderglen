// Rebuilds src/content/audio-credits.json (shown in Options) from the ledger rows of music files.
import { readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const root = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const rows = readFileSync(join(root, "docs", "audio", "LICENCES.md"), "utf8")
  .split("\n")
  .filter(
    (l) =>
      l.startsWith("| music/") ||
      l.startsWith("| sfx/") ||
      l.startsWith("| ambient/"),
  )
  .map((l) =>
    l
      .trim()
      .replace(/^\||\|$/g, "")
      .split("|")
      .map((c) => c.trim()),
  )
  .map(([file, title, author, licence, url]) => ({
    file,
    title,
    author,
    licence,
    url,
  }));
const out = {
  _note:
    "Shown by Options > Sound credits. Generated from docs/audio/LICENCES.md by scripts/audio/credits.mjs. CC-BY files must be listed; CC0 ones are listed as thanks.",
  credits: rows,
};
writeFileSync(
  join(root, "src", "content", "audio-credits.json"),
  JSON.stringify(out, null, 2) + "\n",
);
console.log(`${rows.length} credits`);
