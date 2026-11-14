# 101 The in-game Guide (draft)

Status: **settled with the owner 2026-11-14** (option 1 of three, people and pause answered). First
slice built 2026-11-14, see "Built status". It adds one tab to the menu of note 49 and shares its data with
the wiki of note 100.

## Why

The owner asked whether the wiki could live in the game. A player who wonders "when does this fish
bite" or "what does Cordelia like" should not have to leave the game. The wiki cannot be embedded
as it is. It is 6 MB of HTML with search, it lists secrets, and a webview is awkward on tablets
and in the standalone desktop build. So the game gets its own small reference that reads the same data.

## Decisions

1. **A Guide tab in the menu (ours, owner chose 2026-11-14).** It sits after Collect and before
   Options. Stardew has no in-game encyclopedia (from memory, SC-177 below), so this is ours. The
   public wiki stays as the outside-the-game reference.
2. **Discovery gated (ours).** An entry shows only what the player has found. A thing never met is
   absent, so the Guide cannot spoil it. The public wiki lists everything and is outside the game.
3. **Three states per entry (ours).**
   - Hidden: not listed.
   - Seen: listed with its name and picture, and the facts the player has seen for themselves.
   - Known: the full card, once the player has done the thing (caught it, grown it, cooked it, met
     them).
4. **Built from the same data (ours).** A card is made by `src/core/guide.ts` from `src/content/*.json`,
   free of Phaser and unit tested. It never holds facts of its own. The wiki generator and the
   Guide share the field logic where practical, so the two cannot disagree.
5. **Prose is reused, but only cleared text.** The one-line blurbs in `docs/wiki-text/` are the
   entry text. Text still flagged draft is not shown in game. The text files must move or be copied
   to somewhere `src/` can import, since the game cannot read `docs/`. Settled in the build: a build
   step copies the cleared text into `src/content/guide-text/`.
6. **The layout is the menu's list and detail pattern.** A category row on the left, the entries of
   that category below it, the card on the right. Touch is a tap on a row. Page Up and Page Down
   still switch tabs, and Up and Down move the list. It reuses `Menu` and `frame()` from `panel.ts`.
7. **No search in the first build.** Categories and an alphabetical list are enough at this size.
   Add it if the lists grow past a screen of scrolling.

## What each category shows

| Category | Seen when | Known when | Card fields |
| --- | --- | --- | --- |
| Crops | the seed is held | one is harvested | seasons, days to grow, regrow, sell price |
| Fish | caught once or seen in a pond | caught | where, season, time, weather, sell price, bundles |
| Forage | picked up once | picked up | seasons, places, uses |
| Items | held once | held | what it is, sell price, where it comes from |
| Recipes | the recipe is known | cooked or crafted once | ingredients, what it gives |
| Bundles | the room is open | the bundle is open | what it asks for, which items are done |
| People | met | met (decided 2026-11-14); each fact is learned separately, see "People" | birthday, likes, dislikes, shop hours |
| Places | visited | visited | what is there, who is there |

Secrets (the secret woods, the last seat, the rare finds) stay hidden until found. They never
appear greyed with a goal. This differs from Collections (note 38), which does grey out some
goals.

## People: facts are learned one at a time (ours, owner 2026-11-14)

A person is listed once met. Their card then fills in as the player learns, and nothing is shown
ahead of that:

- On meeting: name, picture, where they live.
- Birthday: learned on meeting or when seen on the calendar.
- A gift taste: learned when that item is given and the reaction seen. An untried item stays out.
  The Guide never lists a whole gift table.
- Shop hours: learned on the first visit during them.
- Heart events: only those already seen.

The save keeps a small learned-facts list per person. Whether Stardew works this way is SC-178.

## What it needs from the save

The Collections tab already records what was caught, shipped and cooked. The Guide needs the same
facts plus a few more: items ever held, places visited, people met. Where the save has none of
these, add one small `seen` record per category. Nothing here changes game rules. This is the one
piece of build work that touches `src/core/save.ts`, and old saves must load with it empty and
fill as the player plays.

## Build order

1. `src/core/guide.ts`, the seen and known rules and the card builder, with tests. Save fields.
2. The tab shell with Crops and Fish, to prove the pattern.
3. Forage, Items, Recipes.
4. Bundles and Places.
5. People, after the voice sheets (M3d), since the cards want real prose.

## Open

- **Tab count.** Eleven tabs on the strip is tight on a tablet. If it does not fit, Guide could be
  a second page inside the Collect tab instead. Decide when the shell is on a tablet.
- Decided 2026-11-14: a person is known once met, and the Guide pauses the clock like the rest of the
  menu (note 49).
- **Fish per fact.** Whether fish also reveal where and when one fact at a time, or all at the first
  catch. Proposed: all at the first catch.

## Stardew check

SC-177 in `54_stardew_checks.md` (open): Stardew has no in-game encyclopedia beyond the Collections
tab. SC-178 (open): Stardew shows a gift taste only after the gift. Both from memory, unchecked.

## Built status

Built 2026-11-14: the Guide tab (`GuideScene`, after Collect on the strip), the rules and card builder in
`src/core/guide.ts` (`tests/guide.test.ts`), the `guide` save field (items ever held, noted when the game
saves and when the tab opens, absent in old saves), and `npm run guide:text`, which copies the cleared
wiki blurbs to `src/content/guide-text.json` (`guide:text:check` is in `npm run check`).

Categories built: Crops (seen with the seed, known with the produce or a shipment), Fish (known when
caught), Forage and Items (known once held), People (met; birthday and role at once, gift tastes only
from the gift log, no shop hours yet).

Left, in the order above: Recipes, Bundles and Places. Shop hours on a person's card need a visit record.
Seen fish (in a pond), heart events seen on a card, a search box, the tab count check on a tablet, and
cards with pictures. Items are noted from the backpack only, so something that was only ever in a
chest or the bin stays hidden until held.
