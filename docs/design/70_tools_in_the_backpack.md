# 70. Tools in the backpack

Status: designed 2026-11-08 with the owner, not built.

## Today

The toolbar shows the four tools (hoe, can, axe, pickaxe) as a fixed block on
page 1, then 12 backpack slots. Later pages show 12 slots only. There is no
Hand tool (note 47). There is no backpack menu: items cannot be moved between
slots yet.

## The decision

Tools become ordinary backpack stacks, as in Stardew. The backpack is 12, 24 or
36 slots (note 07), every page exactly 12, and the hotbar is the page you have
selected. A new game puts the four tools in slots 1 to 4 of page 1 and the
starting seeds after them. The owner can move a tool into any slot and swap it
with an item.

Checked: the saved Tools page says tools are carried in the backpack or stored
in a chest, most cannot be trashed or dropped, and a lost Scythe, Axe, Pickaxe
or Can comes back as a basic one next morning (SC-79). The saved Inventory page:
rows of 12, the hotbar is the selected row, items move in an inventory menu,
Shift and click sends an item from the lower rows to the top row, and opening
the menu pauses the clock.

## Rules

1. **Tools are items.** One stack of 1 each, ids `tool:hoe`, `tool:can`,
   `tool:axe`, `tool:pickaxe`. The tier (copper, steel and so on) stays in
   `toolTiers`, not in the item. A tool stack cannot be sold, shipped, dropped,
   handed in, cooked, or put in the trash.
2. **Chests take tools (Stardew).** Put into any chest, including the camp
   chest and big chests. A tool in a chest cannot be used until taken out. Chest
   loading and the bench's "draw from chests" rules (note 34) skip tool stacks.
3. **Using a tool needs it in the backpack.** The number keys, Tab and the
   wheel select a slot, so selecting an empty slot or an item works as today.
   The 1 to 9 keys select slots of the current page, as in Stardew.
4. **Lost tools.** If a kind of tool is in neither the backpack, a chest nor the
   smith at the start of a day, a basic one (tier 0) is placed in the first free
   backpack slot, or beside the bed if the pack is full, with a one line message.
   Nothing in M2 or M3 can lose a tool, so this is a safety net for bugs and for
   combat in M3b.
5. **The smith (note 44).** Handing a tool over removes its stack from the slot
   and the slot empties. The returned tool goes into the first free slot, or the
   mailbox if none is free. Unchecked: Stardew's exact behaviour here is from
   memory (SC-80). `toolAway` stays the single check that blocks use.
6. **A full backpack.** Tools use four of the slots. A new game starts with 8
   free in 12. Pickups refuse as they do now when no slot is free.

## Moving items: the backpack menu

New screen, opened with a key (E) or the touch bag button, like Stardew's
inventory tab. It shows every page at once as a grid of 12 columns. It pauses
the clock (in singleplayer; the multiplayer rule is for M4).

- Desktop: click a stack to pick it up, click a slot to put it down or swap.
  Shift and click sends a stack from a lower page to the first free slot of page
  1. Right click splits a stack in half; click on the same item combines.
- Touch: tap to pick up, tap a slot to put down. A Split button on a picked up
  stack.
- Dragging out of the menu does nothing, except onto the trash can below.
- The trash can (Stardew starter tool, upgrades return gold) is out of scope here.
  Until it exists, items cannot be thrown away from this menu.

## Saves

`SAVE_VERSION` bumps. On load of an older save the four tools are inserted at
slots 1 to 4 and every item shifts up by four. Items that no longer fit are
dropped (owner, 2026-11-08: Stardew has no equivalent, so not worth a chest). The
game is unreleased. Chests, `toolTiers` and the smith order are unchanged. A
smith order with a tool away keeps working: its stack is not in the backpack,
which is the same state as rule 5.

## Build slices

1. Tools as stacks: item data, `startGame`, `heldAt`, save migration, hud and
   selection read slots only (the `TOOLS` block goes). Tests.
2. Chests and the smith: tool stacks allowed in chests, refused everywhere else;
   handover and return per rules 4 and 5.
3. The backpack menu with move, swap, split, combine and Shift click, desktop
   then touch. Pauses the clock.

Slice 1 is not playable without slice 3 (tools could not be moved), so build 1
and 3 together, then 2.

## Open

- Wording for SC-79 and SC-80 go in note 54 (SC-79 done, SC-80 open).
- Whether the hotbar number keys also reach pages 2 and 3 (Stardew: no).
