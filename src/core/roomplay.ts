// What the host does for players off the farm (note 109, steps 2 to 4): ground piles guests walk over, the
// state of each map a player is on, the creatures of mine floors and creature maps (chasing the nearest
// player), swing intents, hits and fainting per player, and the fishing cast and catch. Held by the
// `GameRoomWorld` on the host, never saved. Free of Phaser and the DOM.
import { asPlayer } from "./asplayer";
import { dateOf } from "./calendar";
import {
  cooldownFor,
  hitDamageFor,
  isWeapon,
  loseItems,
  swingTargets,
  weaponById,
} from "./combat";
import { PASS_OUT_MONEY_CAP, PASS_OUT_MONEY_SHARE } from "./day";
import { dangerHit } from "./danger";
import { defeatCreature, removeCreature } from "./creature-defeat";
import { ENERGY_FLOOR } from "./energy";
import { oilCalms } from "./elixirs";
import { ensureMapCreatures } from "./areas";
import {
  creatureById,
  creatureMax,
  hurtCreature,
  saveCreature,
  splitOff,
  stepCreature,
  swingDamage,
  type Creature,
} from "./creatures";
import {
  TOO_TIRED_TO_CAST,
  bite,
  castEnergy,
  fishById,
  landFish,
  legendGates,
  rodById,
  type Bite,
  type FishDef,
} from "./fishing";
import { REACH_TILES } from "./screens";
import { landFind } from "./waterfinds";
import {
  blastCreatures,
  blastPlayer,
  blastRocks,
  bombById,
  placeBomb,
  tickBombs,
  type LitBomb,
} from "./bombs";
import { festivalDayToday } from "./festivals";
import { FROSTFIN, iceBite, isHole, lakeShut } from "./icefishing";
import {
  MARKET_FISH,
  PIER_NIGHT_MINUTES,
  isPierCast,
  luckRare,
  pierBite,
  pierCastProblem,
  rollPearl,
} from "./marketpier";
import { landLobster, landTrash } from "./pots";
import { pickupRadius } from "./ground";
import { creatureSpawnsOf } from "./mapcreatures";
import { type Facing, move, type Vec } from "./movement";
import { tileBlockedNoHorse } from "./blocking";
import { LOCAL_PLAYER, savePlayer, type PlayerId } from "./players";
import type { Intent } from "./protocol";
import type { Notice, Placement } from "./room";
import { spotPixels } from "./homes";
import {
  TOO_FAR,
  floorOf,
  groundOfMap,
  onMap,
  reachProblem,
  tileUnder,
  townView,
  viewOf,
  type MapView,
  type Standing,
} from "./roommaps";
import type { GameState } from "./save";
import { isRaining } from "./weather";

/** Where a creature stands in the mine, as the scene's feet box (`CREATURE_BODY`). */
const CREATURE_BODY = { hw: 5, h: 5 };

/** A swing lands a little early when the cooldown is checked on the host: lag slack, as a share of the cooldown. */
const SWING_SLACK = 0.8;

const FACINGS: readonly string[] = ["up", "down", "left", "right"];

/** What the host needs of the room: where players stand, who is up, and the host's dice. */
export interface PlayEnv {
  g: GameState;
  where?: (id: PlayerId) => Standing | undefined;
  /** False for a player who is dropped or in bed: they are not targets and pick nothing up. */
  active: (id: PlayerId) => boolean;
  random: () => number;
  /** The tile a player wakes on in their own home, and the move to put their position there (note 110). */
  home?: (id: PlayerId) => { map: string; x: number; y: number } | undefined;
  place?: (p: Placement) => void;
  /** A fish landed from a cast into an ice hole of the Forest lake: counts for the contest (note 111 decision 5). */
  onHoleCatch?: (id: PlayerId) => void;
}

interface Pending {
  bite: Bite;
  distance: number;
  at: { x: number; y: number };
  map: string;
  /** A cast from the Night Market pier: a pearl may come with the fish. */
  pier?: boolean;
  /** A cast into an ice hole of the Forest lake on the Frostday contest. */
  hole?: boolean;
}

/** The creatures of a map and what holds them: a mine floor, or a map with a spawn table. */
interface Fight {
  view: MapView;
  list: { creatures: Creature[] };
  dangerous: boolean;
}

/** A fish a cast can bring up: the river and sea roster, the Frostday Frostfin and the pier's market fish. */
export const castFishById = (id: string): FishDef | undefined =>
  fishById(id) ??
  (id === FROSTFIN.id ? FROSTFIN : MARKET_FISH.find((f) => f.id === id));

const isNum = (v: unknown): v is number =>
  typeof v === "number" && Number.isFinite(v);

export class RoomPlay {
  private readonly notices: Notice[] = [];
  private readonly sigs = new Map<string, string>();
  private readonly lastMap = new Map<PlayerId, string>();
  /** Players who fainted on a map: not chased there until they leave it. */
  private readonly fainted = new Map<PlayerId, string>();
  private readonly swingReady = new Map<PlayerId, number>();
  private readonly burn = new Map<PlayerId, number>();
  private readonly pending = new Map<PlayerId, Pending>();
  /** Bombs a guest lit, counting down on the host (note 109). */
  private lit: { by: PlayerId; map: string; bomb: LitBomb }[] = [];
  private clockMs = 0;

  constructor(private readonly env: PlayEnv) {}

  /** Messages queued since the last call. */
  takeNotices(): Notice[] {
    return this.notices.splice(0);
  }

  private get g(): GameState {
    return this.env.g;
  }

  /** Every active player with a position on a map the host can work, by id. */
  private standing(): { id: PlayerId; at: Standing; v: MapView }[] {
    const out: { id: PlayerId; at: Standing; v: MapView }[] = [];
    for (const id of this.g.players.ids) {
      if (!this.env.active(id)) continue;
      const at = this.env.where?.(id);
      if (!at) continue;
      const v = viewOf(this.g, at.map);
      if (v) out.push({ id, at, v });
    }
    return out;
  }

  /** One tick of the host's play: pickups, creatures, then what changed on each map goes out. */
  step(dtMs: number): void {
    this.clockMs += dtMs;
    const here = this.standing();
    for (const p of here) {
      if (
        this.fainted.get(p.id) !== undefined &&
        this.fainted.get(p.id) !== p.v.id
      )
        this.fainted.delete(p.id);
      if (p.id !== LOCAL_PLAYER) this.pickUp(p.id, p.at, p.v);
    }
    const dt = dtMs / 1000;
    this.stepBombs(dt, here);
    const maps = new Set(here.map((p) => p.v.id));
    for (const p of here) if (p.id !== LOCAL_PLAYER) this.tickVitals(p.id, dt);
    for (const id of maps) this.stepCreatures(id, here, dt);
    this.sendStates(here, maps);
  }

  // ---- ground piles

  /** A guest walks over piles within the pickup radius: the first to arrive takes them (rule 5). */
  private pickUp(id: PlayerId, at: Standing, v: MapView): void {
    const ground = groundOfMap(this.g, v.id);
    if (!ground || ground.count === 0) return;
    const rec = this.g.players.get(id);
    ground.collect(
      rec.inventory,
      tileUnder(at, v.map.tileSize),
      pickupRadius(rec.equipment.magnetBonus()),
    );
  }

  // ---- map state

  private signature(v: MapView): string {
    const ground = groundOfMap(this.g, v.id)?.save() ?? [];
    if (v.kind !== "mine") return JSON.stringify(ground);
    const f = floorOf(this.g, v.floor!);
    return JSON.stringify([ground, f.rocks.save(), f.ladder ?? null]);
  }

  private stateMsg(v: MapView) {
    const ground = groundOfMap(this.g, v.id)?.save() ?? [];
    if (v.kind !== "mine") return { t: "mapstate" as const, map: v.id, ground };
    const f = floorOf(this.g, v.floor!);
    return {
      t: "mapstate" as const,
      map: v.id,
      ground,
      floor: {
        rocks: f.rocks.save(),
        ...(f.ladder ? { ladder: { ...f.ladder } } : {}),
      },
    };
  }

  /** What changed on each occupied map goes to the guests on it; a guest who just arrived gets the map as it stands. */
  private sendStates(
    here: { id: PlayerId; v: MapView }[],
    maps: Set<string>,
  ): void {
    const arrived = new Set<string>();
    for (const p of here) {
      if (p.id === LOCAL_PLAYER) continue;
      if (this.lastMap.get(p.id) !== p.v.id) {
        this.lastMap.set(p.id, p.v.id);
        this.notices.push({ to: [p.id], msg: this.stateMsg(p.v) });
        arrived.add(`${p.id}`);
      }
    }
    for (const id of maps) {
      const v = viewOf(this.g, id)!;
      const sig = this.signature(v);
      if (this.sigs.get(id) === sig) continue;
      this.sigs.set(id, sig);
      const to = here
        .filter(
          (p) => p.v.id === id && p.id !== LOCAL_PLAYER && !arrived.has(p.id),
        )
        .map((p) => p.id);
      if (to.length > 0) this.notices.push({ to, msg: this.stateMsg(v) });
    }
    for (const id of [...this.sigs.keys()])
      if (!maps.has(id)) this.sigs.delete(id);
  }

  // ---- creatures

  /** The creatures of a map today, or undefined where there are none. Made on first need. */
  fightOf(v: MapView, arrive?: Vec): Fight | undefined {
    if (v.kind === "mine") {
      const f = floorOf(this.g, v.floor!);
      return { view: v, list: f, dangerous: f.dangerous };
    }
    if (v.kind === "area" && creatureSpawnsOf(v.id)) {
      const ts = v.map.tileSize;
      const list = ensureMapCreatures(
        this.g,
        v.id,
        this.env.random,
        arrive
          ? { x: Math.floor(arrive.x / ts), y: Math.floor(arrive.y / ts) }
          : { x: 0, y: 0 },
      );
      return list
        ? { view: v, list: { creatures: list }, dangerous: false }
        : undefined;
    }
    return undefined;
  }

  /** Grace and burns run down for a guest on a creature map. */
  private tickVitals(id: PlayerId, dt: number): void {
    const rec = this.g.players.get(id);
    const c = rec.combat;
    c.sync(rec.skills, rec.equipment.graceBonus());
    c.health.tick(dt);
    c.tickBuffs(dt);
    const burn = c.effects.tick(dt);
    if (burn <= 0) return void this.burn.delete(id);
    const debt = (this.burn.get(id) ?? 0) + burn;
    const whole = Math.floor(debt);
    this.burn.set(id, debt - whole);
    if (whole > 0 && c.health.drain(whole) > 0) this.afterHit(id);
  }

  /**
   * Step the creatures of a map toward their nearest player. A map the host's own player stands on is
   * stepped by the host's scene (which passes the same nearest-player rule); this steps the others.
   */
  private stepCreatures(
    mapId: string,
    here: { id: PlayerId; at: Standing; v: MapView }[],
    dt: number,
  ): void {
    const on = here.filter((p) => p.v.id === mapId);
    if (on.some((p) => p.id === LOCAL_PLAYER)) return;
    const v = on[0]!.v;
    const fight = this.fightOf(v, on[0]!.at);
    if (!fight) return;
    // A guest with "no creatures" on is not chased or hurt (their own setting, note 109).
    const targets = on.filter(
      (p) =>
        this.fainted.get(p.id) !== mapId &&
        !this.g.players.get(p.id).combat.noCreatures,
    );
    if (targets.length === 0) return;
    const ts = v.map.tileSize;
    const rocks =
      v.kind === "mine" ? floorOf(this.g, v.floor!).rocks : undefined;
    onMap(this.g, v, () => {
      const bw = {
        state: this.g,
        map: v.map,
        mapId: v.id,
        rocks,
        festivalShut: () => false,
      };
      for (const c of [...fight.list.creatures]) {
        const near = nearestOf(c, targets);
        const result = stepCreature(c, dt, {
          player: near.at,
          walk: (cr, dx, dy) =>
            move(
              { x: cr.x, y: cr.y },
              { x: dx, y: dy },
              CREATURE_BODY,
              ts,
              (x, y) => tileBlockedNoHorse(bw, x, y),
            ),
          random: this.env.random,
          assist: this.g.players.get(near.id).combat.assist,
          tileSize: ts,
          calm: asPlayer(this.g, near.id, () => oilCalms(this.g, c.kind)),
        });
        if (result.hit) this.hurtPlayer(near.id, c, result.hit, fight);
      }
    });
    this.sendCreatures(mapId, fight.list.creatures, on, fight.dangerous);
  }

  /** The creatures go to the guests on the map with their full health, for the health bars (note 109). */
  private sendCreatures(
    map: string,
    list: Creature[],
    on: { id: PlayerId }[],
    dangerous: boolean,
  ): void {
    const guests = on.map((p) => p.id).filter((id) => id !== LOCAL_PLAYER);
    // A guest with "no creatures" on is sent none, so their copy draws none (note 109).
    const quiet = guests.filter(
      (id) => this.g.players.get(id).combat.noCreatures,
    );
    const to = guests.filter((id) => !quiet.includes(id));
    const rows = list.map((c) => ({
      ...saveCreature(c),
      max: creatureMax(c, dangerous),
    }));
    if (to.length > 0)
      this.notices.push({ to, msg: { t: "creatures", map, rows } });
    if (quiet.length > 0)
      this.notices.push({
        to: quiet,
        msg: { t: "creatures", map, rows: [] },
      });
  }

  // ---- bombs

  /**
   * A guest lights a bomb from their pack on the tile they face (note 109, step 4). The host places it as the
   * sender (the single player rule), counts the fuse and, when it goes off, breaks rocks and hurts creatures as
   * the thrower. Guests on the map see it blink and boom (`bomb` and `blast`).
   */
  bomb(
    by: PlayerId,
    intent: Intent,
    at: Standing | undefined,
  ): string | undefined {
    const { x, y } = intent;
    const id = typeof intent.item === "string" ? intent.item : undefined;
    if (!isNum(x) || !isNum(y) || !bombById(id)) return "bad bomb";
    const v = viewOf(this.g, String(intent.map ?? "farm"));
    if (!v) return "Nothing to do here.";
    if (at) {
      const far = reachProblem(this.g, at, v, x, y, REACH_TILES);
      if (far) return far;
    }
    const g = this.g;
    return onMap(g, v, () =>
      asPlayer(g, by, () => {
        const rocks = v.kind === "mine" ? floorOf(g, v.floor!).rocks : g.rocks;
        const taken = (px: number, py: number) =>
          !!rocks?.at(px, py) ||
          this.lit.some(
            (l) => l.map === v.id && l.bomb.x === px && l.bomb.y === py,
          );
        const r = placeBomb(g, v.map, v.id, x, y, id!, taken);
        if (!r.ok)
          return r.reason === "cannot place here"
            ? "You cannot put that there."
            : r.reason;
        this.lit.push({ by, map: v.id, bomb: r.bomb });
        this.toMap(v.id, {
          t: "bomb",
          map: v.id,
          x,
          y,
          id: r.bomb.id,
          fuse: r.bomb.fuse,
        });
        this.sendPlayer(by);
        return undefined;
      }),
    );
  }

  /** Tell the guests standing on a map (the host's scene reads the state itself). */
  private toMap(map: string, msg: Notice["msg"]): void {
    const to = this.standing()
      .filter((p) => p.id !== LOCAL_PLAYER && p.v.id === map)
      .map((p) => p.id);
    if (to.length > 0) this.notices.push({ to, msg });
  }

  private stepBombs(
    dt: number,
    here: { id: PlayerId; at: Standing; v: MapView }[],
  ): void {
    if (this.lit.length === 0) return;
    const due = new Set(
      tickBombs(
        this.lit.map((l) => l.bomb),
        dt,
      ),
    );
    const gone = this.lit.filter((l) => due.has(l.bomb));
    this.lit = this.lit.filter((l) => !due.has(l.bomb));
    for (const l of gone) this.explode(l, here);
  }

  /** A bomb goes off: rocks the thrower's Mining allows break, creatures in the circle are hurt, and guests in it too (never lethal). */
  private explode(
    l: { by: PlayerId; map: string; bomb: LitBomb },
    here: { id: PlayerId; at: Standing; v: MapView }[],
  ): void {
    const v = viewOf(this.g, l.map);
    if (!v) return;
    const g = this.g;
    const ts = v.map.tileSize;
    const floor = v.kind === "mine" ? v.floor : undefined;
    onMap(g, v, () =>
      asPlayer(g, l.by, () => {
        const rocks = v.kind === "mine" ? floorOf(g, v.floor!).rocks : g.rocks;
        if (rocks) blastRocks(g, rocks, floor, l.bomb, this.env.random);
      }),
    );
    const fight = this.fightOf(v);
    if (fight)
      for (const c of blastCreatures(fight.list.creatures, l.bomb, ts))
        this.defeat(l.by, c, fight);
    for (const p of here) {
      if (p.id === LOCAL_PLAYER || p.v.id !== l.map) continue;
      const rec = g.players.get(p.id);
      const lost = blastPlayer(rec.combat.health, l.bomb, tileUnder(p.at, ts));
      if (lost > 0) this.sendPlayer(p.id);
    }
    this.sendPlayer(l.by);
    this.toMap(l.map, {
      t: "blast",
      map: l.map,
      x: l.bomb.x,
      y: l.bomb.y,
      id: l.bomb.id,
    });
  }

  /**
   * A creature's hit lands on a guest: the single player rule on their own record (dangerous floors take
   * two and a half times, defense and effects are theirs). Called by the host's scene too, for a guest
   * the host's own creature loop chases. Returns the health lost.
   */
  hurtPlayer(
    id: PlayerId,
    c: Creature,
    hit: number,
    fight: {
      dangerous: boolean;
      view: MapView;
      list: { creatures: Creature[] };
    },
  ): number {
    const rec = this.g.players.get(id);
    const combat = rec.combat;
    combat.sync(rec.skills, rec.equipment.graceBonus());
    const lost = combat.health.hurt(
      dangerHit(hit, fight.dangerous),
      combat.assist,
      rec.equipment.defense(),
    );
    if (lost <= 0) return 0;
    const inflicts = creatureById(c.kind)?.inflicts;
    if (inflicts && this.env.random() < inflicts.chance) {
      const eq = rec.equipment;
      combat.effects.inflict(inflicts.effect, this.env.random, {
        immunity: eq.immunity(),
        slimeProof: eq.slimeProof(),
        halfLength: eq.halvesEffects(),
      });
    }
    // The thorns ring sends the damage back (note 37).
    if (rec.equipment.thorns() && hurtCreature(c, lost))
      this.defeat(id, c, fight);
    this.afterHit(id);
    return lost;
  }

  /** A hit or burn changed a guest's health: tell them, and faint them if it ran out (rule 6). */
  private afterHit(id: PlayerId): void {
    const rec = this.g.players.get(id);
    if (rec.combat.health.down) this.faint(id);
    else this.sendPlayer(id);
  }

  sendPlayer(id: PlayerId): void {
    this.notices.push({
      to: [id],
      msg: { t: "player", id, rec: savePlayer(this.g.players.get(id)) },
    });
  }

  /**
   * A player's health ran out: they pay the single player cost (gold the pass-out rule takes, up to
   * three stacks lost to the trainer's counter), wake at home, and the others play on (rule 6).
   */
  faint(id: PlayerId): void {
    const rec = this.g.players.get(id);
    const stand = this.env.where?.(id);
    if (stand) this.fainted.set(id, viewOf(this.g, stand.map)?.id ?? stand.map);
    const w = this.g.players.wallet(id);
    const gold = Math.min(
      Math.floor(Math.max(w.money, 0) * PASS_OUT_MONEY_SHARE),
      PASS_OUT_MONEY_CAP,
    );
    w.money -= gold;
    const lost = asPlayer(this.g, id, () =>
      loseItems(this.g, this.env.random, rec.combat.assist),
    );
    rec.combat.sync(rec.skills, rec.equipment.graceBonus());
    rec.combat.health.fill();
    rec.combat.effects.clear();
    rec.combat.defeatPending = false;
    this.burn.delete(id);
    const at = this.env.home?.(id);
    this.notices.push({
      to: [id],
      msg: {
        t: "faint",
        gold,
        lost: lost.map((l) => ({ ...l })),
        ...(at ? { at } : {}),
      },
    });
    if (at) {
      const s = spotPixels(at);
      this.env.place?.({ id, map: s.map, x: s.px, y: s.py });
    }
    this.sendPlayer(id);
  }

  /** A creature is beaten by `id`: the kill, the experience and the goods are theirs (rule 7). */
  private defeat(
    id: PlayerId,
    c: Creature,
    fight: { view: MapView; list: { creatures: Creature[] } },
  ): void {
    const v = fight.view;
    onMap(this.g, v, () =>
      asPlayer(this.g, id, () =>
        defeatCreature(
          this.g,
          c,
          v.id,
          v.floor,
          v.map.tileSize,
          this.env.random,
        ),
      ),
    );
    removeCreature(fight.list, c.uid);
  }

  // ---- swing

  /**
   * A guest's weapon swing: the host finds the creatures in reach of where the sender stands, hits them with
   * the sender's skills and kill buffs, and a beaten one pays out to the sender (note 109, "Mine floors").
   */
  swing(by: PlayerId, intent: Intent): string | undefined {
    const name = intent.map;
    if (typeof name !== "string") return "bad swing";
    const v = viewOf(this.g, name);
    if (!v) return "Nothing to hit here.";
    const weapon =
      typeof intent.weapon === "string" && isWeapon(intent.weapon)
        ? weaponById(intent.weapon)
        : undefined;
    if (!weapon) return "bad swing";
    const rec = this.g.players.get(by);
    if (rec.inventory.count(weapon.id) <= 0) return "no weapon";
    const facing = intent.facing;
    if (typeof facing !== "string" || !FACINGS.includes(facing))
      return "bad swing";
    const stand = this.env.where?.(by);
    const pos: Vec | undefined = stand
      ? viewOf(this.g, stand.map)?.id === v.id
        ? { x: stand.x, y: stand.y }
        : undefined
      : isNum(intent.x) && isNum(intent.y)
        ? { x: intent.x, y: intent.y }
        : undefined;
    if (!pos) return TOO_FAR;
    const ready = this.swingReady.get(by) ?? 0;
    if (this.clockMs < ready) return "Swing again soon.";
    this.swingReady.set(
      by,
      this.clockMs +
        cooldownFor(rec.skills, weapon.cooldown) *
          rec.combat.effects.swingFactor() *
          1000 *
          SWING_SLACK,
    );
    const fight = this.fightOf(v, pos);
    if (!fight) return undefined;
    let aim: Vec | undefined;
    if (weapon.family === "sling" && isNum(intent.ax) && isNum(intent.ay))
      aim = { x: intent.ax, y: intent.ay };
    const ts = v.map.tileSize;
    const hits = swingTargets(
      weapon,
      facing as Facing,
      pos,
      fight.list.creatures,
      ts,
      aim,
    );
    for (const c of hits) {
      const hit = hitDamageFor(rec.skills, weapon.damage, this.env.random);
      const boosted = Math.round(hit.damage * rec.combat.killDamageFactor());
      const damage = swingDamage(c, boosted, weapon.family, pos);
      if (hurtCreature(c, damage)) this.defeat(by, c, fight);
      else {
        const next =
          1 + fight.list.creatures.reduce((m, o) => Math.max(m, o.uid), 0);
        const small = splitOff(c, next);
        if (small) fight.list.creatures.push(small);
      }
    }
    if (hits.length > 0) this.sendPlayer(by);
    return undefined;
  }

  // ---- fishing

  /**
   * A cast: the host rolls what bites (the single player rule, as the sender) and tells the sender's catch
   * screen. The cast spends the sender's energy but no game time (the clock is everyone's). Guests fish
   * without bait or lures for now: the rigs are the farm's, not a player's.
   */
  cast(
    by: PlayerId,
    intent: Intent,
    at: Standing | undefined,
  ): string | undefined {
    const { x, y } = intent;
    const rod = rodById(
      typeof intent.rod === "string" ? intent.rod : undefined,
    );
    if (!rod) return "bad cast";
    if (!isNum(x) || !isNum(y)) return "bad cast";
    const name = String(intent.map ?? "farm");
    const v = viewOf(this.g, name) ?? townView(this.g, name);
    if (!v || v.map.indoors) return "Nothing to fish here.";
    if (!v.map.isWater(x, y)) return "Face the water to fish.";
    if (at) {
      const far = reachProblem(this.g, at, v, x, y, Math.ceil(rod.range) + 1);
      if (far) return far;
    }
    const rec = this.g.players.get(by);
    if (rec.inventory.count(rod.id) <= 0) return "no rod";
    // A town has no ground to drop an overflowing catch on, so a cast there needs a free slot.
    if (v.kind === "town" && !hasFreeSlot(rec.inventory))
      return "Your pack is full.";
    const g = this.g;
    // The Frostday lake is shut until the festival opens; a cast into a hole may bring a Frostfin (a guest's hole catch counts for the contest, note 111).
    const fest = festivalDayToday(g.day.clock.day);
    const iceDay = fest?.id === "frostday" && v.id === "forest";
    if (iceDay && lakeShut(fest, g.day.clock.minutes))
      return "The lake opens at noon.";
    const hole = iceDay && isHole(fest, x, y);
    // The pier is judged from the plank the sender stands on (the host's own rule).
    // The pier is on Hearthwell's bank, so a plank tile on any other map is only a tile.
    const feet =
      at && v.id === "hearthwell" ? tileUnder(at, v.map.tileSize) : undefined;
    if (feet) {
      const gated = asPlayer(g, by, () => pierCastProblem(g, feet.x, feet.y));
      if (gated) return gated;
    }
    // The permit is the sender's own (note 111 rule 9).
    const pier = feet
      ? asPlayer(g, by, () => isPierCast(g, feet.x, feet.y))
      : false;
    return asPlayer(g, by, () => {
      const cost = castEnergy(g.skills.level("fishing"));
      if (g.day.energy.current - cost <= ENERGY_FLOOR) return TOO_TIRED_TO_CAST;
      const kind = v.map.waterKindAt(x, y) ?? "river";
      const tutorial = g.fishing.total === 0;
      const luck = luckRare(g);
      let found = bite(
        kind,
        {
          season: dateOf(g.day.clock.day).season,
          // The pier draws the night odds from 17:00 to 23:00 (note 14).
          minutes: pier ? PIER_NIGHT_MINUTES : g.day.clock.minutes,
          raining: isRaining(g.weather),
          ...legendGates(g, rod.id),
        },
        this.env.random,
        tutorial,
        { rare: luck },
      );
      if (hole) found = iceBite(found, tutorial, this.env.random);
      if (pier) found = pierBite(found, tutorial, this.env.random, luck);
      g.day.energy.spend(cost);
      const share = isNum(intent.distance)
        ? Math.min(Math.max(intent.distance, 0), 1)
        : 0.5;
      this.pending.set(by, {
        bite: found,
        distance: share,
        at: { x, y },
        map: v.id,
        ...(pier ? { pier } : {}),
        ...(hole && kind === "forest-lake" ? { hole: true } : {}),
      });
      const msg =
        found.kind === "fish"
          ? ({ t: "bite", kind: "fish", item: found.fish.id } as const)
          : found.kind === "trash" || found.kind === "find"
            ? ({ t: "bite", kind: found.kind, item: found.item } as const)
            : ({ t: "bite", kind: found.kind } as const);
      this.notices.push({ to: [by], msg });
      return undefined;
    });
  }

  /** The catch: the guest's bar fight ended (`perfect`) or the fish got away (`miss`). */
  land(by: PlayerId, intent: Intent): string | undefined {
    const p = this.pending.get(by);
    if (!p) return "Nothing is on the line.";
    this.pending.delete(by);
    if (intent.miss === true) return undefined;
    const v = viewOf(this.g, p.map) ?? townView(this.g, p.map);
    if (!v) return "Nothing to fish here.";
    const g = this.g;
    const perfect = intent.perfect === true;
    onMap(g, v, () =>
      asPlayer(g, by, () => {
        const b = p.bite;
        const at = p.at;
        if (b.kind === "fish") {
          const def = castFishById(b.fish.id);
          if (def)
            landFish(g, def, {
              perfect,
              distance: p.distance,
              random: this.env.random,
              at,
            });
          if (def && p.pier) rollPearl(g, at, this.env.random);
          if (def && p.hole) this.env.onHoleCatch?.(by);
        } else if (b.kind === "lobster")
          landLobster(g, at, p.distance, this.env.random);
        else if (b.kind === "trash") landTrash(g, at, b.item);
        else if (b.kind === "find") landFind(g, at, b.item);
      }),
    );
    this.sendPlayer(by);
    return undefined;
  }
}

/** True when a pack has an empty slot. */
function hasFreeSlot(inv: { size: number; slot(i: number): unknown }): boolean {
  for (let i = 0; i < inv.size; i++) if (!inv.slot(i)) return true;
  return false;
}

/** The nearest of the players on a map to a creature, by pixels. */
function nearestOf<T extends { at: Vec }>(c: Vec, players: T[]): T {
  let best = players[0]!;
  let d = Infinity;
  for (const p of players) {
    const e = Math.hypot(p.at.x - c.x, p.at.y - c.y);
    if (e < d) {
      d = e;
      best = p;
    }
  }
  return best;
}

/** The nearest of several players' pixel positions to a creature, for the host's scene stepping its own floor. */
export function nearestPlayer<T extends { x: number; y: number }>(
  c: Vec,
  players: T[],
): T | undefined {
  let best: T | undefined;
  let d = Infinity;
  for (const p of players) {
    const e = Math.hypot(p.x - c.x, p.y - c.y);
    if (e < d) {
      d = e;
      best = p;
    }
  }
  return best;
}
