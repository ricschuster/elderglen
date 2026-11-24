// The slayer wall list (note 22, Maren's `wall-list` tile in the mine hall) and the floor 120 dangerous
// mode lever, headless, as text. Part 1 opens the list in the mine hall, reads the rows, claims a ready
// goal and buys a reward again in the shop, then closes it. Part 2 stands on floor 120 (stage `mines-120`),
// flips the lever (it takes effect the next day, note 109 rule 9): pending only today, flipping back cancels,
// and after the day ends the mine is dangerous.
// Run: npm run dev, then `BASE_URL=http://localhost:5173/ node scripts/playtest/wall-lever.mjs`. About 30 seconds.
// Exit code 1 when a check fails.
import { launch, Bot, log, sleepMs } from "./lib.mjs";

const w = await launch({ fresh: true });
const bot = new Bot(w.p, w.errs);
const fails = [];
const ok = (cond, msg) => {
  log(cond ? "pass" : "FAIL", msg);
  if (!cond) fails.push(msg);
};
const scenes = async () => (await bot.snap()).scenes;
// ---- part 1: the wall list
const r1 = await w.p.evaluate(() =>
  window.farmState({
    season: "summer",
    dayOfSeason: 10,
    weather: "sunny",
    money: 60000,
    skills: { combat: 6 },
    minesDeepest: 5,
    map: "mine",
    entry: "from_above",
    autoProfessions: true,
  }),
);
ok(
  r1.problems.length === 0,
  `mine hall state set ${JSON.stringify(r1.problems)}`,
);
await sleepMs(1200);
ok((await bot.dbg()).map === "mine", "standing in the mine hall");

// Kills for the first goal, made through the rules' own tally.
const first = await w.p.evaluate(async () => {
  const c = await import("/src/core/creatures.ts");
  const s = window.__game.registry.get("state");
  const g = c.SLAYER_GOALS[0];
  s.combat.kills[g.kinds[0]] = g.goal;
  return { id: g.id, goal: g.goal, name: g.name };
});
log("goal staged", JSON.stringify(first));

await bot.actAt(6, 1);
await sleepMs(400);
ok(
  (await scenes()).includes("walllist"),
  "Action on the wall-list tile opens the list",
);
const rows = await w.p.evaluate(() => {
  const sc = window.__game.scene.getScene("walllist");
  return sc.menu.rows?.map((r) => `${r.label} | ${r.detail}`) ?? [];
});
log(rows.join("\n"));
ok(
  rows.length >= 13,
  `the list shows the switch row and every goal (${rows.length} rows)`,
);
ok(
  rows.some((r) => r.includes(first.name) && /Ready to claim/.test(r)),
  `${first.name} reads Ready to claim`,
);
// Claim: move the menu to the ready row and press its button.
const claimed = await w.p.evaluate((name) => {
  const sc = window.__game.scene.getScene("walllist");
  const i = sc.menu.rows.findIndex((r) => r.label.startsWith(name));
  const row = sc.menu.rows[i];
  const btn = row?.buttons?.find((b) => b.text === "Claim");
  if (!btn) return false;
  btn.run();
  return true;
}, first.name);
ok(claimed, "a Claim button is on the ready goal");
const after = await w.p.evaluate(async () => {
  const l = await import("/src/core/slayerlist.ts");
  const c = await import("/src/core/creatures.ts");
  const s = window.__game.registry.get("state");
  return l.goalState(s, c.SLAYER_GOALS[0]);
});
ok(after === "claimed", `goal state after Claim is ${after}`);
// Shop page: the reward is sold again.
const shop = await w.p.evaluate(() => {
  const sc = window.__game.scene.getScene("walllist");
  sc.menu.rows[0].buttons[0].run();
  return sc.menu.rows.map(
    (r) => `${r.label} | ${r.detail} | ${(r.buttons ?? []).map((b) => b.text)}`,
  );
});
log(shop.join("\n"));
ok(
  shop.length >= 2 && /g$/.test(shop[1].split(" | ")[1] ?? ""),
  "the shop page lists a reward with a price",
);
// A second met goal that is not claimed: the shop sells it, and buying it costs the listed price.
const bought = await w.p.evaluate(async () => {
  const l = await import("/src/core/slayerlist.ts");
  const c = await import("/src/core/creatures.ts");
  const s = window.__game.registry.get("state");
  for (const g of c.SLAYER_GOALS.slice(1)) {
    const r = l.rewardOf(g);
    if (!r || r.price === undefined) continue;
    s.combat.kills[g.kinds[0]] = g.goal;
    const before = s.money;
    const err = l.buyReward(s, r.id);
    return {
      id: r.id,
      price: r.price,
      err: err ?? null,
      spent: before - s.money,
    };
  }
  return { none: true };
});
log("buy", JSON.stringify(bought));
ok(
  !bought.none && bought.err === null,
  `buying a met goal's reward works (${JSON.stringify(bought)})`,
);
if (bought.err === null)
  ok(
    bought.spent === bought.price,
    `buying cost ${bought.spent}g (price ${bought.price}g)`,
  );
await w.p.keyboard.press("Escape");
await sleepMs(400);
ok(
  !(await scenes()).includes("walllist"),
  "Escape closes the list and the farm runs again",
);

// ---- part 2: the lever on floor 120
await w.p.evaluate(() => window.farmStage("mines-120"));
await sleepMs(1500);
const here = await bot.dbg();
ok(here.map === "mine-120", `stage mines-120 lands on ${here.map}`);
const lever = await w.p.evaluate(async () => {
  const m = await import("/src/core/mines.ts");
  const s = window.__game.registry.get("state");
  const l = m.floorLayout(120, s.day.clock.day).lever;
  return {
    lever: l ?? null,
    dangerous: s.mines.dangerous,
    deepest: s.mines.deepest,
  };
});
log("lever", JSON.stringify(lever));
ok(!!lever.lever, "floor 120 has a lever");
ok(
  lever.deepest >= 120 && lever.dangerous === false,
  "lever unlocked, dangerous mode off at the start",
);
// The generated floor maps are not in the bot's map table, so walk with the game's own route and
// the game's own blocked tiles (`farmWalk`, `farmBlocked`).
const flip = async () => {
  const blocked = new Set(await w.p.evaluate(() => window.farmBlocked()));
  const L = lever.lever;
  const sides = [
    { x: L.x, y: L.y + 1, dir: "up" },
    { x: L.x, y: L.y - 1, dir: "down" },
    { x: L.x - 1, y: L.y, dir: "right" },
    { x: L.x + 1, y: L.y, dir: "left" },
  ].filter((c) => !blocked.has(`${c.x},${c.y}`));
  let at;
  for (const c of sides)
    if (await bot.hookWalk(c.x, c.y)) ((at = c), (sides.length = 0));
  if (!at) throw new Error("could not stand beside the lever");
  await bot.face(at.dir);
  await bot.key("KeyX", 200);
  return (await bot.dbg()).message;
};
const m1 = await flip();
log("message:", m1);
ok(
  /From tomorrow, the mine is dangerous/.test(m1),
  "first pull says the mine changes tomorrow",
);
const st = () =>
  w.p.evaluate(() => {
    const s = window.__game.registry.get("state");
    return {
      today: s.mines.dangerous,
      tomorrow: s.mines.dangerousTomorrow,
      day: s.day.clock.day,
    };
  });
const s1 = await st();
ok(
  s1.today === false && s1.tomorrow === true,
  `flip is pending only ${JSON.stringify(s1)}`,
);
// A floor made today, after the flip, is still calm.
const made = await w.p.evaluate(() => {
  const s = window.__game.registry.get("state");
  return s.mines.visit(110, s.day.clock.day).dangerous === true;
});
ok(made === false, "a floor made after the flip is not dangerous today");
// Flipping back before the day ends cancels the flip.
const m2 = await flip();
log("message:", m2);
ok(
  /From tomorrow, the mine is calm/.test(m2),
  "second pull says calm tomorrow",
);
const s2 = await st();
ok(
  s2.today === false && s2.tomorrow === false,
  `second pull cancels ${JSON.stringify(s2)}`,
);
// Flip again and let the day end through the game's own sleep rules.
await flip();
const s3 = await st();
ok(s3.tomorrow === true, "flipped on again");
const slept = await w.p.evaluate(async () => {
  const sl = await import("/src/core/sleep.ts");
  const s = window.__game.registry.get("state");
  sl.sleep(s, [], Math.random, undefined, true);
  return {
    today: s.mines.dangerous,
    tomorrow: s.mines.dangerousTomorrow,
    day: s.day.clock.day,
  };
});
log("after sleep", JSON.stringify(slept));
ok(
  slept.today === true && slept.tomorrow === true,
  "after the day ends the mine is dangerous",
);
const next = await w.p.evaluate(() => {
  const s = window.__game.registry.get("state");
  return s.mines.visit(111, s.day.clock.day).dangerous === true;
});
ok(next, "a floor made the next day is dangerous");
ok(
  w.errs.length === 0,
  `no console errors ${JSON.stringify(w.errs).slice(0, 300)}`,
);

await w.b.close();
log(fails.length ? `FAILED: ${fails.join("; ")}` : "all passed");
process.exit(fails.length ? 1 : 0);
