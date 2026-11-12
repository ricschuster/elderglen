# 88 Placement system and Forge stock: owner decisions

Status: decisions only (owner, 2026-11-12). The full placement design note is still to
write. Nothing here is built.

## Settled

- **Last Seat gate (Stardew).** Becomes "every other bundle" once bundles 20, 24 and 26
  exist (#181). Stays 23 until then.
- **Couple door.** Either partner opens it (as built).
- **Coop and barn heater (Stardew).** A heater you place inside the building, not an
  invisible item. A visible tile, so it joins the placement system.
- **Elderfruit.** Same as Stardew's stardrop: +34 maximum energy, eaten the moment it is
  found, no health restored (saved Stardrop page). Eight sources, not seven (note 39).
- **Fish seed letter.** Carries an elderfruit and is the eighth source (note 39).
- **Forge dwarf stock (saved Dwarf page).** Bombs in three sizes (Stardew: 450g, 1,000g,
  1,600g), Life Elixir (2,000g, restores health to full), Miner's Treat (1,000g,
  energy), Oil of Garlic (3,000g, weaker monsters avoid you), plus our own lamps and
  rest-camp supplies. Prices are Stardew's, as placeholders for ours.
- **Bombs** are designed here, with the placement system, not skipped.

## Placement system rules

- Each placeable has its own allowed places (farm, mine, camp, inside a building). The
  table is part of the design note.
- A placed item is picked up by clicking it with any tool or the empty hand (Stardew,
  sprinkler rule, SC-48). A bomb is used up and is not picked up.
- **Lightning rod.** Catches a strike on the farm and yields a battery pack (500g
  placeholder). Rules are in `src/core/lightning.ts`.
- **Lamps.** A fixed glow ring at night, no fuel (Stardew, SC-128).

## Still to design (the full rules are now in note 89)

Bomb blast shape, damage to the player and monsters, and which rock a bomb breaks (the
hard rock gate). The per item place table. The heater's effect size. The Life Elixir,
Miner's Treat and Oil of Garlic effects and the monster avoid buff. Goods hand-in to a
named place and Mossback and the pond fish are not yet taken.

## Second round (owner, 2026-11-12)

- **Bomb blast.** Radius 1, 2 and 3 tiles for the cherry bomb, bomb and mega bomb. This is
  from memory of Stardew and unchecked (no saved bomb page); placeholder numbers.
- **Bomb effects.** Breaks rock and ore nodes, hurts monsters and the player. Never
  crops, trees or buildings.
- **Hard rock gate.** Bombs do not skip a pickaxe gate. Each ore keeps its tool level.
- **Heater.** Covers the whole building on winter nights (the built rule). SC-131 still open.
- **Goods hand-in (Stardew, saved Special Orders page).** A fixed container in the named
  place: a pantry chest, house chest or kitchen fridge. Goods gathered after acceptance
  count, as in note 65. Needs one container in each hand-in interior.
- **Life Elixir** restores health to full. **Miner's Treat** gives a big energy boost
  (placeholder 100 energy).
- **Oil of Garlic.** Monsters below a tier ignore the player for the rest of the day.
- **Mossback.** Pond only, any time, shy, so a hard bar and a high price (note 21).
- **Last Seat.** Counts bundles only, no per-room rule (the every-other-bundle gate
  already implies every room).
- **Bundle 26 keepsake.** A lore item with no effect; it gives a letter and a hall shelf slot.
- **Bundle 24 treat.** Sold at the stall of any festival with food, so year one cannot miss it.
- **Bundle 20 glow ring.** A worn light ring of radius 5. Placeable lamps stay a fixed
  glow, with no carried light (SC-128).
