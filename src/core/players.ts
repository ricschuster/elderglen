import { Energy } from "./energy";
import { Inventory } from "./inventory";
import { Skills } from "./skills";
import type { ToolTiers } from "./upgrades";

/** A player's id within one world. Stable for the life of the save (note 53). */
export type PlayerId = string;

/** The id of the host, and of the only player in a single-player game. */
export const LOCAL_PLAYER: PlayerId = "p1";

/** Water in a full can at the start (note 103). */
export const START_CAN_WATER = 40;

/**
 * One player's own things: what the shared world does not hold (note 53, "What
 * is shared and what is per player"). Small on purpose; the spike measured
 * hundreds of bytes per record. Free of Phaser and the DOM.
 */
export interface PlayerRecord {
  id: PlayerId;
  /** Money of this player. Used when the host chose separate wallets; else the shared wallet is the host's. */
  money: number;
  inventory: Inventory;
  skills: Skills;
  /** Tier of the hoe, can, pickaxe and axe, 0 for basic. */
  toolTiers: ToolTiers;
  /** Water left in the can. */
  canWater: number;
  /** Energy and its ceiling. Single player shares this object with `Day.energy`. */
  energy: Energy;
}

export function newPlayer(
  id: PlayerId,
  money: number,
  energy: Energy = new Energy(),
): PlayerRecord {
  return {
    id,
    money,
    inventory: new Inventory(),
    skills: new Skills(),
    toolTiers: { hoe: 0, can: 0, pickaxe: 0, axe: 0 },
    canWater: START_CAN_WATER,
    energy,
  };
}

/** The player records of one world, keyed by id. The host is first. */
export class Players {
  private readonly byId = new Map<PlayerId, PlayerRecord>();
  /** The player this device controls. */
  localId: PlayerId = LOCAL_PLAYER;

  /** `energy` is the first player's energy object (the day's, in single player). */
  constructor(startMoney: number, energy?: Energy) {
    this.add(LOCAL_PLAYER, startMoney, energy);
  }

  add(id: PlayerId, money: number, energy?: Energy): PlayerRecord {
    if (this.byId.has(id)) throw new Error(`player ${id} already exists`);
    const p = newPlayer(id, money, energy);
    this.byId.set(id, p);
    return p;
  }

  remove(id: PlayerId): boolean {
    if (id === LOCAL_PLAYER) return false;
    return this.byId.delete(id);
  }

  has(id: PlayerId): boolean {
    return this.byId.has(id);
  }

  /** The record of a player, or a thrown error for an unknown id. */
  get(id: PlayerId): PlayerRecord {
    const p = this.byId.get(id);
    if (!p) throw new Error(`no player ${id}`);
    return p;
  }

  /** The record of the player on this device. */
  get local(): PlayerRecord {
    return this.get(this.localId);
  }

  get ids(): PlayerId[] {
    return [...this.byId.keys()];
  }

  get count(): number {
    return this.byId.size;
  }

  each(): PlayerRecord[] {
    return [...this.byId.values()];
  }
}

/** The local player's record as readable and writable fields, for `GameState`. */
export function localView(players: Players): {
  money: number;
  inventory: Inventory;
  skills: Skills;
  toolTiers: ToolTiers;
  canWater: number;
} {
  return {
    get money() {
      return players.local.money;
    },
    set money(v: number) {
      players.local.money = v;
    },
    get inventory() {
      return players.local.inventory;
    },
    set inventory(v: Inventory) {
      players.local.inventory = v;
    },
    get skills() {
      return players.local.skills;
    },
    set skills(v: Skills) {
      players.local.skills = v;
    },
    get toolTiers() {
      return players.local.toolTiers;
    },
    set toolTiers(v: ToolTiers) {
      players.local.toolTiers = v;
    },
    get canWater() {
      return players.local.canWater;
    },
    set canWater(v: number) {
      players.local.canWater = v;
    },
  };
}
