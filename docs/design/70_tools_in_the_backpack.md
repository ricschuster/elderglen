# 70. Tools in the backpack

Status: design only, not built. Owner decision, 2026-11-08.

## What is built now

The toolbar shows the four tools (hoe, can, axe, pickaxe) as a fixed block,
then 12 backpack slots. Later backpack pages (after the 24 and 36 slot
upgrades) show their 12 slots only; the tool block is on page 1 only. The Hand
tool is gone (see below).

## The decision

Tools become ordinary backpack items, as in Stardew. The backpack is 12, 24 or
36 slots (note 07) and every page is exactly 12 slots. The four tools start in
the first four slots of page 1 and the owner can move them into any slot, and
swap them with items. Stardew does this (checked by the owner's play, 2026-11-08;
add to note 54 if wording matters).

## To design before building

- Where tools live in the save, and how old saves migrate: put the four tools
  in slots 0 to 3.
- Whether a tool can be dropped, sold, stored in a chest or lost. Proposal: no
  to all; a tool cannot leave the backpack, and a swap with a chest is refused.
- The smith keeps a tool for 2 days (note 44): its slot stays held, shown as
  "at the smith", and the tool returns to that slot.
- Moving items: the backpack menu needs a pick up and put down gesture (drag on
  desktop and touch, click and click). It does not exist yet for items either.
- Selection indices, the 1 to 9 keys, Tab and Shift (row) and the touch bar all
  index slots, not tools, once this lands.
- A full backpack: tools take four slots, so a new game starts with 8 free.

## The Hand tool is removed (built, 2026-11-08)

The Hand only picked things up. Now: the Action button shakes trees, picks
forage, harvests and collects from machines (note 47). The axe or pickaxe takes
up an empty chest, a placed machine, or furniture in the house; a chest with
items in it is pushed instead (SC-56). Sprinklers are lifted by any tool.
Stardew has no Hand tool. Picking up machines and chests with the axe or
pickaxe is from memory and not checked against the wiki.
