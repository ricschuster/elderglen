# 37 Equipment: rings, boots and clothing slots (draft)

Status: draft. Decided with the owner on 2026-10-31. Built 2026-11-10 (#597): the two ring slots, the four light and magnet rings, the wearing screen (see "Built"). Boots, Defense, Immunity and the combat rings are not built.
Reference: the saved Stardew Valley Wiki pages Rings, Boots, Footwear, Hats,
Inventory and Forge, read only (ADR 0002). The owner chose Stardew's behaviour
on every question, so this note follows the saved pages. Item names are ours
and open. Stat numbers are Stardew's unless marked ours.

## Decisions

- **Slots (as Stardew):** two rings, boots, a hat, a shirt and pants. Any two
  rings can be worn at once and some effects stack. The hat, shirt and pants
  are cosmetic (the hat page says hats have no effect), and belong to
  `10_customisation.md` and tailoring. Slice 3 builds the ring and boots slots
  and the screen. Hat, shirt and pants slots arrive with customisation.
- **Trinkets:** the saved pages list a trinket category, but none of them
  describes the trinket slot, so it is not checked and not in this note.
- **Boots give Defense and Immunity (as Stardew).** Defense cuts damage taken.
  Immunity shortens bad effects. Boots are found, bought or won, and all can be
  sold.
- **The ring list is Stardew's** (below), minus the wedding ring (we use a token
  that is not worn, `12_marriage.md`) and the jukebox ring (unobtainable in
  Stardew).
- **Rings can be combined** at the forge into one ring that holds both effects,
  as Stardew does. The cost is not on a saved page and is open.

## Conflicts this reopens

The owner's choice needs stats that earlier notes ruled out for the first
build. These notes are partly superseded once slice 3 begins.

- `22_mines.md` says weapon stats are damage, speed and reach, with no crit and
  no enchant at first, and that ring slots are covered by bundle rewards. Rings
  now work as Stardew's, so crit chance, crit power, attack, knockback and
  weapon speed come with them.
- `24_processing_and_cooking.md` says buffs exist only for stats we have, and
  lists luck, defence, attack and magnetism as not yet existing. They now exist
  with equipment, so food and drink buffs may use them (open).
- `22_mines.md` has one health bar and small hits of 4 to 12. How Defense turns
  into damage is not on a saved page, so it is open.
- Immunity needs bad effects to shorten. Slice 3 creatures must have at least
  one (Stardew's example is the slimed buff), or Immunity does nothing.

The slot and the first rings do not need all of this. See the order below.

## Rings (Stardew's effects, our names open)

| Effect | Stardew value | Needs |
| --- | --- | --- |
| Small and plain glow | Light radius 5, and 10. Stacks | Light on dark floors and at night |
| Small and plain magnet | Pickup radius +1 tile, and +2. Stacks | Magnetism |
| Glow and magnet in one | Radius 10 light and +2 tiles | The two above |
| Defense | +1 and +5 (two rings) | Defense |
| Crit chance and crit power | +10 percent each | Crit |
| Attack, weapon speed, knockback | +10 percent each | Attack, speed, knockback |
| Slime proof | No slime damage and no slimed effect | A slime effect |
| Warrior, savage, vampire | Buff, 3 second speed buff, and 2 health a kill | Combat buffs |
| Soul sapper | 4 energy a kill | Energy on kill |
| Burglar | Drops roll twice | Drop tables |
| Thorns | Attackers take the damage dealt | Combat |
| Protection | +0.4 seconds of grace after a hit | Grace window (1.5 seconds in ours) |
| Phoenix | Once a day, back to 50 percent health when knocked out | Defeat rule |
| Sturdy and immunity band | Bad effects last half as long, and Immunity +4 | Immunity |
| Yoba style shield | A chance of a shield buff when hit | Luck and buffs |
| Lucky | Luck +1 | Luck |
| Coffee finder | More coffee drops from creatures | Drops |
| Iridium style band | Glow, magnet and +10 percent attack in one | Late ore |

- Where each ring comes from (mine drops, crafting, bundle rewards, shop or a
  guild-style board) is open and belongs to the mines note. Two are fixed
  already: the glow ring is the Night Fishing bundle reward and the magnet ring
  is The Catch reward (`16_bundles.md`). Nine more are the slayer goals' rewards
  in `22_mines.md` (slime proof, burglar, vampire, savage, warrior, defense,
  protection, sturdy and thorns, settled 2026-10-31). The glow ring is not a slayer
  reward, since a bundle gives it.
- Rings that need combat stats wait for those stats. Light and magnet rings do
  not.

## Boots (Stardew's stat pairs, our names open)

| Tier | Defense and Immunity pairs |
| --- | --- |
| Early (found or bought, floors 1 to 39) | 1 and 0, 0 and 1, 1 and 1, 2 and 0 |
| Middle (floors 40 to 79) | 3 and 0, 2 and 1, 1 and 2 |
| Deep (floors 80 to 119) | 4 and 2, 3 and 3, 1 and 6 |
| Late | 4 and 4, 3 and 5, up to 5 and 8, and a 7 and 0 pair |

- Every pair above appears in Stardew's list. Which boots are found in a floor
  chest, which are bought and which are gifts is open (Stardew gives each pair a
  source from the Guild, a floor chest, a fishing chest or a drop).
- **Boots can be custom-tailored** to move the stats of one pair onto another,
  which suits our tailoring station (`10_customisation.md`).

## The wearing screen (ours)

- The equipment slots and paper doll sit on the Pack tab, under the backpack,
  as Stardew's Inventory tab does (decided 2026-11-03; there is no separate Wear
  tab, note 49). Tap a wearable item in the pack to wear it, or tap a slot to
  list what fits. Tap a worn item to take it off. No drag is needed
  (`27_touch_controls.md`).
- A glow or magnet ring should show its effect at once so the player learns what
  it does. The paper doll also shows the current Defense and Immunity.
- Saving stores what the player wears (`10_customisation.md`).
- Worn items are not shipped by accident. The shipping bin skips worn items, and
  a sold worn item asks first.

## Order of work

1. **Slot and screen, in slice 3,** with the two bundle rings (glow and magnet).
   They need only light and a pickup radius.
2. **Defense and Immunity, and boots,** with the first creatures in slice 3.
3. **Combat stat rings** once weapons have the stats, in the later mines work.
   The weapon stats in `22_mines.md` get crit, attack and knockback then.

Bundle 16's glow ring has a placeholder reward until the slot exists
(`33_build_order.md`). Built 2026-11-10: `glow-ring` is a kept item that does
nothing yet. The slot itself is not built.

## Built (2026-11-10, #597)

`src/core/equipment.ts` and `src/content/rings.json`: two ring slots, worn from
the pack (a worn ring leaves the pack, so the bin cannot take it), saved with
the game. Four rings, light and magnet only, which stack: small glow (light 5),
glow (10), small magnet (+1 tile) and magnet (+2). The magnet bonus is wired
into the ground pickup radius. Light is computed (`lightRadius()`) but nothing
reads it yet, since the mines have no dark floors. Screen: `EquipmentScene`,
opened from the hat box, not yet the Pack tab (no Pack tab exists). The magnet
ring has no source until bundle 28 (The Catch) is built. Placeholder: which of
the glow rings the Night Fishing bundle gives is the 10 radius one.

## Open

- How Defense changes damage, and how Immunity is read, from a source or a
  playtest (neither is on a saved page).
- Ring and boots sources, prices and craft costs.
- Ring combining cost.
- Whether the trinket slot is wanted.
- Which stats food and drink buffs may use now (`24_processing_and_cooking.md`).
- Whether early combat stats should wait until a playtest says gentle combat
  needs them, given the first mines build has no creatures.

## Not taken from Stardew

- The wedding ring and the jukebox ring.
- Item names, art and descriptions. Ours are written fresh.
