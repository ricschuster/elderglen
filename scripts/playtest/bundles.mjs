// The M3b exit test "bundles 1 to 26 can be filled", in the real game UI.
// For every hall bundle (rooms in order, the Last Seat last) it gives the exact
// goods with the dev hook, opens the room's scroll in the hall by walking there,
// hands each good in through the hall screen with the keyboard, and checks the
// bundle completes, the reward arrives, the room completes with its bundles,
// and the Last Seat stays locked until every other bundle is done. A bundle that
// cannot be filled (a good that cannot be given, a row that is missing) is a
// FINDING, not a script error. One screenshot per room. About 1 to 2 minutes.
import { launch, Bot, log, sleepMs, finding, findings } from "./lib.mjs";

const { b, p, errs } = await launch({ fresh: true });
const bot = new Bot(p, errs);
await bot.dismissModals();

// ---------- helpers (the same walking and menu moves as play.mjs)
async function menuCursor(scene, field) {
  return p.evaluate(
    ([sc, f]) => window.__game.scene.getScene(sc)[f].cursor,
    [scene, field],
  );
}
async function menuTo(scene, field, idx) {
  for (let i = 0; i < 40; i++) {
    const c = await menuCursor(scene, field);
    if (c === idx) return;
    await bot.key(c < idx ? "ArrowDown" : "ArrowUp", 30);
  }
  throw new Error(`menu ${scene}.${field} would not reach ${idx}`);
}
const hallText = (field) =>
  p.evaluate((f) => window.__game.scene.getScene("hall")[f].text, field);
async function walkThrough(dir, want) {
  await bot.face(dir);
  await bot.key("KeyX", 90);
  await sleepMs(1200);
  const d = await bot.dbg();
  if (d.map !== want)
    throw new Error(`expected map ${want} after the door, on ${d.map}`);
}
/** Where to stand, facing up, to use each room's scroll in the hall map. */
const SCROLL_STAND = {
  "foragers-shelf": [4, 2],
  larder: [4, 14],
  hearth: [43, 2],
  "last-seat": [43, 14],
  "water-room": [28, 6],
  "guests-board": [35, 10],
};
async function openRoom(room) {
  const [sx, sy] = SCROLL_STAND[room];
  await bot.walkTo(sx, sy);
  await bot.face("up");
  await bot.key("KeyX", 400);
  const s = await bot.snap();
  if (!s.scenes.includes("hall"))
    throw new Error(`the hall screen did not open at the ${room} scroll`);
  const title = await p.evaluate(
    () => window.__game.scene.getScene("hall").room,
  );
  if (title !== room)
    finding(`the ${room} scroll opened the room "${title}" instead`);
}
async function closeHall() {
  await bot.key("Escape", 350);
  const s = await bot.snap();
  return s.scenes;
}

// ---------- data from the game itself
const data = await p.evaluate(async () => {
  const { BUNDLES, ROOMS } = await import("/src/core/bundles.ts");
  return { bundles: BUNDLES, rooms: ROOMS };
});
const roomOrder = data.rooms.map((r) => r.id);
const ordered = roomOrder.flatMap((r) =>
  data.bundles.filter((x) => x.room === r),
);
const lastRoom = "last-seat";
const lastOther = [...ordered].reverse().find((x) => x.room !== lastRoom);
log(`${data.bundles.length} bundles in ${roomOrder.length} rooms`);

const status = (room) =>
  p.evaluate(
    (r) => window.__game.registry.get("state").hall.roomStatus(r),
    room,
  );
const complete = (id) =>
  p.evaluate((i) => window.__game.registry.get("state").hall.complete(i), id);

// Rooms start closed except the first (the soft gates, note 40).
for (const r of data.rooms) {
  const want = r.opensAfter === 0 ? "ready" : "locked";
  const got = await status(r.id);
  if (got !== want) finding(`room ${r.id} starts ${got}, expected ${want}`);
}

// ---------- walk to the hall: out of the farm's east exit, to the hall door
await bot.walkTo(78, 14);
await walkThrough("right", "hearthwell");
await bot.walkTo(99, 60);
await walkThrough("up", "hall");

/** Resolve a pool member to a good that can be given: itself, else an item in that artisan category. */
const resolveGood = (member) =>
  p.evaluate(async (m) => {
    const { itemById, allItems } = await import("/src/core/items.ts");
    const { categoryOf } = await import("/src/core/artisan.ts");
    if (itemById(m)) return m;
    const it = allItems().find((i) => categoryOf(i.id) === m);
    return it ? it.id : null;
  }, member);

/** The goods to hand in for a bundle: one stack id per unit, for the first `required` slots. */
async function planFor(def) {
  const units = [];
  for (const slot of def.items.slice(0, def.required)) {
    for (let u = 0; u < slot.count; u++) {
      // A pool slot takes a different member for each unit, so every member is tried over a run.
      const member = slot.anyOf ? slot.anyOf[u % slot.anyOf.length] : slot.id;
      const good = await resolveGood(member);
      if (!good) return { missing: member, slot: slot.id };
      units.push({
        stack:
          slot.minQuality === "normal" ? good : `${good}@${slot.minQuality}`,
        slot: slot.id,
      });
    }
  }
  return { units };
}

const clearPack = () =>
  p.evaluate(() => {
    const inv = window.__game.registry.get("state").inventory;
    inv.load(inv.save().map(() => null));
  });
const packIds = () =>
  p.evaluate(() => {
    const inv = window.__game.registry.get("state").inventory;
    const ids = [];
    for (let i = 0; i < inv.size; i++) {
      const s = inv.slot(i);
      if (s && !ids.includes(s.id)) ids.push(s.id);
    }
    return ids;
  });

const results = [];
/** Fill one bundle through the hall screen. The room's screen is open. */
async function fillBundle(def, bi) {
  const tag = def.id;
  const plan = await planFor(def);
  if (plan.missing) {
    finding(
      `${tag}: cannot give "${plan.missing}" (slot ${plan.slot}): no such item`,
    );
    return false;
  }
  await clearPack();
  const need = {};
  for (const u of plan.units) need[u.stack] = (need[u.stack] ?? 0) + 1;
  for (const [stack, n] of Object.entries(need)) {
    const r = await p.evaluate(([i, c]) => window.farmGive(i, c), [stack, n]);
    if (r !== "ok") {
      finding(`${tag}: farmGive(${stack}, ${n}) returned ${r}`);
      return false;
    }
  }
  const before = await bot.snap();
  // A bundle must not be done, and the room must be taking hand-ins.
  if (await complete(def.id)) {
    finding(`${tag}: already complete before any hand-in`);
    return false;
  }
  await menuTo("hall", "bundleMenu", bi);
  await bot.key("ArrowRight", 30);
  let snapBefore = before;
  for (let n = 0; n < plan.units.length; n++) {
    const u = plan.units[n];
    const ids = await packIds();
    const row = ids.indexOf(u.stack);
    if (row < 0) {
      finding(`${tag}: ${u.stack} is not in the backpack list`);
      return false;
    }
    const labels = await p.evaluate(() =>
      window.__game.scene.getScene("hall").packMenu.rows.map((r) => r.label),
    );
    if (!labels[row]) {
      finding(`${tag}: no hand-in row for ${u.stack}`);
      return false;
    }
    await menuTo("hall", "packMenu", row);
    if (n === plan.units.length - 1) snapBefore = await bot.snap();
    await bot.key("Enter", 40);
    const have = await p.evaluate(
      ([i, s]) => window.__game.registry.get("state").hall.have(i, s),
      [def.id, u.slot],
    );
    const sl = def.items.find((i) => i.id === u.slot);
    const sofar = plan.units
      .slice(0, n + 1)
      .filter((x) => x.slot === u.slot).length;
    if (have !== Math.min(sofar, sl.count)) {
      const msg = await hallText("message");
      finding(
        `${tag}: after handing in ${u.stack}, ${u.slot} is ${have}/${sl.count}; the hall said "${msg}"`,
      );
      return false;
    }
  }
  await bot.key("ArrowLeft", 30);
  const after = await bot.snap();
  const msg = await hallText("message");
  if (!(await complete(def.id))) {
    finding(`${tag}: not complete after every good was handed in`);
    return false;
  }
  if (!/is complete!/.test(msg))
    finding(`${tag}: no completion message, the hall said "${msg}"`);
  // The reward.
  const rw = def.reward;
  if (rw.money && after.money - snapBefore.money !== rw.money)
    finding(
      `${tag}: money reward ${rw.money} but money changed by ${after.money - snapBefore.money}`,
    );
  if (rw.item) {
    const got =
      bot.count(after, rw.item.id) - bot.count(snapBefore, rw.item.id);
    if (got !== rw.item.count)
      finding(
        `${tag}: reward ${rw.item.count} ${rw.item.id}, but the backpack gained ${got}`,
      );
  }
  if (rw.recipe) {
    const known = await p.evaluate(async (r) => {
      const { known, recipeById } = await import("/src/core/crafting.ts");
      const rec = recipeById(r);
      return rec
        ? known(window.__game.registry.get("state"), rec)
        : "no recipe";
    }, rw.recipe);
    if (known !== true)
      finding(
        `${tag}: recipe ${rw.recipe} not known after the bundle (${known})`,
      );
  }
  if (rw.hats) await takeHats(def);
  return true;
}

/** Choose `choose` hats of the set through the hall screen, then check a further pick is refused. */
async function takeHats(def) {
  const { choose, from } = def.reward.hats;
  await menuTo("hall", "bundleMenu", 0).catch(() => {});
  const bi = await p.evaluate(
    (id) =>
      window.__game.registry
        .get("state")
        .hall.bundlesIn(window.__game.scene.getScene("hall").room)
        .findIndex((x) => x.id === id),
    def.id,
  );
  await menuTo("hall", "bundleMenu", bi);
  await bot.key("ArrowRight", 30);
  const owned = () =>
    p.evaluate((h) => {
      const w = window.__game.registry.get("state").wardrobe;
      return h.filter((x) => w.has(x)).length;
    }, from);
  const start = await owned();
  for (let i = 0; i < from.length; i++) {
    await menuTo("hall", "packMenu", i);
    await bot.key("Enter", 60);
  }
  const got = (await owned()) - start;
  if (got !== choose)
    finding(
      `${def.id}: took ${got} hats from the set, expected exactly ${choose}`,
    );
  await bot.key("ArrowLeft", 30);
}

// ---------- the run
for (const room of roomOrder) {
  const defs = data.bundles.filter((x) => x.room === room);
  if (defs.length === 0) {
    finding(`room ${room} has no bundles`);
    continue;
  }
  const st = await status(room);
  if (st !== "ready") {
    finding(
      `room ${room} is ${st} when its turn came; later rooms cannot be reached`,
    );
    continue;
  }
  await openRoom(room);
  for (let bi = 0; bi < defs.length; bi++) {
    const def = defs[bi];
    // The Last Seat stays shut until the very last other bundle is done.
    if (def.id === lastOther.id) {
      await closeHall();
      const locked = await status(lastRoom);
      if (locked !== "locked")
        finding(`last-seat is ${locked} before ${def.id} (should be locked)`);
      await openRoom(lastRoom);
      const text = await hallText("detail");
      if (!/Not ready yet/.test(text))
        finding(`last-seat screen while locked says "${text}"`);
      else if (!/1 more bundle/.test(text))
        finding(`last-seat locked text does not say 1 more bundle: "${text}"`);
      await closeHall();
      await openRoom(room);
    }
    const t0 = Date.now();
    let ok = false;
    try {
      ok = await fillBundle(def, bi);
    } catch (e) {
      finding(`${def.id}: UI step failed: ${e.message}`);
    }
    results.push([def.id, ok]);
    log(
      `${ok ? "PASS" : "FAIL"} ${def.id} (${((Date.now() - t0) / 1000).toFixed(1)}s)`,
    );
    if (!ok) {
      // Make sure the screen is still the right one before the next bundle.
      const s = await bot.snap();
      if (!s.scenes.includes("hall")) await openRoom(room);
    }
  }
  const roomDone = await p.evaluate(
    (r) => window.__game.registry.get("state").hall.roomComplete(r),
    room,
  );
  const failed = results.filter(
    ([id, ok]) => !ok && defs.some((d) => d.id === id),
  );
  if (failed.length === 0 && !roomDone)
    finding(`room ${room}: every bundle passed but the room is not complete`);
  if (failed.length > 0 && roomDone)
    finding(`room ${room}: complete although a bundle failed`);
  // Rooms done in order: the next room must have opened by now, unless this was the last.
  await bot.shot(`bundles-${room}`);
  const scenes = await closeHall();
  if (scenes.includes("end")) {
    log("end screen opened after the last room");
    await bot.shot("bundles-end");
    await bot.key("Escape", 350);
  }
}

const passed = results.filter(([, ok]) => ok).length;
const hallAll = await p.evaluate(() => {
  const h = window.__game.registry.get("state").hall;
  return { all: h.allComplete, bridge: h.bridgeMended };
});
if (passed === data.bundles.length && !(hallAll.all && hallAll.bridge))
  finding(
    `all bundles passed but allComplete=${hallAll.all} bridgeMended=${hallAll.bridge}`,
  );
log(`${passed} of ${data.bundles.length} bundles filled through the UI`);
if (errs.length) finding(`console or page errors: ${errs.join(" | ")}`);
log("FINDINGS:\n" + (findings.length ? findings.join("\n") : "none"));
await b.close();
process.exit(findings.length ? 1 : 0);
