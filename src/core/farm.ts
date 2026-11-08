import { cropById } from "./crops";
import { fertilizerById } from "./fertilizer";
import type { Season } from "./calendar";

export interface Plot {
  tilled: boolean;
  crop?: { id: string; daysGrown: number; harvests: number };
  wateredToday: boolean;
  /** The fertilizer mixed into this soil, until the season ends. */
  fertilizer?: string;
}

const key = (x: number, y: number) => `${x},${y}`;

/** Slack for fractional growth, such as 9 days at 10 percent faster. */
const EPSILON = 1e-9;

/** The farm's soil and crops. Pure rules; the scene draws it. */
export class Farm {
  private plots = new Map<string, Plot>();

  /**
   * An indoor plot (the greenhouse, `docs/design/31_farm_growth.md`): crops
   * grow in any season, never wither when it changes, and fertilizer stays.
   * Watering is still the player's (or a sprinkler's) job, and rain does not reach it.
   */
  constructor(readonly indoors = false) {}

  /** Plots keyed by "x,y", as plain data. */
  save(): Record<string, Plot> {
    return structuredClone(Object.fromEntries(this.plots));
  }

  load(saved: Record<string, Plot>): void {
    this.plots = new Map(Object.entries(structuredClone(saved)));
  }

  /** Every plot with its tile, for drawing. */
  *each(): Generator<{ x: number; y: number; plot: Plot }> {
    for (const [k, plot] of this.plots) {
      const [x, y] = k.split(",").map(Number) as [number, number];
      yield { x, y, plot };
    }
  }

  plotAt(x: number, y: number): Plot | undefined {
    return this.plots.get(key(x, y));
  }

  /** Dig the ground. Returns false if it is already tilled. */
  till(x: number, y: number): boolean {
    if (this.plotAt(x, y)) return false;
    this.plots.set(key(x, y), { tilled: true, wateredToday: false });
    return true;
  }

  /** Remove empty tilled soil (and any fertilizer in it). False, and nothing changed, if there is none or a crop grows there. */
  clearEmpty(x: number, y: number): boolean {
    const plot = this.plotAt(x, y);
    if (!plot || plot.crop) return false;
    return this.plots.delete(key(x, y));
  }

  /** Plant a seed in tilled, empty soil. Fails out of season, except indoors. */
  plant(x: number, y: number, cropId: string, season: Season): boolean {
    const plot = this.plotAt(x, y);
    const def = cropById(cropId);
    if (!plot || plot.crop || !def) return false;
    if (!this.indoors && !def.seasons.includes(season)) return false;
    plot.crop = { id: cropId, daysGrown: 0, harvests: 0 };
    return true;
  }

  /**
   * Mix a fertilizer into tilled soil. Returns undefined on success, or why
   * not. One per tile. Quality and retaining soil go in before the seed
   * sprouts; speed fertilizer any time (saved Fertilizer page).
   */
  fertilize(x: number, y: number, id: string): string | undefined {
    const plot = this.plotAt(x, y);
    const def = fertilizerById(id);
    if (!plot || !def) return "nothing to fertilize";
    if (plot.fertilizer) return "already fertilized";
    if (def.line !== "speed" && plot.crop && plot.crop.daysGrown > 0)
      return "too late to fertilize";
    plot.fertilizer = id;
    return undefined;
  }

  /** Water every plot, as rain does. */
  waterAll(): void {
    for (const plot of this.plots.values()) plot.wateredToday = true;
  }

  /** True if the plot holds a crop ready to harvest. */
  isRipe(x: number, y: number): boolean {
    const crop = this.plotAt(x, y)?.crop;
    const def = crop && cropById(crop.id);
    return !!crop && !!def && crop.daysGrown >= def.growDays - EPSILON;
  }

  /** Number of crops growing on the farm. */
  get cropCount(): number {
    let n = 0;
    for (const p of this.plots.values()) if (p.crop) n += 1;
    return n;
  }

  /** Water a plot. Returns false if there is nothing to water. */
  water(x: number, y: number): boolean {
    const plot = this.plotAt(x, y);
    if (!plot) return false;
    plot.wateredToday = true;
    return true;
  }

  /** Harvest a ripe crop. Returns the crop id, or undefined if not ripe. */
  harvest(x: number, y: number): string | undefined {
    const plot = this.plotAt(x, y);
    const crop = plot?.crop;
    const def = crop && cropById(crop.id);
    if (!plot || !crop || !def || crop.daysGrown < def.growDays - EPSILON)
      return undefined;
    if (def.regrowDays !== undefined) {
      crop.daysGrown = def.growDays - def.regrowDays;
      crop.harvests += 1;
    } else {
      delete plot.crop;
    }
    return def.id;
  }

  /**
   * Overnight: watered crops grow a day, then all plots dry out, except where
   * retaining soil keeps them wet on a chance. Crops whose season has ended
   * wither. Pass the season of the new day, and whether it is a new season:
   * fertilizer wears off then, unless a crop that grows in the new season is
   * still in the soil. Speed fertilizer adds to `growth`.
   */
  endDay(
    newSeason: Season,
    growth = 1,
    random: () => number = Math.random,
    seasonChanged = false,
  ): void {
    for (const plot of this.plots.values()) {
      const crop = plot.crop;
      if (crop) {
        const def = cropById(crop.id);
        if (!def || (!this.indoors && !def.seasons.includes(newSeason)))
          delete plot.crop;
        else if (plot.wateredToday)
          crop.daysGrown +=
            growth + (fertilizerById(plot.fertilizer)?.growthBonus ?? 0);
      }
      const keep = fertilizerById(plot.fertilizer)?.keepWet;
      plot.wateredToday = keep !== undefined && random() < keep;
      if (seasonChanged && !plot.crop && !this.indoors) delete plot.fertilizer;
    }
  }
}
