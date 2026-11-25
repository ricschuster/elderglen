import { describe, expect, it } from "vitest";
import { asPlayer } from "../src/core/asplayer";
import {
  BOUQUET,
  TOKEN,
  courtGift,
  finishWedding,
  weddingMorning,
} from "../src/core/courtship";
import { divorceMorning, exesOf } from "../src/core/divorce";
import { HEART } from "../src/core/friendship";
import { DIVORCE_FEE } from "../src/core/marriage";
import { hostMarriage } from "../src/core/playerid";
import { applyMarriageIntent } from "../src/core/marriageintents";
import { LOCAL_PLAYER, syncPlayer, savePlayer } from "../src/core/players";
import { propose } from "../src/core/playermarriage";
import { deserialize, newGame, serialize } from "../src/core/save";
import { applyScreenIntent } from "../src/core/screenintents";
import { kiss, spouseId, spouseMorning } from "../src/core/spouse";
import { meet } from "../src/core/townfolk";

/** Villager marriage per player (note 12 "As built", note 53): each player courts and weds on their own. */
const VIL = "bramwell";
const OTHER = "linnet";

function mk() {
  const g = newGame("standard", "separate");
  g.players.add("g2", 0);
  g.players.add("g3", 0);
  g.houseTier = 1;
  g.day.clock.day = 10;
  return g;
}
type G = ReturnType<typeof mk>;

/** Give a player the hearts and the items, as that player. */
function ready(g: G, who: string, id = VIL, hearts = 8): void {
  const rec = g.players.get(who);
  rec.friendship.meet(id);
  rec.friendship.award(id, hearts * HEART);
  rec.inventory.add(BOUQUET, 1);
  rec.inventory.add(TOKEN, 1);
}

/** The current player's pendant to a villager, once the bouquet has lifted their hearts to 10. */
function pendant(g: G, id: string) {
  const need = 10 * HEART - g.friendship.points(id);
  if (need > 0) g.friendship.award(id, need);
  return courtGift(g, id, TOKEN);
}

/** Date, propose and wed as `who` (the wedding day is `day`). */
function wed(g: G, who: string, id = VIL): void {
  ready(g, who, id);
  asPlayer(g, who, () => {
    expect(courtGift(g, id, BOUQUET)?.consumed).toBe(true);
    expect(pendant(g, id)?.consumed).toBe(true);
    g.day.clock.day += 3;
    expect(finishWedding(g)).toBe(true);
    g.day.clock.day -= 3;
  });
}

describe("a guest courts and weds a villager", () => {
  it("dates, proposes and marries while the host is unaffected", () => {
    const g = mk();
    ready(g, "g2");
    const host = g.players.get(LOCAL_PLAYER);
    const guest = g.players.get("g2");
    asPlayer(g, "g2", () => {
      expect(courtGift(g, VIL, BOUQUET)?.consumed).toBe(true);
      expect(g.marriage.stage).toBe("courting");
    });
    expect(guest.marriage.stage).toBe("courting");
    expect(host.marriage.stage).toBe("none");
    expect(guest.inventory.count(BOUQUET)).toBe(0);
    asPlayer(g, "g2", () => {
      expect(pendant(g, VIL)?.consumed).toBe(true);
    });
    expect(guest.marriage.stage).toBe("engaged");
    expect(guest.marriage.weddingDay).toBe(13);
    g.day.clock.day = 13;
    asPlayer(g, "g2", () => {
      expect(weddingMorning(g)).toBe("go");
      expect(finishWedding(g)).toBe(true);
    });
    expect(guest.marriage.married).toBe(true);
    expect(guest.marriage.spouse).toBe(VIL);
    expect(host.marriage.stage).toBe("none");
    expect(host.friendship.capHearts(VIL)).toBeLessThan(
      guest.friendship.capHearts(VIL),
    );
    expect(hostMarriage(g)).toBe(host.marriage);
  });

  it("works through the meet intent for the sender only", () => {
    const g = mk();
    ready(g, "g2");
    expect(
      applyScreenIntent(g, "g2", { kind: "meet", id: VIL, held: BOUQUET }),
    ).toBeUndefined();
    expect(g.players.get("g2").marriage.spouse).toBe(VIL);
    expect(g.players.get(LOCAL_PLAYER).marriage.spouse).toBeNull();
  });
});

describe("one spouse per villager", () => {
  it("another player cannot court or propose to an engaged or married villager, and keeps their hearts", () => {
    const g = mk();
    wed(g, "g2");
    ready(g, LOCAL_PLAYER);
    ready(g, "g3");
    const hostPts = g.players.get(LOCAL_PLAYER).friendship.points(VIL);
    const r = courtGift(g, VIL, BOUQUET);
    expect(r?.consumed).toBe(false);
    expect(r?.message).toMatch(/promised to someone else/);
    expect(g.marriage.stage).toBe("none");
    expect(g.inventory.count(BOUQUET)).toBe(1);
    asPlayer(g, "g3", () => {
      expect(pendant(g, VIL)?.consumed).toBe(false);
    });
    expect(g.players.get(LOCAL_PLAYER).friendship.points(VIL)).toBe(hostPts);
    // They can still court somebody else.
    ready(g, LOCAL_PLAYER, OTHER);
    expect(courtGift(g, OTHER, BOUQUET)?.consumed).toBe(true);
  });

  it("an engagement also shuts it, and frees a rival who was only dating", () => {
    const g = mk();
    ready(g, LOCAL_PLAYER);
    ready(g, "g2");
    expect(courtGift(g, VIL, BOUQUET)?.consumed).toBe(true);
    asPlayer(g, "g2", () => {
      expect(courtGift(g, VIL, BOUQUET)?.consumed).toBe(true);
      expect(pendant(g, VIL)?.consumed).toBe(true);
    });
    expect(g.marriage.stage).toBe("none");
    const pts = g.friendship.points(VIL);
    expect(courtGift(g, VIL, TOKEN)?.consumed).toBe(false);
    expect(g.friendship.points(VIL)).toBe(pts);
    // Dating is not exclusive: both courted until the engagement, which freed the host.
    expect(g.players.get("g2").marriage.stage).toBe("engaged");
  });

  it("a player married to a player cannot wed a villager, and the reverse", () => {
    const g = mk();
    g.players.get("g2").inventory.add(TOKEN, 1);
    expect(
      applyMarriageIntent(g, "g2", { kind: "propose", to: "g3" }),
    ).toBeUndefined();
    expect(
      applyMarriageIntent(g, "g3", { kind: "accept-proposal" }),
    ).toBeUndefined();
    ready(g, "g2");
    asPlayer(g, "g2", () => {
      expect(courtGift(g, VIL, BOUQUET)?.consumed).toBe(false);
    });
    const g2 = mk();
    wed(g2, "g2");
    g2.players.get(LOCAL_PLAYER).inventory.add(TOKEN, 1);
    expect(
      applyMarriageIntent(g2, LOCAL_PLAYER, { kind: "propose", to: "g2" }),
    ).toMatch(/already/);
    expect(
      applyMarriageIntent(g2, "g3", { kind: "propose", to: "g2" }),
    ).toMatch(/already|token/);
    g2.players.get("g3").inventory.add(TOKEN, 1);
    expect(
      applyMarriageIntent(g2, "g3", { kind: "propose", to: "g2" }),
    ).toMatch(/already/);
    // Two free players still marry as before.
    propose(g.playerMarriage, "g3", "g2");
  });
});

describe("spouse ways go to the right player", () => {
  it("kiss, spouse line and the morning chore are the guest's own", () => {
    const g = mk();
    wed(g, "g2");
    g.day.clock.day = 20;
    // The host talks to the guest's spouse as to a friend: no kiss, no spouse halving.
    g.friendship.meet(VIL);
    expect(spouseId(g)).toBeNull();
    expect(kiss(g, VIL)).toBeUndefined();
    expect(meet(g, VIL, undefined).kiss).toBeFalsy();
    asPlayer(g, "g2", () => {
      expect(spouseId(g)).toBe(VIL);
      expect(kiss(g, VIL)).toBeDefined();
      expect(kiss(g, VIL)).toBeUndefined();
    });
    const rand = () => 0.5;
    expect(spouseMorning(g, rand)).toBeUndefined();
    const news = asPlayer(g, "g2", () => spouseMorning(g, rand));
    expect(news?.name).toBeTruthy();
    // The host's cap is the friend cap, the guest's is the spouse cap.
    expect(g.friendship.capHearts(VIL)).toBeLessThan(
      g.players.get("g2").friendship.capHearts(VIL),
    );
  });

  it("the spouse route and the children stay the host's", () => {
    const g = mk();
    wed(g, "g2");
    expect(hostMarriage(g)).toBe(g.players.get(LOCAL_PLAYER).marriage);
    asPlayer(g, "g2", () => {
      expect(hostMarriage(g)).toBe(g.players.get(LOCAL_PLAYER).marriage);
    });
  });
});

describe("divorce for each player", () => {
  it("the filer pays from their own purse; the other marriage stays", () => {
    const g = mk();
    wed(g, "g2", VIL);
    wed(g, LOCAL_PLAYER, OTHER);
    g.players.get("g2").money = DIVORCE_FEE + 10;
    g.money = 5;
    expect(
      applyMarriageIntent(g, "g2", { kind: "villager-divorce" }),
    ).toBeUndefined();
    expect(g.players.get("g2").money).toBe(10);
    expect(g.players.get("g2").marriage.divorcing).toBe(true);
    expect(g.marriage.divorcing).toBe(false);
    // Cancelling hands the fee back.
    expect(
      applyMarriageIntent(g, "g2", { kind: "villager-divorce-cancel" }),
    ).toBeUndefined();
    expect(g.players.get("g2").money).toBe(DIVORCE_FEE + 10);
    expect(
      applyMarriageIntent(g, "g2", { kind: "villager-divorce-cancel" }),
    ).toMatch(/Nothing/);
    // The host cannot afford it.
    expect(
      applyMarriageIntent(g, LOCAL_PLAYER, { kind: "villager-divorce" }),
    ).toMatch(/fee/);
    applyMarriageIntent(g, "g2", { kind: "villager-divorce" });
    const news = asPlayer(g, "g2", () => divorceMorning(g));
    expect(news?.name).toBeTruthy();
    const guest = g.players.get("g2");
    expect(guest.marriage.stage).toBe("none");
    expect(guest.marriage.exes).toEqual([VIL]);
    expect(guest.friendship.points(VIL)).toBeGreaterThan(0);
    expect(g.marriage.married).toBe(true);
    expect(exesOf(g)).toEqual([]);
    // The freed villager can be courted by anyone again.
    ready(g, "g3");
    asPlayer(g, "g3", () => {
      expect(courtGift(g, VIL, BOUQUET)?.consumed).toBe(true);
    });
  });

  it("the wedding intent finishes only the sender's own", () => {
    const g = mk();
    ready(g, "g2");
    asPlayer(g, "g2", () => {
      courtGift(g, VIL, BOUQUET);
      pendant(g, VIL);
    });
    expect(applyMarriageIntent(g, "g2", { kind: "villager-wedding" })).toMatch(
      /no wedding/,
    );
    g.day.clock.day = 13;
    expect(
      applyMarriageIntent(g, "g2", { kind: "villager-wedding" }),
    ).toBeUndefined();
    expect(g.players.get("g2").marriage.married).toBe(true);
    expect(
      applyMarriageIntent(g, LOCAL_PLAYER, { kind: "villager-wedding" }),
    ).toMatch(/no wedding/);
  });
});

describe("save and sync", () => {
  it("round-trips each player's marriage and exes", () => {
    const g = mk();
    wed(g, "g2");
    wed(g, LOCAL_PLAYER, OTHER);
    g.players.get("g3").marriage.setEx(OTHER, true);
    const back = deserialize(serialize(g))!;
    expect(back.players.get(LOCAL_PLAYER).marriage.spouse).toBe(OTHER);
    expect(back.players.get(LOCAL_PLAYER).marriage.married).toBe(true);
    expect(back.players.get("g2").marriage.spouse).toBe(VIL);
    expect(back.players.get("g2").marriage.married).toBe(true);
    expect(back.players.get("g3").marriage.exes).toEqual([OTHER]);
    // The spouse's heart cap is known when the points load.
    expect(back.players.get("g2").friendship.points(VIL)).toBe(
      g.players.get("g2").friendship.points(VIL),
    );
  });

  it("an old save's flat marriage and ex flags belong to the host", () => {
    const g = mk();
    wed(g, LOCAL_PLAYER, VIL);
    const raw = JSON.parse(serialize(g));
    // An old save: no per-player marriage and no exes, the exes were world flags.
    for (const p of raw.players ?? []) delete p.marriage;
    delete raw.marriage.exes;
    raw.flags = ["ex-linnet", "other"];
    const back = deserialize(JSON.stringify(raw))!;
    const host = back.players.get(LOCAL_PLAYER);
    expect(host.marriage.spouse).toBe(VIL);
    expect(host.marriage.married).toBe(true);
    expect(host.marriage.exes).toEqual(["linnet"]);
    expect(back.flags).toEqual(["other"]);
    expect(back.players.get("g2").marriage.stage).toBe("none");
    expect(host.friendship.capHearts(VIL)).toBeGreaterThanOrEqual(10);
  });

  it("syncPlayer carries a guest's marriage to their copy", () => {
    const g = mk();
    wed(g, "g2");
    const copy = deserialize(serialize(newGame("standard", "separate")))!;
    copy.players.add("g2", 0);
    expect(syncPlayer(copy.players, savePlayer(g.players.get("g2")))).toBe(
      true,
    );
    expect(copy.players.get("g2").marriage.spouse).toBe(VIL);
    expect(copy.players.get("g2").marriage.married).toBe(true);
  });
});
