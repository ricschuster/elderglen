// Save split browser check (note 52): night and resume records, Continue,
// Restart this day, Export and Import, the two-tab guard and persist().
// Needs `npm run dev`. About 1 minute.
import fs from "node:fs";
import {
  GAME_URL,
  OUT,
  launch,
  Bot,
  log,
  sleepMs,
  finding,
  findings,
} from "./lib.mjs";

const { b, p, errs } = await launch({ fresh: true });
const bot = new Bot(p, errs);
const keys = () =>
  p.evaluate(() =>
    Object.keys(localStorage)
      .filter((k) => k.startsWith("elderglen-"))
      .sort(),
  );
const st = () =>
  p.evaluate(() => {
    const s = window.__game.registry.get("state");
    return {
      money: s.money,
      minutes: s.day.clock.minutes,
      day: s.day.clock.day,
      parsnip: s.inventory
        .save()
        .reduce((n, x) => (x && x.id === "parsnip" ? n + x.count : n), 0),
    };
  });
const scenes = () =>
  p.evaluate(() => window.__game.scene.getScenes(true).map((x) => x.scene.key));
const card = (slot) => ({ x: 600, y: 142 + (slot - 1) * 64 });

// 1. A night record and a resume record after the first sleep.
await bot.key("z", 600);
await bot.key("Enter", 400);
await bot.key("Enter", 400);
let k = await keys();
for (const want of ["elderglen-save-slot-1", "elderglen-resume-slot-1"])
  if (!k.includes(want)) finding(`no ${want} after the first night: ${k}`);
const morning = await st();
log("morning", JSON.stringify(morning));

// 2. Play on, then reload as a player closing the tab would.
await p.evaluate(() => window.farmGive("parsnip", 7));
await bot.walkTo(66, 16);
await sleepMs(3000);
const mid = await st();
const spot = await bot.dbg();
await p.reload();
await sleepMs(2000);
let sc = await scenes();
log("after reload scenes", sc);
await bot.shot("save-title");
if (!sc.includes("title")) finding(`reload did not reach the title: ${sc}`);

// 3. Continue loads the day in progress, not the morning.
await p.mouse.click(card(1).x, card(1).y);
await sleepMs(1500);
const cont = await st();
log("continue", JSON.stringify(cont), "mid", JSON.stringify(mid));
if (cont.parsnip !== mid.parsnip)
  finding(
    `Continue lost the day in progress: parsnip ${cont.parsnip}, was ${mid.parsnip}`,
  );
if (cont.minutes < mid.minutes - 10)
  finding(`Continue went back in time: ${cont.minutes}, was ${mid.minutes}`);
const spotAfter = (await bot.dbg()).tile;
log("tile", JSON.stringify(spot.tile), "->", JSON.stringify(spotAfter));
if (spot.tile.x !== spotAfter.x || spot.tile.y !== spotAfter.y)
  finding(
    `Continue put the player at ${JSON.stringify(spotAfter)}, was ${JSON.stringify(spot.tile)}`,
  );

// 4. Restart this day returns to the morning record.
await p.reload();
await sleepMs(2000);
await p.mouse.click(745, 142);
await sleepMs(300);
await p.mouse.click(745, 142);
await sleepMs(1500);
const rest = await st();
log("restart", JSON.stringify(rest));
if (rest.parsnip !== morning.parsnip || rest.minutes !== morning.minutes)
  finding(
    `Restart this day is not the morning: ${JSON.stringify(rest)} vs ${JSON.stringify(morning)}`,
  );

// 5. Persist: ask for durable storage (headless Chromium may refuse).
log(
  "persisted",
  await p.evaluate(() => navigator.storage?.persisted?.()),
  "persist API",
  await p.evaluate(() => typeof navigator.storage?.persist),
);

// 6. Export from Options, then Import the file into the first empty slot.
await p.reload();
await sleepMs(2000);
await p.keyboard.press("KeyO");
await sleepMs(800);
await bot.shot("save-options");
const optTexts = () =>
  p.evaluate(() =>
    window.__game.scene
      .getScenes(true)
      .flatMap((x) => x.children.list)
      .filter((o) => o.type === "Text")
      .map((o) => `${o.text}@${Math.round(o.x)},${Math.round(o.y)}`),
  );
let found;
for (let i = 0; i < 45 && !found; i++) {
  await p.keyboard.press("ArrowDown");
  await sleepMs(60);
  found = (await optTexts()).find((t) => t.startsWith("Export@"));
}
if (!found) finding("never reached the Save file row in Options");
else {
  await bot.shot("save-options-file");
  const [x, y] = found.split("@")[1].split(",").map(Number);
  const dl = p.waitForEvent("download", { timeout: 5000 }).catch(() => null);
  await p.mouse.click(x, y);
  const d = await dl;
  if (!d) finding("Export gave no download");
  else {
    const path = `${OUT}/${d.suggestedFilename()}`;
    await d.saveAs(path);
    const j = JSON.parse(fs.readFileSync(path, "utf8"));
    log(
      "export",
      d.suggestedFilename(),
      fs.statSync(path).size,
      "bytes",
      Object.keys(j),
    );
    if (j.format !== "elderglen-export" || !j.night)
      finding("export file shape wrong");
    if (!j.resume) finding("export has no resume record");
    // Import into the first empty slot (slot 2).
    const imp = (await optTexts()).find((t) => t.startsWith("Import@"));
    const [ix, iy] = imp.split("@")[1].split(",").map(Number);
    const fc = p.waitForEvent("filechooser", { timeout: 5000 });
    await p.mouse.click(ix, iy);
    await (await fc).setFiles(path);
    await sleepMs(800);
    const said = (await optTexts()).filter((t) =>
      /Imported|slot|file/i.test(t),
    );
    log("import says", JSON.stringify(said));
    if (!(await keys()).includes("elderglen-save-slot-2"))
      finding("Import did not fill slot 2");
    if (!(await keys()).includes("elderglen-resume-slot-2"))
      finding("Import did not carry the resume record");
    // Bad files.
    for (const [name, body] of [
      ["junk.json", "not json"],
      ["wrong.json", JSON.stringify({ format: "other" })],
      ["newer.json", JSON.stringify({ ...j, exportVersion: 99 })],
    ]) {
      const again = (await optTexts()).find((t) => t.startsWith("Import@"));
      log("import button now at", again);
      const [jx, jy] = again.split("@")[1].split(",").map(Number);
      const fc2 = p.waitForEvent("filechooser", { timeout: 5000 });
      await p.mouse.click(jx, jy);
      await (
        await fc2
      ).setFiles({
        name,
        mimeType: "application/json",
        buffer: Buffer.from(body),
      });
      await sleepMs(500);
      log(
        name,
        JSON.stringify(
          (await optTexts()).filter((t) =>
            /not an|newer|could not|Imported/i.test(t),
          ),
        ),
      );
    }
  }
}

// 7. Two-tab guard: a second tab in the same browser context is covered.
await b.close();
{
  const { chromium } = await import("playwright");
  const br = await chromium.launch({
    executablePath: process.env.CHROMIUM_PATH || undefined,
  });
  const ctx = await br.newContext({ viewport: { width: 960, height: 540 } });
  await ctx.addInitScript(() => {
    if (!localStorage.getItem("elderglen-settings"))
      localStorage.setItem(
        "elderglen-settings",
        JSON.stringify({
          version: 1,
          profile: "desktop",
          touchScheme: "stick",
        }),
      );
  });
  const covers = (pg) =>
    pg.evaluate(() =>
      [...document.querySelectorAll("button")].some((x) =>
        /Play here/.test(x.textContent),
      ),
    );
  const a1 = await ctx.newPage();
  await a1.goto(GAME_URL + "?new");
  await sleepMs(2500);
  const a2 = await ctx.newPage();
  await a2.goto(GAME_URL);
  await sleepMs(2500);
  const second = await covers(a2);
  if (!second) finding("a second tab was not covered by the guard");
  await a2.screenshot({ path: `${OUT}/shots/save-second-tab.png` });
  if (await covers(a1)) finding("the first tab was covered by the second one");
  await a2.click("text=Play here instead");
  await sleepMs(4500);
  const first = await covers(a1);
  if (!first) finding("the first tab did not pause after the second took over");
  log(
    "tab guard: second covered",
    second,
    "first paused after takeover",
    first,
  );
  // A reload of the owning tab reclaims its own lock.
  await a2.reload();
  await sleepMs(2500);
  if (await covers(a2)) finding("a reloaded tab locked itself out");
  await br.close();
}

// 8. Late-game size: a late stage, slept, with every record measured.
{
  const l = await launch({ fresh: true });
  const lb = new Bot(l.p, l.errs);
  const names = await l.p.evaluate(() => window.farmStages());
  log("stages", names.length, names.slice(-6).join(", "));
  const pick = process.env.LATE_STAGE ?? names[names.length - 1];
  const { toStage } = await import("./lib.mjs");
  await toStage(l.p, pick);
  await lb.key("z", 800);
  await lb.key("Enter", 400);
  await lb.key("Enter", 400);
  await sleepMs(500);
  const sizes = await l.p.evaluate(() =>
    Object.fromEntries(
      Object.keys(localStorage)
        .filter((k) => k.startsWith("elderglen-"))
        .map((k) => [k, localStorage[k].length]),
    ),
  );
  log(`late stage ${pick} sizes`, JSON.stringify(sizes));
  const total = Object.values(sizes).reduce((a, c) => a + c, 0);
  log(
    "total chars",
    total,
    "x5 slots, 3 records:",
    Math.round((total * 5) / 1024),
    "KB (chars, x2 bytes in UTF-16 quota)",
  );
  if (total * 5 * 2 > 5 * 1024 * 1024)
    finding(`five late-game slots would pass 5 MB: ${total * 10} bytes`);
  log("late errors", JSON.stringify(l.errs));
  await l.b.close();
}
log("FINDINGS:\n" + (findings.length ? findings.join("\n") : "none"));
process.exit(0);
