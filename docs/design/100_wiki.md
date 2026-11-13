# 100 In-house wiki (draft)

Status: **draft 2026-11-13** (issue #910). Owner answers: the audience is public later, fish and
bundles come first, and it sits beside `docs/overview.html` rather than replacing it. Nothing is
built. This note settles what a page is, where its facts come from and how it is kept true, so
the first build (fish and bundles) does not need to be redone for the other categories.

## Why

`overview.json` is hand-kept and has been behind since 2026-11-11. The owner cannot see at a
glance what exists, where it lives and how far it is built. The Stardew wiki is the model for the
shape (one page per thing, an infobox, category tables, cross-links). Only the shape is borrowed.
Every word and picture is ours (ADR 0002).

## What it is not

- Not a replacement for `overview.html`. That stays the map of design areas and issues. The wiki
  answers "what is this thing and is it in the game". The two link to each other.
- Not hand-written pages. Anything a data file already says is generated, so it cannot drift.
- Not hosted yet. It is a folder of static files opened from disk, like the overview.
- Not a spoiler policy decision. See open question 2.

## Decisions

1. **Generated static site.** A script reads the game's data and writes plain HTML, the same
   pattern as `scripts/overview/build.mjs`: `npm run wiki` writes, `npm run wiki:check` fails if
   the output is stale or a link is dangling, and `wiki:check` joins `npm run check`.
2. **Output in `docs/wiki/`**, committed, like `overview.html`, so the owner can open it from
   disk with no build. Files are `index.html`, one `fish/<id>.html` per fish, one
   `bundles/<id>.html` per bundle, one `rooms/<id>.html` per hall room, and the category tables
   `fish/index.html` and `bundles/index.html`. One shared `wiki.css` and one `search.js`.
3. **Two views of one build, one flag.** The public view shows only what a player could know. The
   internal view adds the build status and the design note links the owner wants. Both come from
   the same generator (`--internal`). Public output is what is committed under `docs/wiki/`;
   internal output goes to `docs/wiki-internal/`, which is git-ignored, because the owner's
   status badges mention unbuilt work. See "Status" below.
4. **Read the data, not the code.** The generator reads `src/content/*.json` directly. It must
   not import Phaser or the TypeScript game code. Item names and ids come from the same JSON.
   Where the JSON is not enough (the display name of a non-fish item in a bundle, a recipe's
   output), the generator needs a data-only item table. See open question 4.
5. **Prose is separate from facts.** Hand-written text lives in `docs/wiki-text/<category>.json`,
   keyed by id (one short description per page, optional "tips"). The generator never edits it.
   A page with no prose still builds from facts alone. `wiki:check` lists pages with none, as
   information, not as a failure.
6. **Our own voice and art.** No Stardew names, text or art. Item pictures come from the game's
   own code-drawn art once the generator can render it (see open question 5); until then a plain
   labelled box stands in.

## Page types (first build)

### Fish page

Source: `fish.json` (one row per fish) joined with `pond.json`, `bundles.json`, `recipes.json`,
`requests.json`, `orders.json`, `shops.json` and the legends and shellfish sections of
`fish.json` where present.

Infobox, in this order, each line only if the data has it:

| Field | Source |
| --- | --- |
| Name, picture | `name`, art |
| Where | `water` (river, forest lake, mountain lake, delta, sea, lake cove, pond, ice) |
| Season | `seasons`; "Any" when all four |
| Time | `time` (dawn, day, dusk, night, any) |
| Weather | `weather`, if set |
| Rarity | `rarity` |
| Difficulty and behaviour | `difficulty`, `behaviour` |
| Size | `length` range |
| Sells for | `sellPrice`, then quality prices as the rules compute them |
| Needs | the rod or bait rule, if any |

Body sections, each only if it applies: **Used in** (bundles it can fill, recipes, orders and
requests that ask for it), **In a pond** (the species row from `pond.json`: what it produces, the
quest reward), **Notes** (the hand-written prose).

### Bundle page

Source: `bundles.json` and `rooms.json`.

Infobox: name, room, how many items are needed (`required`, or "all"), the reward (item and
count), and the hint text. Body: a table of the accepted items, each linked to its fish or item
page, with a count column where an item needs more than one. A bundle that accepts "any of"
a group lists the group.

### Room page

Source: `rooms.json`. Name, what opens it (`opensAfter`, shown as a plain sentence), what the
room unlocks when finished, and the list of its bundles.

### Category tables

`fish/index.html` is a sortable table of all fish (name, water, season, time, rarity, price) with
filter chips for water and season. `bundles/index.html` groups bundles under their room. Both
are plain tables that work without script, with sorting as an addition.

### Front page

Category tiles, the search box, a link to the overview, and (internal view only) the counts of
built, decided and placeholder pages.

## Search and navigation

`search.js` loads one generated `search-index.json` (name, category, path, a few keywords) and
filters as the player types. No library. Without script the category tables still work. Every
id mentioned on a page is a link; `wiki:check` fails on a link to a page that does not exist.

## Status

The owner's main ask is to see where things are at, but the audience is public later. So status
is an internal view, not part of the public pages.

- **Internal view only:** a badge per page, `Built`, `Decided, not built` or `Placeholder`, and
  a link to the design note and issue.
- **How it is set:** a fish or bundle that exists in the JSON is `Built`. A `numbers are
  placeholders` marker is read from a `status` field the data may carry (new, optional, default
  `built`), not guessed from prose. Things that are only in a note ("decided, not built") appear
  as stub pages from `docs/wiki-text/<category>.json` with `"status": "decided"`, so the
  internal view can show what is coming. Stubs never appear in the public view.
- **Public view:** shows no badge and no stubs. A player sees only what is in the game. Prices
  and rules are the game's current numbers, so the public site must be rebuilt from a release
  tag, not from `main`, when it is hosted (later; not in this note).

## Keeping it true

`wiki:check` fails when:

- the committed output differs from a fresh build (stale);
- a link, bundle item, pond species or recipe input names an id that does not exist;
- a fish in `fish.json` has no page, or a page has no source row;
- the public output contains the words "placeholder", "decided", "TODO" or an issue number
  (a guard for the public audience).

The generator is pure: same data in, same bytes out. Prettier formats the output, as in the
overview, so the diff is readable.

## Build order

1. This note, then an ADR only if the tool choice needs one (it does not: no new dependency).
2. `scripts/wiki/build.mjs` with the fish category end to end: page template, infobox, table,
   `wiki:check`, the CSS, the search index. Gate added to `npm run check`.
3. Bundles and rooms on the same template.
4. Owner looks at fish and bundles and the internal view; fix the template before more
   categories.
5. Later categories in the order the owner picks (crops, forage, people, recipes, places).
6. Hosting (GitHub Pages from a tagged release) and the public text pass, after M3d art.

## Open questions

1. **Public wording of "where".** The game has hidden or late places (lake cove, the legend
   conditions). Should the public pages show them from the start, or only after the player has
   reached them? Recommended: show everything, since the wiki is not in the game. Stardew
   wiki: shows everything on the page, spoilers included (from memory, not checked).
2. **Spoilers in the owner's internal view versus public.** Same question for legends and heart
   event rewards. Recommended: public pages list legend conditions, the way a player wiki would;
   revisit if the owner would rather keep them secret. Stardew: its wiki lists them.
3. **Item pages.** A bundle holds non-fish items (wood, stone, forage, crops). First build links
   them to a plain item stub with a name and sell price. Recommended: yes, a stub. Stardew: every
   item has a page.
4. **A data-only item table.** Item names live in `src/core/items.ts` today. Recommended:
   extract a JSON item table the game and the wiki both read (a small refactor, its own PR,
   before step 2). The alternative is to parse `items.ts`, which is fragile.
5. **Pictures.** Item art is drawn in code at runtime. Recommended: a one-off script renders each
   item to a PNG into `docs/wiki/img/` during the build, once the art pass (note 99) settles;
   labelled boxes until then.
6. **Public text.** Who writes the prose, and when. Recommended: after M3d, from the voice
   sheets, so the wiki does not carry placeholder text out to the public.
7. **Licence and credit line** on the public site (original art and text, MIT or other). Settle
   with the ADR on generated-art licences (M3d, step 13 to 16 of the layout track).

## Relation to other notes

- Fish data and roster: note 21. Ponds: note 93. Bundles: notes 16, 35 and 63.
- Overview and valley map: `docs/overview.json`, `docs/valley-map.json`.
- Style: note 99 for the look of the pictures. The wiki's own page style follows the game's
  palette but is plain, readable and works on a tablet.
