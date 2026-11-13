import pondData from "../content/pond.json";
import { FISH } from "./fishing";
import { FORAGE } from "./forage";
import { SHELLFISH } from "./pots";

/**
 * What a fish pond may hold (`docs/design/93_fish_pond_and_water_finds.md`):
 * any fish caught with a rod or a pot, the legends included, and the sea urchin
 * and coral of the sea forage items. Never a water find. This list has no
 * dependency on `items.ts`, so that file can add a roe item for each species.
 */
export interface PondSpecies {
  id: string;
  name: string;
  sellPrice: number;
  /** Which quest group asks for items: fresh water or the sea. */
  group: "fresh" | "sea";
  legend: boolean;
}

export const POND_SPECIES: PondSpecies[] = [
  ...FISH.map((f) => ({
    id: f.id,
    name: f.name,
    sellPrice: f.sellPrice,
    group: (f.water === "sea" ? "sea" : "fresh") as "fresh" | "sea",
    legend: f.rarity === "legend",
  })),
  ...SHELLFISH.map((s) => ({
    id: s.id,
    name: s.name,
    sellPrice: s.sellPrice,
    group: (s.water === "salt" ? "sea" : "fresh") as "fresh" | "sea",
    legend: false,
  })),
  ...FORAGE.filter((f) =>
    (pondData.extraSpecies as string[]).includes(f.id),
  ).map((f) => ({
    id: f.id,
    name: f.name,
    sellPrice: f.sellPrice,
    group: "sea" as const,
    legend: false,
  })),
];

export const speciesById = (id: string | undefined) =>
  POND_SPECIES.find((s) => s.id === id);

/** The roe item of a species (`<id>-roe`). Half the fish's price, a placeholder of ours. */
export const roeOf = (id: string): string => `${id}-roe`;
export const roePrice = (s: PondSpecies): number => Math.floor(s.sellPrice / 2);

/** Aged roe (preserves jar): `<id>-aged-roe`, twice the roe's price (Stardew, from memory, SC-170). */
export const agedRoeOf = (id: string): string => `${id}-aged-roe`;
export const agedRoePrice = (s: PondSpecies): number => 2 * roePrice(s);
/** The species whose roe or aged roe an item is, if it is one. */
export function roeSpeciesOf(item: string): string | undefined {
  const m = /^(.+?)(?:-aged)?-roe$/.exec(item);
  return m && speciesById(m[1]) ? m[1] : undefined;
}
