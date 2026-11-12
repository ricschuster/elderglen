# 96 Tailoring

Status: design settled with the owner's answers of 2026-11-12. Numbers are placeholders.
Nothing here is built. Parts of Stardew's behaviour are from memory (SC-161 to SC-163).

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
- **Boots.** Feed 1 cloth, spool a pair of boots, and a second pair is the feed donor
  (look from one, stats from the other), per note 37. Placeholder cost 1 cloth.
- **Dye.** Six pots (red, orange, yellow, green, blue, purple), one item each, all six
  used up, then hue, saturation and value sliders colour the worn piece. Items and their
  pot colour follow `src/content/dyes.json`, which grows from 31 rows to cover flowers,
  forage, gems, fish and dishes. Processed goods take their ingredient's colour. Quality
  is ignored. Needs the piece worn, as in Stardew.
- **The farm dye vat stays.** It is the Dyer's bundle (23) reward and the simple
  single-colour machine; the pots are the full tool in town.
- **Cloth sources.** The loom (built), by wool quality (silver 25, gold 50, per note 24
  tuning). Cloth also comes from the Hat-maker's order board and a few ring 1 chests.
- **No upkeep, no loss.** A worn-out piece does not exist. Dyeing can be redone free.

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
4. Dye pots and sliders screen. Boots tailoring after boots exist as items.
5. Art: placeholder blocks per piece. Real art in M3d.

Gift tastes: cloth stays shared by the animal keeper and hat-maker (note 61).

## Open

- The exact set of dye-pot items and colours (extend `dyes.json`).
- Whether the unlock scene is a heart event or a plain first-cloth line.
- Cloth prices at the Hat-maker's board.
