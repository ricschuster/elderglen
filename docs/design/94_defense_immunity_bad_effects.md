# 94 Defense, Immunity and bad effects (draft)

Status: **settled with the owner on 2026-11-12; numbers are placeholders.** Design part of
#879. Builds on `37_equipment.md` and `22_mines.md`. Stardew facts are from the saved
Combat page (read 2026-11-12). It settles the open points of note 37: how Defense turns
into damage, what Immunity does, and which bad effects exist.

## What the owner decided

- **Immunity is a chance to resist a bad effect (Stardew).** Not a shorter duration.
  This replaces note 37's "Immunity shortens bad effects". The saved Combat page says
  Immunity "affects the chance to be afflicted with certain debuffs" and gives no numbers
  (SC-159).
- **Three bad effects, one per mine band:** slimed, chilled and burned.

## Defense (already built)

Defense is a flat cut from each hit, to a floor of 1 damage, and Assist halves what is
left (rounded up). It is built in `Health.hurt` (`src/core/combat.ts`) and fed by the
boots and the Defense ring (+1 and +5). Stardew says only that Defense "affects how much
damage the player takes" (saved page), so the flat rule is ours (SC-159). Boots today run
from 0 to 4 Defense against hits of 4 to 12, so a full set trims about a third at the
top and never makes a hit free.

## Immunity

- **A resist roll.** When a creature's hit would inflict a bad effect, roll once. Each
  point of Immunity resists 10 percent, capped at 75 percent, so an effect always has a
  chance to land. Boots give 0 to 2 points (`boots.json`) and the Sturdy and Immunity
  band adds 4 (note 37), so up to 6 points, 60 percent, in play.
- **The roll is per hit.** A hit that lands still hurts. Immunity only stops the effect.
- **Slime proof ring** blocks slimed outright and takes no slime damage (note 37).
- **The Sturdy ring's half-duration** stays as written in note 37: a separate cut on the
  length of an effect that did land. It is the only way duration shrinks.
- **Immunity shows** on the equipment screen as a percent ("Resist 20 percent"), with a
  tooltip, so a tablet player never has to work out the points.

## The three bad effects (placeholders)

| Effect | Cause | What it does | Length |
| --- | --- | --- | --- |
| Slimed | Slimes and jellies in the Upper Galleries (floors 1 to 40) | Walk speed down by a third | 8 s |
| Chilled | Frost creatures in the Cold Deeps (floors 41 to 80) | Attack swing 25 percent slower | 8 s |
| Burned | Ember creatures in the Ember Deeps (floors 81 to 120) | 1 health lost a second | 4 s |

- **One effect at a time of each kind.** A second hit of the same effect refreshes the
  timer, it does not stack.
- **Cleared on leaving the floor, on sleep and on defeat.** The player is never carried
  into the farm with one.
- **Food and tonics.** Life Elixir clears all bad effects (note 88). A snow-warm dish
  could clear chilled, later.
- **Creatures.** Each creature row gets an optional `inflicts` field with the effect and
  a chance (placeholder 100 percent for slime and frost hits, 50 percent for ember hits).
  Immunity rolls against that.
- **Stardew has more debuffs** (frozen, nauseated, weakness, darkness and others) from
  memory. The saved pages do not list them, so the full list stays
  unchecked (SC-159) and later bands may add to ours.

## Build list

1. `src/core/effects.ts`: the three effects, a resist roll with Immunity, timers, and
   clearing rules, free of Phaser.
2. `inflicts` on creature rows; `FarmScene` applies and shows an icon and timer.
3. Slime proof ring, Sturdy and Immunity band, boots Immunity wired to the roll.
4. Equipment screen shows Immunity as a percent.
5. Tests: resist cap, refresh, clearing, Sturdy half-duration, slime proof.

## Open

- SC-159: Stardew's Defense formula, the Immunity numbers and the debuff list.
- Names, icons and the exact effect numbers.
