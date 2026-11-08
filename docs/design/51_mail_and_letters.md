# 51 Mail and letters (draft)

Status: draft. Decided with the owner on 2026-11-02.

Built (2026-11-08): the pure mail core (`src/core/mail.ts`), letters as data
(`src/content/letters.json`), the optional `mail` save field (no version bump),
the farm mailbox at tile (4,6) with its flag, the reader page (`MailScene`, card
plus a list of kept letters, standing in for the journal's Mail section), the
"There is mail." report line, and the hatter's letter. Not built: request gifts
(no request board), friendship, Long Road, fish seed and lost item letters, story
quests, and the journal section (no journal shell yet).
Notes 38, 49 and 50 and the mine and bundle notes lean on letters: achievement
gifts, the hatter's letter, request-count gifts, friendship mail and the Long
Road letter. No note said how a letter arrives or how it is read. This one does.
Stardew's mail is the model. Its details here are from memory and unchecked.

## Decisions

- **A farm mailbox receives the mail (Stardew, decided 2026-11-02).** It stands
  by the farmhouse. A flag shows when a letter is waiting. The player uses it to
  read the oldest waiting letter. This reverses the 2026-10-29 drop of the
  mailbox for mail in general. That drop was about the warden head's reveal, and
  the reveal still needs no mailbox (`09_story_and_lore.md`).
- **A trigger on day N delivers on the morning of day N+1 (Stardew, decided
  2026-11-02).** This is note 38's "the day after". A trigger fired in the
  evening and slept on arrives the very next morning. Delivery is part of the
  overnight step, with the weather and the crop update. Mail also arrives
  on a festival morning (decided 2026-11-02): the flag costs nothing and no
  reward is held up. The saved `Letters` page does not say what Stardew does.
- **Opening a letter gives its attachment at once (Stardew, decided
  2026-11-02).** An attachment is gold, items, a recipe, or a hat unlock. Gold,
  recipes and unlocks apply immediately. Items go to the pack. If the pack is
  full, the letter stays open-pending: the text is read, the item is not taken,
  and the flag stays up until the player makes room and uses the mailbox again.
  In Stardew a full pack opens a make-room menu, and dismissing it forfeits the
  item (saved `Letters` page). We keep the item instead, so nothing is lost
  (decided 2026-11-02, ours).
- **Read letters are kept in the journal (decided 2026-11-02, ours).** The
  journal gets a third section, Mail, newest first (`49_menu_and_journal.md`).
  Stardew rereads letters from its collections tab (added in 1.4, saved
  `Letters` page). Ours sits in the journal (decided 2026-11-02) because a letter with an item still
  to take is live business. It helps a tablet player who missed a recipe or a
  hint. Reopening a letter shows its text
  and marks a taken attachment as taken. It never gives the attachment twice.
- **A letter is sent once.** Each letter has an id. A trigger that fires twice,
  or a save reload, never queues a second copy.
- **Letters are data, the queue is rules.** Text and attachments live in
  `src/content/`. The queue, delivery and take rules live in `src/core/`, free
  of Phaser, with tests. Text follows the voice in `18_dialogue.md`, and has no
  em dashes.
- **No junk mail and no replies.** Every letter has a sender and a reason. The
  player cannot answer a letter.
- **There is no cap on kept letters (decided 2026-11-02).** Letters are short
  text and there will be about a hundred across the game, so the save stays
  small. Stardew keeps no archive, so there is no number to copy.
- **Who carries it is lore only.** The carriers bring it to the Outpost in
  Hearthwell, where the hall steward is postmaster. The warden head's courier is not tied to the mailbox.

## The letter record

| Field | Meaning |
| --- | --- |
| id | Unique name, also the dedupe key |
| sender | A villager, a household, or a group such as the hat-makers |
| title | One line, shown in the journal list |
| body | The text, kept short enough to read on a tablet without scrolling twice |
| trigger | The event that queues it (see below) |
| attachment | None, or gold, items, a recipe id, or a flag such as a hat unlock |
| quest | Optional. Starts a story quest from this letter (`50_request_board_and_quests.md`, source `letter`) |

Saved per letter: the day it is due, then `waiting`, `opened` or `taken`. A
letter with no attachment goes straight to `taken` when opened.

## Letters already promised by other notes

| Letter | Trigger | Attachment | From |
| --- | --- | --- | --- |
| The hatter's letter | First achievement | Hats are on sale | `38_achievements.md`, `10_customisation.md` |
| Achievement gifts | A few achievements, such as the full fish roster | Gold or a keepsake | `38_achievements.md` |
| Request gifts | 10 and 40 finished requests | 500g and 2,500g | `38_achievements.md`, `50_request_board_and_quests.md` |
| Friendship mail | Heart steps, once villagers exist | Recipes or gifts | `24_processing_and_cooking.md` |
| The Long Road letter | The Long Road project | A story item | `16_bundles.md` |
| The fish seed letter | The day after Master Angler | A seed | `39_completion_total.md` |
| Lost item returned | Defeat in the mines | One lost stack | `22_mines.md` |
| Story quest letters | Story beats | A quest, none written yet | `50_request_board_and_quests.md` |

This note adds no letter to that list. The authors of the other notes write
their own text. The mines opening is not a letter: Old Greencoat comes to the
door (`16_bundles.md`).

## The mailbox and the morning

- **The mailbox** is a `mailbox` service marker on the farm map at tile (4,6),
  the free tile beside the house on the opposite side of the path from the bin
  at (8,6). The house door is at (6,5). It is a solid object like the bin, so
  the player uses it from the tile in front. The tile is a placeholder like the
  rest of the farm map (`05_farm_map_placeholder.md`). Using it follows the Action intent
  (`47_action_intent.md`): X, a click, or a tap on it. A tap from far away
  walks to it first (`48_tap_to_move.md`).
- **The flag** is a raised mark on the mailbox while any letter is `waiting` or
  `opened`. Placeholder art is two generated sprites, flag down and flag up,
  swapped when the state changes. The final art comes with the farm art. The morning report adds the line "There is mail." when new mail has
  arrived overnight, in `src/core/report.ts`.
- **Opening** shows the letter as a card with the sender, the text and, if any,
  what comes with it. One tap or press closes it. If more letters wait, using
  the mailbox again opens the next oldest, and the flag stays up until none
  wait (decided 2026-11-02; this is how Stardew does it from memory, unchecked).
  The player is never forced through a whole pile. The clock pauses while a letter is open.

## The journal's Mail section

- The third journal section after Quests and Projects. Each row is the title
  and the sender, with the day received. A dot marks an attachment still to take.
- Opening a row shows the same card. Nothing in the section deletes a letter.
- It starts empty and says so, as the Quests section does.

## Build order

1. The letter record, the queue, next-morning delivery and the take rule in
   `src/core/`, with tests. A save field for the queue. Plan the version bump
   with the first slice that builds this.
2. The mailbox on the farm map, the flag and the letter card.
3. The morning report line.
4. The journal Mail section (needs the journal shell in note 49).
5. The first real letters, with note 38's hatter and request gifts.

## For later

- **Letters that start story quests** with the story and dialogue notes.
- **Friendship mail** with the villagers.
- **A second reading of a letter's recipe or item**, if play shows people lose
  track of them.

## Open

- Nothing is open that blocks a build. One claim stays unchecked: that Stardew
  opens one letter per use of the mailbox (the saved `Letters` page does not
  say).
