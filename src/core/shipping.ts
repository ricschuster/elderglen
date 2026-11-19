import { itemById } from "./items";
import type { Inventory } from "./inventory";
import { isOre } from "./ore";
import { LOCAL_PLAYER, type PlayerId, type Players } from "./players";

/** Goods of one kind shipped at one locked unit price. */
export interface BinLine {
  id: string;
  count: number;
  /** Money for one item, fixed when it went into the bin. */
  unit: number;
  /** Who shipped it and is paid for it. Absent in older saves: the host. */
  by?: PlayerId;
}

export interface BinSave {
  lines: BinLine[];
  /** Items ever shipped, by id. A later collection page reads this. */
  shipped: Record<string, number>;
}

/** What the bin paid out at the end of a day. */
export interface Settlement {
  lines: BinLine[];
  total: number;
  /** What each shipper earned, by player id. */
  byPlayer: Record<PlayerId, number>;
}

/**
 * The shipping bin (`docs/design/28_shipping_bin.md`). Goods go in during the
 * day at a price fixed on shipping, can be taken back until the player sleeps,
 * and are paid for when the day ends.
 */
export class ShippingBin {
  private lines: BinLine[] = [];
  private shipped: Record<string, number> = {};

  each(): readonly BinLine[] {
    return this.lines;
  }

  get isEmpty(): boolean {
    return this.lines.length === 0;
  }

  /** Money the bin will pay tonight, to everyone or to one shipper. */
  total(by?: PlayerId): number {
    return this.lines
      .filter((l) => by === undefined || (l.by ?? LOCAL_PLAYER) === by)
      .reduce((n, l) => n + l.count * l.unit, 0);
  }

  /** How many of an item have ever been shipped. */
  shippedCount(id: string): number {
    return this.shipped[id] ?? 0;
  }

  /**
   * Move up to `n` of an item from the backpack into the bin at `multiplier`
   * times its price. Returns how many went in, 0 for an unknown item.
   */
  ship(
    inv: Inventory,
    id: string,
    n: number,
    multiplier = 1,
    by: PlayerId = LOCAL_PLAYER,
  ): number {
    const def = itemById(id);
    const count = Math.min(Math.floor(n), inv.count(id));
    if (!def || def.keep || count <= 0 || !inv.remove(id, count)) return 0;
    const unit = Math.floor(def.sellPrice * multiplier);
    const line = this.lines.find(
      (l) => l.id === id && l.unit === unit && (l.by ?? LOCAL_PLAYER) === by,
    );
    if (line) line.count += count;
    else this.lines.push({ id, count, unit, by });
    return count;
  }

  /**
   * Ship into the mine hall's bin: the same bin and the same nightly payment,
   * but it takes raw ore only (note 22). Returns how many went in.
   */
  shipOre(
    inv: Inventory,
    id: string,
    n: number,
    multiplier = 1,
    by: PlayerId = LOCAL_PLAYER,
  ): number {
    return isOre(id) ? this.ship(inv, id, n, multiplier, by) : 0;
  }

  /**
   * Move up to `n` of a line back into the backpack, as far as there is room.
   * Returns how many came back.
   */
  takeBack(inv: Inventory, index: number, n: number): number {
    const line = this.lines[index];
    if (!line) return 0;
    const count = Math.min(Math.floor(n), line.count, inv.room(line.id));
    if (count <= 0 || !inv.add(line.id, count)) return 0;
    line.count -= count;
    if (line.count === 0) this.lines.splice(index, 1);
    return count;
  }

  /**
   * Pay for everything in the bin and empty it. With a `Players` each shipper is
   * paid their own lines (into the pool when wallets are shared); with a plain
   * wallet everything goes to it (single player).
   */
  settle(payTo: { money: number } | Players): Settlement {
    const lines = this.lines.map((l) => ({ ...l }));
    const total = this.total();
    const byPlayer: Record<PlayerId, number> = {};
    for (const l of lines) {
      const who = l.by ?? LOCAL_PLAYER;
      byPlayer[who] = (byPlayer[who] ?? 0) + l.count * l.unit;
    }
    if ("pay" in payTo && typeof payTo.pay === "function") {
      for (const [who, n] of Object.entries(byPlayer))
        if (payTo.has(who)) payTo.pay(who, n);
        else payTo.pay(LOCAL_PLAYER, n);
    } else (payTo as { money: number }).money += total;
    for (const l of lines)
      this.shipped[l.id] = (this.shipped[l.id] ?? 0) + l.count;
    this.lines = [];
    return { lines, total, byPlayer };
  }

  save(): BinSave {
    return {
      lines: this.lines.map((l) => ({ ...l })),
      shipped: { ...this.shipped },
    };
  }

  load(data: BinSave): void {
    this.lines = data.lines.map((l) => ({ ...l }));
    this.shipped = { ...data.shipped };
  }
}
