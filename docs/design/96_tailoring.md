# 96 Tailoring

Status: design settled with the owner's answers of 2026-11-12. Numbers are placeholders.
Built in part (see "Built status"). Parts of Stardew's behaviour are from memory (SC-161 to SC-163, SC-170).

Part of note 10 ("Tailoring" and "Dyes"). Ring 1 only, art waits for M3d.

## Decided 2026-11-12 (owner)

- **Shape (Stardew):** a sewing machine with a feed slot and a spool slot. One cloth in
  the feed, one item in the spool, and the spool item decides which piece comes out.
  The only part checked is the saved Wool page: cloth in the feed with wool in the spool
  makes a Plain Shirt, and wool in the spool of a dyeable piece is a white dye.
- **Place (Stardew-shaped):** the Hat-maker household's house in Hearthwell (note 20),
  with the six dye pots beside the machine (note 24, SC-95). It unlocks by a short scene
  after the player's first cloth. No skill gate: cloth supply is the pacing.
- **Scope (Stardew):** hats, shirts, pants and boots, all tailorable, shirts, pants and
  hats dyeable. Boots follow note 37 (move the stats of one pair onto another).

## How it works

- **Make a piece.** Feed 1 cloth, spool 1 item. A data table `src/content/tailoring.json`
  maps each spool item to one output (hat, shirt or pants), our own rows chosen by look,
  not copied from Stardew. An item with no row is refused with a line saying so. The
  spool item is used up, the cloth too. Output goes to the wardrobe (note 10), not the
  pack, and a second copy is refused.
- **Boots (owner, 2026-11-12).** The stats of one pair move onto another pair and the
  donor pair is used up. No cloth. The saved Footwear page confirms only the stat
  transfer and that the result is named "Custom-tailored [name of shoe/boot]". Which slot
  is which is not on the page: ours is feed = the pair whose look and name are kept,
  spool = the pair whose stats are taken and which is used up (SC-170). The same pair, or
  two pairs with the same stats, are refused. A custom pair keeps its original look and
  can be tailored again. It is a made item (`look@stats` id), not a listed one.
- **Dye.** Six pots (red, orange, yellow, green, blue, purple), one item each, all six
  used up, then hue, saturation and value sliders colour the worn piece. Items and their
  pot colour follow `src/content/dyes.json`, which grows from 31 rows to cover flowers,
  forage, gems, fish and dishes. Processed goods take their ingredient's colour. Quality
  is ignored. Needs the piece worn, as in Stardew.
- **The farm dye vat stays.** It is the Dyer's bundle (23) reward and the simple
  single-colour machine; the pots are the full tool in town.
- **Cloth sources.** The loom (built), by wool quality (silver 25, gold 50, per note 24
  tuning). Cloth also comes from the Hat-maker's order board and a few ring 1 chests.
- **No upkeep, no loss.** A worn-out piece does not exist. Dyeing can be redone, and a redo costs the six pot
  items again, no gold (owner, 2026-11-12: Stardew's pots consume their items).

## Content (ring 1 starting set)

- Hats: the current wardrobe plus 8 tailorable ones tied to the five hat bundle choices
  (note 63) so the Host's bundle (24) can be tailored as well as bought.
- Shirts: 12 base shirts and the Plain Shirt (cloth plus wool).
- Pants: 8 base pants.
- Rows in `tailoring.json`: about 30 spool items for the starting set, tuned in play.
- Clothes have no stats. Hats show standing in the ledger (note 10).

## Build

1. Item kinds `shirt` and `pants` and slots in the wardrobe and save (optional fields).
2. `src/core/tailoring.ts`: pure rules for feed, spool, output and refusal, tested.
3. The sewing machine and pots as interior objects in the Hat-maker house, with the
   unlock scene as data (note 84 events).
4. Dye pots and sliders screen. Boots tailoring (built 2026-11-12, boots now exist as items).
5. Art: placeholder blocks per piece. Real art in M3d.

Gift tastes: cloth stays shared by the animal keeper and hat-maker (note 61).

## Open

- The exact set of dye-pot items and colours (extend `dyes.json`).
- Whether the unlock scene is a heart event or a plain first-cloth line.
- Cloth prices at the Hat-maker's board.

## Built status (2026-11-12)

Built, with `tests/tailoring.test.ts`: `src/core/clothes.ts` (shirt and pants defs, tints),
the wardrobe now holds shirts, pants, the worn one of each and dye tints (all optional in the
save), `src/core/tailoring.ts` (sew, refusal lines, the spool table, dye pots, undye, the
first-cloth unlock), `src/content/tailoring.json` (13 shirts with the Plain Shirt, 8 pants, 29
spool rows over 8 new tailorable hats, shirts and pants, cloth cost 1), the pot items in
`dyes.json` (`potInputs`, `potColours`, `potAlias`: pink, indigo and violet fold into red,
blue and purple), the `sewing-machine` and `dye-pots` services in the Hatter's house, and a
placeholder `TailorScene` (spool list, hue, saturation and value rows) plus shirt and pants
rows in the hat box.

Taken as: the unlock is a plain first-cloth line from Cordelia (not a heart event); a redo
costs the six pot items again and no gold (owner, 2026-11-12); the second spool copy is refused.

Boots can be tailored (2026-11-12, `tailorBoots` in `tailoring.ts`, a made `look@stats`
item in `equipment.ts`, a placeholder boots section on the sewing screen, custom pairs
wearable and saved). Unverified by play. Boots are not floor chest finds yet.

Not built: processed goods taking their ingredient's colour in the pots, the
player sprite wearing shirts and pants (art, M3d), the Hat-maker's order board cloth, the
cloth prices, the hatter map generator (it does not know the two new services, so
regenerating the map drops them). Placeholders: all piece names and colours, the 29 spool
rows, cloth cost 1, the pot item list.
