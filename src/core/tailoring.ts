import dyeData from "../content/dyes.json";
import tailorData from "../content/tailoring.json";
import { CLOTH, DYE_INPUTS, artisanById } from "./artisan";
import {
  pieceById,
  clampTint,
  type PieceKind,
  type TailorKind,
  type Tint,
} from "./clothes";
import { TAILORED_SEP, bootsById, tailoredParts } from "./equipment";
import { hatById } from "./hats";
import { roeSpeciesOf } from "./pondspecies";
import { splitQuality } from "./quality";
import type { GameState } from "./save";
import { hasFlag } from "./worldflags";

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

// ---- boots

/** The base pair that gives a pair its look (a custom pair keeps its look pair). */
const lookOf = (id: string): string => tailoredParts(id)?.[0] ?? id;
/** The base pair whose stats a pair carries. */
const statsOf = (id: string): string => tailoredParts(id)?.[1] ?? id;

const isBoots = (id: string): boolean => bootsById(id) !== undefined;

/**
 * Why a pair of boots cannot be tailored, or undefined when it can. The feed pair
 * keeps its look and name; the spool pair gives its stats and is used up. No cloth
 * (owner, 2026-11-12; which slot is which is unchecked, SC-170). Only pairs in the
 * pack count, so a worn pair must come off first.
 */
export function bootsTailorProblem(
  g: GameState,
  feed: string,
  spool: string,
): string | undefined {
  if (!isBoots(feed) || !isBoots(spool))
    return "Only a pair of boots can go in both.";
  if (feed === spool && g.inventory.count(feed) < 2)
    return "You need two different pairs.";
  if (g.inventory.count(feed) < 1 || g.inventory.count(spool) < 1)
    return "Both pairs must be in your pack.";
  if (statsOf(feed) === statsOf(spool))
    return "Both pairs already have the same stats.";
  return undefined;
}

export type TailorBootsResult =
  { ok: true; id: string; name: string } | { ok: false; reason: string };

/**
 * Move the stats of the spool pair onto the feed pair. The spool pair is used up and
 * the feed pair becomes "Custom-tailored [name]". Free of cloth.
 */
export function tailorBoots(
  g: GameState,
  feed: string,
  spool: string,
): TailorBootsResult {
  const problem = bootsTailorProblem(g, feed, spool);
  if (problem) return { ok: false, reason: problem };
  const look = lookOf(feed);
  const stats = statsOf(spool);
  const id = look === stats ? look : `${look}${TAILORED_SEP}${stats}`;
  g.inventory.remove(feed, 1);
  g.inventory.remove(spool, 1);
  g.inventory.add(id, 1);
  return { ok: true, id, name: bootsById(id)!.name };
}

/** Every pair of boots in the pack, for the screen. */
export function packBoots(g: GameState): string[] {
  const out: string[] = [];
  for (let i = 0; i < g.inventory.size; i++) {
    const slot = g.inventory.slot(i);
    if (slot && isBoots(slot.id) && !out.includes(slot.id)) out.push(slot.id);
  }
  return out;
}

// ---- dye pots

/** The six pots, in order (note 96, SC-95). */
export const POT_COLOURS: readonly string[] = dyeData.potColours;
const POT_ALIAS = dyeData.potAlias as Record<string, string>;
const POT_INPUTS = dyeData.potInputs as Record<string, string>;

/** Artisan kinds whose id is `<ingredient>-<kind>` (`artisanId`), so they take the ingredient's colour. */
const PROCESSED_KINDS = ["jam", "pickles", "wine", "juice", "dried"];

/** The raw colour of a processed good's ingredient (note 96): jam, pickles, wine, juice, dried. */
function processedColour(base: string): string | undefined {
  const cat = artisanById(base)?.category;
  if (!cat || !PROCESSED_KINDS.includes(cat)) return undefined;
  const input = base.slice(0, base.length - cat.length - 1);
  return POT_INPUTS[input] ?? DYE_INPUTS[input];
}

/** The pot colour an item stains, if any. Plants follow the dye vat table; quality is ignored. */
export function potColourOf(item: string): string | undefined {
  const base = splitQuality(item).base;
  // Roe and aged roe take the colour of their fish (notes 24, 93).
  const fish = roeSpeciesOf(base);
  const c =
    POT_INPUTS[fish ?? base] ??
    DYE_INPUTS[fish ?? base] ??
    processedColour(base);
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

/**
 * The story flag set by Cordelia's 4 heart event (`cordelia-machine-4`, notes 62 and 96).
 * Older saves may hold the same name as a world flag from the retired first-cloth line.
 */
export const TAILORING_OPEN = "tailoring-open";
export const SEWING_SERVICE = "sewing-machine";
export const DYE_POTS_SERVICE = "dye-pots";

/**
 * Facing the machine or the pots. Until Cordelia's 4 heart event has set the flag the
 * machine is hers; after it, it is open for good (no skill gate). A world flag of the same
 * name, from the retired first-cloth line, still opens it so old saves keep their machine.
 * Returns a line to show, or undefined when the screen opens.
 */
export function tailoringLine(g: GameState): string | undefined {
  if (hasFlag(g, TAILORING_OPEN) || g.heartEvents.hasFlag(TAILORING_OPEN))
    return undefined;
  return "Cordelia's sewing machine, a basket of spools beside it. She keeps it to herself for now, and it does not look like it is for sale.";
}
