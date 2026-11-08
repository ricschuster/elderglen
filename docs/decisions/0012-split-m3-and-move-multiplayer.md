# Split M3 and move multiplayer after the ring 1 systems

## Status

Accepted (owner, 2026-11-08). Amends ADR 0007: the milestone order changes, the
M4 to M6 names do not.

## Context

M3 was named the vertical slice, but it grew to hold slice 1 and much of slice
4 (animals, cooking, machines, festivals, requests, mail). Fishing, combat,
friendship and villagers, and the Last Seat are not built, nor is the story
spine. "Vertical slice" no longer describes the remaining work, which is the
rest of ring 1 (`docs/design/33_build_order.md`). ADR 0007 put multiplayer
right after M3, which would now come before most of the game's systems exist.

## Decision

M3 splits into four GitHub milestones. M4, M5 and M6 keep their names.

- **M3, vertical slice.** Slice 1 and the work pulled forward from later
  slices. Done when the owner has played the coop, barn, machines and cooking
  by hand and the open issues are closed or moved.
- **M3b, ring 1 systems.** Fishing and the Water room (slice 2), combat and the
  deeper mines (slice 3), friendship, the cast, gifts and heart events (slice
  4), the horse, the cask and cellar, the dye vat and the greenhouse. Done when
  every system exists and bundles 1 to 26 can be filled.
- **M4, multiplayer.** Moves to follow M3b.
- **M3c, ring 1 story and ending.** The story spine, the Last Seat (slice 5) and
  its numbers, the valley layout, and the year two rules. Done when ring 1 plays from start to ending.
- **M3d, ring 1 polish.** Art, audio, onboarding, balance, minigames, packaging
  and the name register check. Done when ring 1 is releasable as a full game.

Order of work: M3, M3b, M4, M3c, M3d, M5, M6. M3c and M3d build on a
multiplayer base.

## Consequences

- Multiplayer is designed against the finished systems, so it needs no
  retrofit of fishing, combat or friendship. The cost is that story and polish
  work waits behind M4, and M4's hosting question (ADR 0007) now blocks them.
- The rule in ADR 0007 still holds: no multiplayer code before M4 starts, and
  systems keep world and player state separable.
- `docs/design/03_milestones.md` holds the table. The GitHub milestones are
  created to match and the open issues moved.

## Amendment (2026-11-08)

The owner moved the map areas into M3b: the Forest (with tree types), Secret
Woods, River delta with the Beach, Mountain, Quarry and Lake cove maps, because
fishing, hardwood, the Mines entrance and the Water room need them. Hearthwell's
shell and interiors are filed in M3b too and ride with #599. The Beach elf's
house waits for the story spine. See `docs/design/71_map_areas_overview.md`.
