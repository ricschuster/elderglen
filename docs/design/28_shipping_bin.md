# 28 Shipping bin (draft)

Status: draft. Decided with the owner on 2026-10-31, placement, touch and summary on 2026-11-01. The bin is built (2026-11-01): `src/core/shipping.ts`, `BinScene`, `ShippingScene`.
Selling at the shop is built (`src/core/shop.ts`, `src/scenes/ShopScene.ts`).
Reference: the Stardew Valley Wiki Shipping page, read only (ADR 0002).

## Decisions

- **The bin sits beside the shop, not instead of it.** The shop keeps buying
  goods and pays at once. The bin pays when the day ends. Both pay the same
  price for the same item and quality. Nothing is bin-only for now.
- **One bin comes with every farm,** by the house. It is a placed object like
  the other farm objects. Extra bins and a mini bin are later, with the farm
  note.
- **Shipping an item.** Walk up and use the bin. The menu shows the inventory
  grid with the bin beside it, as in Stardew. The player taps or drags a stack
  into the bin. This replaces the earlier plan to reuse the shop sell list.
  A tap or drag moves the whole stack, which is what Stardew does. A single
  item goes through a quantity prompt (see Settled 2026-11-01). Take-back
  covers a mis-tap.
- **Take-back.** Anything shipped today can be taken out again until the player
  sleeps. The bin menu has two tabs, Ship and Shipped today. Tapping a line in
  the second tab takes it back, with Take back 1 and Take back all buttons. This is wider than Stardew, which returns only the last item. It
  removes the mistake of shipping something the hall still needs.
- **Payout.** Money is paid when the day ends, including a pass-out. The
  pass-out money loss (see `07_tuning_numbers.md`) applies to cash carried, not
  to the bin, which is already shipped.
- **Price is fixed on shipping.** The price uses the sell multiplier at the
  moment the item goes in (`sellMultiplier` in `src/core/professions.ts`), so a
  later level-up that day does not change it. The bin stores the money value
  per item, not only the item.
- **Day-end summary.** A screen after sleeping lists what sold and the total.
  This is the reward moment for the bin, so it should be short and clear.
- **No sell warning.** The 2026-10-25 decision stands: the game does not warn
  before shipping something the hall wants.

## Why both routes

The shop trip costs a walk to town and the day's clock. The bin removes that
trip for the daily crop sale, and a slow payout is the price. The shop stays
for the player who needs money now to buy seeds before planting.

## Build notes

- Core: a `ShippingBin` in `src/core/` holding lines of item id, count and
  locked unit price. Methods: ship, takeBack, total, and settle (pay and clear).
  Free of Phaser, unit tested.
- Save: the bin contents are saved, so a save between shipping and sleeping
  keeps them.
- The day-end flow calls settle before the summary and before the morning
  save.
- Shipped counts per item feed a later collection page (not designed here).

## Settled 2026-10-31 (open items)

- **Collection page and achievements: M3.** The bin already saves shipped
  counts per item, so the page can read them when it is built.
- **No bin-only or shop-only items.** Every item can go either route.
- **Mini bin and extra bins: M5, optional.** They go with the farm note.

## Settled 2026-11-01 (placement, touch, summary)

- **Placement: beside the house door (Stardew).** The bin stands just outside
  the house on the farm map, close to the door and the bed, so shipping is the
  last chore of the day. Stardew's exact spot is from memory, not checked on a
  saved page. The `bin` object class and its tile go in the map contract
  (`05_farm_map_placeholder.md`) and the committed map JSON.
- **Touch: tap ships a stack, with a quantity prompt for singles (Stardew).**
  Tapping a stack moves all of it. The prompt (a small number picker with
  plus, minus, All and Ship) opens for a single or a part. This replaces the
  hold-moves-one idea above. The bin is not an axe target, so holding Use on
  its tile does nothing and there is no clash with hold to chop. Stardew's
  mobile quantity control is not checked on a saved page. Settle the prompt's
  feel on the real tablet (#59, #63).
- **Summary: a separate screen before the report (Stardew).** After the player
  sleeps and settle runs, a shipping screen lists each item sold with its count
  and money, then the total. A button moves on to the existing morning report.
  It is skipped when the bin was empty. Stardew's layout is not checked, so the
  rows are ours.

## Built differently from the note

- The Ship screen is two lists (backpack and shipped today), as the shop is,
  not an inventory grid with the bin beside it. The grid waits for the art
  pass (#58). Tapping a row ships the whole stack, as the note says.
- The Shipped today list takes back a whole line (Take all) or one (Take 1).

No open items.
