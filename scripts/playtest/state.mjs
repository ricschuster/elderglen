// The farmState dev hook: jump a new game to a chosen state in one call and
// read it back. About 10 seconds.
import { launch, Bot, log, sleepMs, finding, findings } from "./lib.mjs";

const { b, p, errs } = await launch({ fresh: true });
const bot = new Bot(p, errs);

const result = await p.evaluate(() =>
  window.farmState({
    season: "summer",
    dayOfSeason: 12,
    money: 7777,
    items: { wood: 40, parsnip: 5 },
    skills: { farming: 4, mining: 2 },
    hallRooms: ["foragers-shelf"],
    flags: ["secret-log-cleared"],
    hearts: { odette: 3 },
  }),
);
await sleepMs(800);
log("problems", JSON.stringify(result));
if (result.problems.length) finding(`problems: ${result.problems}`);

const dbg = await bot.dbg();
const g = await p.evaluate(() => {
  const s = window.__game.registry.get("state");
  return {
    skills: {
      farming: s.skills.level("farming"),
      mining: s.skills.level("mining"),
    },
    pantry: s.hall.roomComplete("foragers-shelf"),
    flag: s.flags,
    hearts: s.friendship.hearts("odette"),
  };
});
const expect = (name, got, want) => {
  if (JSON.stringify(got) !== JSON.stringify(want))
    finding(
      `${name}: got ${JSON.stringify(got)}, wanted ${JSON.stringify(want)}`,
    );
};
expect("day", dbg.day, 28 + 12);
expect("money", dbg.money, 7777);
expect("wood", dbg.wood, 40);
expect("skills", g.skills, { farming: 4, mining: 2 });
expect("foragers-shelf", g.pantry, true);
expect("flags", g.flag, ["secret-log-cleared"]);
expect("hearts", g.hearts, 3);
const scenes = (await bot.snap()).scenes;
if (!scenes.includes("farm") && !scenes.includes("Farm"))
  log("scenes after the jump", scenes.join(","));
await bot.shot("state-jump");

log("errors", JSON.stringify(errs));
log("FINDINGS:\n" + (findings.length ? findings.join("\n") : "none"));
await b.close();
process.exit(findings.length ? 1 : 0);
