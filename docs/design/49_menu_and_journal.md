# 49 The in-game menu and the journal (draft)

Status: draft. Decided with the owner on 2026-11-02. Nothing here is built. It is
the "in-game menu and journal" intent that `47_action_intent.md` and
`45_controls_profiles.md` set aside. Several notes already assume a pause menu:
crafting (`34`), the wearing screen (`37`), collections and achievements (`38`)
and the options door (`45`). This note gives them one home.

## Decisions

- **One tabbed menu (Stardew, decided 2026-11-02).** Esc or E opens it. Its tabs
  replace today's one-off screens. Skills, now its own screen on K, moves inside
  it. Stardew's tabs (owner screenshot, SC-06; saved Player Menu page, 1.6):
  Inventory, Skills, Social, Map, Crafting, Animals, Special Items & Powers,
  Collections, Options, Exit. We follow that order (Animals and Special Items
  added 2026-11-14, owner chose both), and there is
  no Wear tab (decided 2026-11-03): the equipment slots and paper doll sit on
  the Pack tab under the backpack, and items are worn from the pack
  (`37_equipment.md`).
- **The journal is a separate window (Stardew, decided 2026-11-02).** It is not
  a menu tab. It has its own key and its own button on the HUD.
- **The journal holds a quest log and a project log (ours, decided
  2026-11-02).** Stardew's journal is a quest log only. Ours also lists the
  village hall projects.
- **The journal key is J, and Eat stays on F (ours, decided 2026-11-02).** F is
  Stardew's Journal key. We keep Eat on F so current players lose nothing, and
  this closes the Eat-on-F question in note 45. Like every desktop key, J can be
  rebound. Esc and E for the menu stay fixed (note 45).
- **Both pause the clock (decided 2026-11-02).** The saved Inventory page says
  the menu pauses the clock in single player. Whether Stardew's journal also
  pauses is not checked. We pause for both, which suits tablets.

## The menu tabs

| Tab | Holds | Built | Note |
| --- | --- | --- | --- |
| Pack | The whole backpack, with the equipment slots and paper doll below it. Move items between slots, split and combine stacks. Wear or take off an item here. The toolbar row is the top row | no | Inventory page, `37` |
| Skills | What `SkillsScene` shows now | screen exists | `SkillsScene` |
| Social | A placeholder page until villager hearts exist (`18_dialogue.md`) | no | Stardew tab |
| Map | A placeholder page until there is a map worth showing | no | Stardew tab |
| Crafting | Known recipes. Crafts from the pack only | no | `34` |
| Animals | Pets, horse and farm animals with friendship hearts and whether each was petted today (Stardew 1.6). Hidden until the player has an animal | no | `23`, `25` |
| Special Items | Special items, book powers and mastery powers collected (Stardew 1.6): name and what it does. Hidden until the first one is held. Ours: keepsakes and keys we already have (Deepmark Key, Homeward Pin and so on) count as special items | no | saved page |
| Collections | Shipped items, finds and the Achievements tab | no | `38` |
| Options | The existing controls screen, as the in-game door | screen exists | `45` |
| Exit | Save the day in progress and return to the title. No confirm | no | `52` (Stardew discards, from memory) |

- **Social and Map are in the tab list as placeholders (decided 2026-11-02).**
  Each shows a short "not yet" page until its system is built. They match
  Stardew's tab list.
- **Exit saves the day in progress, then returns to the title (decided
  2026-11-02, ours; Stardew discards it, from memory).** It writes the resume
  record of note 52, so Continue picks up mid-day and nothing is lost, which is
  why it needs no confirm. Exit Game is for an installed app only and waits for
  the wrapper ADR.
- **K is dropped (Stardew, decided 2026-11-02).** Stardew has no skills key.
  Skills is a tab, reached by Esc or E.
- **The Pack tab's info panel (Stardew, saved Inventory page, 2026-11-14):**
  farm name, current funds, total earnings and the date. Built so far: funds,
  date and farm type. The game has no farm name or lifetime earnings counter
  yet, so those two wait for a name field and a counter in the save. The
  four tools are ordinary stacks in the grid (note 102): they move and swap like
  any item, and can go in chests, but are never trashed, sold, shipped or dropped.
  There is no fixed tool strip. Built 2026-11-16.
- **The Skills tab (Stardew 1.6) also shows:** the title from total skill levels,
  the farmhouse upgrade level, the deepest mine floor and the stardrop-like
  finds, when each exists. Professions show on hover or long press. Added as
  those systems allow.
- **The Social tab gets a gift log (note 61):** pick a villager to see the gift
  tastes learned so far.
- **Tab order of the first build (2026-11-14):** Pack, Skills, Social, Map,
  Crafting, Animals, Special Items, Collections, Options, Exit. Social, Map,
  Animals and Special Items show a short "not yet" page for now, so the strip
  already has its final shape. The "hidden, not greyed" rule below applies to
  Animals and Special Items once their pages are real.
- **Opening (Stardew):** Esc or E on desktop, a menu button on touch. Stardew's
  mobile page shows a three-line menu icon.
- Any other tab with nothing to show yet is hidden, not greyed. The first build
  needs Pack, Skills, Options and Exit, plus the two placeholders.
- **Touch:** tabs are tapped. Stacks move by tap a stack, tap a slot. No drag is
  needed (`27_touch_controls.md`).

## The journal

Three sections, switched with Left and Right or a tap.

- **Quests.** Each open request by title. Expand one to read it and see its
  progress under it. The sources are the daily request board and any story
  letters (`50_request_board_and_quests.md`). Stardew also has a cancel button on a quest. We have no quests
  built yet, so this section starts empty and says so.
- **Projects.** Each village hall project with the goods it still needs and the
  ones already handed in. This reads the same data as the hall screen
  (`40_hall_layout.md`) and never changes it.
- **Mail.** Read letters, newest first, with any attachment marked taken or
  waiting (`51_mail_and_letters.md`). It starts empty and says so.
- **Reread conversations** (`18_dialogue.md`) wait for the dialogue system.
  They would be a third section, not built now.

## Build order

1. A menu shell scene: tab strip, close on Esc or E, clock pause, and the Skills
   and Options tabs moved in. Options gets its in-game door here.
2. The Exit tab, as note 52 settles it.
3. The Pack tab. It needs the stack move, split, sort and trash rules in
   `src/core/`, with tests, before the scene.
4. The journal shell with the Projects section, reading hall data.
5. The Quests section, when the request board exists.
6. Crafting and Collections tabs, and the equipment slots on the Pack tab, arrive with their own systems.
7. HUD buttons for the menu and the journal, for touch. The touch layout is in
   `27_touch_controls.md`.

## Also decided (2026-11-02)

- **The wheel scrolls the open list (ours).** While the menu or journal is open,
  the mouse wheel scrolls Pack rows, recipes, collections or journal entries. It
  never changes the held slot behind the menu. The saved pages do not say what
  Stardew's wheel does in a menu, so this is unchecked against Stardew.
- **The Pack tab has three extras (Stardew's inventory menu).**
  - A trash can destroys what is dropped on it. Tools are never trashed (note 102). On
    touch, tap a stack and then the can, with a confirm for anything of value.
  - An Auto-Sort button sorts the pack into game order, tools first.
  - A bundle icon opens the journal on its Projects section. It is only a
    shortcut, since the journal already holds that data.
- **Page Up and Page Down switch tabs on the keyboard (ours).** E closes the
  menu, so it cannot switch tabs. Tabs stay clickable and tappable. The saved
  pages give Stardew's controller shoulder buttons only, so the PC keyboard way
  there is unchecked. These two keys are fixed with the other menu keys
  (note 45).

## Built status

- 2026-11-14: a Guide tab after Collect (note 101).

- 2026-11-14: `MenuScene` (tab strip, Esc or E, Page Up and Page Down), Pack tab
  (`PackScene`; move, split, sort and trash rules in `src/core/packmenu.ts`),
  Skills, Crafting, Collections and Options hosted as tabs, Exit tab (asks
  twice, since the resume record of note 52 is not built), placeholder pages for
  Social, Map, Animals and Special Items. K and R open the menu on Skills and
  Crafting, and the HUD Skills button is now Menu.
- 2026-11-14 (later): equipment on the Pack tab (two ring slots and the boots
  under the backpack; select a stack and press Wear, tap a worn slot to take it
  off; rules `wearFromPack` and `takeOff` in `src/core/packmenu.ts`). Social tab
  (everyone met, hearts, talked and gift today, tap a person for the gift log),
  Animals tab (horse and farm animals, hearts out of 5, petted today), Special
  Items tab (Homeward pin, Deepmark key, Furniture Catalogue); rules in
  `src/core/menupages.ts`. Animals and Special Items are hidden until they have
  something. Skills tab shows farmhouse upgrade, deepest mine floor and
  elderfruit eaten. The journal (`JournalScene`, `src/core/journal.ts`): J
  (rebindable) and a HUD button, Quests, Projects and Mail sections, Left and
  Right to switch, Up and Down or the wheel to scroll, and a Projects shortcut
  button on the Pack tab. Exit saves (note 52).
- Left: the trash can as a drop target, Pack farm name and total earnings (no
  field in the save), the paper doll (no art), the Skills title from total
  levels (the title names are not settled), the "stardrop-like finds" beyond
  elderfruit, profession details on hover, Quests expand and cancel, reread
  conversations (waits for dialogue), the Special Items book and mastery powers
  (the systems do not exist). The Special Items page does not search chests.

## Open

- None left in this note. The trash can's confirm rule (which items count as
  valuable) waits for the Pack tab build.
