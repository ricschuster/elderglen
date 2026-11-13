import { describe, expect, it } from "vitest";
import { PANTS, SHIRTS, pieceById } from "../src/core/clothes";
import { hatById } from "../src/core/hats";
import { itemById } from "../src/core/items";
import { maps } from "../src/content/maps";
import { deserialize, newGame, serialize } from "../src/core/save";
import {
  CLOTH_COST,
  DYE_POTS_SERVICE,
  POT_COLOURS,
  SEWING_SERVICE,
  SPOOL,
  TAILORING_OPEN,
  dyePiece,
  potColourOf,
  sew,
  sewProblem,
  sewableSpool,
  spoolRowOf,
  tailoringLine,
  undye,
} from "../src/core/tailoring";
import { completeEvent, eventById, nextEvent } from "../src/core/heartevents";
import { HEART } from "../src/core/friendship";
import { setFlag } from "../src/core/worldflags";

const tint = { h: 120, s: 0.5, v: 0.8 };

describe("tailoring content", () => {
  it("has 13 shirts (the plain shirt and 12), 8 pants and about 30 spool rows", () => {
    expect(SHIRTS).toHaveLength(13);
    expect(PANTS).toHaveLength(8);
    expect(SPOOL.length).toBeGreaterThanOrEqual(29);
  });

  it("points every spool row at a real item and a real piece, once each", () => {
    const seen = new Set<string>();
    for (const r of SPOOL) {
      expect(itemById(r.item), r.item).toBeDefined();
      const ok = r.kind === "hat" ? hatById(r.id) : pieceById(r.kind, r.id);
      expect(ok, `${r.kind} ${r.id}`).toBeDefined();
      expect(seen.has(r.item), r.item).toBe(false);
      seen.add(r.item);
    }
  });

  it("makes the Plain Shirt from wool, as Stardew's wool page says", () => {
    expect(spoolRowOf("wool")).toMatchObject({
      kind: "shirt",
      id: "plain-shirt",
    });
  });
});

describe("the sewing machine", () => {
  it("uses 1 cloth and the spool item and puts the piece in the wardrobe", () => {
    const g = newGame();
    g.inventory.add("cloth", 2);
    g.inventory.add("wool", 1);
    const r = sew(g, "wool");
    expect(r).toMatchObject({ ok: true, kind: "shirt", id: "plain-shirt" });
    expect(g.wardrobe.hasPiece("shirt", "plain-shirt")).toBe(true);
    expect(g.inventory.count("cloth")).toBe(2 - CLOTH_COST);
    expect(g.inventory.count("wool")).toBe(0);
    expect(g.inventory.count("shirt")).toBe(0);
  });

  it("makes hats and pants too", () => {
    const g = newGame();
    g.inventory.add("cloth", 5);
    g.inventory.add("hay", 1);
    g.inventory.add("fiber", 1);
    expect(sew(g, "hay")).toMatchObject({ ok: true, kind: "hat" });
    expect(g.wardrobe.has("tailored-sunhat")).toBe(true);
    expect(sew(g, "fiber")).toMatchObject({ ok: true, kind: "pants" });
    expect(g.wardrobe.hasPiece("pants", "work-trousers")).toBe(true);
  });

  it("refuses with a line: no cloth, no spool, no pattern, a second copy", () => {
    const g = newGame();
    g.inventory.add("wool", 2);
    expect(sewProblem(g, "wool")).toMatch(/cloth/);
    g.inventory.add("cloth", 3);
    expect(sewProblem(g, "stone")).toMatch(/no pattern/);
    expect(sewProblem(g, "daffodil")).toMatch(/none of that/);
    expect(sew(g, "wool").ok).toBe(true);
    const again = sew(g, "wool");
    expect(again.ok).toBe(false);
    expect(g.inventory.count("wool")).toBe(1);
    expect(g.inventory.count("cloth")).toBe(2);
  });

  it("lists the pack items the machine can sew", () => {
    const g = newGame();
    g.inventory.add("wool");
    g.inventory.add("stone");
    expect(sewableSpool(g)).toEqual(["wool"]);
  });

  it("opens only after Cordelia's 4 heart event, with no skill gate", () => {
    const g = newGame();
    g.inventory.add("cloth");
    expect(tailoringLine(g)).toMatch(/keeps it to herself/);
    const e = eventById("cordelia-machine-4")!;
    completeEvent(g, e, 5);
    expect(g.heartEvents.hasFlag(TAILORING_OPEN)).toBe(true);
    expect(tailoringLine(g)).toBeUndefined();
  });

  it("keeps the machine open on a save that has the old world flag", () => {
    const g = newGame();
    setFlag(g, TAILORING_OPEN);
    expect(tailoringLine(g)).toBeUndefined();
  });

  it("offers the event at 4 hearts and not before", () => {
    const g = newGame();
    const at = { day: 3, weather: "sunny" as const, place: "hw:hatter" };
    const set = (n: number) =>
      g.friendship.load({
        cordelia: {
          points: n * HEART,
          met: true,
          talkDay: 0,
          giftDay: 0,
          week: 0,
          weekGifts: 0,
          bouquet: false,
          log: {},
        },
      });
    set(1);
    expect(nextEvent(g, { ...at, minute: 11 * 60 })).toBeUndefined();
    set(4);
    expect(nextEvent(g, { ...at, minute: 11 * 60 })?.id).toBe(
      "cordelia-machine-4",
    );
    expect(nextEvent(g, { ...at, minute: 18 * 60 })).toBeUndefined();
  });

  it("has the machine and the pots in the Hatter's house", () => {
    const m = maps.get("hatter");
    const kinds = m.services.map((s) => s.kind);
    expect(kinds).toContain(SEWING_SERVICE);
    expect(kinds).toContain(DYE_POTS_SERVICE);
    expect(maps.problems()).toEqual([]);
  });
});

describe("the wardrobe and saving", () => {
  it("wears and takes off shirts and pants, and refuses unowned ones", () => {
    const g = newGame();
    expect(g.wardrobe.wearPiece("shirt", "plain-shirt")).toBe(false);
    g.wardrobe.addPiece("shirt", "plain-shirt");
    expect(g.wardrobe.addPiece("shirt", "plain-shirt")).toBe(false);
    expect(g.wardrobe.addPiece("shirt", "nope")).toBe(false);
    expect(g.wardrobe.wearPiece("shirt", "plain-shirt")).toBe(true);
    expect(g.wardrobe.wornOf("shirt")).toBe("plain-shirt");
    g.wardrobe.wearPiece("shirt", undefined);
    expect(g.wardrobe.wornOf("shirt")).toBeUndefined();
  });

  it("round trips pieces, worn state and tints, and loads old saves", () => {
    const g = newGame();
    g.wardrobe.addPiece("shirt", "plain-shirt");
    g.wardrobe.wearPiece("shirt", "plain-shirt");
    g.wardrobe.addPiece("pants", "work-trousers");
    g.wardrobe.setTint("shirt", "plain-shirt", tint);
    const back = deserialize(serialize(g))!;
    expect(back.wardrobe.listPieces("shirt")).toEqual(["plain-shirt"]);
    expect(back.wardrobe.listPieces("pants")).toEqual(["work-trousers"]);
    expect(back.wardrobe.shirtWorn).toBe("plain-shirt");
    expect(back.wardrobe.tintOf("shirt", "plain-shirt")).toEqual(tint);
    const old = JSON.parse(serialize(newGame()));
    delete old.wardrobe.shirts;
    expect(
      deserialize(JSON.stringify(old))!.wardrobe.listPieces("shirt"),
    ).toEqual([]);
  });
});

describe("the dye pots", () => {
  const six = [
    "cranberry",
    "pumpkin",
    "daffodil",
    "kale",
    "cornflower",
    "grape",
  ];

  const stocked = () => {
    const g = newGame();
    for (const i of six) g.inventory.add(i);
    g.wardrobe.addPiece("shirt", "plain-shirt");
    g.wardrobe.wearPiece("shirt", "plain-shirt");
    return g;
  };

  it("colours items by the dye table, with pink, indigo and violet folded into the six pots", () => {
    expect(POT_COLOURS).toHaveLength(6);
    expect(potColourOf("cranberry")).toBe("red");
    expect(potColourOf("sweet-pea")).toBe("red");
    expect(potColourOf("bramble-berry")).toBe("blue");
    expect(potColourOf("crocus")).toBe("purple");
    expect(potColourOf("gem-mid-a")).toBe("green");
    expect(potColourOf("cranberry@gold")).toBe("red");
    expect(potColourOf("stone")).toBeUndefined();
  });

  it("processed goods take their ingredient's pot colour", () => {
    expect(potColourOf("tomato-jam")).toBe("red");
    expect(potColourOf("grape-wine")).toBe("purple");
    expect(potColourOf("pumpkin-juice@gold")).toBe("orange");
    expect(potColourOf("chanterelle-dried")).toBe("yellow");
    expect(potColourOf("bramble-berry-jam")).toBe("blue");
    expect(potColourOf("honey-jam")).toBeUndefined();
  });

  it("uses all six items and tints the worn piece", () => {
    const g = stocked();
    expect(dyePiece(g, "shirt", "plain-shirt", six, tint)).toBeUndefined();
    for (const i of six) expect(g.inventory.count(i)).toBe(0);
    expect(g.wardrobe.tintOf("shirt", "plain-shirt")).toEqual(tint);
    expect(undye(g, "shirt", "plain-shirt")).toBe(true);
    expect(g.wardrobe.tintOf("shirt", "plain-shirt")).toBeUndefined();
  });

  it("refuses a piece not worn, a wrong colour, or missing items, and keeps the pack", () => {
    const g = stocked();
    g.wardrobe.wearPiece("shirt", undefined);
    expect(dyePiece(g, "shirt", "plain-shirt", six, tint)).toMatch(/Wear/);
    g.wardrobe.wearPiece("shirt", "plain-shirt");
    const wrong = [...six];
    wrong[0] = "kale";
    expect(dyePiece(g, "shirt", "plain-shirt", wrong, tint)).toMatch(/red pot/);
    g.inventory.remove("grape");
    expect(dyePiece(g, "shirt", "plain-shirt", six, tint)).toMatch(/all six/);
    expect(g.inventory.count("kale")).toBe(1);
    expect(dyePiece(g, "shirt", "plain-shirt", six.slice(0, 5), tint)).toMatch(
      /Every pot/,
    );
  });

  it("clamps the sliders", () => {
    const g = stocked();
    dyePiece(g, "shirt", "plain-shirt", six, { h: 400, s: 3, v: -1 });
    expect(g.wardrobe.tintOf("shirt", "plain-shirt")).toEqual({
      h: 40,
      s: 1,
      v: 0,
    });
  });
});
