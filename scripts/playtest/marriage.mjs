// Marriage (note 12): court, propose, sleep to the wedding, play the wedding
// scene, check the spouse room and the morning after, the daily kiss, and a
// divorce filed and cancelled. State is set with the farmState hook and the
// core courtship rules (imported in the page), so this checks the wiring (the
// scenes, the morning report, the save) and not the walking. About 40 seconds.
// Run with `npm run dev` going: node scripts/playtest/marriage.mjs
import { launch, Bot, log, sleepMs, finding, findings } from "./lib.mjs";

const { b, p, errs } = await launch({ fresh: true });
const bot = new Bot(p, errs);

const st = () =>
  p.evaluate(() => {
    const s = window.__game.registry.get("state");
    const m = s.marriage;
    return {
      stage: m.stage,
      spouse: m.spouse,
      weddingDay: m.weddingDay,
      day: s.day.clock.day,
      kids: m.kids.length,
      divorcing: m.divorcing,
      scenes: window.__game.scene.getScenes(true).map((x) => x.scene.key),
    };
  });
const expect = (name, got, want) => {
  if (JSON.stringify(got) !== JSON.stringify(want))
    finding(
      `${name}: got ${JSON.stringify(got)}, wanted ${JSON.stringify(want)}`,
    );
};
/** Press Enter until no overlay scene is left but the farm (cap 25 presses). */
async function clearOverlays(what) {
  for (let i = 0; i < 25; i++) {
    const s = await st();
    if (s.scenes.length <= 1 && s.scenes[0] === "farm") return;
    await bot.key("Enter", 350);
  }
  finding(`${what}: overlays did not clear: ${(await st()).scenes}`);
}

const who = await p.evaluate(async () => {
  const v = await import("/src/core/villagers.ts");
  return v.VILLAGERS.find((x) => x.candidate)?.id;
});
if (!who) finding("no candidate villager in the data");
log("courting", who);

const r = await p.evaluate(
  (id) =>
    window.farmState({
      season: "spring",
      dayOfSeason: 3,
      weather: "sunny",
      money: 60000,
      items: { bouquet: 1, "promise-token": 1 },
      hearts: { [id]: 10 },
    }),
  who,
);
await sleepMs(800);
if (r.problems.length) finding(`state problems: ${r.problems}`);

const give = (held) =>
  p.evaluate(
    async ([id, item]) => {
      const c = await import("/src/core/courtship.ts");
      const s = window.__game.registry.get("state");
      return c.courtGift(s, id, item);
    },
    [who, held],
  );

let res = await give("bouquet");
log("bouquet:", res?.message);
expect("stage after the bouquet", (await st()).stage, "courting");
// The bouquet lifts the heart cap, so the 10 hearts are given after it.
await p.evaluate((id) => window.farmState({ hearts: { [id]: 10 } }), who);
await sleepMs(800);
res = await give("promise-token");
log("token:", res?.message);
let s = await st();
expect("stage after the token", s.stage, "engaged");
expect("wedding in three days", s.weddingDay - s.day, 3);

// Sleep to the wedding day (three nights, a sunny forecast is not guaranteed:
// the game puts the wedding off a day for rain or a festival).
for (let n = 0; n < 8 && (await st()).stage === "engaged"; n++) {
  await bot.key("z", 600);
  await clearOverlays("the report");
  s = await st();
  if (s.scenes.includes("heart-event")) break;
  // A wedding scene opens in the morning of the day (FarmScene weddingMorning).
  await sleepMs(500);
  s = await st();
  if (s.scenes.includes("heart-event")) {
    log("wedding scene open on day", s.day);
    for (let i = 0; i < 30 && (await st()).scenes.includes("heart-event"); i++)
      await bot.key("Enter", 400);
    break;
  }
}
await sleepMs(500);
await clearOverlays("after the wedding");
s = await st();
expect("stage after the wedding", s.stage, "married");
expect("spouse", s.spouse, who);
await bot.shot("marriage-wedding");

// The morning after: the spouse is on the farm, the room is in the house.
await bot.key("z", 600);
await clearOverlays("the morning after");
s = await st();
log("day", s.day, "stage", s.stage);
await bot.shot("marriage-morning");

// The daily kiss restores energy once a day.
const k = await p.evaluate(async (id) => {
  const sp = await import("/src/core/spouse.ts");
  const s = window.__game.registry.get("state");
  s.day.energy.current = 20;
  const gained = sp.kiss(s, id);
  const mid = s.day.energy.current;
  const again = sp.kiss(s, id);
  return { gained, mid, again: again ?? null, end: s.day.energy.current };
}, who);
log("kiss", JSON.stringify(k));
if (!(k.gained > 0)) finding("the kiss did not restore energy");
if (k.again !== null || k.end !== k.mid)
  finding("a second kiss in a day did something");

// Divorce: file (fee paid), cancel (fee back), file again and sleep: ended.
const dv = await p.evaluate(async () => {
  const d = await import("/src/core/divorce.ts");
  const s = window.__game.registry.get("state");
  const m0 = s.money;
  const filed = d.fileDivorce(s);
  const paid = m0 - s.money;
  const cancelled = d.cancelDivorce(s);
  const back = s.money - m0;
  const refiled = d.fileDivorce(s);
  return { filed, paid, cancelled, back, refiled };
});
log("divorce", JSON.stringify(dv));
expect("divorce file and cancel", dv, {
  filed: true,
  paid: 50000,
  cancelled: true,
  back: 0,
  refiled: true,
});
await bot.key("z", 600);
await clearOverlays("the divorce morning");
s = await st();
expect("stage after divorce", s.stage, "none");
const ex = await p.evaluate(
  (id) => window.__game.registry.get("state").flags.includes(`ex-${id}`),
  who,
);
expect("ex flag", ex, true);
await bot.shot("marriage-divorced");

log("errors", JSON.stringify(errs));
if (errs.length) finding(`console errors: ${errs.length}`);
log("FINDINGS:\n" + (findings.length ? findings.join("\n") : "none"));
await b.close();
process.exit(findings.length ? 1 : 0);
