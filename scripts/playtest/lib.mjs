import fs from "node:fs";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright";

const ROOT = fileURLToPath(new URL("../../", import.meta.url));
/** Screenshots, saves and logs go here. It is git-ignored. */
export const OUT = `${ROOT}playtest-out`;
fs.mkdirSync(`${OUT}/shots`, { recursive: true });
/** The dev server to play against. It must be `npm run dev`: the scripts use `window.farmDebug`. */
export const GAME_URL = process.env.BASE_URL ?? "http://localhost:5173/";
/** Every map by id, so the bot can path on whichever map it is standing in. */
const MAPS = Object.fromEntries(
  [
    "farm",
    "house",
    "sawmill",
    "hall",
    "cellar",
    "green",
    "hedge",
    "mine",
    "farm-cave",
    "forest",
  ].map((id) => {
    const map = JSON.parse(
      fs.readFileSync(`${ROOT}src/content/maps/${id}.json`, "utf8"),
    );
    const exits = new Set();
    for (const layer of map.layers)
      for (const o of layer.objects ?? [])
        if (o.class === "exit")
          for (let y = 0; y < Math.max(1, o.height / 16); y++)
            for (let x = 0; x < Math.max(1, o.width / 16); x++)
              exits.add(
                `${Math.floor(o.x / 16) + x},${Math.floor(o.y / 16) + y}`,
              );
    // Trees stand in the way (stage 2 and up) until the player fells them.
    const trees = new Set();
    for (const layer of map.layers)
      for (const o of layer.objects ?? [])
        if (
          o.class === "tree" &&
          (o.properties?.find((p) => p.name === "stage")?.value ?? 5) > 1
        )
          trees.add(`${Math.floor(o.x / 16)},${Math.floor(o.y / 16)}`);
    // The bot plays at tier 0. On a map that grows (a layer named `-tN`), a
    // cell with no tier 0 ground is black void, so it counts as blocked.
    const col = [...map.layers.find((l) => l.name === "collision").data];
    if (map.layers.some((l) => /-t\d+$/.test(l.name))) {
      const ground = map.layers.find((l) => l.name === "ground").data;
      ground.forEach((g, i) => {
        if (g === 0) col[i] = 1;
      });
    }
    return [
      id,
      {
        W: map.width,
        H: map.height,
        col,
        exits,
        trees,
      },
    ];
  }),
);
/** The map the bot is on. `walkTo` sets it from the game before it plans. */
let here = "farm";
export const setMap = (id) => {
  here = id;
};
/** Tiles the game says are blocked now (rocks, machines, felled trees...). */
let live = new Set();
let liveRead = false;
const blockedT = (x, y) => {
  const { W, H, col, trees } = MAPS[here];
  return (
    live.has(`${x},${y}`) ||
    x < 0 ||
    y < 0 ||
    x >= W ||
    y >= H ||
    col[y * W + x] !== 0 ||
    (!liveRead && trees.has(`${x},${y}`))
  );
};
export const isWalk = (x, y) =>
  !blockedT(x, y) && !MAPS[here].exits.has(`${x},${y}`);
const cx = (tx) => tx * 16 + 8;
const cy = (ty) => ty * 16 + 11;

/** The world speed asked of the dev build (`SPEED=N`), 1 by default. */
export const SPEED = Math.max(1, Number(process.env.SPEED) || 1);
/**
 * The game moves whole frames, so at SPEED=N the smallest step is about 1.3 * N
 * pixels. The bot must stop within a tolerance of that size, and release a
 * little early to allow for the key-up delay.
 */
const TOL = Math.max(2, 1.4 * SPEED);
const LEAD = 0.7 * SPEED;
export const sleepMs = (ms) => new Promise((r) => setTimeout(r, ms));
export const findings = [];
export function finding(msg) {
  findings.push(msg);
  log("FINDING: " + msg);
}
const t0 = Date.now();
export function log(...a) {
  const s = ((Date.now() - t0) / 1000).toFixed(0).padStart(5);
  console.log(`[${s}s]`, ...a);
}

/** A Galaxy Tab A 10.4 (SM-T500) in landscape: 1200x700 CSS pixels with browser bars. */
export const TABLET = {
  viewport: { width: 1200, height: 700 },
  deviceScaleFactor: 1.67,
  hasTouch: true,
  isMobile: true,
};

export async function launch({
  fresh,
  context,
  profile = "desktop",
  bindings,
  scheme = "stick",
}) {
  // DEVICE_CDP: drive Chrome on a real device (adb forward tcp:9222
  // localabstract:chrome_devtools_remote) instead of a headless browser.
  const device = process.env.DEVICE_CDP;
  const b = device
    ? await chromium.connectOverCDP(device)
    : await chromium.launch({
        executablePath: process.env.CHROMIUM_PATH || undefined,
      });
  const p = device
    ? b
        .contexts()[0]
        .pages()
        .find((q) => q.url().startsWith(GAME_URL.slice(0, 22)))
    : await b.newPage(context ?? { viewport: { width: 960, height: 540 } });
  if (device) await p.bringToFront();
  // Set the profile explicitly, so a run never depends on the machine's
  // pointer type (note 45). The bindings stay at their defaults unless given.
  await p.addInitScript(
    ({ profile, bindings, scheme }) => {
      localStorage.setItem(
        "elderglen-settings",
        JSON.stringify({ version: 1, profile, touchScheme: scheme, bindings }),
      );
    },
    { profile, bindings, scheme },
  );
  // SEED makes Math.random repeatable, so two builds can be compared on the
  // same weather, forage and trees.
  if (process.env.SEED)
    await p.addInitScript((seed) => {
      let a = Number(seed) >>> 0;
      Math.random = () => {
        a = (a + 0x6d2b79f5) >>> 0;
        let t = a;
        t = Math.imul(t ^ (t >>> 15), t | 1);
        t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
      };
    }, process.env.SEED);
  const errs = [];
  p.on("pageerror", (e) => errs.push(e.message));
  p.on("console", (m) => {
    if (m.type() === "error" || m.type() === "warning") {
      const t = m.text();
      if (!/GL Driver Message|GPU stall/.test(t))
        errs.push(`${m.type()}: ${t}`);
    }
  });
  await p.route(/\/src\/main\.ts/, async (route) => {
    const res = await route.fetch();
    let t = await res.text();
    t = t.replace(
      /new Phaser\.Game\(|new [\w$]+\.Game\(/,
      (m) => "window.__game = " + m,
    );
    await route.fulfill({ response: res, body: t });
  });
  // SPEED=N asks the dev build to run the world N times faster (FarmScene).
  const q = [
    fresh ? "new" : "",
    process.env.SPEED ? `speed=${process.env.SPEED}` : "",
  ]
    .filter(Boolean)
    .join("&");
  await p.goto(GAME_URL + (q ? `?${q}` : ""));
  await sleepMs(1500);
  return { b, p, errs };
}

export class Bot {
  constructor(p, errs) {
    this.p = p;
    this.errs = errs;
  }
  dbg() {
    return this.p.evaluate(() => window.farmDebug());
  }
  /** Read the map and the game's own blocked tiles, so planning matches the game. */
  async refreshMap() {
    const r = await this.p.evaluate(() => ({
      map: window.farmDebug().map,
      blocked: window.farmBlocked ? window.farmBlocked() : [],
    }));
    here = r.map;
    live = new Set(r.blocked);
    liveRead = r.blocked.length > 0;
    return r.map;
  }
  /** Live read of the game state. Used only to observe and verify. */
  snap() {
    return this.p.evaluate(() => {
      const g = window.__game;
      const s = g.registry.get("state");
      const scenes = g.scene.getScenes(true).map((x) => x.scene.key);
      return {
        scenes,
        day: s.day.clock.day,
        minutes: s.day.clock.minutes,
        energy: s.day.energy.current,
        over: s.day.over,
        money: s.money,
        weather: s.weather,
        endSeen: s.endSeen,
        inv: s.inventory.save(),
        plots: [...s.farm.each()].map(({ x, y, plot }) => ({
          x,
          y,
          ...plot,
          ripe: s.farm.isRipe(x, y),
        })),
        forage: [...s.forage.each()],
        hall: s.hall.save(),
        skills: s.skills.save(),
        selected: g.registry.get("selected") ?? 0,
      };
    });
  }
  count(snap, id) {
    return snap.inv.reduce((n, s) => (s && s.id === id ? n + s.count : n), 0);
  }
  /** Count of a good at any quality (`parsnip`, `parsnip@gold`, ...). */
  countBase(snap, id) {
    return snap.inv.reduce(
      (n, s) => (s && s.id.split("@")[0] === id ? n + s.count : n),
      0,
    );
  }
  async key(k, wait = 60) {
    await this.p.keyboard.press(k);
    await sleepMs(wait);
    // A level 5 skill opens the profession scene after the action that earned
    // it, and the farm stays paused until one is chosen.
    if (k === "KeyC" || k === "KeyX") await this.pickProfession();
  }
  /** Answer the profession scene if it is open: key 1, or 2 with PROFESSION=2. */
  async pickProfession() {
    const open = await this.p.evaluate(() =>
      window.__game.scene.isActive("profession"),
    );
    if (!open) return;
    const pick = process.env.PROFESSION === "2" ? "2" : "1";
    const before = await this.snap();
    await this.p.keyboard.press(pick);
    await sleepMs(150);
    const after = await this.snap();
    if (after.scenes.includes("profession"))
      finding(`profession scene stayed open after key ${pick}`);
    else
      log(
        `profession chosen with key ${pick}:`,
        JSON.stringify(after.skills),
        "was",
        JSON.stringify(before.skills),
      );
  }
  async shot(name) {
    await this.p.screenshot({
      path: `${OUT}/shots/${process.env.PERSONA ?? "expert"}-${name}.png`,
    });
  }

  async holdAxis(axis, target) {
    for (let i = 0; i < 3; i++) {
      const d = await this.dbg();
      const diff = target - d.pos[axis];
      if (Math.abs(diff) <= TOL) return;
      const k =
        axis === "x"
          ? diff > 0
            ? "ArrowRight"
            : "ArrowLeft"
          : diff > 0
            ? "ArrowDown"
            : "ArrowUp";
      await this.p.keyboard.down(k);
      const limit = Date.now() + (Math.abs(diff) / 80) * 1000 + 1500;
      for (;;) {
        const c = (await this.dbg()).pos[axis];
        if (
          (diff > 0 && c >= target - LEAD) ||
          (diff < 0 && c <= target + LEAD)
        )
          break;
        if (Date.now() > limit) break;
      }
      await this.p.keyboard.up(k);
      await sleepMs(30);
    }
  }

  bfs(from, to) {
    const key = (x, y) => `${x},${y}`;
    const prev = new Map([[key(from.x, from.y), null]]);
    const q = [from];
    for (let i = 0; i < q.length; i++) {
      const c = q[i];
      if (c.x === to.x && c.y === to.y) break;
      for (const [dx, dy] of [
        [1, 0],
        [-1, 0],
        [0, 1],
        [0, -1],
      ]) {
        const nx = c.x + dx,
          ny = c.y + dy,
          k = key(nx, ny);
        if (prev.has(k) || !isWalk(nx, ny)) continue;
        prev.set(k, c);
        q.push({ x: nx, y: ny });
      }
    }
    if (!prev.has(key(to.x, to.y))) return null;
    const path = [];
    for (let c = to; c; c = prev.get(key(c.x, c.y))) path.push(c);
    return path.reverse();
  }
  dist(from, to) {
    const p = this.bfs(from, to);
    return p ? p.length : Infinity;
  }

  /**
   * Walk by the game's own tap route (the dev hook `farmWalk`), so no key hold
   * is timed from outside. True on arrival. False when the hook is missing or
   * there is no route, and the caller falls back to key holds.
   */
  async hookWalk(tx, ty) {
    const ok = await this.p.evaluate(
      ([x, y]) => (window.farmWalk ? window.farmWalk(x, y) : false),
      [tx, ty],
    );
    if (!ok) {
      log(`hookWalk: no route to ${tx},${ty}`);
      return false;
    }
    const limit = Date.now() + 20000;
    for (;;) {
      await sleepMs(25);
      const d = await this.dbg();
      if (!d.walking) return d.tile.x === tx && d.tile.y === ty;
      if (Date.now() > limit) {
        const sn = await this.snap();
        log(
          `hookWalk timed out: tile ${JSON.stringify(d.tile)} map ${d.map} scenes ${sn.scenes} target ${tx},${ty}`,
        );
        return false;
      }
    }
  }

  /**
   * Close a story screen the game opens by itself in the morning (the Greencoat
   * when the mines open, the cave choice, the orders board intro). It pauses the
   * farm, so no walk or key press reaches the player until it is closed. Without
   * this a persona run stalled for minutes at the first of them (day 5).
   */
  async dismissModals() {
    for (let i = 0; i < 3; i++) {
      const open = await this.p.evaluate(() =>
        ["greencoat", "cave-choice", "orders"].filter((k) =>
          window.__game.scene.isActive(k),
        ),
      );
      if (open.length === 0) return;
      log(`closing ${open} (opened by the game)`);
      await this.p.keyboard.press("Escape");
      await sleepMs(500);
    }
  }

  async walkTo(tx, ty) {
    for (let attempt = 0; attempt < 4; attempt++) {
      await this.dismissModals();
      await this.refreshMap();
      const d = await this.dbg();
      if (await this.hookWalk(tx, ty)) {
        await sleepMs(20);
        return;
      }
      const path = this.bfs(d.tile, { x: tx, y: ty });
      if (!path)
        throw new Error(`no path ${JSON.stringify(d.tile)} -> ${tx},${ty}`);
      // split into straight runs
      let i = 0;
      while (i < path.length - 1) {
        const a = path[i];
        const dx = path[i + 1].x - a.x,
          dy = path[i + 1].y - a.y;
        let j = i + 1;
        while (
          j + 1 < path.length &&
          path[j + 1].x - path[j].x === dx &&
          path[j + 1].y - path[j].y === dy
        )
          j++;
        if (dx !== 0) await this.holdAxis("x", cx(path[j].x));
        else await this.holdAxis("y", cy(path[j].y));
        i = j;
      }
      await this.holdAxis("x", cx(tx));
      await this.holdAxis("y", cy(ty));
      const e = await this.dbg();
      if (e.tile.x === tx && e.tile.y === ty) return;
      log(`walkTo retry: at ${JSON.stringify(e.tile)} wanted ${tx},${ty}`);
    }
    throw new Error(`could not reach ${tx},${ty}`);
  }

  async face(dir) {
    const k = {
      up: "ArrowUp",
      down: "ArrowDown",
      left: "ArrowLeft",
      right: "ArrowRight",
    }[dir];
    await this.p.keyboard.down(k);
    // Shorter at SPEED=N, so the turn still moves the player about 3.6 px.
    await sleepMs(Math.max(5, 45 / SPEED));
    await this.p.keyboard.up(k);
    await sleepMs(30);
  }

  async select(i) {
    if (i < 9) await this.key(String(i + 1));
    else {
      await this.key("9");
      for (let n = 8; n < i; n++) await this.key("Tab");
    }
    const s = (await this.snap()).selected;
    if (s !== i) throw new Error(`select ${i} got ${s}`);
  }

  /** Face a neighbour tile and use the held tool once. */
  async useToward(dir) {
    await this.face(dir);
    const before = await this.dbg();
    await this.key("KeyC", 90);
    return before;
  }

  /** Walk next to a target tile and press `key` on it (Use by default). */
  async useAt(tx, ty, prefer, key = "KeyC") {
    // The bot may have left a door since the last walk, so read the map first.
    await this.refreshMap();
    const cands = [
      { x: tx, y: ty + 1, dir: "up" },
      { x: tx, y: ty - 1, dir: "down" },
      { x: tx - 1, y: ty, dir: "right" },
      { x: tx + 1, y: ty, dir: "left" },
    ].filter((c) => isWalk(c.x, c.y));
    const d = await this.dbg();
    let best = null,
      bd = Infinity;
    for (const c of cands) {
      const dd =
        prefer && prefer.x === c.x && prefer.y === c.y
          ? -1
          : this.dist(d.tile, c);
      if (dd < bd) {
        bd = dd;
        best = c;
      }
    }
    if (!best) throw new Error(`no stand tile for ${tx},${ty}`);
    await this.walkTo(best.x, best.y);
    await this.face(best.dir);
    const f = await this.dbg();
    if (f.target.x !== tx || f.target.y !== ty) {
      log(
        `facing mismatch: target ${JSON.stringify(f.target)} wanted ${tx},${ty}`,
      );
      await this.walkTo(best.x, best.y);
      await this.face(best.dir);
    }
    await this.key(key, 90);
    return best;
  }

  /** Walk next to a target tile and press Action on it (open, pick, harvest). */
  async actAt(tx, ty, prefer) {
    return this.useAt(tx, ty, prefer, "KeyX");
  }
}
