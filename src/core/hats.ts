import hatData from "../content/hats.json";
import { clampTint, pieceById, type PieceKind, type Tint } from "./clothes";

/**
 * Hats (`docs/design/10_customisation.md`): cosmetic only, drawn on the player.
 * Content lives in `src/content/hats.json`. A hat comes from a festival, as a
 * gift or from its counter (`festivals.ts`).
 */
export interface HatDef {
  id: string;
  name: string;
  /** Placeholder colour for the world sprite, as `#rrggbb`. */
  color: string;
}

export const HATS = hatData as HatDef[];

export function hatById(id: string): HatDef | undefined {
  return HATS.find((h) => h.id === id);
}

/** The key a tint is saved under: `hat:id`, `shirt:id` or `pants:id`. */
export const tintKey = (kind: "hat" | PieceKind, id: string): string =>
  `${kind}:${id}`;

/** The hats, shirts and pants the player owns, and the one of each worn, if any. */
export class Wardrobe {
  private owned: string[] = [];
  worn: string | undefined = undefined;
  private shirts: string[] = [];
  private pants: string[] = [];
  shirtWorn: string | undefined = undefined;
  pantsWorn: string | undefined = undefined;
  /** Dye colours of dyed pieces (note 96). */
  private tints = new Map<string, Tint>();

  /** Owned hat ids, in the order they were got. */
  list(): string[] {
    return [...this.owned];
  }

  has(id: string): boolean {
    return this.owned.includes(id);
  }

  /** Add a hat. Returns false for an unknown hat or one already owned. */
  add(id: string): boolean {
    if (!hatById(id) || this.has(id)) return false;
    this.owned.push(id);
    return true;
  }

  /** Wear an owned hat, or undefined to go bare headed. False if not owned. */
  wear(id: string | undefined): boolean {
    if (id !== undefined && !this.has(id)) return false;
    this.worn = id;
    return true;
  }

  /** Owned shirt or pants ids, in the order they were got. */
  listPieces(kind: PieceKind): string[] {
    return [...(kind === "shirt" ? this.shirts : this.pants)];
  }

  hasPiece(kind: PieceKind, id: string): boolean {
    return (kind === "shirt" ? this.shirts : this.pants).includes(id);
  }

  /** Add a shirt or pants. False for an unknown piece or one already owned. */
  addPiece(kind: PieceKind, id: string): boolean {
    if (!pieceById(kind, id) || this.hasPiece(kind, id)) return false;
    (kind === "shirt" ? this.shirts : this.pants).push(id);
    return true;
  }

  /** Wear an owned piece, or undefined to take it off. False if not owned. */
  wearPiece(kind: PieceKind, id: string | undefined): boolean {
    if (id !== undefined && !this.hasPiece(kind, id)) return false;
    if (kind === "shirt") this.shirtWorn = id;
    else this.pantsWorn = id;
    return true;
  }

  /** The worn piece of a kind: the hat, the shirt or the pants. */
  wornOf(kind: "hat" | PieceKind): string | undefined {
    return kind === "hat"
      ? this.worn
      : kind === "shirt"
        ? this.shirtWorn
        : this.pantsWorn;
  }

  tintOf(kind: "hat" | PieceKind, id: string): Tint | undefined {
    return this.tints.get(tintKey(kind, id));
  }

  /** Dye a piece (or undo the dye with undefined). The caller checks ownership. */
  setTint(kind: "hat" | PieceKind, id: string, tint: Tint | undefined): void {
    if (tint) this.tints.set(tintKey(kind, id), clampTint(tint));
    else this.tints.delete(tintKey(kind, id));
  }

  save(): WardrobeSave {
    return {
      owned: [...this.owned],
      worn: this.worn,
      ...(this.shirts.length ? { shirts: [...this.shirts] } : {}),
      ...(this.pants.length ? { pants: [...this.pants] } : {}),
      ...(this.shirtWorn ? { shirtWorn: this.shirtWorn } : {}),
      ...(this.pantsWorn ? { pantsWorn: this.pantsWorn } : {}),
      ...(this.tints.size ? { tints: Object.fromEntries(this.tints) } : {}),
    };
  }

  /** Restore from a save, dropping unknown pieces and a worn piece not owned. */
  load(raw: unknown): void {
    this.owned = [];
    this.worn = undefined;
    this.shirts = [];
    this.pants = [];
    this.shirtWorn = undefined;
    this.pantsWorn = undefined;
    this.tints = new Map();
    if (typeof raw !== "object" || raw === null) return;
    const data = raw as Partial<WardrobeSave>;
    if (Array.isArray(data.owned))
      for (const id of data.owned) if (typeof id === "string") this.add(id);
    if (typeof data.worn === "string" && this.has(data.worn))
      this.worn = data.worn;
    for (const kind of ["shirt", "pants"] as const) {
      const ids = kind === "shirt" ? data.shirts : data.pants;
      if (Array.isArray(ids))
        for (const id of ids)
          if (typeof id === "string") this.addPiece(kind, id);
      const w = kind === "shirt" ? data.shirtWorn : data.pantsWorn;
      if (typeof w === "string") this.wearPiece(kind, w);
    }
    if (typeof data.tints === "object" && data.tints !== null)
      for (const [key, t] of Object.entries(data.tints)) {
        const [kind, id] = key.split(":");
        const owned =
          kind === "hat"
            ? this.has(id ?? "")
            : (kind === "shirt" || kind === "pants") &&
              this.hasPiece(kind, id ?? "");
        const ok =
          owned &&
          typeof t === "object" &&
          t !== null &&
          [t.h, t.s, t.v].every((n) => typeof n === "number" && isFinite(n));
        if (ok) this.tints.set(key, clampTint(t));
      }
  }
}

export interface WardrobeSave {
  owned: string[];
  worn: string | undefined;
  shirts?: string[];
  pants?: string[];
  shirtWorn?: string;
  pantsWorn?: string;
  tints?: Record<string, Tint>;
}
