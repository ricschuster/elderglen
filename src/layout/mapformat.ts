import { format, resolveConfig } from "prettier";
import { join } from "node:path";

/**
 * Write a map the way the committed files are written, so a save changes only
 * what was edited. The files are Prettier-formatted (`format:check`), and
 * Prettier keeps an object on one line when the source had it on one line. The
 * committed maps mix both styles, so the writer reads the style of each object
 * from the original text and gives it back: an object that matches one in the
 * original (same content, else same place) keeps that object's style.
 */

/** For each `{` of a JSON text, in order: whether it is followed by a line break. */
function braceStyles(text: string): boolean[] {
  const out: boolean[] = [];
  let inString = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (inString) {
      if (c === "\\") i++;
      else if (c === '"') inString = false;
    } else if (c === '"') inString = true;
    else if (c === "{") {
      let j = i + 1;
      while (text[j] === " " || text[j] === "\t") j++;
      out.push(text[j] === "\n" || text[j] === "\r");
    }
  }
  return out;
}

type Walker = (obj: Record<string, unknown>, path: string) => void;

/** Visit every object, parents before children, keys and elements in order. */
function walk(v: unknown, path: string, visit: Walker): void {
  if (Array.isArray(v)) v.forEach((e, i) => walk(e, `${path}/${i}`, visit));
  else if (v !== null && typeof v === "object") {
    const o = v as Record<string, unknown>;
    visit(o, path);
    for (const [k, e] of Object.entries(o)) walk(e, `${path}/${k}`, visit);
  }
}

/** The text of `json` with each object's line-break style taken from `original`. */
function styled(json: unknown, original?: string): string {
  const byContent = new Map<string, boolean[]>();
  const byPath = new Map<string, boolean>();
  if (original !== undefined) {
    const styles = braceStyles(original);
    let n = 0;
    walk(JSON.parse(original), "", (o, path) => {
      const style = styles[n++] ?? true;
      const key = JSON.stringify(o);
      const list = byContent.get(key);
      if (list) list.push(style);
      else byContent.set(key, [style]);
      byPath.set(path, style);
    });
  }
  const expanded = new Map<object, boolean>();
  walk(json, "", (o, path) => {
    const hit = byContent.get(JSON.stringify(o))?.shift();
    expanded.set(o, hit ?? byPath.get(path) ?? true);
  });
  const write = (v: unknown, indent: string): string => {
    if (Array.isArray(v)) {
      if (v.length === 0) return "[]";
      const inner = indent + "  ";
      return `[\n${v.map((e) => inner + write(e, inner)).join(",\n")}\n${indent}]`;
    }
    if (v !== null && typeof v === "object") {
      const entries = Object.entries(v as Record<string, unknown>);
      if (entries.length === 0) return "{}";
      const inner = indent + "  ";
      const parts = entries.map(
        ([k, e]) => `${JSON.stringify(k)}: ${write(e, inner)}`,
      );
      return expanded.get(v) === false
        ? `{ ${parts.join(", ")} }`
        : `{\n${parts.map((p) => inner + p).join(",\n")}\n${indent}}`;
    }
    return JSON.stringify(v);
  };
  return write(json, "");
}

/** Format a map for writing. Pass the file's current text to keep its style. */
export async function formatMap(
  root: string,
  json: unknown,
  original?: string,
): Promise<string> {
  const config =
    (await resolveConfig(join(root, "src/content/maps/x.json"))) ?? {};
  return format(styled(json, original), { ...config, parser: "json" });
}
