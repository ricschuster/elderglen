# 94 Defense, Immunity and bad effects (draft)

Status: **settled with the owner on 2026-11-12; numbers are placeholders.** Design part of
Issue #879. Builds on `37_equipment.md` and `22_mines.md`. Stardew facts are from the saved
Combat page (read 2026-11-12). It settles the open points of note 37: how Defense turns
into damage, what Immunity does, and which bad effects exist.

## What the owner decided

- **Immunity is a chance to resist a bad effect (Stardew).** Not a shorter duration.
  This replaces note 37's "Immunity shortens bad effects". The saved Combat page says
  Immunity "affects the chance to be afflicted with certain debuffs". The saved Immunity
  page gives the numbers (SC-159): see Immunity below.
- **Three bad effects, one per mine band:** slimed, chilled and burned.

## Defense (already built)

Defense is a flat cut from each hit, to a floor of 1 damage, and Assist halves what is
left (rounded up). It is built in `Health.hurt` (`src/core/combat.ts`) and fed by the
boots and the Defense ring (+1 and +5). Stardew says only that Defense "affects how much
damage the player takes" (saved page), and the saved Defense page confirms the flat rule (1 off per point, floor of 1, SC-159). Boots today run
from 0 to 4 Defense against hits of 4 to 12, so a full set trims about a third at the
top and never makes a hit free.

## Immunity

- **A resist roll.** When a creature's hit would inflict a bad effect, roll once. Each
  point of Immunity resists 9.1 percent, added up, with no cap (Stardew, saved Immunity
  page, SC-159; owner chose it 2026-11-12). Eleven points make a player immune. Boots give 0 to 2 points (`boots.json`) and the Sturdy and Immunity
  band adds 4 (note 37), so up to 6 points, about 55 percent, in play.
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

## Built (2026-11-12)

`src/core/effects.ts` (the three effects, `resistChance`, timers, refresh, burn, clearing),
`Combat.effects`, `Health.drain`, optional `inflicts` on creature rows (gloop slimed 100
percent, frostnibbler and icicle hopper chilled 100, cinder pup burned 50), Defense and
Immunity summed over boots and rings, four placeholder rings in `rings.json` (defense +1,
iron defense +5, slime proof, sturdy band with Immunity +4 and half length). `FarmScene`
rolls Immunity on a landed hit, slows walking (slimed), slows swings (chilled), burns 1 a
second, clears on entering a floor, on sleep and on defeat, and a Life Elixir clears all.
The health bar shows "Slimed 5s". The equipment screen shows resist as a percent. Tests:
`tests/effects.test.ts`.

Not built: effect icons (text only), tooltip on the percent, chilled cleared by a dish,
effect sprites or sound.

### Ring sources (built 2026-11-12, owner chose Stardew's pattern, saved Rings and Adventurer's Guild pages)

The trainer at the mine entrance stands in for the Adventurer's Guild (note 22). Shop and
slayer data sit on the ring rows in `rings.json`; rules are in `combat.ts`
(`buyRing`, `ringLocked`, `claimSlayerRing`); the trainer screen lists them.

- **Defense ring (+1):** sold for 1,000g once the player has met the trainer (our stand-in
  for Stardew's "Initiation" quest, saved Rings page: purchased from the Adventurer's
  Guild after completing the "Initiation" Quest, Topaz Ring, sells 1,000g on the page).
- **Iron defense ring (+5):** sold for 5,000g once the deepest mine floor reaches 40
  (end of the Upper Galleries). Owner choice ("after reaching a mine floor gate"). The
  saved Rings page does NOT show this: it lists the +5 Crabshell Ring as the reward for
  eradicating 60 Rock Crabs. Note 22 already gives our Rock Crab goal a crabshell ring,
  so the two defense +5 sources overlap. See Open.
- **Slime proof ring:** the Gloop slayer goal reward (1,000 kills, all colours), handed
  over free the first time, then sold again for 25,000g if lost (saved Rings and Guild
  pages: Slime Charmer Ring, reward for eradicating 1,000 Slimes, and the Guild page shows
  25,000g for it). `slayerClaimed` is saved on the combat save.
- **Sturdy band:** crafted at Combat level 1 from 2 copper bars, 25 moth dust and 25
  gloop jelly (`recipes.json`). Stardew's Sturdy Ring is crafted at Combat level 1 from
  2 Copper Bars, 25 Bug Meat and 25 Slime (saved Rings page, read 2026-11-12; SC-169).
  We have no Bug Meat item, so moth dust (a Dustmoth drop) is the closest stand-in and
  gloop jelly stands for Slime. Note 22's slayer table no longer gives it to the Icicle Hopper.

Choices made without a settled answer (placeholders): burn can defeat the player (owner, 2026-11-12);
the other gloop colours and the lanternmoth and old digger inflict nothing; the
resist roll is skipped on a hit lost to grace.

## Open

- **Bug Meat equivalent:** there is no bug meat item. The Sturdy band uses moth dust.
  Owner to confirm or add a drop (a Mossbeetle drop would be the other candidate).
- **Defense +5 source:** the owner chose a shop after a floor gate, but the saved page
  has the +5 ring as the Rock Crab 60 slayer reward. Keep both, or move the +5 ring to
  the Rock Crab reward and drop the shop (note 22 already plans a crabshell defense ring)?
  The floor gate (40) and prices are placeholders (note 07).
- **Icicle Hopper reward:** note 22 gave it the Sturdy band; it now has no reward.

- SC-159: formula and numbers done. The full debuff list is not on the saved pages.
- Names, icons and the exact effect numbers.
