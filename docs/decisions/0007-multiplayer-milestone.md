# Multiplayer as milestone M4

## Status

Accepted. Reverses the single-player decision of 2026-10-15 (issue #18) in the
project brief. That decision was recorded there, not in an earlier ADR.
Amended by ADR 0012, which moves multiplayer to M4, after M3b.

## Context

The brief listed multiplayer as a non-goal: "not planned for", and a large
rework if ever wanted. The owner now wants it, between the vertical slice (M3)
and ring 2. The stack is a browser game on Phaser (ADR 0004), so online play
probably needs a server or relay, which is a real cost for a free solo project.
The save design (`docs/design/52_save_and_exit.md`) already keeps player and
world fields apart so a split stays possible.

## Decision

Multiplayer becomes milestone M4. The old M4 (ring 2 prototype) becomes M5 and
the old M5 (ring 3 and centre 3) becomes M6. The first playable and M3 stay
single player, and no multiplayer code is written before M4 starts.

M4 begins with a design note, not code. It must settle at least: online or
same-device play, who owns the world and the clock, how a day ends when players
sleep at different times, the save and join model, what hosting costs and who
pays, the networking approach on browsers and tablets, and what that means for
the rules in `src/core/`.

## Consequences

- `docs/design/03_milestones.md`, the brief, `CLAUDE.md`, the system review and
  the M4 and M5 references in other notes are updated. The GitHub milestones
  are renamed to match.
- Systems built before M4 should keep world and player state separable and keep
  rules free of Phaser and the DOM, as they already are. Nothing else is
  built for multiplayer ahead of its design.
- M4 can change earlier designs, such as the day end and the shipping bin, once
  its note exists.
- The hosting cost is unknown and may change the plan. If it does, a new ADR
  records that.
