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
  type CabinStyle,
  type JoinResult,
} from "./cabins";
import { advanceCabinBuilds } from "./cabinhome";
import {
  applyBedMove,
  homeData,
  ownWakeSpot,
  spotPixels,
  wakeSpot,
} from "./homes";
import { HOUSE_UPGRADE_NAMES, isHouseMap } from "./house";
import { isFarmMap, resolveMapId } from "./farmtypes";
import { asPlayer } from "./asplayer";
import { weddingBlock } from "./courtship";
import {
  applyMarriageIntent,
  expireProposalsAndRefund,
} from "./marriageintents";
import * as pm from "./playermarriage";
import { morningEnergy } from "./energyrules";
import { PASS_OUT_MONEY_CAP, PASS_OUT_MONEY_SHARE } from "./day";
import { LOCAL_PLAYER, type PlayerId } from "./players";
import type { Intent } from "./protocol";
import { applyFarmIntent, mapOfIntent, MAPPED_KINDS } from "./roomintents";
import { RoomPlay } from "./roomplay";
import { reachProblem, TOO_FAR } from "./roommaps";
import { applyScreenIntent, screenNeed, targetsScreen } from "./screenintents";
import { farmTypeById } from "./farmtypes";
import {
  inReach,
  parseRef,
  refProblem,
  REACH_TILES,
  Screens,
  type Standing,
} from "./screens";
import { offerIds, isShopStock } from "./shopoffers";
import type {
  BedStatus,
  Notice,
  NightNews,
  Placement,
  RoomWorld,
} from "./room";
import { serialize, START_MONEY, type GameState } from "./save";
import { sleep, type SleepReport } from "./sleep";
import { giveStartKit } from "./toolbar";

export interface RoomWorldOptions {
  /** How cabins come: free at a multiplayer start, or bought by the host in a converted game. */
  origin?: CabinOrigin;
  /** Open area where a free cabin may be built. */
  cabinArea?: { x: number; y: number; w: number; h: number };
  blocked?: BlockedFn;
  /**
   * True when the player is inside a home (the farmhouse; cabins have no interior map yet): falling
   * asleep there costs no money (note 07, 2026-10-31). Absent: nobody is inside.
   */
  inside?: (id: PlayerId) => boolean;
  random?: () => number;
  /**
   * Where a player stands now (the Room's last position). When given, a screen action is accepted
   * only from a player who opened that screen within reach of it (note 108). Absent: no position
   * checks, the screens are open to every intent (unit tests without a Room).
   */
  where?: (id: PlayerId) => Standing | undefined;
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
  /** The cabin book lives in the game state, so it is saved and sent with the farm (note 110). */
  get cabins(): CabinBook {
    return this.g.cabins!;
  }
  set cabins(b: CabinBook) {
    this.g.cabins = b;
  }
  /** The home each player went to bed in tonight, by instance id (note 110 rule 1). */
  private readonly sleptIn = new Map<PlayerId, string>();
  private readonly placements: Placement[] = [];
  private readonly wakeNotices: Notice[] = [];
  /** Cabin upgrades that landed this morning, by owner, for the report. */
  lastCabinNews: Record<PlayerId, string> = {};
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
    Pick<
      RoomWorldOptions,
      "cabinArea" | "blocked" | "random" | "spots" | "inside"
    >
  > &
    Pick<RoomWorldOptions, "where">;
  /** Open screens and their locks (note 108): the host's book, never saved. */
  readonly screens = new Screens();
  /** Players off the farm: ground piles, map state, creatures, swings and fishing (note 109). Never saved. */
  readonly play: RoomPlay;

  constructor(
    readonly g: GameState,
    opts: RoomWorldOptions = {},
  ) {
    // A hosted game keeps the book it was saved with; a first hosting starts one.
    if (!g.cabins) g.cabins = newCabinBook(opts.origin ?? "multiplayer-start");
    this.o = {
      cabinArea: opts.cabinArea ?? { x: 0, y: 0, w: 60, h: 40 },
      blocked: opts.blocked ?? (() => false),
      random: opts.random ?? Math.random,
      spots: opts.spots ?? [],
      inside: opts.inside ?? (() => false),
      where: opts.where,
    };
    this.tracker = new DayEndTracker(g.players.ids, (d) => this.endDay(d));
    this.play = new RoomPlay({
      g,
      where: opts.where,
      active: (id) => {
        const p = this.tracker.presence(id);
        return p !== "dropped" && p !== "asleep";
      },
      random: this.o.random,
      home: (id) => ownWakeSpot(g, id),
      place: (p) => this.placements.push(p),
    });
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
    const rec = this.g.players.add(id, start);
    giveStartKit(rec.inventory, this.g.farmType);
    this.names.set(id, name);
    this.tracker.add(id);
  }

  homeOf(id: PlayerId): { x: number; y: number } | undefined {
    const c = this.cabinOf(id);
    return c ? { x: c.x, y: c.y } : undefined;
  }

  /** A joining or returning guest starts in their own cabin, by their bed (note 110). */
  startOf(id: PlayerId): { map: string; x: number; y: number } | undefined {
    return id === LOCAL_PLAYER ? undefined : ownWakeSpot(this.g, id);
  }

  takePlacements(): Placement[] {
    return this.placements.splice(0);
  }

  /** A dropped guest counts as in bed and their character is put in their own cabin (note 53, note 110). */
  playerDropped(id: PlayerId): void {
    this.screens.release(id);
    this.tracker.drop(id);
    this.sleptIn.delete(id);
    const home = ownWakeSpot(this.g, id);
    if (home) {
      const s = spotPixels(home);
      this.placements.push({ id, map: s.map, x: s.px, y: s.py });
    }
  }

  playerRejoined(id: PlayerId): void {
    this.tracker.rejoin(id);
  }

  /** The host buys a cabin (100 gold from the host's wallet), left free for the next guest. The style is picked here. */
  buyCabin(site: CabinSite, style?: CabinStyle): string | undefined {
    const host = this.g.players.wallet(LOCAL_PLAYER);
    const r = buyCabin(this.cabins, host.money, site, this.o.blocked, style);
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
      case "sleep": {
        // Any bed in any home counts, and the player wakes in the home they slept in (note 110 rule 1).
        const at = this.o.where?.(by);
        const here = at && isHouseMap(at.map) ? at.map : undefined;
        if (here && homeData(this.g, here)) this.sleptIn.set(by, here);
        else this.sleptIn.delete(by);
        // A wed pair share a bed but each must get in it: the day ends when every player is
        // in bed, as in normal multiplayer (note 12 and 53, decided 2026-11-19).
        this.tracker.setAsleep(by);
        return undefined;
      }
      case "wake":
        this.sleptIn.delete(by);
        this.tracker.wake(by);
        return undefined;
      case "bed-move":
        return this.moveBed(by, intent);
      case "open": {
        const ref = parseRef(intent.screen);
        if (!ref) return "bad open";
        return this.screens.open(this.g, by, ref, this.o.where?.(by));
      }
      case "close":
        this.screens.close(by);
        return undefined;
      case "buy-cabin": {
        if (by !== LOCAL_PLAYER) return "host only";
        const x = intent.x;
        const y = intent.y;
        if (typeof x !== "number" || typeof y !== "number") return "bad site";
        return this.buyCabin({ x, y }, intent.style as CabinStyle | undefined);
      }
      default: {
        const need = screenNeed(intent);
        if (need && this.o.where && by !== LOCAL_PLAYER) {
          const why = this.screenGate(by, intent, need);
          if (why !== undefined) return why;
        }
        if (this.o.where && by !== LOCAL_PLAYER) {
          const why =
            this.machineGate(by, intent) ?? this.worldGate(by, intent);
          if (why !== undefined) return why;
        }
        if (intent.kind === "swing") return this.play.swing(by, intent);
        if (intent.kind === "cast")
          return this.play.cast(by, intent, this.o.where?.(by));
        if (intent.kind === "catch") return this.play.land(by, intent);
        const m = applyMarriageIntent(this.g, by, intent);
        if (m !== null) return m;
        const sc = applyScreenIntent(this.g, by, intent);
        if (sc !== null) return sc;
        const r = applyFarmIntent(this.g, by, intent, this.o.random);
        return r === null ? `unknown intent ${intent.kind}` : r;
      }
    }
  }

  /** Move the sender's bed: only in the home they live in, from where they stand (note 110 rule 1). */
  private moveBed(by: PlayerId, intent: Intent): string | undefined {
    const at = this.o.where?.(by);
    if (at && by !== LOCAL_PLAYER && at.map !== intent.map)
      return "There is no home here.";
    return applyBedMove(this.g, by, intent);
  }

  /**
   * A guest's screen action is taken only from a player who opened that screen, still stands within reach
   * of it, and names the same chest, stall or counter (note 108, "Where the player stands").
   */
  private screenGate(
    by: PlayerId,
    intent: Intent,
    need: string[],
  ): string | undefined {
    const open = this.screens.current(by);
    if (!open || !need.includes(open.kind)) return "open the screen first";
    const at = this.o.where?.(by);
    if (!at || !inReach(this.g, at, open)) return "too far away";
    if (!targetsScreen(intent, open)) return "not the screen you opened";
    // A shop that shuts while its screen is open stops buying and selling (note 79).
    if (
      open.kind === "shop" &&
      (intent.kind === "buy" || intent.kind === "sell")
    ) {
      const shut = refProblem(this.g, open);
      if (shut !== undefined) return shut;
    }
    if (intent.kind === "buy") {
      const stock = intent.stock;
      const id = intent.id;
      if (stock !== undefined && !isShopStock(stock)) return "bad buy";
      if (
        typeof id === "string" &&
        !offerIds(this.g, open.stock as never).includes(id)
      )
        return "That is not on sale here.";
    }
    if (intent.kind === "ship" && (intent.ore === true) !== (open.ore === true))
      return "not this bin";
    return undefined;
  }

  /** A machine on a farm tile is loaded or emptied only from within reach of it (note 108, group 2). */
  private machineGate(by: PlayerId, intent: Intent): string | undefined {
    if (
      intent.kind !== "machine-load" &&
      intent.kind !== "machine-collect" &&
      intent.kind !== "pond-use"
    )
      return undefined;
    const { x, y } = intent;
    if (typeof x !== "number" || typeof y !== "number") return undefined;
    const at = this.o.where?.(by);
    const ref = {
      kind: "machine",
      map: farmTypeById(this.g.farmType).map,
      x,
      y,
    };
    return at && inReach(this.g, at, ref) ? undefined : "too far away";
  }

  /**
   * A guest's tool or forage intent is taken only if they stand on the map it names and within reach of
   * the tile (note 109, "Reach and map check"). Machine intents have their own gate above.
   */
  private worldGate(by: PlayerId, intent: Intent): string | undefined {
    if (!MAPPED_KINDS.has(intent.kind) || this.isMachineKind(intent.kind))
      return undefined;
    const v = mapOfIntent(this.g, intent);
    if (typeof v === "string") return v;
    const { x, y } = intent;
    if (typeof x !== "number" || typeof y !== "number") return undefined;
    const at = this.o.where?.(by);
    if (!at) return TOO_FAR;
    return reachProblem(this.g, at, v, x, y, REACH_TILES);
  }

  private isMachineKind(kind: string): boolean {
    return (
      kind === "machine-load" ||
      kind === "machine-collect" ||
      kind === "pond-use"
    );
  }

  takeNotices(): Notice[] {
    return [...this.play.takeNotices(), ...this.wakeNotices.splice(0)];
  }

  step(dtMs: number): void {
    this.play.step(dtMs);
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
    const built = this.lastCabinNews[id];
    const lines = [
      !out
        ? "You slept well."
        : lost > 0
          ? `You stayed up too late and passed out. Someone helped you home and kept ${lost}g for the trouble.`
          : "You stayed up too late and passed out. Someone helped you home. It cost you nothing.",
      ...(built ? [built] : []),
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

  /**
   * The new morning for the guests: cabin builds run for occupants who were not passed out away from the farm,
   * each guest's mailbox gets what is due, and each wakes where they slept, or in their own home after a
   * pass-out (note 110 rule 1, rule 3, note 108 rule 8).
   */
  private guestsWake(d: DayEndDecision): void {
    const g = this.g;
    const ft = g.farmType;
    const counts = (owner: PlayerId): boolean => {
      if (!d.passOut.includes(owner)) return true;
      const at = this.o.where?.(owner);
      return !at || isHouseMap(at.map) || isFarmMap(resolveMapId(at.map, ft));
    };
    this.lastCabinNews = {};
    for (const c of advanceCabinBuilds(g, counts))
      if (c.ownerKey !== null)
        this.lastCabinNews[c.ownerKey] =
          `The carpenter finished your cabin's ${HOUSE_UPGRADE_NAMES[c.tier - 1]!.toLowerCase()}.`;
    const day = this.day();
    for (const id of g.players.ids) {
      if (id === LOCAL_PLAYER) continue;
      asPlayer(g, id, () => g.mail.deliver(day));
      if (this.tracker.presence(id) === "dropped") continue;
      const slept = this.sleptIn.get(id);
      const own = ownWakeSpot(g, id);
      const spot =
        (!d.passOut.includes(id) && slept ? wakeSpot(g, slept) : undefined) ??
        own;
      if (!spot) continue;
      const s = spotPixels(spot);
      this.placements.push({ id, map: s.map, x: s.px, y: s.py });
      this.wakeNotices.push({
        to: [id],
        msg: { t: "wake", map: spot.map, x: spot.x, y: spot.y },
      });
    }
    this.sleptIn.clear();
  }

  /** Day end: guests who pass out pay the single player cost, then the world sleeps. */
  private endDay(d: DayEndDecision): void {
    const players = this.g.players;
    this.lastPassOuts = {};
    for (const id of d.passOut) {
      if (id === LOCAL_PLAYER || !players.has(id)) continue;
      const w = players.wallet(id);
      const lost = this.o.inside(id) ? 0 : passOutLoss(w.money);
      w.money -= lost;
      this.lastPassOuts[id] = lost;
    }
    for (const p of players.each()) {
      if (p.id === LOCAL_PLAYER) continue; // the host's energy is the day's, handled by sleep()
      // Awake at the limit is the 2 am case; in bed, the shared clock says how late it is.
      const out = d.passOut.includes(p.id);
      p.energy.current = morningEnergy({
        max: p.energy.max,
        minutes: out ? CLOCK_END : this.g.day.clock.minutes,
        exhausted: p.energy.wasExhausted,
        levelled: p.skills.levelledToday,
        atFloor: p.energy.empty,
      });
      p.energy.wasExhausted = false;
      p.skills.levelledToday = false;
    }
    // An unanswered proposal ends with the day, the token goes back (owner, 2026-11-19).
    expireProposalsAndRefund(this.g);
    const report = sleep(
      this.g,
      this.o.spots,
      this.o.random,
      undefined,
      this.o.inside(LOCAL_PLAYER),
    );
    this.lastReport = report;
    this.hostNight = report;
    this.guestsWake(d);
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
