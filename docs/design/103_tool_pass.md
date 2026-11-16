# 103 Tool pass: art, can water, hover tips, scythe and grass

Status: settled with the owner 2026-11-16 (feedback on note 102). Build step 2 (water in the can) built 2026-11-16: `src/core/canwater.ts`, meter in the
toolbar and pack slots, tooltip line "Water: n/max". Scythe and grass are separate steps.
Builds on notes 70 and 102 (tools in the pack), 23 (silo and hay), 29 and 36 (weeds,
fibre, grass).

## Owner feedback

Tools need better art, the watering can needs a water meter, hovering a toolbar slot
shows a tooltip (name, kind, one line of text, as Stardew's Scythe tip: "Scythe", "Tool",
"It can cut grass into hay, if you've built a silo."), and the game needs a scythe.

## Decisions

1. **Water in the can (Stardew, owner chose it).** The can holds a limited amount per
   tier and each watered tile uses 1. Using the can on any water tile (farm ponds, river,
   lake, sea) refills it. A meter under the can icon shows the fill, in the toolbar and
   the pack slot. Capacity per tier (placeholder, from Stardew memory, SC-189 to check):
   basic 40, copper 55, steel 70, gold 85, iridium 100. Rain does not refill it. A new
   day refills it fully (placeholder, SC-189). With an empty can the tap says "The can
   is empty. Fill it at water." and costs no energy. The two farm ponds already exist
   for this (note 55). Garden pots use water too. Sprinklers and rain do not.
2. **The scythe (owner chose full Stardew).** A fifth tool stack, `tool:scythe`, in the
   pack like the others (note 102): movable, never trashed, sold, shipped or dropped. It
   is not upgradable (the later iridium scythe stays out of scope). The pack stays at 12
   slots with five tools. Touch: a manual pick, as note 27 says.
   - It cuts weeds, fibre plants and grass in one hit, and costs no energy.
   - It never harms crops, trees or placed objects. On a ripe crop it does nothing.
3. **Grass tiles.** The farm gets grass patches (note 36: grass drops no fibre). Rules:
   - A cut grass tile gives hay 50 percent of the time into the silo, only when a silo is
     built (note 23). With no silo the grass is cut and gives nothing, and a line says so
     once a day ("Cut grass could be hay, if you build a silo.").
   - Grass grows back in spring, summer and fall. Winter day 1 clears it (note 29). It
     spreads slowly onto free tillable tiles (placeholder 2 percent a night per edge) and
     stops weed spread (note 29).
   - Tilling grass clears it.
   - Starting amount is a scatter in the farm field. Numbers go in note 07 and are tuned
     in play.
   - Silo full: the hay is lost with a line.
   - Remove the old weed-cutting hay (2 per weed): note 23 already says so.
4. **Hover tooltips.** A tooltip box on mouse hover over a toolbar slot, pack slot and
   (later) chest slot: name, a coloured type line (Tool, Seed, Food...), then a text box.
   The same box opens on a long press on touch. It reuses the HUD tip look from
   `hudpanel.ts`. Text per item comes from the item data (`description`); tools get
   theirs in `src/content/tool-text.json` (name, kind and a line per tool and tier).
   Quality, sell price and energy gained are added for items in a second pass.
5. **Art.** Redraw the five tool icons and the tier looks at 16 px source art:
   readable at 64 px, a tier tint (copper, steel, gold, iridium), a water meter drawn
   beside the can. Art stays placeholder quality until M3d (note 99 rules).

## Build order

1. Scythe stack, weed cutting, tests, tool text and tooltip box (small).
2. Can water: capacity, refill, meter, save (old saves start full).
3. Grass tiles, hay to the silo, tests, sim bot rule.
4. Art pass for the icons.

## Open

- SC-189: Stardew can capacity per tier, nightly refill, and rain refilling (from memory,
  unchecked). Add it to `54_stardew_checks.md` with the build.
- Whether water meter shows on the can slot of the Pack tab only or also in the HUD
  (decided: both).

**Built 2026-11-16, build steps 1 (scythe part) and 3:** `scythe` is the fifth tool
(`toolitems.ts`, `tools.ts`), grass is `src/core/grass.ts` with tests in `tests/grass.test.ts`.
Left: scythe tooltip text, the sim bot cutting grass, final art for the scythe and grass.
