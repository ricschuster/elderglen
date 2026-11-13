# 89 Placement system

Status: design settled with the owner's answers of 2026-11-12 (note 88), numbers are
placeholders. Nothing here is built beyond what "Built today" lists.

One rule set for everything the player puts on a tile: sprinklers, machines, chests,
torches and braziers, lamp-posts, the lightning rod, the coop and barn heater, and bombs.
Today each has its own code path (`placeSprinkler`, `placeMachine`, `placeChest`).
This note says what they share, so a new placeable is a data row, not a new function.

Stardew inspired, not copied (ADR 0002). Stardew claims are marked and tracked in note 54.

## Scope

In: the placing and lifting rules, the per item place table, light, the lightning rod,
the heater, bombs, saving, and the build order.

Out: building placement at the carpenter (`src/core/placement.ts`, a different system),
decoration and furniture inside the farmhouse (note 85), and fences (note 34).

## The model

A placeable is an item with a row in `src/content/placeables.json`. The row says:

- `id`: the item id.
- `kind`: `sprinkler`, `machine`, `chest`, `light`, `rod`, `heater`, `bomb` or `decor`.
- `places`: where it may go (see "Place table").
- `footprint`: tiles, 1 by 1 for everything in ring 1.
- `blocksWalking`: true or false.
- `pickUp`: `hand` (any tool or the empty hand) or `none` (bombs).
- `light`: radius in tiles, for lights, with `onlyAtNight`.

Rules stay in `src/core/` and know nothing of Phaser. Behaviour that is not shared (what
a sprinkler waters, what a machine makes) stays in its own module. The shared layer
answers one question, "may this id stand on this tile of this map?", and returns a
reason when not.

### Placing

1. The player holds the item and uses it on the tile in front (the same tap and Action
   rules as planting, note 27). Free of energy, as planting is.
2. The tile must pass `isClear` (no soil, crop, tree, weed, rock, forage, goods, other
   placeable or machine) and the map must allow the id (the place table).
3. Some tiles are never placeable: a door tile or the tile in front of one, a path tile
   the layout marks `path`, a shop yard, a festival spot, a warp. Layout notes (81 and 87)
   own the list. This keeps a lamp or a chest from blocking a one tile door.
4. The item leaves the pack and the placeable is saved on that map.

### Lifting (Stardew, SC-48)

Click it with any tool or the empty hand and it goes back to the pack. If the pack is
full it stays. Exceptions:

- A chest or machine that holds items cannot be lifted until empty (note 34).
- A bomb cannot be lifted. It is used up.
- A heater, a rod, a torch and a lamp-post lift freely.

## Place table

| Placeable | Where | Notes |
| --- | --- | --- |
| Sprinkler | The farm and the greenhouse | As built. Not on sand. Only tilled tiles are watered |
| Machine | The farm, plus the processing rooms the note 24 lists | As built, per machine. Not in the mines |
| Chest | The farm, houses, camps | As built. Not in a shop or on a festival spot |
| Torch | The farm, the mines floors, camps, the wilds | Not in Hearthwell, not indoors (owner, 2026-11-12) |
| Campfire | The farm, the mines floors, camps, the wilds | Carries a small cook or warm rule later, not in this note |
| Brazier (wood, stone) | The farm and camps | Decoration with light |
| Wood and iron lamp-post | The farm, outdoors | Cost includes a battery pack (note 34) |
| Lightning rod | The farm, outdoors, open sky | Not in the greenhouse, not indoors |
| Heater | The coop and the barn, inside | One per building. Floor tile, not blocking |
| Decor | The farm, outdoors | Footprint up to 2 by 2, blocks walking. See "Farm decoration" |
| Bomb | The mines floors, the Quarry, the farm, the wilds | Not in Hearthwell, not indoors, not in camps |

A map says what it is through its tags (`indoors`, `wild`, the area id). The table is
data, so a map outside it is simply "no" until a row says yes.

## Light

Lights are placeables with a radius, not a separate system. In the mines and at night a
light draws a fixed glow ring (Stardew, recalled, SC-128). A lamp does not burn fuel and
does not move with the player.

| Light | Radius (placeholder) | Notes |
| --- | --- | --- |
| Torch | 3 | Cheap, wood and sap |
| Campfire | 4 | |
| Brazier | 4 | |
| Lamp-post | 6 | Wood then iron, farm only |
| Light ring (worn, bundle 20) | 5 | Carried, not placed. Not a placeable |

The worn ring and the placed lights both feed one light layer that the scene draws. The
worn ring is the only carried light, so the mines have a reason to place lamps as the
player goes down. Rest camps come lit (note 22).

## The lightning rod

Rules are built in `src/core/lightning.ts`. This note adds only the placing and the
collection.

- Placed on the farm, outdoors, in the open. One rod counts per tile and any number may
  stand. The strike rule counts every rod on the farm.
- A strike lands on a charged rod with the chance `1 - (charged / all)^2`, as built. A hit
  rod ignores more strikes that day and makes one battery pack the next morning.
- **Collecting.** The next morning the rod shows a pack. The player uses Action on the
  rod to take it, so the pack is a visible reward and not mail. If the pack waits a
  second storm day the rod still makes only the one.
- A strike never harms the farm. With no rod it only flashes (note 34).
- Built (step 3): the storm clock calls `rollStrikes` every 10 game minutes in the
  scene tick, a strike flashes the screen and a hit rod, and the morning leaves the pack
  on the rod (`chargeRods`, a mark over the rod) until Action takes it (`takePack`).
  Lifting a rod with a pack waiting gives both.

## The heater

- A floor tile in the coop or barn, one per building, picked up by hand like a sprinkler.
  It does not block walking.
- With a heater placed, the building takes no mood loss on winter nights (the built rule,
  note 23: placeholder 10 points). It never harms an animal.
- **Where the item comes from (owner, 2026-11-12):** sold at the ranch shop for gold, as
  Stardew does from memory (unchecked, SC-149). Price 2,000g, as the saved Marnie page lists it (owner, 2026-11-12, SC-149). Bundle 25
  still gives the first one.
- Bundle 25 already hands out a kept `coop-heater` item. That item becomes the placeable.

## Bombs

Settled by the owner on 2026-11-12. Blast sizes are from memory of Stardew and not
checked (SC-150).

| Bomb | Blast radius | Price at the Forge (Stardew, saved Dwarf page) |
| --- | --- | --- |
| Cherry bomb | 1 tile | 450g |
| Bomb | 2 tiles | 1,000g |
| Mega bomb | 3 tiles | 1,600g |

- **Placing.** Held on the tile in front, as for any placeable. It lights a fuse
  (placeholder 1.5 seconds, with a visible flash and a tick) and then explodes. It
  cannot be lifted and cannot be placed in camps, indoors or in Hearthwell.
- **What it breaks.** Rock nodes and ore nodes in the circle, as a pickaxe swing would
  give. The ore gates stay: a bomb breaks an ore only where the player's Mining level
  already allows it (owner, 2026-11-12). Weaker nodes break and the others stay.
  Mining experience is not given for a bomb (placeholder, to tune).
- **What it hurts.** Every monster and the player inside the circle. Placeholder
  damage: cherry 15, bomb 30, mega 50 for monsters, and the same as a share of the
  player's maximum health (10, 20, 30 percent) for the player, never lethal. Combat
  numbers are tuned in note 07.
- **What it never touches.** Crops, trees, fruit trees, buildings, machines, chests and
  other placeables.
- **Edges.** A tile the circle cannot reach through a solid wall is not hit. The check is
  tile distance, no line of sight, to keep the rule simple (placeholder).
- **Hearthwell.** No bombs in the village (owner's table row). The tag `village` is the
  test.

## Forge stock (note 74, saved Dwarf page)

The Forge dwarf sells the three bombs, Life Elixir (2,000g, health to full), Miner's
Treat (1,000g, a big energy boost, placeholder 100), Oil of Garlic (3,000g) and the
owner's torches, camp supplies and a campfire kit. Oil of Garlic: monsters below a
tier ignore the player for the rest of the day. Lamp-posts are not sold: they need a
battery pack. Prices are Stardew's as placeholders.

## Farm decoration (decided 2026-11-12)

The seventh kind, `decor`, for the animal keeper's decoration list (note 23): ornamental
hay bale, doghouse, dark doghouse, cat tree, dark cat tree and bird house.

- A `placeables.json` row like any other. Footprint up to 2 by 2 (the hay bale 1 by 1, the
  doghouses and cat trees 2 by 2 placeholder, the bird house 1 by 1). They block walking.
- Farm outdoors only, not on tilled soil or a path tile. Placed and lifted by hand, free of
  energy, same rules as a chest, and always empty so lifting is never refused.
- Cosmetic, no effect, no upkeep, no decay. No pets exist, so the doghouses and cat trees
  stay decor until a pet system is designed.
- Sold by the animal keeper at note 23's prices (hay bale 250g, bird house 5,000g,
  doghouses and cat trees 10,000g). Stardew sells them as buildings (from memory, SC-164);
  ours are carried, so they can be moved, which is our choice.
- Saved with the other placeables on the map, no new save field.

## Saving

Each map keeps its placeables under its own map id (the `MapStore` of `mapstore.ts`,
today for the farm and the greenhouse). The store generalises to one list per map of
`{ x, y, id, state }`, where `state` is the placeable's own data (a rod's `hit`, a
heater's building, a machine's job). Old saves read the three existing lists into the
new one on load, so a save never loses a sprinkler or a machine. Placed bombs are not
saved: a bomb that is lit when the day ends or the map is left goes off at once.

## Multiplayer (M4)

Placing, lifting and the strike clock are host decisions, as every other state change
will be (ADR 0007). Core functions already take the game state and return an outcome,
so nothing changes except who calls them. Bombs hurt other players, which the host
checks.

## Build order

1. The generic store and the `placeables.json` rows for the things already placed
   (sprinkler, machine, chest), with a save migration and tests. No behaviour change.
2. Lights: torch, campfire, brazier, the light layer, and the worn ring.
3. The lightning rod: placing, the storm clock, collecting the pack.
4. Lamp-posts, once the rod makes packs.
5. The heater tile and its building rule.
6. Bombs: the fuse, the blast, the hard rock gate, the Forge stock.
7. Elixir, Miner's Treat and Oil of Garlic (small, independent).

Each step is a small pull request and the first one is the base for the rest.

## Open questions

Settled 2026-11-12: heater from the ranch shop, no torches indoors, no bomb experience
(same drops as a swing), no cap on rods.

1. **Lit bombs and leaving a map.** They go off at once. A player could keep safe by
   leaving. Acceptable.
2. **Placeable tags per map.** The layout page (note 87) must give each map the tags this
   table reads.

## Built today

- Sprinkler placing and lifting, farm and greenhouse (`placeSprinkler`, `pickUpSprinkler`).
- Machines (`placeMachine`) and chests (`placeChest`, `pickUpChest`).
- Lightning rod rules, battery packs and placing (`src/core/lightning.ts`).
- The `coop-heater` item and the winter mood rule.
- (Lamp-posts, the heater and bombs were not built at the start; the steps below added
  them.)
- Step 1A (2026-11-12): `src/content/placeables.json` has a row for every sprinkler,
  machine and chest, and `src/core/placeables.ts` answers "may this id stand on this kind
  of place?" (`placeTag`, `mayPlaceOn`). `placeSprinkler`, `placeMachine` and `placeChest`
  call it, with no behaviour change. Their storage is still separate; step 1B (one stored
  list per map and the save migration) is next.
- Step 1B (2026-11-12, #889 and #890): `src/core/placedstore.ts` keeps one list per map
  and the save writes a single `placed` list for sprinklers, machines and chests, with the
  three older lists still read. The typed holders stay in memory; kinds with no holder of
  their own (lights, and later the rod, heater) live in `g.placed`.
- Step 2 (2026-11-12): torch, campfire and the two braziers. `src/core/lights.ts`
  (`placeLight`, `pickUpLight`, `lightLayer`, `isLit`), place tags `mine`, `camp` and `wild`
  in `placeTag`, items, recipes (note 07), placeholder art, and `FarmScene` places, lifts
  and draws the glow rings (a warm ring drawn over the night overlay, shown at dusk
  outdoors and always in the mines). The worn ring joins the same layer. Lights on a mine
  floor are not saved and the night clears them, since the floor is rebuilt each day.
  Left: a real light cut-out in the night overlay, camp supplies and the torch as a Forge
  stock item, and the rest of the build order (steps 3 to 7).
- Step 3 (2026-11-12): the lightning rod. The old `g.rods` list moved into the store: a
  rod is a `lightning-rod` row under the farm with `state { hit, pack }`, saved in
  `placed`. An older save's `rods` list is read into the store on load (a struck rod keeps
  its strike). `placeRod`, `pickUpRod`, `takePack`, `chargeRods`; recipe from note 34 (iron
  bar, quartz crystal, 5 bat wing, Foraging 6); placeholder art beside the lights.

- Decor kind (2026-11-12): `src/core/farmdecor.ts` (`placeFarmDecor`, `pickUpFarmDecor`,
  `farmDecorAt`, `buyFarmDecor`), six `decor` rows in `placeables.json` (ornamental hay bale
  250g and bird house 5,000g at 1 by 1, doghouse, dark doghouse, cat tree and dark cat tree
  10,000g at 2 by 2; the `price` field is new), items, the keeper's counter rows, placeholder
  block art, and `PlacedStore.covering` so a 2 by 2 piece (kept at its top left tile) blocks
  digging, planting, spawns, lights and walking on all four tiles. Tests:
  `tests/farmdecor.test.ts`. Left: real art, the cosmetic pet system the doghouses and cat
  trees wait for, a browser look at placing.

## Built status

The decor kind is built (the last item above); see "Built today" for the other steps.

Built (2026-11-12, #877 icons): the bombs already had pictures. Added placeholder icons for the
Forge goods (Life Elixir, Miner's Treat, Oil of Garlic), every boots row, every ring and every
pair of rings (a combined ring shows both stones), key `icon-forge-<id>` (`forgeKey` in
`src/scenes/art.ts`). Test: `tests/forgeicons.test.ts`.
