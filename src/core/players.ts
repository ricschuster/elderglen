import { Energy } from "./energy";
import { Inventory } from "./inventory";
import { Skills } from "./skills";
import { SKILLS } from "./skills";
import { MAX_TIER, UPGRADABLE, type ToolTiers } from "./upgrades";

/** A player's id within one world. Stable for the life of the save (note 53). */
export type PlayerId = string;

/** The id of the host, and of the only player in a single-player game. */
export const LOCAL_PLAYER: PlayerId = "p1";

/** Water in a full can at the start (note 103). */
const START_CAN_WATER = 40;

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

/** How gold is held: one pool for the farm, or each player's own (note 53, money mode). */
export type WalletMode = "shared" | "separate";

export const WALLET_MODES: readonly WalletMode[] = ["shared", "separate"];

/** The player records of one world, keyed by id. The host is first. */
export class Players {
  private readonly byId = new Map<PlayerId, PlayerRecord>();
  /** The player this device controls. */
  localId: PlayerId = LOCAL_PLAYER;
  /** Chosen at game creation. Shared pools every player's gold into the host's record. */
  walletMode: WalletMode = "shared";

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

  /** The record whose `money` is this player's gold: their own, or the host's when shared. */
  wallet(id: PlayerId): PlayerRecord {
    return this.walletMode === "shared" ? this.get(LOCAL_PLAYER) : this.get(id);
  }

  /** Gold available to a player. */
  balance(id: PlayerId): number {
    return this.wallet(id).money;
  }

  /** Pay a player, into the shared pool when shared. Returns the new balance. */
  pay(id: PlayerId, amount: number): number {
    const w = this.wallet(id);
    w.money += amount;
    return w.money;
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
      return players.wallet(players.localId).money;
    },
    set money(v: number) {
      players.wallet(players.localId).money = v;
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

/** One player's record as saved (note 52). The host's flat fields stay in the save too. */
export interface PlayerSave {
  id: PlayerId;
  money: number;
  inventory: ReturnType<Inventory["save"]>;
  skills: ReturnType<Skills["save"]>;
  professions: ReturnType<Skills["saveProfessions"]>;
  topProfessions: ReturnType<Skills["saveTopProfessions"]>;
  toolTiers: ToolTiers;
  canWater: number;
  energy: number;
  /** Energy hit 0 today, and a skill leveled up today (optional: older saves lack them). */
  exhausted?: boolean;
  levelled?: boolean;
}

export function savePlayer(p: PlayerRecord): PlayerSave {
  return {
    id: p.id,
    money: p.money,
    inventory: p.inventory.save(),
    skills: p.skills.save(),
    professions: p.skills.saveProfessions(),
    topProfessions: p.skills.saveTopProfessions(),
    toolTiers: { ...p.toolTiers },
    canWater: p.canWater,
    energy: p.energy.current,
    ...(p.energy.wasExhausted ? { exhausted: true } : {}),
    ...(p.skills.levelledToday ? { levelled: true } : {}),
  };
}

const isCount = (v: unknown): v is number =>
  typeof v === "number" && Number.isInteger(v) && v >= 0;
const isObj = (v: unknown): v is Record<string, unknown> =>
  typeof v === "object" && v !== null && !Array.isArray(v);

/**
 * Read a saved guest record into `players` (not the host: its fields load from
 * the flat part of the save). A malformed record is skipped, fields it lacks
 * take the new-player defaults. Returns true when a record was added.
 */
export function loadPlayerInto(players: Players, raw: unknown): boolean {
  if (!isObj(raw) || typeof raw.id !== "string" || raw.id === "") return false;
  if (raw.id === LOCAL_PLAYER || players.has(raw.id)) return false;
  const p = players.add(raw.id, isCount(raw.money) ? raw.money : 0);
  if (Array.isArray(raw.inventory)) {
    const ok = raw.inventory.every(
      (s) =>
        s === null ||
        (isObj(s) && typeof s.id === "string" && isCount(s.count)),
    );
    if (ok) p.inventory.load(raw.inventory as ReturnType<Inventory["save"]>);
  }
  if (isObj(raw.skills)) {
    const sk = raw.skills;
    const levels = {} as Record<(typeof SKILLS)[number], number>;
    for (const k of SKILLS) levels[k] = isCount(sk[k]) ? sk[k] : 0;
    p.skills.load(levels);
  }
  if (isObj(raw.toolTiers))
    for (const t of UPGRADABLE) {
      const v = raw.toolTiers[t];
      if (isCount(v)) p.toolTiers[t] = Math.min(v, MAX_TIER);
    }
  if (isCount(raw.canWater)) p.canWater = raw.canWater;
  if (typeof raw.energy === "number" && Number.isFinite(raw.energy))
    p.energy.current = Math.min(raw.energy, p.energy.max);
  p.energy.wasExhausted = raw.exhausted === true;
  p.skills.levelledToday = raw.levelled === true;
  return true;
}
