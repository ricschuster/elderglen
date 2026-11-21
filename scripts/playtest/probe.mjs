// Where villagers are by the schedule, as text. No screenshots.
//   node scripts/playtest/probe.mjs <from> <to> [step] [id,id] [map,map]
// Times are H:MM on the game clock (7:30, 26:00 for 2 am). Defaults: step 10, every
// villager found, maps house,farm,hearthwell. Reads today's state on the tablet.
// Example: node scripts/playtest/probe.mjs 7:30 9:30 10 linnet
import { ev } from "./tablet-lib.mjs";

const mins = (t) => {
  const [h, m] = t.split(":").map(Number);
  return h * 60 + (m || 0);
};
const [from, to, step = "10", ids = "", maps = "house,farm,hearthwell"] =
  process.argv.slice(2);
if (!from || !to) {
  console.error("usage: probe.mjs <from H:MM> <to H:MM> [step] [ids] [maps]");
  process.exit(2);
}
const lines = await ev(
  `window.farmWhere(${mins(from)}, ${mins(to)}, ${Number(step)}, ${JSON.stringify(
    ids ? ids.split(",") : [],
  )}, ${JSON.stringify(maps.split(","))})`,
);
console.log(lines.join("\n"));
