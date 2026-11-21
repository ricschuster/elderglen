// Take the "engaged" stage (house tier 1) through the nights to the wedding, silently.
//   node scripts/playtest/wedding-morning.mjs
// Starts the stage in slot 5, then sleeps (clock to 1:50 am, pass out, Start the day) until
// the wedding scene plays. It stops with the wedding scene or report on screen and prints one
// line. The tablet app must be open on a game (title, any slot). Does not touch real saves.
import { ev, status, sleep, tap, wake } from "./tablet-lib.mjs";

wake();
const r = await ev(`JSON.stringify(window.farmStage("engaged"))`);
if (!r.includes('"problems":[]')) {
  console.log(`stage problems: ${r}`);
  process.exit(1);
}
await sleep(3000);
const stage = () =>
  ev(`window.__game?.registry.get("state")?.marriage?.stage ?? "unknown"`);
const day = () => ev(`window.farmDebug().day`);
let nights = 0;
while ((await stage()) === "engaged" && nights < 12) {
  await ev(`window.farmState({minutes:1550})`);
  await sleep(26000);
  nights++;
  if ((await stage()) !== "engaged") break;
  tap(960, 856); // Start the day
  await sleep(2500);
}
console.log(
  `${await status()} after ${nights} nights (day ${await day()}); the report/wedding is on screen`,
);
