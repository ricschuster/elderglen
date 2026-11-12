import dyeData from "../content/dyes.json";
import tailorData from "../content/tailoring.json";
import { CLOTH, DYE_INPUTS } from "./artisan";
import {
  pieceById,
  clampTint,
  type PieceKind,
  type TailorKind,
  type Tint,
} from "./clothes";
import { hatById } from "./hats";
import { splitQuality } from "./quality";
import type { GameState } from "./save";
import { hasFlag, setFlag } from "./worldflags";

/**
 * Tailoring (`docs/design/96_tailoring.md`): the sewing machine and the dye pots in the
 * Hatter's house. One cloth in the feed and one item in the spool make one piece; the
 * spool item picks the piece (`content/tailoring.json`). Pieces go to the wardrobe. Pure
 * rules, placeholder numbers.
 */
/** Cloth a piece costs (placeholder, note 96). */
export const CLOTH_COST = tailorData.clothCost;

export interface SpoolRow {
  item: string;
  kind: TailorKind;
  id: string;
}
export const SPOOL = tailorData.spool as SpoolRow[];

/** The piece a spool item makes, ignoring quality, if it makes any. */
export const spoolRowOf = (item: string): SpoolRow | undefined => {
  const base = splitQuality(item).base;
  return SPOOL.find((r) => r.item === base);
};

export const pieceName = (kind: TailorKind, id: string): string =>
  (kind === "hat" ? hatById(id) : pieceById(kind, id))?.name ?? id;

const owns = (g: GameState, kind: TailorKind, id: string): boolean =>
  kind === "hat" ? g.wardrobe.has(id) : g.wardrobe.hasPiece(kind, id);

export type SewResult =
  | { ok: true; kind: TailorKind; id: string; name: string }
  | { ok: false; reason: string };

/**
 * Why a spool item cannot be sewn now, or undefined when it can. The refusal lines
 * are the player's text.
 */
export function sewProblem(g: GameState, spool: string): string | undefined {
  const row = spoolRowOf(spool);
  if (!row) return "The machine has no pattern for that.";
  if (g.inventory.count(CLOTH) < CLOTH_COST)
    return `You need ${CLOTH_COST} cloth in the feed.`;
  if (g.inventory.count(spool) < 1) return "You have none of that to spool.";
  if (owns(g, row.kind, row.id))
    return `You already have the ${pieceName(row.kind, row.id).toLowerCase()}.`;
  return undefined;
}

/** Sew a piece: the cloth and the spool item are used up, the piece goes to the wardrobe. */
export function sew(g: GameState, spool: string): SewResult {
  const problem = sewProblem(g, spool);
  if (problem) return { ok: false, reason: problem };
  const row = spoolRowOf(spool)!;
  g.inventory.remove(CLOTH, CLOTH_COST);
  g.inventory.remove(spool, 1);
  if (row.kind === "hat") g.wardrobe.add(row.id);
  else g.wardrobe.addPiece(row.kind, row.id);
  return {
    ok: true,
    kind: row.kind,
    id: row.id,
    name: pieceName(row.kind, row.id),
  };
}

/** Every spool item the player carries that the machine can sew, for the screen. */
export function sewableSpool(g: GameState): string[] {
  const out: string[] = [];
  for (let i = 0; i < g.inventory.size; i++) {
    const slot = g.inventory.slot(i);
    if (slot && spoolRowOf(slot.id) && !out.includes(slot.id))
      out.push(slot.id);
  }
  return out;
}

// ---- dye pots

/** The six pots, in order (note 96, SC-95). */
export const POT_COLOURS: readonly string[] = dyeData.potColours;
const POT_ALIAS = dyeData.potAlias as Record<string, string>;
const POT_INPUTS = dyeData.potInputs as Record<string, string>;

/** The pot colour an item stains, if any. Plants follow the dye vat table; quality is ignored. */
export function potColourOf(item: string): string | undefined {
  const base = splitQuality(item).base;
  const c = POT_INPUTS[base] ?? DYE_INPUTS[base];
  if (!c) return undefined;
  return POT_COLOURS.includes(c) ? c : POT_ALIAS[c];
}

/**
 * Dye a worn piece. `pots` holds one item per pot, in `POT_COLOURS` order, each of that
 * pot's colour; all six are used up. `tint` is the slider result. Returns a refusal line,
 * or undefined when dyed.
 */
export function dyePiece(
  g: GameState,
  kind: TailorKind,
  id: string,
  pots: readonly string[],
  tint: Tint,
): string | undefined {
  if (!owns(g, kind, id)) return "You do not have that piece.";
  if (g.wardrobe.wornOf(kind) !== id)
    return "Wear the piece before you dye it.";
  if (pots.length !== POT_COLOURS.length) return "Every pot needs one item.";
  const need = new Map<string, number>();
  for (let i = 0; i < pots.length; i++) {
    const item = pots[i]!;
    if (potColourOf(item) !== POT_COLOURS[i])
      return `The ${POT_COLOURS[i]} pot needs something ${POT_COLOURS[i]}.`;
    need.set(item, (need.get(item) ?? 0) + 1);
  }
  for (const [item, n] of need)
    if (g.inventory.count(item) < n) return "You do not have all six.";
  for (const [item, n] of need) g.inventory.remove(item, n);
  g.wardrobe.setTint(kind, id, clampTint(tint));
  return undefined;
}

/** Take the dye off a piece, free. */
export function undye(g: GameState, kind: TailorKind, id: string): boolean {
  if (!owns(g, kind, id) || !g.wardrobe.tintOf(kind, id)) return false;
  g.wardrobe.setTint(kind, id, undefined);
  return true;
}

export type { PieceKind };

// ---- the Hatter's house

/** The flag raised when Cordelia first shows the machine (the first cloth, note 96). */
export const TAILORING_OPEN = "tailoring-open";
export const SEWING_SERVICE = "sewing-machine";
export const DYE_POTS_SERVICE = "dye-pots";

/**
 * Facing the machine or the pots. Before the first cloth the machine is Cordelia's; with
 * cloth in the pack she lends it, once, and it is open for good (no skill gate). Returns
 * a line to show, or undefined when the screen opens.
 */
export function tailoringLine(g: GameState): string | undefined {
  if (hasFlag(g, TAILORING_OPEN)) return undefined;
  if (g.inventory.count(CLOTH) < 1)
    return "Cordelia's sewing machine, a basket of spools beside it. She says: bring me a bolt of cloth and I will show you.";
  setFlag(g, TAILORING_OPEN);
  return 'Cordelia looks at your cloth and smiles. "Feed one in here, put something on the spool, and see what comes out. The machine is yours whenever the shop is open."';
}
