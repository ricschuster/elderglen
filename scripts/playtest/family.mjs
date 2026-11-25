// Children, divorce and re-dating by the core rules, headless (note 12, note 84). Starts the
// "married" stage (house tier 2), asks for a child and lets it arrive, then divorces, sleeps to
// the end of the marriage and courts the ex again. Checks the wiring, not the walking.
// Run with `npm run dev` going: node scripts/playtest/family.mjs
import { launch, Bot, log, sleepMs, finding, findings } from "./lib.mjs";

const { b, p, errs } = await launch({ fresh: true });
const bot = new Bot(p, errs);
const expect = (name, got, want) => {
  if (JSON.stringify(got) !== JSON.stringify(want))
    finding(
      `${name}: got ${JSON.stringify(got)}, wanted ${JSON.stringify(want)}`,
    );
};
const scenes = () =>
  p.evaluate(() => window.__game.scene.getScenes(true).map((x) => x.scene.key));
async function clearOverlays(what) {
  for (let i = 0; i < 25; i++) {
    const s = await scenes();
    if (s.length <= 1 && s[0] === "farm") return;
    await bot.key("Enter", 350);
  }
  finding(`${what}: overlays did not clear: ${await scenes()}`);
}

const r = await p.evaluate(() => JSON.stringify(window.farmStage("married")));
await sleepMs(1500);
if (!r.includes('"problems":[]')) finding(`stage problems: ${r}`);

// A child: not asked before a week has passed, then a yes brings one in ARRIVAL_DAYS.
const kid = await p.evaluate(async () => {
  const c = await import("/src/core/children.ts");
  const s = window.__game.registry.get("state");
  const m = s.marriage;
  const out = { kids0: m.children, dueAtStart: c.childAskDue(s) };
  s.day.clock.day = m.weddingDay + c.ASK_AFTER_WEDDING_DAYS;
  out.dueAfterWeek = c.childAskDue(s);
  out.reply = c.answerAsk(s, true, "Linnet");
  out.childDue = m.childDue - s.day.clock.day;
  out.arrival = c.ARRIVAL_DAYS;
  s.day.clock.day = m.childDue;
  out.news = c.childMorning(s) ?? null;
  out.kids1 = m.children;
  out.askAgainAtOnce = c.childAskDue(s);
  return out;
});
log("child", JSON.stringify(kid));
if (!kid.dueAfterWeek) finding("the ask was not due a week after the wedding");
if (kid.childDue !== kid.arrival)
  finding("the arrival day is not ARRIVAL_DAYS on");
if (!kid.news || kid.kids1 !== kid.kids0 + 1)
  finding("the child did not arrive");
if (kid.askAgainAtOnce) finding("a second ask came at once");

// Divorce, then sleep: the marriage ends, a child stays on the record, the ex flag is up.
const dv = await p.evaluate(async () => {
  const d = await import("/src/core/divorce.ts");
  const s = window.__game.registry.get("state");
  return { filed: d.fileDivorce(s), kids: s.marriage.children };
});
expect("file", dv.filed, true);
await bot.key("z", 600);
await clearOverlays("the divorce morning");
const after = await p.evaluate(() => {
  const s = window.__game.registry.get("state");
  return {
    stage: s.marriage.stage,
    kids: s.marriage.children,
    ex: s.marriage.isEx("linnet"),
    spouse: s.friendship.spouse ?? null,
  };
});
log("after divorce", JSON.stringify(after));
expect("stage after divorce", after.stage, "none");
expect("ex mark", after.ex, true);
log("children after divorce:", after.kids, "(was", dv.kids + ")");

// Re-dating: court the ex again.
const red = await p.evaluate(async () => {
  const c = await import("/src/core/courtship.ts");
  const s = window.__game.registry.get("state");
  window.farmState({
    items: { bouquet: 1, "promise-token": 1 },
    hearts: { linnet: 10 },
  });
  const bq = c.courtGift(s, "linnet", "bouquet");
  window.farmState({ hearts: { linnet: 10 } });
  const tk = c.courtGift(s, "linnet", "promise-token");
  return {
    bq: bq?.message ?? null,
    tk: tk?.message ?? null,
    stage: s.marriage.stage,
  };
});
log("re-dating", JSON.stringify(red));
await sleepMs(500);
log("errors", JSON.stringify(errs));
if (errs.length) finding(`console errors: ${errs.length}`);
log("FINDINGS:\n" + (findings.length ? findings.join("\n") : "none"));
await b.close();
process.exit(findings.length ? 1 : 0);
