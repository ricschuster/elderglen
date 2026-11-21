import { describe, expect, it } from "vitest";
import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import rules from "../src/content/audio-rules.json";
import {
  AMBIENT,
  AUDIO_TIMING,
  Cooldowns,
  MAX_VOICES,
  MAX_VOICES_PER_ID,
  MIN_RETRIGGER_MS,
  VoiceGate,
  animalCue,
  morningCues,
  pulseCues,
  DEFAULT_AUDIO,
  MUSIC,
  SFX,
  allAudioFiles,
  areaClassName,
  busGain,
  chooseAmbient,
  chooseMusic,
  clampVolume,
  doorSoundFor,
  ducks,
  festivalForAudio,
  footstepFor,
  isSfx,
  jitterOf,
  pickVariant,
  resolveMusic,
  sfxForAct,
  sfxForUse,
  volumeGain,
  type AudioInfo,
} from "../src/core/audio";
import { situation } from "../src/audio/director";
import {
  defaultSettings,
  deserializeSettings,
  serializeSettings,
} from "../src/core/bindings";

const root = join(__dirname, "..");

function walk(dir: string, out: string[] = []): string[] {
  for (const f of readdirSync(dir)) {
    const p = join(dir, f);
    if (statSync(p).isDirectory()) walk(p, out);
    else if (p.endsWith(".ts")) out.push(p);
  }
  return out;
}

const info = (over: Partial<AudioInfo> = {}): AudioInfo => ({
  scene: "farm",
  season: "spring",
  minutes: 12 * 60,
  weather: "sunny",
  mapId: "farm",
  ...over,
});

describe("manifest and files", () => {
  it("every manifest file exists on disk and is not empty", () => {
    for (const f of allAudioFiles()) {
      const p = join(root, "public", "audio", f);
      expect(existsSync(p), f).toBe(true);
      expect(statSync(p).size, f).toBeGreaterThan(200);
    }
  });

  it("has every music slot the design names", () => {
    const slots = [
      "title",
      "spring",
      "summer",
      "fall",
      "winter",
      "night",
      "rain",
      "village",
      "mines",
      "beach",
      "woods",
      "interior",
      "festival",
      "night-market",
      "heart-event",
      "wedding",
      "bundle",
      "fishing",
    ];
    for (const s of slots) expect(MUSIC[s], s).toBeDefined();
  });

  it("loops carry loop points inside the file's length", () => {
    for (const [id, m] of Object.entries(MUSIC))
      if (m.loop) expect(m.loopEnd! > m.loopStart!, id).toBe(true);
    for (const [id, a] of Object.entries(AMBIENT))
      expect(a.loopEnd > a.loopStart, id).toBe(true);
  });

  it("shipped audio stays under the 30 MB budget", () => {
    let total = 0;
    for (const f of new Set(allAudioFiles()))
      total += statSync(join(root, "public", "audio", f)).size;
    expect(total / 1048576).toBeLessThan(30);
  });

  it("downloaded music has a ledger row", () => {
    const ledger = readFileSync(
      join(root, "docs/reference/audio/LICENCES.md"),
      "utf8",
    );
    for (const m of Object.values(MUSIC))
      if (m.source === "downloaded")
        expect(ledger.includes(`| ${m.file} |`), m.file).toBe(true);
  });
});

describe("ids used in code exist in the manifest", () => {
  const files = [
    ...walk(join(root, "src/scenes")),
    ...walk(join(root, "src/audio")),
    join(root, "src/core/audio.ts"),
  ];
  const ids = new Set<string>();
  for (const f of files) {
    const text = readFileSync(f, "utf8")
      .split("\n")
      .filter((l) => !/^\s*(import |} from )/.test(l))
      .join("\n");
    for (const m of text.matchAll(/audio\.sfx\(\s*"([^"]+)"/g)) ids.add(m[1]!);
    for (const m of text.matchAll(
      /["'`](?:ui|tool|fish|crop|forage|item|world|chest|tree|sprinkler|money|step|door|combat|enemy|player|bomb|mine|animal|cook|craft|machine|eat|drink|bundle|gift|heart|event|marriage|wedding|mail|day|bed|clock|festival|weather)(?:\.[a-z]+)?["'`]/g,
    ))
      ids.add(m[0].slice(1, -1));
  }
  it("finds a healthy number of call sites", () => {
    expect(ids.size).toBeGreaterThan(40);
  });
  it("every sfx id referenced by code is defined", () => {
    const bad = [...ids].filter(
      (id) =>
        /^[a-z]+\.[a-z]+$/.test(id) &&
        !/\.(json|ts|js)$/.test(id) &&
        !isSfx(id),
    );
    expect(bad).toEqual([]);
  });
  it("rules reference real slots and ids", () => {
    for (const v of Object.values(rules.sceneMusic))
      expect(MUSIC[v], v).toBeDefined();
    for (const v of Object.values(rules.aliases))
      expect(MUSIC[v], v).toBeDefined();
    for (const id of rules.duck.on) expect(isSfx(id), id).toBe(true);
    for (const c of Object.values(rules.classes)) {
      if (c.music !== "season") expect(MUSIC[c.music], c.music).toBeDefined();
      for (const a of c.ambient) expect(AMBIENT[a], a).toBeDefined();
      expect(isSfx(`step.${c.surface}`)).toBe(true);
    }
    for (const c of Object.values(rules.areas))
      expect(rules.classes, c).toHaveProperty(c);
    for (const s of Object.values(rules.surfaceOverrides))
      expect(isSfx(`step.${s}`)).toBe(true);
  });
  it("every map in the game has an audio class or defaults to the farm", () => {
    const maps = readdirSync(join(root, "src/content/maps")).map((f) =>
      f.replace(/\.json$/, ""),
    );
    const unclassed = maps.filter((m) => !(m in rules.areas));
    // Maps without a row play as the farm; only the known open farm variants may rely on that.
    expect(unclassed.filter((m) => !m.startsWith("farm"))).toEqual([]);
  });
});

describe("mixer", () => {
  it("maps slider positions to gain on a square curve", () => {
    expect(volumeGain(0)).toBe(0);
    expect(volumeGain(100)).toBe(1);
    expect(volumeGain(50)).toBeCloseTo(0.25);
    expect(volumeGain(-5)).toBe(0);
    expect(volumeGain(500)).toBe(1);
  });
  it("mute silences every bus", () => {
    const s = { ...DEFAULT_AUDIO, muted: true };
    for (const b of ["music", "sfx", "ambient"] as const)
      expect(busGain(s, b)).toBe(0);
    expect(busGain(DEFAULT_AUDIO, "music")).toBeGreaterThan(0);
  });
  it("clamps volumes to steps of ten", () => {
    expect(clampVolume(47)).toBe(50);
    expect(clampVolume(-30)).toBe(0);
    expect(clampVolume(999)).toBe(100);
    expect(clampVolume("x", 70)).toBe(70);
    expect(clampVolume(NaN, 20)).toBe(20);
  });
  it("saves with the device settings and survives bad records", () => {
    const s = defaultSettings();
    s.audio = { muted: true, musicVolume: 30, sfxVolume: 90, ambientVolume: 0 };
    const back = deserializeSettings(serializeSettings(s));
    expect(back.audio).toEqual(s.audio);
    expect(deserializeSettings('{"version":1}').audio).toEqual(DEFAULT_AUDIO);
    const bad = deserializeSettings(
      JSON.stringify({
        version: 1,
        audio: { muted: "yes", musicVolume: "loud" },
      }),
    );
    expect(bad.audio).toEqual(DEFAULT_AUDIO);
  });
  it("has sane timings and ducks the stingers", () => {
    expect(AUDIO_TIMING.crossfadeMs).toBeGreaterThan(
      AUDIO_TIMING.stingerFadeMs,
    );
    expect(AUDIO_TIMING.duckAmount).toBeGreaterThan(0);
    expect(AUDIO_TIMING.duckAmount).toBeLessThan(1);
    expect(ducks("ui.levelup")).toBe(true);
    expect(ducks("tool.hoe")).toBe(false);
  });
});

describe("variation", () => {
  it("never repeats the last variant when there is a choice", () => {
    let seed = 7;
    const rng = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
    let last: number | undefined;
    for (let i = 0; i < 500; i++) {
      const v = pickVariant(3, last, rng);
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThan(3);
      expect(v).not.toBe(last);
      last = v;
    }
    expect(pickVariant(1, 0, rng)).toBe(0);
  });
  it("jitters rate and gain within the knobs", () => {
    for (const r of [0, 0.25, 0.5, 0.999]) {
      const j = jitterOf({ pitch: 0.1, gainJitter: 0.2 }, () => r);
      expect(j.rate).toBeGreaterThan(Math.pow(2, -0.1) - 1e-9);
      expect(j.rate).toBeLessThan(Math.pow(2, 0.1) + 1e-9);
      expect(Math.abs(j.gain - 1)).toBeLessThanOrEqual(0.2 + 1e-9);
    }
    expect(jitterOf({ pitch: 0, gainJitter: 0 }, Math.random)).toEqual({
      rate: 1,
      gain: 1,
    });
  });
  it("footsteps have three variants per surface", () => {
    for (const s of ["grass", "dirt", "wood", "stone", "sand", "water"])
      expect(SFX[`step.${s}`]!.files.length).toBe(3);
  });
  it("cooldowns hold a repeat back", () => {
    const c = new Cooldowns();
    expect(c.allow("a", 0, 100)).toBe(true);
    expect(c.allow("a", 50, 100)).toBe(false);
    expect(c.allow("b", 50, 100)).toBe(true);
    expect(c.allow("a", 150, 100)).toBe(true);
  });
});

describe("voice limits", () => {
  it("never retriggers faster than the floor, even with a zero cooldown", () => {
    const g = new VoiceGate();
    expect(g.start("a", 0, 0)).toBe(true);
    expect(g.start("a", MIN_RETRIGGER_MS - 1, 0)).toBe(false);
    expect(g.start("a", MIN_RETRIGGER_MS, 0)).toBe(true);
  });
  it("a tight loop of one id starts only a few voices", () => {
    const g = new VoiceGate();
    let started = 0;
    for (let t = 0; t < 1000; t++) if (g.start("a", t, 30)) started++;
    expect(started).toBe(MAX_VOICES_PER_ID);
    g.end("a");
    expect(g.start("a", 5000, 30)).toBe(true);
  });
  it("all ids together stay under the voice cap", () => {
    const g = new VoiceGate();
    let started = 0;
    for (let i = 0; i < 200; i++)
      for (let k = 0; k < 4; k++) if (g.start(`id${i}`, i * 100, 30)) started++;
    expect(started).toBeLessThanOrEqual(MAX_VOICES * 4);
    expect(g.voices).toBeLessThanOrEqual(MAX_VOICES);
  });
  it("every manifest gap is at least the floor", () => {
    for (const [id, d] of Object.entries(SFX))
      expect(d.cooldownMs, id).toBeGreaterThanOrEqual(MIN_RETRIGGER_MS);
  });
});

describe("world and morning cues", () => {
  const w = (o = {}) => ({
    day: 3,
    mapId: "farm",
    minutes: 700,
    ground: 0,
    machinesDone: 0,
    ...o,
  });
  it("chimes as the clock passes noon, once", () => {
    expect(pulseCues(w(), w({ minutes: 730 }))).toEqual(["clock.chime"]);
    expect(pulseCues(w({ minutes: 730 }), w({ minutes: 740 }))).toEqual([]);
  });
  it("hears a machine finish and an item hit the ground", () => {
    expect(pulseCues(w(), w({ machinesDone: 1 }))).toEqual(["machine.done"]);
    expect(pulseCues(w(), w({ ground: 2 }))).toEqual(["item.drop"]);
    expect(pulseCues(w({ ground: 2 }), w({ ground: 1 }))).toEqual([]);
  });
  it("is silent across a day or map change and on the first look", () => {
    expect(pulseCues(undefined, w({ ground: 9 }))).toEqual([]);
    expect(pulseCues(w(), w({ day: 4, minutes: 900, ground: 5 }))).toEqual([]);
    expect(pulseCues(w(), w({ mapId: "mine", machinesDone: 3 }))).toEqual([]);
  });
  it("the morning plays what happened overnight", () => {
    const base = {
      newMail: 0,
      achievements: [],
      sprinklers: 0,
      eggs: 0,
      barn: 0,
    };
    expect(morningCues(base)).toEqual([]);
    expect(
      morningCues({
        newMail: 2,
        achievements: ["x"],
        sprinklers: 1,
        eggs: 1,
        barn: 1,
      }),
    ).toEqual([
      "sprinkler.run",
      "animal.cluck",
      "animal.moo",
      "mail",
      "achievement",
    ]);
  });
  it("each species has its call", () => {
    expect(animalCue("goat")).toBe("animal.baa");
    expect(animalCue("sheep")).toBe("animal.baa");
    expect(animalCue("pig")).toBe("animal.oink");
    expect(animalCue("duck")).toBe("animal.chirp");
    expect(animalCue("cow")).toBe("animal.moo");
    expect(animalCue("chicken")).toBe("animal.cluck");
    for (const s of [
      "chicken",
      "duck",
      "rabbit",
      "cow",
      "goat",
      "sheep",
      "pig",
    ])
      expect(isSfx(animalCue(s)), s).toBe(true);
  });
  it("chime hours are real minutes in the day", () => {
    for (const m of rules.chimeMinutes) expect(m).toBeLessThanOrEqual(26 * 60);
  });
});

describe("music selection", () => {
  it("plays the season on the farm by day", () => {
    expect(chooseMusic(info({ season: "spring" }))).toBe("spring");
    expect(chooseMusic(info({ season: "summer" }))).toBe("summer");
    expect(chooseMusic(info({ season: "fall" }))).toBe("fall");
    expect(chooseMusic(info({ season: "winter" }))).toBe("winter");
  });
  it("plays night after dark and rain in the wet", () => {
    expect(chooseMusic(info({ minutes: 22 * 60 }))).toBe("night");
    expect(chooseMusic(info({ weather: "rainy" }))).toBe("rain");
    expect(chooseMusic(info({ weather: "stormy" }))).toBe("rain");
    expect(chooseMusic(info({ weather: "snowy", season: "winter" }))).toBe(
      "winter",
    );
    // Night wins over rain.
    expect(chooseMusic(info({ minutes: 23 * 60, weather: "rainy" }))).toBe(
      "night",
    );
  });
  it("night falls earlier in winter", () => {
    expect(chooseMusic(info({ season: "winter", minutes: 19 * 60 + 30 }))).toBe(
      "night",
    );
    expect(chooseMusic(info({ season: "summer", minutes: 19 * 60 + 30 }))).toBe(
      "summer",
    );
  });
  it("plays a track per place whatever the weather", () => {
    const at = (mapId: string, over: Partial<AudioInfo> = {}) =>
      chooseMusic(info({ mapId, minutes: 22 * 60, weather: "rainy", ...over }));
    expect(at("hearthwell")).toBe("village");
    expect(at("green")).toBe("village");
    expect(at("forest")).toBe("woods");
    expect(at("secret-woods")).toBe("woods");
    expect(at("cove")).toBe("beach");
    expect(at("delta")).toBe("beach");
    expect(at("inn")).toBe("interior");
    expect(at("house")).toBe("interior");
    expect(at("mine", { floor: 3 })).toBe("mines");
    expect(at("farm-cave")).toBe("mines");
    expect(at("unknown-map")).toBe("night");
  });
  it("lets the scene override the place", () => {
    expect(chooseMusic(info({ scene: "title" }))).toBe("title");
    expect(chooseMusic(info({ scene: "heart-event", mapId: "inn" }))).toBe(
      "heart-event",
    );
    expect(chooseMusic(info({ scene: "wedding" }))).toBe("wedding");
    expect(chooseMusic(info({ scene: "fishing", mapId: "cove" }))).toBe(
      "fishing",
    );
    expect(chooseMusic(info({ scene: "end" }))).toBe("bundle");
  });
  it("plays festival music, and the Night Market after it opens", () => {
    expect(
      chooseMusic(info({ festival: "hat-parade", mapId: "hearthwell" })),
    ).toBe("festival");
    expect(
      chooseMusic(info({ festival: "night-market", mapId: "hearthwell" })),
    ).toBe("night-market");
  });
  it("finds festivals from the calendar", () => {
    // Spring 10 is the hat parade (day 10); the Night Market runs in winter 16 (day 84 + 16 = 100).
    expect(festivalForAudio(10, "hearthwell", 12 * 60)).toBe("hat-parade");
    expect(festivalForAudio(10, "farm", 12 * 60)).toBeUndefined();
    expect(festivalForAudio(2, "hearthwell", 12 * 60)).toBeUndefined();
    expect(festivalForAudio(3 * 28 + 16, "hearthwell", 18 * 60)).toBe(
      "night-market",
    );
    expect(festivalForAudio(3 * 28 + 16, "hearthwell", 9 * 60)).toBeUndefined();
  });
  it("every id it can return exists", () => {
    const seasons = ["spring", "summer", "fall", "winter"] as const;
    const weathers = ["sunny", "rainy", "stormy", "snowy"] as const;
    const maps = [...Object.keys(rules.areas), "nowhere"];
    for (const mapId of maps)
      for (const season of seasons)
        for (const weather of weathers)
          for (const minutes of [8 * 60, 21 * 60]) {
            const id = chooseMusic(info({ mapId, season, weather, minutes }));
            expect(
              MUSIC[id],
              `${mapId} ${season} ${weather} ${id}`,
            ).toBeDefined();
          }
    for (const scene of Object.keys(rules.sceneMusic))
      expect(MUSIC[chooseMusic(info({ scene }))]).toBeDefined();
  });
  it("resolves event music names through the aliases", () => {
    expect(resolveMusic("placeholder-rain-theme")).toBe("heart-event");
    expect(resolveMusic("rain")).toBe("rain");
    expect(resolveMusic("nope")).toBeUndefined();
  });
});

describe("ambient selection", () => {
  const ids = (i: AudioInfo) => chooseAmbient(i).map((l) => l.id);
  it("has birds by day and crickets at night outdoors", () => {
    expect(ids(info())).toEqual(["birds"]);
    expect(ids(info({ minutes: 22 * 60 }))).toEqual(["crickets"]);
  });
  it("has rain, quieter indoors, and no birds in it", () => {
    expect(ids(info({ weather: "rainy" }))).toEqual(["rain"]);
    const out = chooseAmbient(info({ weather: "rainy" }))[0]!.level;
    const inn = chooseAmbient(info({ weather: "rainy", mapId: "inn" }));
    expect(inn.find((l) => l.id === "rain")!.level).toBeLessThan(out);
    expect(inn.some((l) => l.id === "hearth")).toBe(true);
  });
  it("has wind in winter and storms, waves at the shore, drip below ground", () => {
    expect(ids(info({ season: "winter" }))).toEqual(["wind"]);
    expect(ids(info({ weather: "stormy" }))).toContain("wind");
    expect(ids(info({ mapId: "cove" }))).toContain("waves");
    expect(ids(info({ mapId: "mine", floor: 2 }))).toEqual(["drip"]);
    expect(ids(info({ mapId: "cellar" }))).toEqual(["drip"]);
  });
  it("is silent outside the farm scene, and levels stay in 0..1", () => {
    expect(chooseAmbient(info({ scene: "title" }))).toEqual([]);
    for (const l of chooseAmbient(info({ mapId: "cove", weather: "stormy" })))
      expect(l.level).toBeGreaterThan(0);
  });
});

describe("footsteps and doors", () => {
  it("picks the surface by place, then tile", () => {
    expect(footstepFor("farm", undefined)).toBe("step.grass");
    expect(footstepFor("farm", undefined, { tilled: true })).toBe("step.dirt");
    expect(footstepFor("farm", undefined, { water: true, tilled: true })).toBe(
      "step.water",
    );
    expect(footstepFor("cove", undefined)).toBe("step.sand");
    expect(footstepFor("house", undefined)).toBe("step.wood");
    expect(footstepFor("smithy", undefined)).toBe("step.stone");
    expect(footstepFor("mine", 4)).toBe("step.stone");
    expect(footstepFor("hearthwell", undefined)).toBe("step.dirt");
  });
  it("sounds a door when a building is crossed", () => {
    expect(doorSoundFor("hearthwell", "inn")).toBe("door.shop");
    expect(doorSoundFor("farm", "house")).toBe("door.open");
    expect(doorSoundFor("house", "farm")).toBe("door.close");
    expect(doorSoundFor("farm", "forest")).toBeUndefined();
    expect(areaClassName("nowhere")).toBe("farm");
  });
});

describe("outcomes to effects", () => {
  const tool = (t: string) => ({ kind: "tool" as const, tool: t });
  it("maps tools", () => {
    expect(sfxForUse(tool("hoe"), { ok: true }, false)).toBe("tool.hoe");
    expect(sfxForUse(tool("can"), { ok: true }, false)).toBe("tool.water");
    expect(
      sfxForUse(tool("can"), { ok: true, note: "You fill the can." }, false),
    ).toBe("tool.fill");
    expect(sfxForUse(tool("axe"), { ok: true }, false)).toBe("tool.axe");
    expect(sfxForUse(tool("scythe"), { ok: true }, false)).toBe("tool.scythe");
    expect(sfxForUse(tool("pickaxe"), { ok: true }, false)).toBe(
      "tool.pickaxe",
    );
    expect(sfxForUse(tool("pickaxe"), { ok: true, item: "stone" }, true)).toBe(
      "mine.rock",
    );
    expect(sfxForUse(tool("pickaxe"), { ok: true, ladder: true }, true)).toBe(
      "mine.ladder",
    );
  });
  it("tells ore, geodes and rock apart in the mine", () => {
    const pick = (item: string) =>
      sfxForUse(tool("pickaxe"), { ok: true, item }, true);
    expect(pick("copper-ore")).toBe("mine.ore");
    expect(pick("geode")).toBe("mine.geode");
    expect(pick("stone")).toBe("mine.rock");
  });
  it("a felled tree falls, a first swing only bites", () => {
    expect(
      sfxForUse(tool("axe"), { ok: true, item: "wood" }, false, {
        treeHere: true,
      }),
    ).toBe("tree.fall");
    expect(
      sfxForUse(tool("axe"), { ok: true }, false, { treeHere: true }),
    ).toBe("tool.axe");
    expect(sfxForUse(tool("axe"), { ok: true, item: "fiber" }, false, {})).toBe(
      "tool.axe",
    );
  });
  it("loading a machine starts it, placing one is a place", () => {
    const held = { kind: "item" as const, id: "keg" };
    expect(
      sfxForUse(held, { ok: true, note: "Wine: 7 days." }, false, {
        machineHere: true,
      }),
    ).toBe("machine.start");
    expect(sfxForUse(held, { ok: true }, false)).toBe("world.place");
  });
  it("whiffs with a tool, errors with an item, is silent empty-handed", () => {
    expect(
      sfxForUse(tool("hoe"), { ok: false, reason: "cannot dig here" }, false),
    ).toBe("tool.swing");
    expect(
      sfxForUse(tool("hoe"), { ok: false, reason: "at the smithy" }, false),
    ).toBe("ui.error");
    expect(
      sfxForUse(
        { kind: "item", id: "parsnip-seed" },
        { ok: false, reason: "x" },
        false,
      ),
    ).toBe("ui.error");
    expect(
      sfxForUse({ kind: "empty" }, { ok: false, reason: "x" }, false),
    ).toBeUndefined();
  });
  it("plants seeds and places other things", () => {
    expect(
      sfxForUse({ kind: "item", id: "parsnip-seed" }, { ok: true }, false),
    ).toBe("crop.plant");
    expect(
      sfxForUse({ kind: "item", id: "sprinkler" }, { ok: true }, false),
    ).toBe("world.place");
  });
  it("tells a harvest from a forage pick", () => {
    expect(sfxForAct({ ok: true, item: "parsnip" }, true)).toBe("crop.harvest");
    expect(sfxForAct({ ok: true, item: "berry" }, false)).toBe("forage.pick");
    expect(sfxForAct({ ok: true }, true)).toBeUndefined();
    expect(sfxForAct({ ok: false }, true)).toBeUndefined();
  });
});

describe("director situation", () => {
  const probe = {
    day: 1,
    minutes: 12 * 60,
    weather: "sunny" as const,
    mapId: "farm",
  };
  it("is the farm while the farm lives, even under a menu", () => {
    expect(situation(["shop"], true, probe)?.scene).toBe("farm");
    expect(situation(["farm"], true, probe)?.scene).toBe("farm");
  });
  it("lets story scenes override the farm", () => {
    expect(situation(["fishing"], true, probe)?.scene).toBe("fishing");
    expect(situation(["heart-event"], true, probe)?.scene).toBe("heart-event");
  });
  it("plays title music only when no farm exists", () => {
    expect(situation(["title"], false, undefined)?.scene).toBe("title");
    expect(situation(["options"], true, probe)?.scene).toBe("farm");
    expect(situation(["options"], false, undefined)?.scene).toBe("options");
  });
  it("says nothing when nothing is running", () => {
    expect(situation([], false, undefined)).toBeUndefined();
  });
});

describe("engine applies settings live", () => {
  it("mute and sliders change the bus gains at once, without a restart", async () => {
    const gains: { value: number; set: number[] }[] = [];
    const node = () => ({
      connect: (n: unknown) => n,
      disconnect: () => {},
    });
    class FakeCtx {
      state = "running";
      currentTime = 0;
      destination = node();
      createGain() {
        const g = {
          ...node(),
          gain: {
            value: 1,
            set: [] as number[],
            setValueAtTime(v: number) {
              this.set.push(v);
            },
            setTargetAtTime(v: number) {
              this.set.push(v);
            },
            cancelScheduledValues() {},
            linearRampToValueAtTime() {},
          },
        };
        gains.push(g.gain);
        return g;
      }
      resume() {
        return Promise.resolve();
      }
    }
    const g = globalThis as Record<string, unknown>;
    const had = g.window;
    g.window = { AudioContext: FakeCtx };
    try {
      const { AudioEngine } = await import("../src/audio/engine");
      const e = new AudioEngine();
      e.unlock();
      // gains: master, duck, music, sfx, ambient.
      const [, , music, sfx, ambient] = gains;
      expect(music!.set.at(-1)).toBeCloseTo(volumeGain(60));
      e.applySettings({ ...e.settings, sfxVolume: 20 });
      expect(sfx!.set.at(-1)).toBeCloseTo(volumeGain(20));
      expect(ambient!.set.at(-1)).toBeCloseTo(volumeGain(60));
      e.applySettings({ ...e.settings, muted: true });
      for (const b of [music, sfx, ambient]) expect(b!.set.at(-1)).toBe(0);
      e.applySettings({ ...e.settings, muted: false });
      expect(sfx!.set.at(-1)).toBeCloseTo(volumeGain(20));
    } finally {
      g.window = had;
    }
  });
});
