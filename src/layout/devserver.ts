import {
  existsSync,
  mkdirSync,
  readFileSync,
  readdirSync,
  statSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { join } from "node:path";
import type { IncomingMessage, ServerResponse } from "node:http";
import {
  DRAFTS_DIR,
  DRAFT_FILE_ROUTE,
  DRAFT_LIST_ROUTE,
  isDraftPath,
} from "../core/layoutdraft";
import { formatMap } from "./mapformat";
import type { TiledMapJson } from "../core/map";
import {
  DRAFT_ROUTE,
  READ_ROUTE,
  SAVE_ROUTE,
  saveProblems,
  textHash,
} from "../core/layoutedit";

/**
 * The dev-only side of the layout page (`docs/design/87_layout_page.md`,
 * slice 2). Node only: it is imported by `vite.config.ts` and the tests, never
 * by the page, and the plugin applies to `vite serve` only, so a production
 * build holds neither the route nor this code.
 */

const MAPS = "src/content/maps";
const DRAFTS = ".layout-drafts";

export type SaveResult =
  | { ok: true; hash: string }
  | { ok: false; status: number; error: string; problems?: string[] };

/** The files and rules behind the routes, free of Vite so tests can call it. */
export class LayoutStore {
  constructor(private readonly root: string) {}

  private path(id: string): string {
    return join(this.root, MAPS, `${id}.json`);
  }

  private draftPath(id: string): string {
    return join(this.root, DRAFTS, `${id}.json`);
  }

  private files(): Record<string, TiledMapJson> {
    const out: Record<string, TiledMapJson> = {};
    for (const f of readdirSync(join(this.root, MAPS)))
      if (f.endsWith(".json"))
        out[f.replace(/\.json$/, "")] = JSON.parse(
          readFileSync(join(this.root, MAPS, f), "utf8"),
        );
    return out;
  }

  /** The text, hash and any saved draft of a map. */
  read(id: string): { text: string; hash: string; draft?: string } {
    if (!/^[a-z0-9][a-z0-9-]*$/.test(id) || !existsSync(this.path(id)))
      throw new Error(`no map "${id}"`);
    const text = readFileSync(this.path(id), "utf8");
    const draft = existsSync(this.draftPath(id))
      ? readFileSync(this.draftPath(id), "utf8")
      : undefined;
    return { text, hash: textHash(text), ...(draft ? { draft } : {}) };
  }

  /**
   * Save an edited map. Refuses, writing nothing, when the file on disk is not
   * the one the page opened (`baseHash`), or when any hard check fails across
   * the whole registry with the new file in place.
   */
  async save(
    id: string,
    json: TiledMapJson,
    baseHash: string,
  ): Promise<SaveResult> {
    let disk;
    try {
      disk = this.read(id);
    } catch (e) {
      return { ok: false, status: 404, error: (e as Error).message };
    }
    if (disk.hash !== baseHash)
      return {
        ok: false,
        status: 409,
        error: "the file changed on disk since it was opened: reload it",
      };
    const problems = saveProblems(this.files(), id, json);
    if (problems.length > 0)
      return { ok: false, status: 422, error: "checks failed", problems };
    const text = await formatMap(this.root, json, disk.text);
    writeFileSync(this.path(id), text);
    rmSync(this.draftPath(id), { force: true });
    return { ok: true, hash: textHash(text) };
  }

  /** Every `.tmj` draft under the drafts folder, as repo relative paths. */
  listDrafts(): string[] {
    const out: string[] = [];
    const walk = (rel: string): void => {
      for (const f of readdirSync(join(this.root, rel)).sort()) {
        const p = `${rel}/${f}`;
        if (statSync(join(this.root, p)).isDirectory()) walk(p);
        else if (isDraftPath(p)) out.push(p);
      }
    };
    if (existsSync(join(this.root, DRAFTS_DIR))) walk(DRAFTS_DIR);
    return out;
  }

  /** The text of one draft. Refuses any path that is not a draft file. */
  readDraftFile(path: string): string {
    if (!isDraftPath(path) || !existsSync(join(this.root, path)))
      throw new Error(`no draft "${path}"`);
    return readFileSync(join(this.root, path), "utf8");
  }

  /** Keep unsaved edits (or drop them, with null) in `.layout-drafts/`. */
  draft(id: string, json: TiledMapJson | null): void {
    if (!/^[a-z0-9][a-z0-9-]*$/.test(id)) throw new Error(`bad map id "${id}"`);
    if (json === null) {
      rmSync(this.draftPath(id), { force: true });
      return;
    }
    mkdirSync(join(this.root, DRAFTS), { recursive: true });
    writeFileSync(this.draftPath(id), JSON.stringify(json));
  }
}

const body = (req: IncomingMessage): Promise<string> =>
  new Promise((resolve, reject) => {
    let data = "";
    req.on("data", (c: Buffer) => (data += c.toString()));
    req.on("end", () => resolve(data));
    req.on("error", reject);
  });

const send = (res: ServerResponse, status: number, value: unknown): void => {
  res.statusCode = status;
  res.setHeader("content-type", "application/json");
  res.end(JSON.stringify(value));
};

/** The connect handler for the three routes. Calls `next` for any other path. */
export function layoutHandler(root: string) {
  const store = new LayoutStore(root);
  return async (
    req: IncomingMessage,
    res: ServerResponse,
    next: () => void,
  ): Promise<void> => {
    const url = new URL(req.url ?? "/", "http://localhost");
    try {
      if (url.pathname === READ_ROUTE && req.method === "GET")
        return send(res, 200, store.read(url.searchParams.get("id") ?? ""));
      if (url.pathname === DRAFT_LIST_ROUTE && req.method === "GET")
        return send(res, 200, store.listDrafts());
      if (url.pathname === DRAFT_FILE_ROUTE && req.method === "GET")
        return send(res, 200, {
          text: store.readDraftFile(url.searchParams.get("path") ?? ""),
        });
      if (url.pathname === SAVE_ROUTE && req.method === "POST") {
        const b = JSON.parse(await body(req)) as {
          id: string;
          json: TiledMapJson;
          baseHash: string;
        };
        const r = await store.save(b.id, b.json, b.baseHash);
        return send(res, r.ok ? 200 : r.status, r);
      }
      if (url.pathname === DRAFT_ROUTE && req.method === "POST") {
        const b = JSON.parse(await body(req)) as {
          id: string;
          json: TiledMapJson | null;
        };
        store.draft(b.id, b.json);
        return send(res, 200, { ok: true });
      }
    } catch (e) {
      return send(res, 400, { ok: false, error: (e as Error).message });
    }
    next();
  };
}
