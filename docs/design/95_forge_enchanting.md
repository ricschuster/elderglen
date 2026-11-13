# 95 The forge: weapon forging, enchanting and ring combining (draft)

Status: **split by the owner on 2026-11-12. Ring combining is ring 1 (M3b). Gem forging and
enchanting are deferred to ring 2 or 3 (M5 and later), paid in a Cinder Shard equivalent.**
Lists and numbers are placeholders. Design part of #879 (enchanting). Stardew rules are from
the saved Forge page (read 2026-11-12). Names, prices and art are ours (ADR 0002).

## What the owner decided

- **The split (2026-11-12).** Ring 1 builds only ring combining. Gem forging, enchanting,
  and the forge menu's other tabs wait for ring 2 or 3, where Stardew's own forge sits in
  its volcano and a Cinder Shard equivalent has a home. Only the ring combining
  section below is built in M3b. The Hearthsilver costs there are the stand-in if the owner
  later pulls them forward. The six gems keep their other uses (sale, gifts, bundles).

- **All three parts of Stardew's Forge:** gem forging of weapons, random enchantments, and
  ring combining.
- **Currency: Hearthsilver ore, plus a gem where Stardew uses one, at a high cost.**
  Ring 1 has no volcano, so Stardew's Cinder Shards have no home. When ring 2 or 3 is built
  (M5), the currency switches to a Cinder Shard equivalent. So the currency is one data
  field, `forgeCurrency`, never written into the rules.
- **Where.** The Mountain forge hut (note 74, `forge` map). The smith dwarf there already
  sells bombs and Life Elixir (note 89). Stardew's forge is a Volcano Dungeon floor and
  its Mini-Forge needs Combat Mastery, which we do not have, so ours is the one forge.
  This also reopens note 22's "bought, not forged": weapons are still bought, then
  improved here.

## Gem forging (Stardew)

- **A melee weapon takes up to three forgings.** Each costs one gem and Hearthsilver ore:
  **20, 30 and 40** (Stardew's 10, 15 and 20 Cinder Shards, doubled for a high cost).
- **Stat by gem** (Stardew's mapping, our six gems by depth tier from note 69):

  | Tier | Gem | Effect per forging |
  | --- | --- | --- |
  | Low (any floor) | `gem-low-a` | More knockback, +1 |
  | Low | `gem-low-b` | More Defense, +1 |
  | Mid (floor 41 and deeper) | `gem-mid-a` | Crit chance, +4.6 percent flat |
  | Mid | `gem-mid-b` | Crit power, +10 percent |
  | High (floor 81 and deeper) | `gem-high-a` | Weapon speed, +2, +3, +2 |
  | High | `gem-high-b` | Damage, +10 percent min and max |

  Which of each pair is which is open, and the stat names follow note 37 and the rings.
- **The Glimmerstone** fills all remaining forgings with random upgrades for 20 ore (the
  Diamond rule, Stardew). Our Glimmerstone is the rarest find, so this is a once-a-year
  prize.
- **Slings** cannot be forged (Stardew). Crit, speed and knockback need the combat stats of
  note 37, which the rings already add.
- **Unforging is free** and returns half the ore. It removes forgings, not enchantments.

## Enchanting (Stardew)

- **One random enchantment per weapon or tool**, replaceable at the same price. The cost
  is **80 Hearthsilver ore and one high-tier gem** (Stardew: a Prismatic Shard and 20
  Cinder Shards). The roll is never the last two this tool had (Stardew), and uses a
  counter of enchantments done, so reloading a day does not reroll a better one.
- **Not on** scythes, the watering can's later forms, a slingshot or any trash can.
- **A tool keeps its enchantment through an upgrade** (Stardew).
- **Combat enchantments (melee only), placeholder names:**
  - **Crawler bane:** double damage to the crawling families, and lets the weapon hurt
    armoured crawlers.
  - **Spirit bane:** 50 percent more damage to the Old Diggers' ghosts and spirits.
  - **Vampiric:** 9 percent chance to heal on a kill (about 10 percent of the creature's
    health).
  - **Haymaker:** weeds give more fibre and sometimes hay.
- **Tool enchantments (ours, from the saved page's list):**

  | Name | Effect |
  | --- | --- |
  | Efficient | The tool costs no energy |
  | Reaching | A larger area on a charged use (up to 5 by 5) |
  | Shaving | Extra 3 wood per tree, and hardwood chance from stumps (axe) |
  | Generous | 50 percent chance of a double item (hoe) |
  | Archaeologist | Double chance of finds on artifact spots (hoe, note 69) |
  | Swift | 33 percent faster swing and charge |
  | Preserving | 50 percent chance bait and tackle are not used up (rod) |
  | Bottomless | Infinite water (watering can) |
  | Master | One extra fishing level while held (rod) |
  | Powerful | Axe: clears a large stump in fewer swings; pickaxe: breaks hard rock a grade early |

  The Powerful row was left out in note 44 and is now taken. Which tool takes which row is
  Stardew's grid on the saved page. We have no pan, so the pan rows are dropped.
- **Innate enchantments** (Stardew's second set, a defense, weight, crit or slime gatherer
  bonus on low level weapons) are **not taken** for ring 1. They fit Galaxy-style
  progression that we do not have. A later note can add them.
- **Galaxy and Infinity weapons** and the weapon appearance merge are **not taken**: they
  belong to Stardew's endgame.

## Ring combining (Stardew)

- **Two different rings become one ring** with both effects, stacking as if worn together.
  Cost **40 ore** (Stardew: 20 Cinder Shards, doubled). Two of the same ring cannot be
  combined, a combined ring cannot be combined again, and three at once is not possible.
- **Unforge** splits it back, free, returning half the ore.

## Data and code

- `src/content/forge.json`: `forgeCurrency` (`hearthsilver`), costs, the gem map, the
  enchantment lists and which tools take which.
- `src/core/forge.ts`, free of Phaser: forge a weapon, enchant (random with the counter and
  last-two memory), unforge, combine. The older `forge` data and `forgeWeapon` code from
  note 22's old design are reused where they fit.
- The forge menu at the Mountain forge hut: three tabs (forge, enchant, rings), a preview of
  the result, and a clear cost line. No drag, tablet friendly.
- Save: forgings and the enchantment ride on the item.

## Build order

**Ring 1 (M3b):** ring combining and unforge only, in a small forge menu at the Mountain
forge hut, with the cost and currency read from `forge.json`.

**Deferred to ring 2 or 3:** gem forging and unforge, then enchanting with the combat
list and the tool list (the tool effects one at a time), the currency switched to the
Cinder Shard equivalent.

## Open

- SC-160: Stardew's enchantment pool weights and the Powerful grid are partly on the saved
  page and not fully read for ours. Check before tuning.
- Names and art. The ore cost needs a pacing check against the Hearthsilver supply (floors
  100 to 120, six nodes a floor).
- Which of each gem pair gives which stat.
- The switch to a Cinder Shard equivalent at M5 (ring 2 or 3).

## Built status

Built (2026-11-12): ring combining and unforge only (ring 1). `src/content/forge.json`
(`forgeCurrency`, `combineCost` 40, `unforgeReturnShare` 0.5), `src/core/forge.ts`
(`combineRings`, `unforgeRing`, `packRings`), and a combined ring is an id of its two base ids
joined by `+` (`comboId`, `ringById` in `equipment.ts`), so it saves as a plain item and the
effects stack. The menu is extra rows on the smith counter at the Mountain forge hut
(`SmithScene`), one Combine row per pair of rings in the pack and one Unforge row per combined
ring. The equipment screen lists combined rings. Tests: `tests/forge.test.ts`.

The rings of note 94 have sources now (trainer shop, slayer goals, Sturdy band recipe). Not built: a dedicated forge scene with three tabs, gem forging and enchanting (ring 2 or 3).
