# 13 M3 scope

Built 2026-11-07: the hat parade, hats, and the other spring and summer
festivals. Furniture is built (ten pieces, no wallpaper or floors).

Status: accepted 2026-10-27 (issue #130). The roadmap says the M3 scope is
fixed by a design note before building. This is that note. Change it only
with a new dated decision here.

## What M3 is for

M3 is the vertical slice: one full cycle of centre 1 at near-final quality
(`03_milestones.md`). The slice must show the game's feel, not hold every
feature. The first playable already has farming, foraging, the shop, the hall,
save, quality tiers, tool upgrades and more crops. M3 adds what makes the day
feel like a place: a festival, something to decorate, and a reason to look at
the hall bundles twice.

Rule from the scope section of the roadmap: the slice often feels nearly done
but is about 20 percent of the work, so cut early.

The build order in `33_build_order.md` (2026-10-31) now holds this list as part
of slice 1, and slices fish, mines and animals into later slices.

## Candidates and decisions

| Candidate | Issue | Decision | Why |
| --- | --- | --- | --- |
| Bundle format: hint field and furniture rewards | #21 | In. First. | Needed by the slice itself, and the hint and furniture rewards are small data changes. Unblocks customisation. |
| Festival calendar | #131 | In (design only). | Cheap, and the festival system waits on it. |
| Festival system, one festival | #132 | In, cut to one festival (the hat parade). The second is a stretch goal. | Proves the framework. A second festival is mostly content once the first works. |
| Customisation, first slice | #133 | In, cut to hats and five to ten furniture pieces in the house. Wallpaper and floors are a stretch goal. | Hats tie to the lore and to the parade. Furniture gives the bundle rewards a use. Tailoring, dyes and farm decoration stay out. House upgrades moved into the first playable (`41_house.md`). |
| First minigame (festival game) | #134 | In only if the festival system lands with time to spare. Otherwise the parade has a prize counter and no game. | Optional by its own rules (`11_minigames.md`), and nothing depends on it. |
| Neglect and tone rules, villagers | #135 | In, as a rule only. No villager decay and no lose state are already how the game works. | Nothing to build. Record it and keep the tests honest. |
| Neglect rules, animals | #135 | Out of M3. | There are no animals in the game yet. The rule is written (`09_story_and_lore.md`) and applies when animals are built. |
| Ring 1 cast list | #136 | Out. Draft after the scope is settled. | A design task, not a build task. The slice needs only a few named villagers (see below). |
| Marriage | #137 | Out of M3; in M3b since 2026-11-14 (note 12). | Was "later, not M3". |
| Final name | #138 | Out. | Chosen: Elderglen (ADR 0011). The rename in code is separate. |

## The slice, in one paragraph

A player finishes a hall bundle and is rewarded with a piece of furniture. They
place it in the house. On a festival day in the village the player joins the
hat parade, wearing a hat they found or earned. Bundles show a short hint, so
a player who is stuck is not stuck for long. Everything else in the first
playable is unchanged.

## Order of work

1. #21 bundle format: hint field, furniture reward kind.
2. #131 festival calendar: settle the dates for the hat parade (design only).
3. #132 festival system, hat parade only.
4. #133 customisation: hats first, then furniture placement.
5. #134 festival game, if time allows.
6. #135 record the neglect and tone rules in the tests and docs.

Items 3 and 4 can run in either order after item 1. Each is one to a few PRs.

## What this note adds to the save

Saving must store placed furniture and what the player wears. Plan one save
version bump for the first customisation PR, with a migration that gives older
saves an empty house and no hat (`src/core/save.ts`).

## Cuts, if time runs short

Cut in this order: the festival game, wallpaper and floors, the second
festival, the furniture count (down to five), hats in the world sprite (use a
portrait only). Do not cut the bundle hint or the festival system; the slice
needs both.

## Time box

Set a time box when the first item starts and decide at the end whether to
cut, iterate or ship, as the roadmap asks. The first item, #21, is small
enough to act as the check: if it takes much longer than a session, the rest
of this list is too big.

## Decisions (2026-10-27)

- One festival in M3, the hat parade. The second is a stretch goal. No animal
  work in M3.
- Hats show in a portrait only. The world sprite is not changed in M3.
  Superseded 2026-10-31: hats now show in the world sprite, with a portrait
  as the cut (`10_customisation.md`).
- The festival game is a stretch goal, not a promise.
