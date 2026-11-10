// Smoke test of the newer scenes: the collections page, the smith (geodes),
// the carpenter (furniture, flooring, wallpaper), the village green and hedge
// festival maps, the mailbox, mine floors beyond 10 and the request board. It
// opens each, does one small thing, takes a screenshot and fails on any console
// error or page error. Also the hat box Collections row, buying the Furniture
// Catalogue, placing it, taking a copy and the morning report. About 90 seconds. Needs `npm run dev`.
import { launch, Bot, log, sleepMs, finding, findings, OUT } from "./lib.mjs";

const { b, p, errs } = await launch({ fresh: true });
const bot = new Bot(p, errs);
const farm = (fn, arg) =>
  p.evaluate(
    ([src, arg]) => {
      const g = window.__game;
      const f = g.scene.getScene("farm");
      return new Function("g", "f", "s", "arg", src)(
        g,
        f,
        g.registry.get("state"),
        arg,
      );
    },
    [`return (${fn.toString()})(g, f, s, arg)`, arg],
  );
const shot = (name) => p.screenshot({ path: `${OUT}/shots/smoke-${name}.png` });
const active = () =>
  p.evaluate(() => window.__game.scene.getScenes(true).map((s) => s.scene.key));

async function step(name, fn) {
  const before = errs.length;
  try {
    await fn();
  } catch (e) {
    finding(`${name}: script error: ${e.message}`);
  }
  await sleepMs(150);
  await shot(name);
  for (const e of errs.slice(before)) finding(`${name}: console: ${e}`);
  log(`${name}: ok so far`);
}
async function overlay(kind, data) {
  await farm((g, f, s, a) => f.open(a.kind, a.data), { kind, data });
  await sleepMs(400);
  if (!(await active()).includes(kind))
    throw new Error(`${kind} did not open: ${await active()}`);
  await shot(`${kind}-open`);
}
async function close() {
  await p.keyboard.press("Escape");
  await sleepMs(300);
  if ((await active()).length !== 1) {
    await p.keyboard.press("Escape");
    await sleepMs(300);
  }
  if ((await active()).join() !== "farm")
    throw new Error(`overlay did not close: ${await active()}`);
}
async function goMap(map, entry) {
  await farm((g, f, s, a) => f.scene.restart(a), { map, entry });
  await sleepMs(900);
  const d = await bot.dbg();
  if (d.map !== map) throw new Error(`wanted map ${map}, on ${d.map}`);
}
/** Press Down and Enter until the scene's message contains `text`. */
async function pickRow(scene, text, tries = 25) {
  for (let i = 0; i < tries; i++) {
    await p.keyboard.press("Enter");
    await sleepMs(60);
    const m = await p.evaluate(
      (k) => window.__game.scene.getScene(k).message?.text ?? "",
      scene,
    );
    if (text.test(m)) return m;
    await p.keyboard.press("ArrowDown");
    await sleepMs(40);
  }
  throw new Error(`no row gave ${text} in ${scene}`);
}

await bot.dbg();
await p.evaluate(() => {
  window.farmMoney(1000000);
  for (const id of ["geode", "frozen-geode", "magma-geode", "omni-geode"])
    window.farmGive(id, 2);
});

await step("collections", async () => {
  await overlay("collections");
  await close();
  await overlay("achievements");
  await close();
});

await step("smithy-geodes", async () => {
  await overlay("smithy");
  const before = await farm((g, f, s) => s.inventory.count("geode"));
  const m = await pickRow("smithy", /splits open|Not enough|full/);
  log("smithy crack:", m);
  const after = await farm((g, f, s) => s.inventory.count("geode"));
  if (/splits open/.test(m) && after !== before - 1)
    finding(`smithy: geode count ${before} -> ${after} after a crack`);
  await close();
});

await step("carpenter", async () => {
  await overlay("carpenter");
  await sleepMs(200);
  for (let i = 0; i < 4; i++) {
    await p.keyboard.press("ArrowDown");
    await sleepMs(60);
  }
  await shot("carpenter-list");
  await close();
});

await step("cooking", async () => {
  const tier = await farm((g, f, s) => {
    const was = s.houseTier;
    s.houseTier = Math.max(was, 1);
    s.inventory.add("egg", 2);
    return was;
  });
  await overlay("cooking");
  await sleepMs(200);
  const m = await pickRow("cooking", /You cook|missing|full/);
  log("cook:", m);
  const n = await farm((g, f, s) => s.achievements.cookedCount);
  if (!/You cook/.test(m) || n !== 1)
    finding(`cooking: message "${m}", cooked count ${n}`);
  await close();
  await farm((g, f, s, tier) => {
    s.houseTier = tier;
    // Leave the pack as it was, so later steps still have room.
    s.inventory.remove("egg", s.inventory.count("egg"));
    s.inventory.remove("fried-egg", s.inventory.count("fried-egg"));
  }, tier);
});

await step("mailbox", async () => {
  const n = await farm((g, f, s) => {
    s.mail.queue("hatters-letter", s.day.clock.day);
    return s.mail.deliver(s.day.clock.day);
  });
  log("mail delivered:", n);
  await overlay("mailbox");
  await p.keyboard.press("Enter");
  await sleepMs(300);
  await shot("mailbox-letter");
  await close();
});

await step("requests", async () => {
  await overlay("requests");
  await close();
  await overlay("requests", { list: true });
  await close();
});

await step("hat-box-collections", async () => {
  // Rows are hats, then Achievements, Collections, Requests: try each row.
  let opened = false;
  for (let n = 0; n < 12 && !opened; n++) {
    await overlay("hats");
    for (let i = 0; i < n; i++) {
      await p.keyboard.press("ArrowDown");
      await sleepMs(40);
    }
    await p.keyboard.press("Enter");
    await sleepMs(300);
    opened = (await active()).includes("collections");
    if (!opened) await close();
  }
  if (!opened) throw new Error("no hat box row opened collections");
  await shot("collections-from-hats");
  await close();
});

await step("catalogue-buy", async () => {
  await farm((g, f, s) => {
    s.houseTier = 1;
    s.money = Math.max(s.money, 300000);
  });
  await overlay("carpenter");
  await pickRow("carpenter", /Bought\. Place it/);
  const owned = await farm(
    (g, f, s) => s.catalogue && s.inventory.count("furniture-catalogue"),
  );
  if (owned !== 1) finding(`catalogue buy: backpack holds ${owned}`);
  await close();
});

await step("catalogue-place-and-copy", async () => {
  await goMap("house", "door");
  const slot = await farm((g, f, s) =>
    s.inventory.save().findIndex((x) => x && x.id === "furniture-catalogue"),
  );
  if (slot < 0) throw new Error("no catalogue in the backpack");
  await bot.select(slot + 4); // four tools come first on the toolbar
  await bot.refreshMap();
  let d = await bot.dbg();
  // Step into the room first: facing down at the door would walk out of it.
  await bot.hookWalk(d.tile.x, d.tile.y - 3);
  await bot.refreshMap();
  d = await bot.dbg();
  let placed = false;
  for (const dir of ["up", "left", "right"]) {
    await bot.face(dir);
    await bot.key("KeyC", 150);
    placed = await farm((g, f, s) => s.furniture.has("furniture-catalogue"));
    if (placed) {
      await shot("catalogue-placed");
      await bot.face(dir);
      await bot.key("KeyX", 400);
      break;
    }
  }
  if (!placed) {
    const sel = (await bot.snap()).selected;
    throw new Error(
      `could not place it from ${JSON.stringify(d.tile)}, slot ${slot}, selected ${sel}, scenes ${await active()}, map ${d.map}`,
    );
  }
  if (!(await active()).includes("catalogue")) {
    throw new Error(`Action did not open the catalogue: ${await active()}`);
  }
  await shot("catalogue-open");
  const before = await farm(
    (g, f, s) => s.inventory.save().filter(Boolean).length,
  );
  await p.keyboard.press("ArrowDown");
  await sleepMs(60);
  await p.keyboard.press("Enter");
  await sleepMs(200);
  const after = await farm(
    (g, f, s) => s.inventory.save().filter(Boolean).length,
  );
  if (after <= before) finding(`catalogue copy: stacks ${before} -> ${after}`);
  await shot("catalogue-copy");
  await close();
});

await step("morning-report", async () => {
  const day = await farm((g, f, s) => s.day.clock.day);
  await goMap("house", "door");
  await p.keyboard.press("z");
  await sleepMs(600);
  if ((await active()).includes("shipping")) {
    await p.keyboard.press("Enter");
    await sleepMs(500);
  }
  if (!(await active()).includes("report"))
    throw new Error(`no report after sleeping: ${await active()}`);
  await shot("morning-report");
  const text = await p.evaluate(() =>
    window.__game.scene
      .getScene("report")
      .children.list.filter((c) => c.text)
      .map((c) => c.text)
      .join(" | "),
  );
  log("report:", text.slice(0, 400));
  await p.keyboard.press("Enter");
  await sleepMs(500);
  if ((await farm((g, f, s) => s.day.clock.day)) !== day + 1)
    finding("the day did not advance");
});

await step("village-green", async () => {
  await goMap("green", "door");
  const d = await bot.dbg();
  const ok = await bot.hookWalk(d.tile.x, d.tile.y - 4);
  if (!ok) finding("village green: could not walk 4 tiles up");
  await shot("green-walk");
});

await step("hedge-maze", async () => {
  await goMap("hedge", "door");
  const d = await bot.dbg();
  if (!(await bot.hookWalk(d.tile.x + 3, d.tile.y)))
    finding("hedge: could not walk 3 tiles right");
});

for (const floor of [11, 26, 45, 85, 100, 120])
  await step(`mine-${floor}`, async () => {
    await goMap(`mine-${floor}`, "from_above");
    const d = await bot.dbg();
    log(`mine floor ${floor} at`, JSON.stringify(d.tile));
  });

await step("coop", async () => {
  await farm((g, f, s) => {
    s.inventory.add("wood", 300);
    s.inventory.add("stone", 100);
    // Under the house upgrade price, so only the coop row can be ordered.
    s.money = 20000;
    s.houseBuild = undefined;
  });
  await overlay("carpenter");
  await pickRow("carpenter", /Ordered\./);
  await close();
  // Three sleeps stand in for the three build days.
  await farm((g, f, s) => {
    s.animals.build = undefined;
    s.animals.coopBuilt = true;
    // The deluxe interior (22 wide) loads and can be walked in.
    s.animals.tier = 3;
  });
  await overlay("keeper");
  await pickRow("keeper", /is in the coop/);
  await pickRow("keeper", /Bought \d+ hay/);
  await close();
  await farm((g, f, s) => {
    s.inventory.add("egg", 1);
  });
  await goMap("coop", "door");
  await overlay("coop-bench");
  await pickRow("coop-bench", /Fed \d/);
  // The incubator row comes next: put the egg in.
  await p.keyboard.press("ArrowDown");
  await pickRow("coop-bench", /in the incubator/, 1);
  await p.keyboard.press("ArrowDown");
  await p.keyboard.press("Enter");
  await sleepMs(100);
  await p.keyboard.press("Digit3");
  await sleepMs(100);
  await close();
  await goMap("farm", "from_coop");
});

await step("barn", async () => {
  await farm((g, f, s) => {
    s.inventory.add("wood", 300);
    s.inventory.add("stone", 100);
    // Under the house upgrade price, so only the barn row can be ordered.
    s.money = 20000;
    s.houseBuild = undefined;
    s.animals.build = undefined;
  });
  await overlay("carpenter");
  await pickRow("carpenter", /Ordered\./);
  await close();
  await farm((g, f, s) => {
    s.animals.build = undefined;
    s.animals.barnBuilt = true;
    // The deluxe interior (24 wide, 13 deep) loads and can be walked in.
    s.animals.barnTier = 3;
    s.money = 30000;
    s.animals.hay = 60;
  });
  await overlay("keeper");
  await pickRow("keeper", /is in the barn/);
  await close();
  await goMap("barn", "door");
  await overlay("barn-bench");
  await pickRow("barn-bench", /Fed \d/);
  await p.keyboard.press("ArrowDown");
  await p.keyboard.press("Enter");
  await sleepMs(100);
  await p.keyboard.press("Digit3");
  await sleepMs(100);
  await close();
  await shot("barn-inside");
  await goMap("farm", "from_barn");
  await shot("barn-outside");
});

await step("back-to-farm", async () => {
  await goMap("farm", "start");
});

log(`console errors: ${errs.length}`);
log("FINDINGS:");
console.log(
  findings.length
    ? findings.map((f, i) => `${i + 1}. ${f}`).join("\n")
    : "none",
);
await b.close();
process.exit(findings.length ? 1 : 0);
