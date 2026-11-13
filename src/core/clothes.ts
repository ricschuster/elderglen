import tailorData from "../content/tailoring.json";

/**
 * Shirts and pants (`docs/design/96_tailoring.md`): cosmetic pieces made at the
 * sewing machine, owned and worn through the wardrobe like hats. Content is
 * `src/content/tailoring.json`. Pure data and lookups.
 */
export type PieceKind = "shirt" | "pants";
/** What the sewing machine can make: the two pieces above and hats. */
export type TailorKind = PieceKind | "hat";

export interface PieceDef {
  id: string;
  name: string;
  /** Placeholder colour as `#rrggbb`. */
  color: string;
}

export const SHIRTS = tailorData.shirts as PieceDef[];
export const PANTS = tailorData.pants as PieceDef[];

export const piecesOf = (kind: PieceKind): PieceDef[] =>
  kind === "shirt" ? SHIRTS : PANTS;

export const pieceById = (
  kind: PieceKind,
  id: string | undefined,
): PieceDef | undefined => piecesOf(kind).find((p) => p.id === id);

/** A dye colour on a worn piece: hue 0 to 360, saturation and value 0 to 1 (note 96 sliders). */
export interface Tint {
  h: number;
  s: number;
  v: number;
}

export const clampTint = (t: Tint): Tint => ({
  h: ((Math.round(t.h) % 360) + 360) % 360,
  s: Math.min(1, Math.max(0, t.s)),
  v: Math.min(1, Math.max(0, t.v)),
});
