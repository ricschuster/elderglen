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

## Still to design

Bomb blast shape, damage to the player and monsters, and which rock a bomb breaks (the
hard rock gate). The per item place table. The heater's effect size. The Life Elixir,
Miner's Treat and Oil of Garlic effects and the monster avoid buff. Goods hand-in to a
named place and Mossback and the pond fish are not yet taken.
