// What the host does for a festival with several players (note 111): the gate (all in first, leave together,
// the clock), the main events (the seed hunt, the ice contest, the cake tasting), the shared Harvest Showing
// display, and each player's own rewards (parade, lantern, maze chest, feast gift, counter, pier). Held by the
// `GameRoomWorld` on the host, never saved. Free of Phaser and the DOM.
import { maps } from "../content/maps";
import { asPlayer } from "./asplayer";
import { dateOf } from "./calendar";
import { hallRestored } from "./bundles";
import {
  awardTaste,
  dishesMissing,
  giveDish,
  newCakeTable,
  tasteResult,
  type CakeTable,
} from "./cakeday";
import { feastGive } from "./feastexchange";
import { FestivalGate } from "./festivalgate";
import { endsAfterMainEvent, festivalLayout, RIVALS } from "./festivalroutes";
import {
  buyAtCounter,
  counterOf,
  counterProblem,
  enterFestival,
  enterProblem,
  festivalDayToday,
  festivalMapFor,
  festivalPlace,
  inZone,
  leaveFestival,
  type Festival,
} from "./festivals";
import {
  iceDone,
  iceEntry,
  iceEntryLine,
  iceWinners,
  judgeEntry,
  lakeShut,
  noteContestCatch,
  payIcePrize,
  startIceContest,
  type IceContest,
} from "./icefishing";
import { hatById } from "./hats";
import {
  buyLantern,
  lanternBuyProblem,
  launchLantern,
  launchProblem,
} from "./lanterns";
import { openChest } from "./maze";
import {
  buyPermit,
  claimHotDrink,
  floatLantern,
  floatProblem,
  permitProblem,
  PIER_LINES,
} from "./marketpier";
import { finishParade, joinParade, PARADE_FESTIVAL } from "./parade";
import { LOCAL_PLAYER, savePlayer, type PlayerId } from "./players";
import type { FestivalView, Intent } from "./protocol";
import type { Notice } from "./room";
import { resolveMapId } from "./farmtypes";
import { tileUnder } from "./roommaps";
import type { GameState } from "./save";
import {
  contestRival,
  huntStartProblem,
  huntWinners,
  payHuntPrize,
  pickPacket,
  startHuntContest,
  tickContest,
  type HuntContest,
} from "./seedhunt";
import {
  collectShowingPrize,
  judgeShared,
  sharedJudgeProblem,
  sharedResult,
  TABLE_SIZE,
} from "./showing";
import type { Screens, Standing } from "./screens";

export interface FestivalEnv {
  g: GameState;
  /** Connected players who are not dropped; the host's own always. */
  present: () => PlayerId[];
  name: (id: PlayerId) => string;
  where?: (id: PlayerId) => Standing | undefined;
  screens: Screens;
}

const isInt = (v: unknown): v is number =>
  typeof v === "number" && Number.isInteger(v);

/** The intent kinds this class answers (anything else falls through to the world's other rules). */
export const FESTIVAL_KINDS: ReadonlySet<string> = new Set([
  "festival-enter",
  "festival-leave",
  "festival-buy",
  "hunt-start",
  "hunt-pick",
  "ice-judge",
  "cake-give",
  "cake-taste",
  "showing-set",
  "showing-judge",
  "showing-collect",
  "parade-join",
  "parade-done",
  "lantern-buy",
  "lantern-launch",
  "maze-chest",
  "feast-give",
  "pier-permit",
  "pier-float",
  "pier-drink",
]);

const itemLine = (hat?: string): string =>
  hat ? `You get the ${hatById(hat)?.name ?? "hat"}.` : "";

export class RoomFestival {
  private gate: FestivalGate | undefined;
  private day = -1;
  private hunt: HuntContest | undefined;
  private ice: IceContest | undefined;
  private cake: CakeTable | undefined;
  private table: string[] = [];
  private wrapped = false;
  private lastKey = "";
  private readonly notices: Notice[] = [];

  constructor(private readonly env: FestivalEnv) {}

  private get g(): GameState {
    return this.env.g;
  }

  /** Today's gate, made on the first look of the day. Undefined on a day with no festival (the Night Market is exempt). */
  current(): FestivalGate | undefined {
    const day = this.g.day.clock.day;
    if (day !== this.day) {
      this.day = day;
      this.gate = undefined;
      this.hunt = this.ice = this.cake = undefined;
      this.table = [];
      this.wrapped = false;
      this.lastKey = "";
      const f = festivalDayToday(day);
      if (f) this.gate = new FestivalGate(f.id, day);
    }
    return this.gate;
  }

  /** True while the clock stands still: the festival is on and has its own map (as in single player). */
  clockHeld(): boolean {
    const gate = this.current();
    const f = festivalDayToday(this.g.day.clock.day);
    return (
      !!gate &&
      !!f &&
      gate.ahead &&
      !gate.ended &&
      festivalMapFor(f, dateOf(this.g.day.clock.day).year) !== undefined
    );
  }

  takeNotices(): Notice[] {
    return this.notices.splice(0);
  }

  // ---- the view

  view(): FestivalView | undefined {
    const gate = this.current();
    if (!gate) return undefined;
    const present = this.env.present();
    const v: FestivalView = gate.view(present, this.env.name);
    if (this.hunt)
      v.hunt = {
        packets: this.hunt.packets.map((t) => [t[0], t[1]]),
        counts: { ...this.hunt.counts },
        target: this.hunt.target,
        left: Math.ceil(this.hunt.left),
        done: this.hunt.status === "done",
      };
    if (this.ice)
      v.ice = {
        win: this.ice.win,
        entries: Object.fromEntries(
          Object.entries(this.ice.entries).map(([id, e]) => [id, { ...e }]),
        ),
      };
    if (this.cake)
      v.cake = {
        given: Object.keys(this.cake.dishes),
        ...(this.cake.tasted ? { tasted: this.cake.tasted.quality } : {}),
      };
    const f = festivalDayToday(this.g.day.clock.day);
    if (f?.activity === "showing") {
      const holder = this.holder();
      const r = sharedResult(this.g);
      v.showing = {
        table: [...this.table],
        ...(holder ? { holder } : {}),
        ...(r ? { result: { place: r.place.place, points: r.points } } : {}),
      };
    }
    return v;
  }

  private holder(): PlayerId | undefined {
    for (const id of this.env.present()) {
      const s = this.env.screens.current(id);
      if (s?.kind === "showing") return id;
    }
    return undefined;
  }

  /** Send the view to everyone when it changed. */
  private publish(force = false): void {
    const v = this.view();
    if (!v) return;
    const key = JSON.stringify(v);
    if (key === this.lastKey && !force) return;
    this.lastKey = key;
    this.notices.push({
      to: this.env.present(),
      msg: { t: "festival", view: v },
    });
  }

  private line(id: PlayerId, text: string): void {
    if (text) this.notices.push({ to: [id], msg: { t: "fline", text } });
  }

  private sendPlayer(id: PlayerId): void {
    if (id === LOCAL_PLAYER) return;
    this.notices.push({
      to: [id],
      msg: { t: "player", id, rec: savePlayer(this.g.players.get(id)) },
    });
  }

  // ---- the step

  step(dtMs: number): void {
    const gate = this.current();
    if (!gate) return;
    const present = this.env.present();
    gate.refresh(present);
    if (this.hunt && this.hunt.status === "running") {
      this.pickFromPositions(this.hunt);
      tickContest(this.hunt, dtMs / 1000);
      if (huntDone(this.hunt)) this.concludeHunt();
    }
    if (gate.ended && !this.wrapped) this.wrapUp();
    this.publish();
  }

  /** The festival is over: the clock goes to its end (the single player rule) and everyone is told to go home. */
  private wrapUp(): void {
    this.wrapped = true;
    leaveFestival(this.g);
    this.publish(true);
  }

  // ---- intents

  /** Judge a festival intent. `null` when it is not one of these (the caller tries the next rule). */
  apply(
    by: PlayerId,
    intent: Intent,
    at: Standing | undefined,
  ): string | undefined | null {
    if (!FESTIVAL_KINDS.has(intent.kind)) return null;
    const g = this.g;
    const f = festivalDayToday(g.day.clock.day);
    // The Night Market has no gate; its pier and drink work on a market evening only.
    switch (intent.kind) {
      case "pier-permit":
        return this.pier(by, () => {
          const why = permitProblem(g);
          if (why) return why;
          buyPermit(g);
          this.line(by, PIER_LINES.sold);
          return undefined;
        });
      case "pier-float":
        return this.pier(by, () => {
          const why = floatProblem(g);
          if (why) return why;
          const line = floatLantern(g);
          if (line) this.line(by, line);
          return undefined;
        });
      case "pier-drink":
        return this.pier(by, () => {
          const r = claimHotDrink(g);
          this.line(by, r.line);
          return r.given ? undefined : r.line;
        });
    }
    const gate = this.current();
    if (!f || !gate) return "There is no festival today.";
    switch (intent.kind) {
      case "festival-enter":
        return this.enter(by, f, gate, at);
      case "festival-leave": {
        const why = gate.leave(by, this.env.present());
        if (why === undefined) this.afterGate();
        return why;
      }
    }
    // Everything else happens inside: the player has gone in and the festival is on.
    if (!gate.entered.has(by)) return "Go to the festival first.";
    if (!gate.ahead)
      return "The festival has not begun. Waiting for the others.";
    if (gate.ended) return "The festival is over for today.";
    switch (intent.kind) {
      case "festival-buy":
        return this.buy(by, f, intent);
      case "hunt-start":
        return this.startHunt(by, f);
      case "hunt-pick":
        return this.pickIntent(by, intent, at);
      case "ice-judge":
        return this.judgeIce(by, f);
      case "cake-give":
        return this.giveCake(by, f, intent);
      case "cake-taste":
        return this.tasteCake(by, f);
      case "showing-set":
      case "showing-judge":
      case "showing-collect":
        return this.showing(by, f, intent);
      case "parade-join":
        return this.paradeJoin(by, f, intent);
      case "parade-done":
        return this.paradeDone(by, f);
      case "lantern-buy":
        return this.own(by, () => {
          const why = lanternBuyProblem(g);
          if (why) return why;
          buyLantern(g);
          this.line(
            by,
            "You buy a paper lantern. Set it afloat from the shore.",
          );
          return undefined;
        });
      case "lantern-launch":
        return this.own(by, () => {
          const why = launchProblem(g);
          if (why) return why;
          const r = launchLantern(g);
          this.line(
            by,
            r
              ? `Your lantern drifts out with the rest. They like you a little more.${r.keepsake ? " You keep a small lantern." : ""}`
              : "",
          );
          return undefined;
        });
      case "maze-chest":
        return this.own(by, () => {
          if (f.activity !== "maze") return "There is no chest here.";
          this.line(by, openChest(g));
          return undefined;
        });
      case "feast-give":
        return this.feast(by, intent);
    }
    return `unknown intent ${intent.kind}`;
  }

  /** Run `fn` as the sender, then send them their record (guests) and the view. */
  private own(by: PlayerId, fn: () => string | undefined): string | undefined {
    const why = asPlayer(this.g, by, fn);
    if (why === undefined) this.sendPlayer(by);
    this.publish();
    return why;
  }

  private pier(by: PlayerId, fn: () => string | undefined): string | undefined {
    return this.own(by, fn);
  }

  private afterGate(): void {
    const gate = this.gate;
    if (gate?.ended && !this.wrapped) this.wrapUp();
    this.publish();
  }

  /** The sender's standing tile on its map, when the host knows where they stand. */
  private tileOf(
    at: Standing | undefined,
  ): { x: number; y: number } | undefined {
    if (!at) return undefined;
    let ts = 16;
    try {
      ts = maps.get(resolveMapId(at.map, this.g.farmType)).tileSize;
    } catch {
      // keep the default
    }
    return tileUnder(at, ts);
  }

  private enter(
    by: PlayerId,
    f: Festival,
    gate: FestivalGate,
    at: Standing | undefined,
  ): string | undefined {
    const year = dateOf(this.g.day.clock.day).year;
    // A festival held in place is entered by standing in its place. A festival with its own map is entered
    // through its gate, which the scene walks the player through once this is accepted (no position check).
    if (at && !festivalMapFor(f, year)) {
      const p = festivalPlace(f, hallRestored(this.g.hall), year);
      const t = this.tileOf(at);
      if (
        resolveMapId(at.map, this.g.farmType) !== p.map ||
        !t ||
        !inZone(p.zone, t.x, t.y)
      )
        return "Walk into the festival to go in.";
    }
    const problem = gate.entered.has(by)
      ? undefined
      : asPlayer(this.g, by, () => enterProblem(this.g));
    if (problem) return problem;
    const why = gate.enter(by, this.env.present());
    if (why) return why;
    asPlayer(this.g, by, () => enterFestival(this.g));
    this.afterGate();
    return undefined;
  }

  private buy(by: PlayerId, f: Festival, intent: Intent): string | undefined {
    const i = intent.entry;
    if (!isInt(i)) return "bad buy";
    const entry = counterOf(f, dateOf(this.g.day.clock.day).year)[i];
    if (!entry) return "That is not on sale here.";
    return this.own(by, () => {
      const why = counterProblem(this.g, f, entry);
      if (why) return why;
      return buyAtCounter(this.g, f, entry) ? undefined : "Your pack is full.";
    });
  }

  // ---- the seed hunt

  private startHunt(by: PlayerId, f: Festival): string | undefined {
    const gate = this.gate!;
    if (f.id !== "seedswap-fair") return "There is no seed hunt here.";
    if (this.hunt)
      return this.hunt.status === "running"
        ? "The hunt is on."
        : "The hunt is over.";
    const players = this.env.present().filter((p) => gate.entered.has(p));
    const c = startHuntContest(
      f,
      this.g.day.clock.day,
      this.g.day.clock.minutes,
      players,
    );
    if (!c)
      return (
        huntStartProblem(f, this.g.day.clock.minutes) ??
        "The hunt cannot start."
      );
    this.hunt = c;
    for (const p of players)
      this.line(
        p,
        `Find ${c.target} seed packets in ${c.hunt.seconds} seconds. Go!`,
      );
    this.publish(true);
    void by;
    return undefined;
  }

  private pickFromPositions(c: HuntContest): void {
    const f = festivalDayToday(this.g.day.clock.day);
    const mapId = f && festivalLayout(f)?.map;
    if (!mapId) return;
    for (const id of Object.keys(c.counts)) {
      if (!this.env.present().includes(id)) continue;
      const at = this.env.where?.(id);
      if (!at || resolveMapId(at.map, this.g.farmType) !== mapId) continue;
      const t = this.tileOf(at);
      if (t) pickPacket(c, id, t.x, t.y);
    }
  }

  private pickIntent(
    by: PlayerId,
    intent: Intent,
    at: Standing | undefined,
  ): string | undefined {
    const c = this.hunt;
    if (!c || c.status !== "running") return "There is no hunt running.";
    const { x, y } = intent;
    if (!isInt(x) || !isInt(y)) return "bad pick";
    const t = this.tileOf(at);
    if (t && Math.max(Math.abs(t.x - x), Math.abs(t.y - y)) > 1)
      return "Too far away.";
    pickPacket(c, by, x, y);
    if (huntDone(c)) this.concludeHunt();
    this.publish();
    return undefined;
  }

  /** The hunt is done: the winners get the prize, the others hear who won; it ends the festival (note 82). */
  private concludeHunt(): void {
    const c = this.hunt!;
    const f = festivalDayToday(this.g.day.clock.day)!;
    const winners = huntWinners(c);
    const names = winners.map((id) => this.env.name(id));
    const rival = contestRival(f, c);
    for (const [id, n] of Object.entries(c.counts)) {
      if (winners.includes(id)) {
        const won = asPlayer(this.g, id, () => payHuntPrize(this.g));
        this.line(
          id,
          `You found ${n} packets. You win the hunt! ${itemLine(won?.hat)}${won?.packet ? " You get a rare seed packet." : ""}`.trim(),
        );
        this.sendPlayer(id);
      } else if (winners.length > 0)
        this.line(
          id,
          `You found ${n} packets. ${names.join(" and ")} win${names.length === 1 ? "s" : ""} the hunt.`,
        );
      else
        this.line(
          id,
          `Time is up with ${n} found. ${cap(rival ?? "the rival")} wins the hunt.`,
        );
    }
    if (endsAfterMainEvent(f)) this.gate!.finish();
    this.afterGate();
  }

  // ---- the ice contest

  /** A fish landed from a hole of the lake: the sender's count goes up (host scene and guests alike, note 111). */
  iceCatch(id: PlayerId): void {
    const f = festivalDayToday(this.g.day.clock.day);
    const gate = this.current();
    if (!f || !gate || f.id !== "frostday" || !gate.ahead || gate.ended) return;
    this.ice ??= startIceContest(f);
    if (this.ice && noteContestCatch(this.ice, id, "forest-lake", true))
      this.publish();
  }

  private judgeIce(by: PlayerId, f: Festival): string | undefined {
    if (f.id !== "frostday") return "There is no contest here.";
    if (lakeShut(f, this.g.day.clock.minutes)) return "The lake opens at noon.";
    this.ice ??= startIceContest(f);
    const c = this.ice!;
    const e = iceEntry(c, by);
    const status = judgeEntry(c, by, this.g.day.clock.minutes);
    if (status === "fishing") {
      this.line(
        by,
        `You have ${e.caught} of ${c.win}. Keep fishing at the holes, then come back.`,
      );
      this.publish();
      return undefined;
    }
    let text = iceEntryLine(c, by) ?? "";
    if (status === "won") {
      const won = asPlayer(this.g, by, () => payIcePrize(this.g));
      if (won)
        text += ` ${won.hat ? `You get the ${hatById(won.hat)?.name ?? "hat"}. ` : ""}${won.frostfin ? "You get a Frostfin." : ""}`;
      this.sendPlayer(by);
    }
    this.line(by, text.trim());
    if (endsAfterMainEvent(f) && iceDone(c)) this.gate!.finish();
    this.afterGate();
    return undefined;
  }

  /** Every player who beat the rival so far (for tests and the host's screens). */
  iceWinnerIds(): PlayerId[] {
    return this.ice ? iceWinners(this.ice) : [];
  }

  // ---- the cake table

  private giveCake(
    by: PlayerId,
    f: Festival,
    intent: Intent,
  ): string | undefined {
    if (f.id !== "cake-day") return "There is no cake table today.";
    const item = intent.item;
    if (typeof item !== "string") return "bad dish";
    this.cake ??= newCakeTable(this.g.day.clock.day);
    const table = this.cake;
    const why = asPlayer(this.g, by, () => giveDish(this.g, table, by, item));
    if (why) return why;
    this.sendPlayer(by);
    if (dishesMissing(table, this.env.present()).length === 0)
      this.taste(table);
    this.publish();
    return undefined;
  }

  private tasteCake(by: PlayerId, f: Festival): string | undefined {
    if (f.id !== "cake-day") return "There is no cake table today.";
    const table = this.cake;
    if (!table || tasteResult(table, this.env.present()) === undefined)
      return "Put a dish on the table first.";
    if (table.tasted) return "The cake has been tasted already.";
    void by;
    this.taste(table);
    this.publish();
    return undefined;
  }

  /** Everyone tastes: the lowest dish sets the friendship gain, and a present player with no dish makes it the poor one. */
  private taste(table: CakeTable): void {
    const present = this.env.present();
    const r = tasteResult(table, present);
    if (!r || table.tasted) return;
    table.tasted = r;
    for (const id of present) {
      asPlayer(this.g, id, () => awardTaste(this.g, r.quality));
      this.line(
        id,
        r.missing.length > 0
          ? `Everyone tastes the cake. Not every dish came (${r.quality}). They like you a little.`
          : `Everyone tastes the cake (${r.quality}). They like you a little more.`,
      );
      this.sendPlayer(id);
    }
  }

  // ---- the shared Harvest Showing display

  private showing(
    by: PlayerId,
    f: Festival,
    intent: Intent,
  ): string | undefined {
    if (f.activity !== "showing") return "There is no display here.";
    if (intent.kind === "showing-collect")
      return this.own(by, () => {
        const r = collectShowingPrize(this.g);
        if (!r)
          return sharedResult(this.g)
            ? "You have collected your prize from the judge."
            : "The judge has not scored the table yet.";
        this.line(
          by,
          `Place ${r.place.place}. You win ${r.tokens} show tokens.${r.rosette ? " The judge pins a rosette hat on you." : ""}`,
        );
        return undefined;
      });
    // Setting and judging need the table: the one player at it holds the lock (note 108 rule 2).
    const open = this.env.screens.current(by);
    if (
      open?.kind !== "showing" ||
      this.env.screens.holder(this.g, open) !== by
    )
      return "Open the table first.";
    if (sharedResult(this.g)) return "The judge has already scored the table.";
    if (intent.kind === "showing-set") {
      const ids = intent.ids;
      if (
        !Array.isArray(ids) ||
        ids.length > TABLE_SIZE ||
        ids.some((i) => typeof i !== "string")
      )
        return "bad table";
      this.table = ids as string[];
      this.publish();
      return undefined;
    }
    // Judge: the table is scored once for the farm and every player gets the same placing.
    const why = asPlayer(this.g, by, () =>
      sharedJudgeProblem(this.g, this.table),
    );
    if (why) return why;
    const r = asPlayer(this.g, by, () => judgeShared(this.g, this.table))!;
    for (const id of this.env.present())
      this.line(
        id,
        `${r.score.total} points: place ${r.place.place}. Collect your prize from the judge.`,
      );
    this.publish();
    return undefined;
  }

  // ---- the parade and the feast

  private paradeJoin(
    by: PlayerId,
    f: Festival,
    intent: Intent,
  ): string | undefined {
    if (f.id !== PARADE_FESTIVAL) return "There is no march today.";
    const { x, y } = intent;
    if (!isInt(x) || !isInt(y)) return "bad march";
    return this.own(by, () => {
      const why = joinParade(this.g, String(intent.map ?? "hearthwell"), x, y);
      if (!why)
        this.line(by, "The march forms. You fall in at the tail of the line.");
      return why;
    });
  }

  private paradeDone(by: PlayerId, f: Festival): string | undefined {
    if (f.id !== PARADE_FESTIVAL) return "There is no march today.";
    return this.own(by, () => {
      this.line(by, finishParade(this.g));
      return undefined;
    });
  }

  private feast(by: PlayerId, intent: Intent): string | undefined {
    const { map, id, held } = intent;
    if (typeof map !== "string" || typeof id !== "string") return "bad gift";
    return this.own(by, () => {
      const r = feastGive(
        this.g,
        map,
        id,
        typeof held === "string" ? held : undefined,
        hallRestored(this.g.hall),
      );
      if (!r) return "That is not the gift to give.";
      this.line(by, r.message);
      return undefined;
    });
  }
}

/** Read through a function so the checker does not narrow a status that the hunt changes. */
const huntDone = (c: HuntContest): boolean => c.status === "done";

const cap = (s: string): string => s.charAt(0).toUpperCase() + s.slice(1);

/** The rival's name, for tests. */
export const rivalOf = (f: Festival): string | undefined => RIVALS[f.id];
