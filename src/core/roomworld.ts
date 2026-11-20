// The RoomWorld adapter over a real GameState (note 53, steps 2, 5, 6 and 7 together). The Room
// asks it to admit guests, apply intents, step the day end and make snapshots. Free of Phaser and
// the DOM. Only a small first set of intent kinds is wired (see `apply`).
import { DAY_END as CLOCK_END } from "./clock";
import { DayEndTracker, type DayEndDecision, type Presence } from "./dayend";
import {
  CABIN_PRICE,
  buyCabin,
  joinNeedsCabin,
  newCabinBook,
  type BlockedFn,
  type Cabin,
  type CabinBook,
  type CabinOrigin,
  type CabinSite,
  type JoinResult,
} from "./cabins";
import { weddingBlock } from "./courtship";
import {
  applyMarriageIntent,
  expireProposalsAndRefund,
} from "./marriageintents";
import * as pm from "./playermarriage";
import { PASS_OUT_MONEY_CAP, PASS_OUT_MONEY_SHARE } from "./day";
import { LOCAL_PLAYER, type PlayerId } from "./players";
import type { Intent } from "./protocol";
import { applyFarmIntent } from "./roomintents";
import type { BedStatus, NightNews, RoomWorld } from "./room";
import { serialize, START_MONEY, type GameState } from "./save";
import { sleep, type SleepReport } from "./sleep";

export interface RoomWorldOptions {
  /** How cabins come: free at a multiplayer start, or bought by the host in a converted game. */
  origin?: CabinOrigin;
  /** Open area where a free cabin may be built. */
  cabinArea?: { x: number; y: number; w: number; h: number };
  blocked?: BlockedFn;
  random?: () => number;
  /** The night's artifact spots, passed to sleep(). */
  spots?: Parameters<typeof sleep>[1];
}

/** The guest's pass-out cost: the single player rule (note 53), taken from their wallet. */
function passOutLoss(money: number): number {
  return Math.min(
    Math.floor(Math.max(money, 0) * PASS_OUT_MONEY_SHARE),
    PASS_OUT_MONEY_CAP,
  );
}

export class GameRoomWorld implements RoomWorld {
  cabins: CabinBook;
  /** Player marriages (note 12, two-player steps), kept on the host in the game state. */
  get marriages(): pm.PlayerMarriageBook {
    return this.g.playerMarriage;
  }
  /** The last morning's wedding and divorce news, for the reports. */
  lastWeddings: pm.WeddingNews[] = [];
  lastDivorces: pm.DivorceNews[] = [];
  readonly tracker: DayEndTracker;
  /** Names by id, for the host's screens. */
  readonly names = new Map<PlayerId, string>([[LOCAL_PLAYER, "Host"]]);
  /** Standing state: set while a refused join waits for the host to buy a cabin; `onCabinRefused` is the one-shot notice. */
  cabinOffer: { name: string; price: number } | undefined;
  /** Called when a join is refused for lack of a cabin (the host's screen offers `buyCabin`). */
  onCabinRefused?: (name: string) => void;
  /** The report of the last night, for the host's morning screen. */
  lastReport: SleepReport | undefined;
  /** Guests' pass-outs on the last night: id to gold lost. */
  lastPassOuts: Record<PlayerId, number> = {};
  private pending: JoinResult | undefined;
  /** The night just ended, held until the Room (guests) and the host's scene each take it. */
  private guestNight: NightNews | undefined;
  private hostNight: SleepReport | undefined;
  private readonly o: Required<
    Pick<RoomWorldOptions, "cabinArea" | "blocked" | "random" | "spots">
  >;

  constructor(
    readonly g: GameState,
    opts: RoomWorldOptions = {},
  ) {
    this.cabins = newCabinBook(opts.origin ?? "multiplayer-start");
    this.o = {
      cabinArea: opts.cabinArea ?? { x: 0, y: 0, w: 60, h: 40 },
      blocked: opts.blocked ?? (() => false),
      random: opts.random ?? Math.random,
      spots: opts.spots ?? [],
    };
    this.tracker = new DayEndTracker(g.players.ids, (d) => this.endDay(d));
  }

  day(): number {
    return this.g.day.clock.day;
  }

  minutes(): number {
    return this.g.day.clock.minutes;
  }

  snapshot(): string {
    return serialize(this.g);
  }

  presence(id: PlayerId): Presence | undefined {
    return this.tracker.presence(id);
  }

  cabinOf(id: PlayerId): Cabin | undefined {
    return this.cabins.cabins.find((c) => c.ownerKey === id);
  }

  /** Join-needs-a-cabin: refuse with the cabin reason, else hold the assignment. */
  admit(id: PlayerId, name: string): string | undefined {
    const r = joinNeedsCabin(this.cabins, id, this.o.cabinArea, this.o.blocked);
    if (r.kind === "refused") {
      this.pending = undefined;
      if (r.reason === "no-free-cabin") {
        this.cabinOffer = { name, price: CABIN_PRICE };
        this.onCabinRefused?.(name);
      }
      return r.reason;
    }
    this.pending = r;
    return undefined;
  }

  addPlayer(id: PlayerId, name: string): void {
    if (this.pending && this.pending.kind !== "refused")
      this.cabins = this.pending.book;
    this.pending = undefined;
    const start = this.g.players.walletMode === "separate" ? START_MONEY : 0;
    this.g.players.add(id, start);
    this.names.set(id, name);
    this.tracker.add(id);
  }

  homeOf(id: PlayerId): { x: number; y: number } | undefined {
    const c = this.cabinOf(id);
    return c ? { x: c.x, y: c.y } : undefined;
  }

  playerDropped(id: PlayerId): void {
    this.tracker.drop(id);
  }

  playerRejoined(id: PlayerId): void {
    this.tracker.rejoin(id);
  }

  /** The host buys a cabin (100 gold from the host's wallet), left free for the next guest. */
  buyCabin(site: CabinSite): string | undefined {
    const host = this.g.players.wallet(LOCAL_PLAYER);
    const r = buyCabin(this.cabins, host.money, site, this.o.blocked);
    if (!r.ok) return r.reason;
    this.cabins = r.book;
    host.money = r.gold;
    this.cabinOffer = undefined;
    return undefined;
  }

  apply(by: PlayerId, intent: Intent): string | undefined {
    const players = this.g.players;
    if (!players.has(by)) return "unknown player";
    switch (intent.kind) {
      case "spend": {
        const amount = intent.amount;
        if (
          typeof amount !== "number" ||
          !Number.isInteger(amount) ||
          amount <= 0
        )
          return "bad amount";
        if (players.balance(by) < amount) return "not enough gold";
        players.pay(by, -amount);
        return undefined;
      }
      case "sleep":
        // A wed pair share a bed but each must get in it: the day ends when every player is
        // in bed, as in normal multiplayer (note 12 and 53, decided 2026-11-19).
        this.tracker.setAsleep(by);
        // A wed pair share one bed: in bed counts for both (note 12 and 53).
        for (const k of this.bedmates(by)) this.tracker.setAsleep(k);
        return undefined;
      case "wake":
        this.tracker.wake(by);
        for (const k of this.bedmates(by)) this.tracker.wake(k);
        return undefined;
      case "buy-cabin": {
        if (by !== LOCAL_PLAYER) return "host only";
        const x = intent.x;
        const y = intent.y;
        if (typeof x !== "number" || typeof y !== "number") return "bad site";
        return this.buyCabin({ x, y });
      }
      default: {
        const m = applyMarriageIntent(this.g, by, intent);
        if (m !== null) return m;
        const r = applyFarmIntent(this.g, by, intent, this.o.random);
        return r === null ? `unknown intent ${intent.kind}` : r;
      }
    }
  }

  /** The wed partner who shares this player's bed, if they are in this world. */
  private bedmates(id: PlayerId): PlayerId[] {
    const k = pm.isMarried(this.marriages, id)
      ? pm.partnerOf(this.marriages, id)
      : undefined;
    return k && this.g.players.has(k) ? [k] : [];
  }

  step(dtMs: number): void {
    const limit = this.g.day.clock.minutes >= CLOCK_END;
    this.tracker.check(dtMs, limit);
  }

  /** Who is in bed and who is up, by name (the "who is left" notice). */
  bedStatus(): BedStatus {
    const d = this.tracker.decision(false);
    const name = (id: string): string => this.names.get(id) ?? id;
    return { asleep: d.asleep.map(name), waiting: d.waiting.map(name) };
  }

  /** The night's news for the guests' reports, once (the Room sends it). */
  takeNight(): NightNews | undefined {
    const n = this.guestNight;
    this.guestNight = undefined;
    return n;
  }

  /** The night's report for the host's own morning screen, once (the farm scene takes it). */
  takeHostNight(): SleepReport | undefined {
    const r = this.hostNight;
    this.hostNight = undefined;
    return r;
  }

  /** Report lines for one guest: the pass-out outcome and the marriage news (note 12, 53). */
  guestLines(id: PlayerId): { lines: string[]; lost: number } {
    const lost = this.lastPassOuts[id] ?? 0;
    const out = id in this.lastPassOuts;
    const lines = [
      !out
        ? "You slept well."
        : lost > 0
          ? `You stayed up too late and passed out. Someone helped you home and kept ${lost}g for the trouble.`
          : "You stayed up too late and passed out. Someone helped you home. It cost you nothing.",
      ...pm.marriageReportLines(
        this.marriages,
        id,
        this.day(),
        (k) => this.names.get(k) ?? k,
        this.lastDivorces,
        this.lastWeddings,
      ),
    ];
    return { lines, lost };
  }

  /** Day end: guests who pass out pay the single player cost, then the world sleeps. */
  private endDay(d: DayEndDecision): void {
    const players = this.g.players;
    this.lastPassOuts = {};
    for (const id of d.passOut) {
      if (id === LOCAL_PLAYER || !players.has(id)) continue;
      const w = players.wallet(id);
      const lost = passOutLoss(w.money);
      w.money -= lost;
      this.lastPassOuts[id] = lost;
    }
    for (const p of players.each()) {
      if (p.id === LOCAL_PLAYER) continue; // the host's energy is the day's, handled by sleep()
      const out = d.passOut.includes(p.id);
      p.energy.current = out ? Math.round(p.energy.max * 0.75) : p.energy.max;
    }
    // An unanswered proposal ends with the day, the token goes back (owner, 2026-11-19).
    expireProposalsAndRefund(this.g);
    const report = sleep(this.g, this.o.spots, this.o.random);
    this.lastReport = report;
    this.hostNight = report;
    // The new morning: filed divorces take effect, then due weddings play (no wait for the partner).
    this.lastDivorces = pm.divorceMorning(this.marriages);
    this.lastWeddings = pm.weddingMorning(
      this.marriages,
      this.day(),
      weddingBlock(this.g),
    );
    this.guestNight = {
      day: this.day(),
      forGuest: (id) => this.guestLines(id),
    };
  }
}
