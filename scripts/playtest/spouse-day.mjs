// The spouse's day by the schedule, as text, headless (no tablet). Starts the "married" stage
// (or the stage named in argv[2]), prints one line each time the spouse's place changes.
//   node scripts/playtest/spouse-day.mjs [stage]
// FROM, TO, STEP (minutes), ALL=1 (every step), MAPS=a,b (default house,farm,hearthwell; "none" = on none of them).
import { launch, sleepMs } from "./lib.mjs";

const { b, p, errs } = await launch({ fresh: true });
await p.evaluate(
  ([a, c, d, process_all, maps]) => {
    window.__maps = maps ? maps.split(",") : undefined;
    window.__from = a;
    window.__to = c;
    window.__step = d;
    window.__all = !!process_all;
  },
  [
    process.env.FROM || 360,
    process.env.TO || 1560,
    process.env.STEP || 10,
    !!process.env.ALL,
    process.env.MAPS || "",
  ],
);
const r = await p.evaluate(
  (n) => JSON.stringify(window.farmStage(n)),
  process.argv[2] || "married",
);
await sleepMs(1500);
console.log("stage:", r);
const out = await p.evaluate(() => {
  const s = window.__game.registry.get("state");
  const id = s.marriage.spouse;
  const lines = window.farmWhere(
    Number(window.__from || 360),
    Number(window.__to || 1560),
    Number(window.__step || 10),
    [id],
    window.__maps,
  );
  let prev = "";
  const changes = [];
  for (const l of lines) {
    const rest = l.slice(l.indexOf(" ") + 1);
    const place = rest.replace(/ [\d]+,[\d]+$/, "");
    if (place !== prev || window.__all) changes.push(l);
    prev = place;
  }
  return { id, stage: s.marriage.stage, day: s.day.clock.day, changes };
});
console.log(out.id, out.stage, "day", out.day);
console.log(out.changes.join("\n"));
console.log("errors", JSON.stringify(errs));
await b.close();
