// Farm ponds by hand (#951): from the `farm-pond-stocked` stage walk to the pond, press Action
// with a fish held (stock it), with a second kind (refused), with nothing (menu opens), then sleep
// nights and read roe, breeding and the pond status. Also orders a pond from `farm-pond-to-order` through the carpenter menu, and
// takes a waiting product (`farm-pond-product`) and fills a capacity quest (`farm-pond-quest`) by hand.
// Run with `npm run dev` going: node scripts/playtest/pond.mjs
import {
  launch,
  Bot,
  log,
  sleepMs,
  finding,
  findings,
  toStage,
} from "./lib.mjs";

const { b, p, errs } = await launch({ fresh: true });
const bot = new Bot(p, errs);
const expect = (what, got, want) => {
  const ok = JSON.stringify(got) === JSON.stringify(want);
  log(`${ok ? "ok  " : "FAIL"} ${what}: ${JSON.stringify(got)}`);
  if (!ok)
    finding(
      `${what}: got ${JSON.stringify(got)}, wanted ${JSON.stringify(want)}`,
    );
};
const pond = () =>
  p.evaluate(async () => {
    const m = await import("/src/core/pond.ts");
    const s = window.__game.registry.get("state");
    const pl = m.pondsOf(s)[0];
    if (!pl) return null;
    const st = m.stateOf(pl);
    return {
      species: st.species,
      count: st.count,
      cap: m.capOf(st),
      out: st.out ?? null,
      quest: st.quest ?? null,
      building: st.building,
      carp: s.inventory.count("carp"),
      perch: s.inventory.count("perch"),
    };
  });
const slotOf = (id) =>
  p.evaluate(
    (id) =>
      window.__game.registry
        .get("state")
        .inventory.save()
        .findIndex((x) => x?.id === id),
    id,
  );
const open = () => p.evaluate(() => window.__game.scene.isActive("pond"));
const dayNo = () =>
  p.evaluate(() => window.__game.registry.get("state").day.clock.day);
const sleepNight = async () => {
  const d0 = await dayNo();
  await bot.key("z", 600);
  await bot.key("Enter", 500);
  await sleepMs(1200);
  await bot.dismissModals();
  const d1 = await dayNo();
  if (d1 !== d0 + 1) finding(`a night did not pass: day ${d0} to ${d1}`);
};

await toStage(p, "farm-pond-stocked");
await bot.dismissModals();
expect("start", (await pond())?.count, 2);

// Walk to the pond (top left 50,18; 5 by 5) and face its west edge.
await bot.walkTo(49, 20);
await bot.face("right");
const where = await bot.dbg();
log("at", JSON.stringify(where.tile), "target", JSON.stringify(where.target));

// A second kind is refused.
await bot.select(await slotOf("perch"));
await bot.key("KeyX", 200);
let s = await pond();
expect("perch refused, count", [s.count, s.species, s.perch], [2, "carp", 1]);

// The same kind goes in.
await bot.select(await slotOf("carp"));
await bot.key("KeyX", 200);
s = await pond();
expect("carp in", [s.count, s.carp], [3, 2]);

// Nothing held to put in: the menu opens, then closes.
await bot.select(11);
await bot.key("KeyX", 300);
expect("menu opens on an empty hand", await open(), true);
await bot.key("Escape", 300);
expect("menu closes", await open(), false);

// Nights: roe and breeding. Record each morning.
for (let n = 1; n <= 8; n++) {
  await sleepNight();
  s = await pond();
  log(`night ${n}: ${JSON.stringify(s)}`);
}
if (s.count !== s.cap) finding(`pond not at its cap: ${JSON.stringify(s)}`);
if (!s.out)
  log(
    "no product waiting after 8 nights (chance 0.15 + 0.08 per fish a night)",
  );

// Take a waiting product by Action with an empty hand, if any.
if (s.out) {
  await bot.walkTo(49, 20);
  await bot.face("right");
  await bot.select(11);
  // The walks cleared trees and filled the pack with wood: make room, as a player would.
  await p.evaluate(() => {
    const inv = window.__game.registry.get("state").inventory;
    inv.remove("wood", inv.count("wood"));
  });
  const fd = await bot.dbg();
  log("take: at", JSON.stringify(fd.tile), "target", JSON.stringify(fd.target));
  log(
    "held/room",
    JSON.stringify(
      await p.evaluate(async () => {
        const s = window.__game.registry.get("state");
        const sc = window.__game.scene.getScenes(true)[0];
        const pk = s.inventory.save();
        return {
          sel: sc.selected,
          held: pk[sc.selected] ?? null,
          room: s.inventory.room("carp-roe"),
          used: pk.filter(Boolean).length,
          size: pk.length,
          report: window.__game.scene.isActive("report"),
        };
      }),
    ),
  );
  const before = await p.evaluate(
    (id) => window.__game.registry.get("state").inventory.count(id),
    s.out.item,
  );
  await bot.key("KeyX", 300);
  log(
    "scenes",
    JSON.stringify(
      await p.evaluate(() =>
        window.__game.scene.getScenes(true).map((s) => s.scene.key),
      ),
    ),
  );
  const after = await p.evaluate(
    (id) => window.__game.registry.get("state").inventory.count(id),
    s.out.item,
  );
  expect("product taken", after - before, s.out.count);
  expect("pond out cleared", (await pond()).out, null);
}

// Order a pond (stage farm-pond-to-order): cost, the build days, then it opens.
await toStage(p, "farm-pond-to-order");
await bot.dismissModals();
// Through the carpenter's menu: the Fish pond row's Place button, then the placement screen.
const ord = await p.evaluate(async () => {
  const m = await import("/src/core/pond.ts");
  const g = window.__game;
  const s = g.registry.get("state");
  const prob = m.pondOrderProblem(s);
  const before = s.money;
  g.scene.getScenes(true)[0].scene.launch("carpenter");
  await new Promise((r) => setTimeout(r, 600));
  const c = g.scene.getScene("carpenter");
  c.placePond();
  await new Promise((r) => setTimeout(r, 600));
  const placing = g.scene.isActive("placement");
  const pl = g.scene.getScene("placement");
  pl.moveTo(50, 18);
  const free = pl.free;
  pl.confirm();
  await new Promise((r) => setTimeout(r, 600));
  return {
    prob: prob ?? null,
    r: { ok: placing && free && m.pondsOf(s).length === 1 },
    placing,
    free,
    paid: before - s.money,
    days: m.POND_BUILD_DAYS,
  };
});
log("order", JSON.stringify(ord));
expect("order ok", ord.r.ok, true);
expect("paid 5000", ord.paid, 5000);
s = await pond();
expect("building", s?.building, ord.days);
for (let n = 0; n < ord.days; n++) await sleepNight();
s = await pond();
expect("built after the days", s?.building, 0);
// Stock the new pond by hand.
await bot.walkTo(49, 20);
await bot.face("right");
await bot.select(await slotOf("carp"));
await bot.key("KeyX", 300);
s = await pond();
expect("new pond stocked", [s.species, s.count], ["carp", 1]);
// Breeding from one fish: a new fish arrives after the species' spawn days.
for (let n = 1; n <= 8; n++) {
  await sleepNight();
  s = await pond();
  log(
    `new pond night ${n}: count ${s.count} of ${s.cap}, out ${JSON.stringify(s.out)}`,
  );
}
if (s.count < 2) finding(`no breeding in 8 nights: ${JSON.stringify(s)}`);

// A waiting product from the stage: an empty hand takes it.
await toStage(p, "farm-pond-product");
await bot.dismissModals();
s = await pond();
expect("product waiting", s.out, { item: "carp-roe", count: 2 });
await bot.walkTo(49, 20);
await bot.face("right");
await bot.select(11);
await p.evaluate(() => {
  const inv = window.__game.registry.get("state").inventory;
  inv.remove("wood", inv.count("wood"));
});
const roe0 = await p.evaluate(() =>
  window.__game.registry.get("state").inventory.count("carp-roe"),
);
await bot.key("KeyX", 300);
const roe1 = await p.evaluate(() =>
  window.__game.registry.get("state").inventory.count("carp-roe"),
);
expect("stage product taken", roe1 - roe0, 2);
expect("stage product cleared", (await pond()).out, null);

// A capacity quest from the stage: hand the ore in with Action, one at a time.
await toStage(p, "farm-pond-quest");
await bot.dismissModals();
s = await pond();
expect("quest open", s.quest, { item: "copper-ore", need: 3, given: 0 });
const cap0 = s.cap;
await bot.walkTo(49, 20);
await bot.face("right");
for (let i = 0; i < 3; i++) {
  await bot.select(await slotOf("copper-ore"));
  await bot.key("KeyX", 300);
  await bot.dismissModals();
}
s = await pond();
expect("quest closed", s.quest, null);
expect("capacity rose", s.cap > cap0, true);
log(`capacity ${cap0} to ${s.cap}`);

log("errors", JSON.stringify(errs));
if (errs.length) finding(`console errors: ${errs.length}`);
log("FINDINGS:\n" + (findings.length ? findings.join("\n") : "none"));
await b.close();
