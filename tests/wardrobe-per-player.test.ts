import { describe, expect, it } from "vitest";
import { LOCAL_PLAYER, savePlayer, syncPlayer } from "../src/core/players";
import { applyScreenIntent } from "../src/core/screenintents";
import { deserialize, newGame, serialize } from "../src/core/save";

/** Wardrobe per player (note 53): a guest's hats and clothes are theirs, the host's are the host's. */
function mk() {
  const g = newGame("standard", "separate");
  g.players.add("g2", 0);
  return g;
}
const send = (g: ReturnType<typeof mk>, by: string, intent: object) =>
  applyScreenIntent(g, by, { kind: "wardrobe-wear", ...intent } as never);

describe("a wardrobe for each player", () => {
  it("keeps the host's and a guest's apart: equip, store, take out", () => {
    const g = mk();
    const host = g.players.get(LOCAL_PLAYER).wardrobe;
    const guest = g.players.get("g2").wardrobe;
    host.add("straw-boater");
    host.addPiece("shirt", "plain-shirt");
    guest.add("wool-beret");
    expect(g.wardrobe).toBe(host);
    // Equip.
    expect(send(g, "g2", { piece: "hat", id: "wool-beret" })).toBeUndefined();
    expect(guest.worn).toBe("wool-beret");
    expect(host.worn).toBeUndefined();
    // A guest cannot wear what only the host owns.
    expect(send(g, "g2", { piece: "hat", id: "straw-boater" })).toBe(
      "You do not have that.",
    );
    expect(send(g, "g2", { piece: "shirt", id: "plain-shirt" })).toBe(
      "You do not have that.",
    );
    // Host wears theirs; the guest's hat is unchanged.
    expect(send(g, LOCAL_PLAYER, { piece: "hat", id: "straw-boater" })).toBe(
      undefined,
    );
    expect(host.worn).toBe("straw-boater");
    expect(guest.worn).toBe("wool-beret");
    // Store (no id) and take out again.
    expect(send(g, "g2", { piece: "hat" })).toBeUndefined();
    expect(guest.worn).toBeUndefined();
    expect(host.worn).toBe("straw-boater");
    expect(guest.has("wool-beret")).toBe(true);
    send(g, "g2", { piece: "hat", id: "wool-beret" });
    expect(guest.worn).toBe("wool-beret");
    // Clothes.
    expect(send(g, LOCAL_PLAYER, { piece: "shirt", id: "plain-shirt" })).toBe(
      undefined,
    );
    expect(host.shirtWorn).toBe("plain-shirt");
    expect(guest.shirtWorn).toBeUndefined();
    expect(send(g, "g2", { piece: "cape", id: "x" })).toBe("bad wardrobe-wear");
  });

  it("round-trips in a save, host in the flat field and guest in the record", () => {
    const g = mk();
    const host = g.players.get(LOCAL_PLAYER).wardrobe;
    const guest = g.players.get("g2").wardrobe;
    host.add("straw-boater");
    host.wear("straw-boater");
    guest.add("wool-beret");
    guest.wear("wool-beret");
    const back = deserialize(serialize(g))!;
    expect(back.players.get(LOCAL_PLAYER).wardrobe.worn).toBe("straw-boater");
    expect(back.players.get(LOCAL_PLAYER).wardrobe.has("wool-beret")).toBe(
      false,
    );
    expect(back.players.get("g2").wardrobe.worn).toBe("wool-beret");
    expect(back.players.get("g2").wardrobe.has("straw-boater")).toBe(false);
    expect(back.wardrobe).toBe(back.players.get(LOCAL_PLAYER).wardrobe);
  });

  it("reads an old save's single wardrobe as the host's", () => {
    const g = newGame("standard", "separate");
    g.wardrobe.add("straw-boater");
    g.wardrobe.wear("straw-boater");
    const data = JSON.parse(serialize(g));
    // Before this change: no wardrobe inside the player records.
    for (const p of data.players) delete p.wardrobe;
    const back = deserialize(JSON.stringify(data))!;
    expect(back.wardrobe.worn).toBe("straw-boater");
    expect(back.players.get(LOCAL_PLAYER).wardrobe.has("straw-boater")).toBe(
      true,
    );
  });

  it("syncs a guest's record to their copy without touching the host", () => {
    const host = mk();
    host.players.get("g2").wardrobe.add("wool-beret");
    host.players.get("g2").wardrobe.wear("wool-beret");
    host.wardrobe.add("straw-boater");
    const copy = mk();
    copy.wardrobe.add("feathered-cap");
    expect(syncPlayer(copy.players, savePlayer(host.players.get("g2")))).toBe(
      true,
    );
    expect(copy.players.get("g2").wardrobe.worn).toBe("wool-beret");
    expect(copy.wardrobe.list()).toEqual(["feathered-cap"]);
  });
});
