import { conditionsOf, type TiledMapJson, type TiledObject } from "./map";
import { MapRegistry } from "./maps";

/**
 * Object editing and saving for the layout page (`docs/design/87_layout_page.md`,
 * slice 2). Pure: no DOM, no files. The dev server route and the page both call
 * this, so the checks at save are the checks the page shows.
 */

/** Where the dev server route lives. Only the dev server answers it. */
export const SAVE_ROUTE = "/__layout/save";
export const READ_ROUTE = "/__layout/read";
export const DRAFT_ROUTE = "/__layout/draft";

/** A small hash of file text (FNV-1a), to notice a change made outside the page. */
export function textHash(text: string): string {
  let h = 0x811c9dc5;
  for (let i = 0; i < text.length; i++) {
    h ^= text.charCodeAt(i);
    h = Math.imul(h, 0x01000193) >>> 0;
  }
  return h.toString(16).padStart(8, "0");
}

/**
 * The hard checks at save: every problem across the whole registry with the
 * edited map in place (`MapRegistry.problems()` and the pair check, which it
 * includes). A map that cannot be read at all is reported as one problem.
 */
export function saveProblems(
  files: Record<string, TiledMapJson>,
  id: string,
  edited: TiledMapJson,
): string[] {
  if (!/^[a-z0-9][a-z0-9-]*$/.test(id)) return [`bad map id "${id}"`];
  if (!(id in files)) return [`no map "${id}"`];
  try {
    return MapRegistry.fromTiled({ ...files, [id]: edited }).problems();
  } catch (e) {
    return [(e as Error).message];
  }
}

/** A place in a map: an object layer and the object's index in it. */
export interface ObjectRef {
  layer: number;
  index: number;
}

const clone = <T>(v: T): T => structuredClone(v);

const objectAt = (json: TiledMapJson, ref: ObjectRef): TiledObject => {
  const o = json.layers[ref.layer]?.objects?.[ref.index];
  if (!o) throw new Error("no such object");
  return o;
};

/** Move an object by whole tiles. Returns a new map; the input is not changed. */
export function moveObject(
  json: TiledMapJson,
  ref: ObjectRef,
  dx: number,
  dy: number,
): TiledMapJson {
  const out = clone(json);
  const o = objectAt(out, ref);
  o.x += dx * json.tilewidth;
  o.y += dy * json.tilewidth;
  return out;
}

/** Remove an object. */
export function deleteObject(json: TiledMapJson, ref: ObjectRef): TiledMapJson {
  const out = clone(json);
  objectAt(out, ref);
  out.layers[ref.layer]!.objects!.splice(ref.index, 1);
  return out;
}

/** Rename an object. */
export function renameObject(
  json: TiledMapJson,
  ref: ObjectRef,
  name: string,
): TiledMapJson {
  const out = clone(json);
  objectAt(out, ref).name = name;
  return out;
}

/** Tiled's property type name for a value. */
const propType = (v: unknown): string =>
  typeof v === "boolean" ? "bool" : typeof v === "number" ? "int" : "string";

/**
 * Set a custom property of an object, keeping its place in the list. An empty
 * string removes it. A numeric text keeps the type the property already had.
 */
export function setObjectProperty(
  json: TiledMapJson,
  ref: ObjectRef,
  name: string,
  value: string | number | boolean,
): TiledMapJson {
  const out = clone(json);
  const o = objectAt(out, ref);
  const props = (o.properties ??= []) as {
    name: string;
    type?: string;
    value: unknown;
  }[];
  const at = props.findIndex((p) => p.name === name);
  if (value === "") {
    if (at >= 0) props.splice(at, 1);
    if (props.length === 0) delete o.properties;
    return out;
  }
  if (at >= 0) {
    const old = props[at]!;
    const typed =
      typeof old.value === "number" && typeof value === "string"
        ? Number(value)
        : typeof old.value === "boolean" && typeof value === "string"
          ? value === "true"
          : value;
    old.value = Number.isNaN(typed) ? old.value : typed;
  } else props.push({ name, type: propType(value), value });
  return out;
}

/** What each object class needs when added, from notes 05 and 71. */
export const CLASS_DEFAULTS: Record<
  string,
  { point: boolean; props: Record<string, string | number | boolean> }
> = {
  entry: { point: true, props: {} },
  exit: { point: false, props: { map: "", entry: "" } },
  service: { point: false, props: { kind: "" } },
  forage: { point: true, props: {} },
  tree: { point: false, props: { stage: 3 } },
  stump: { point: false, props: {} },
  rock: { point: false, props: {} },
  log: { point: false, props: { flag: "" } },
  weed: { point: false, props: {} },
  twig: { point: false, props: {} },
  water: { point: false, props: { kind: "river" } },
  region: { point: false, props: {} },
  gate: { point: false, props: { gate: "" } },
  mark: { point: true, props: {} },
  fixture: { point: false, props: { kind: "" } },
};

const maxObjectId = (json: TiledMapJson): number =>
  json.layers.reduce(
    (m, l) =>
      (l.objects ?? []).reduce(
        (n, o) => Math.max(n, (o as { id?: number }).id ?? 0),
        m,
      ),
    0,
  );

/**
 * Add an object of a class at a tile, on an object layer. Gives it a fresh
 * object id and bumps `nextobjectid` when the file has one. Properties that
 * start empty are left out, so the new object shows its gaps in the Problems
 * panel rather than carrying empty values.
 */
export function addObject(
  json: TiledMapJson,
  layer: number,
  cls: string,
  name: string,
  x: number,
  y: number,
  props: Record<string, string | number | boolean> = {},
): TiledMapJson {
  const out = clone(json);
  const target = out.layers[layer];
  if (!target || target.type !== "objectgroup")
    throw new Error("not an object layer");
  const def = CLASS_DEFAULTS[cls] ?? { point: false, props: {} };
  const size = json.tilewidth;
  const id = Math.max(maxObjectId(out) + 1, 1);
  const merged = { ...def.props, ...props };
  const properties = Object.entries(merged)
    .filter(([, v]) => v !== "")
    .map(([n, v]) => ({ name: n, type: propType(v), value: v }));
  const o: Record<string, unknown> = {
    id,
    name,
    class: cls,
    type: cls,
    x: def.point ? x * size + size / 2 : x * size,
    y: def.point ? y * size + size / 2 : y * size,
    width: def.point ? 0 : size,
    height: def.point ? 0 : size,
    rotation: 0,
    visible: true,
    ...(def.point ? { point: true } : {}),
    ...(properties.length > 0 ? { properties } : {}),
  };
  (target.objects ??= []).push(o as unknown as TiledObject);
  const next = (out as unknown as { nextobjectid?: number }).nextobjectid;
  if (typeof next === "number")
    (out as unknown as { nextobjectid: number }).nextobjectid = Math.max(
      next,
      id + 1,
    );
  return out;
}

/** Copy an object and place the copy at a tile, with a fresh id. */
export function pasteObject(
  json: TiledMapJson,
  layer: number,
  copy: TiledObject,
  x: number,
  y: number,
): TiledMapJson {
  const out = clone(json);
  const target = out.layers[layer];
  if (!target || target.type !== "objectgroup")
    throw new Error("not an object layer");
  const size = json.tilewidth;
  const id = maxObjectId(out) + 1;
  const o = clone(copy) as TiledObject & { id?: number };
  const frac = (n: number) => n - Math.floor(n / size) * size;
  o.x = x * size + frac(o.x);
  o.y = y * size + frac(o.y);
  if ("id" in o) o.id = id;
  (target.objects ??= []).push(o);
  const raw = out as unknown as { nextobjectid?: number };
  if (typeof raw.nextobjectid === "number")
    raw.nextobjectid = Math.max(raw.nextobjectid, id + 1);
  return out;
}

/** Every condition name any map uses, and every `requires` value: the list a `requires` offers. */
export function requiresChoices(files: Record<string, TiledMapJson>): string[] {
  const out = new Set<string>();
  for (const json of Object.values(files)) {
    for (const c of conditionsOf(json)) out.add(c);
    for (const l of json.layers)
      for (const o of l.objects ?? [])
        for (const p of o.properties ?? [])
          if (p.name === "requires" && typeof p.value === "string")
            out.add(p.value);
  }
  return [...out].sort();
}
