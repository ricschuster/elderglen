import type { TiledMapJson } from "./map";
import { placedObjects } from "./layoutview";

/**
 * Pure helpers for the draft viewer of the layout page
 * (`docs/design/87_layout_page.md`, slice 5): a read-only look at the `.tmj`
 * drafts in `docs/design/drafts/`. Nothing here touches Phaser or the DOM.
 */

/** Dev routes, answered only by the Vite dev server. */
export const DRAFT_LIST_ROUTE = "/__layout/drafts";
export const DRAFT_FILE_ROUTE = "/__layout/draftfile";

/** The folder the drafts live in, from the repo root. */
export const DRAFTS_DIR = "docs/design/drafts";

/**
 * Whether a path may be read as a draft: a `.tmj` file under the drafts folder,
 * with no way out of it. The dev route refuses anything else.
 */
export function isDraftPath(path: string): boolean {
  return (
    path.startsWith(`${DRAFTS_DIR}/`) &&
    path.endsWith(".tmj") &&
    !path.includes("..") &&
    !path.includes("\\") &&
    !path.includes("\0")
  );
}

/** Read draft text as a map. Throws a plain message when it is not a Tiled map. */
export function parseDraft(text: string): TiledMapJson {
  let json: unknown;
  try {
    json = JSON.parse(text);
  } catch {
    throw new Error("the draft is not JSON");
  }
  const j = json as Partial<TiledMapJson>;
  if (
    typeof j.width !== "number" ||
    typeof j.height !== "number" ||
    typeof j.tilewidth !== "number" ||
    !Array.isArray(j.layers)
  )
    throw new Error("the draft is not a Tiled map");
  return j as TiledMapJson;
}

/** The short name of a draft in the list: the path without the folder and extension. */
export function draftLabel(path: string): string {
  return path.slice(DRAFTS_DIR.length + 1).replace(/\.tmj$/, "");
}

/** A few words about a draft: size, its own note, and what it holds. */
export function draftInfo(json: TiledMapJson): string {
  const prop = (n: string) => json.properties?.find((p) => p.name === n)?.value;
  const counts = new Map<string, number>();
  for (const o of placedObjects(json, 0))
    counts.set(o.cls || "point", (counts.get(o.cls || "point") ?? 0) + 1);
  const held = [...counts].map(([c, n]) => `${n} ${c}`).join(", ");
  const note = prop("draft");
  return [
    `${json.width} by ${json.height} tiles`,
    typeof note === "string" ? note : undefined,
    held === "" ? undefined : held,
  ]
    .filter((s) => s !== undefined)
    .join("; ");
}
