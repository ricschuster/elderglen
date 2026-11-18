# 105. Midwinter Feast gift exchange

Drafted 2026-11-18 (#876); the owner answered the three open points the same day (see "Decided"). The main event of the Midwinter Feast (note 14). Note 61 ("Midwinter
pairing") settled the letter and the x5 gift; note 82 drew the seats. This note joins them and
closes the gaps. Built 2026-11-18 (see "Built status"); not yet played. Stardew claims are from the saved Feast of the Winter Star
page (read 2026-11-18) unless marked.

## Settled before (not reopened)

- Winter 18: the hall steward's letter names the player's recipient. Random among people met, never a
  child below the standard tier, the steward if fewer than three are met (note 61).
- The player's gift is worth x5 the normal points (Stardew, saved page).
- The giver stays secret until the player has given (Stardew, saved page).
- All 25 attendees sit at fixed seats; a lit lantern hangs over the recipient's seat (note 82).

## Rules

1. **Who can be named.** The pool is people the player has met who attend the feast: the 22 town
   residents, Aldreth, Korvi, Marl and Maren. Rosmarin and Rundahl never come, so they are never named.
   A spouse can be named (the x5 is halved for a spouse, as every gift is, note 61).
2. **When it is drawn.** On the evening of Winter 17, so the letter arrives on the morning of the 18th
   (mail rule, note 51). The draw is stored as the world flag `feast-recipient:<year>:<id>`, so a reload
   never changes it. The letter text needs a name slot (`{recipient}`), a small change to `letters.json`.
3. **The window.** The exchange is open from 12:00 (opening) to 18:00 (closing), as the counter is.
   Time runs normally in the place, so a player can walk home for a gift and come back before closing.
4. **Giving.** Talk to the recipient at their seat and choose "Give the feast gift". It uses the normal
   gift panel and taste and quality rules (`Friendship.gift`), with three changes: the points are x5;
   it does not count against the one-a-day or two-a-week limits and is not blocked by an earlier gift
   that day; a birthday on Winter 25 does not stack (x5, not x40). The recipient's reply is the festival
   reaction line (voice sheets). Once a year, kept as `feast-given:<year>`.
5. **The reveal.** Right after the gift, the secret giver is drawn and steps forward in a message: their
   name, a line, and the present. The giver is a different person from the recipient, met, attending.
   Cuthbert does not hand it over (this replaces the line in note 82 where the host does). The draw is
   seeded by year and save so it is stable, and is stored as `feast-giver:<year>:<id>`.
6. **The present.** Taste based (note 61): one item the giver loves or likes that exists as an item, is
   not a quest or keepsake item, and has a sell price at most 300 (placeholder). A child gives one item
   at most 100. The present goes to the pack; if the pack is full it is held in the mailbox letter of the
   next morning (the mail rule for items that do not fit). Quality normal. No friendship change from
   receiving it.
7. **No gift, no penalty.** A player who never gives (away, no item, closing passes) loses nothing:
   no reveal, no present, no letter. The lantern goes out at closing. Next year is a new draw.
8. **The festival does not end after the exchange** (unlike the Seedswap and Frostday, note 82). The
   counter stays open until closing; the player walks home when they like. Stardew's page says the festival
   ends when the player leaves town and does not say the exchange ends it.
9. **Both layouts.** The square and the hall use the same rules and the same seats (note 82), so the
   exchange is one piece of code keyed on the seat table `festival-spots.json` (`midwinter-feast` and
   `midwinter-feast@hall`).
10. **Multiplayer (M4).** Each player has their own recipient and giver, drawn per player. Two players may
    share a recipient. Not designed further here.

## Decided (owner, 2026-11-18)

- **No warning on a hated gift (Stardew).** The panel gives no confirm; the x5 loss applies.
- **The feast gift does not count against the gift limits (ours, recommended).**
- **The secret giver reveals and hands over the present (Stardew).** Cuthbert does not.

## Build outline (when the owner is ready)

- `src/core/feastexchange.ts` (pure, tested): `drawRecipient`, `feastGiftOpen`, `giveFeastGift` (calls a
  `Friendship.gift` variant with a multiplier and no limit check), `drawGiver`, `presentFor`.
- `festivals.json`: an `exchange` block for the Feast (hours, multiplier 5, price caps).
- `letters.json`: the Winter 17 trigger and the name slot. Save: three key shapes in `festivalsJoined`.
- Scene: the lantern over the recipient's seat, the "Give the feast gift" choice, the reveal message.

## Open

- Return gift lines per giver (voice sheets) and the present price caps (placeholders).
- Art: the lantern prop and the lit/unlit state.

## Stardew checks

Add to note 54 only if a decision hinges on it: whether a Stardew gift to the recipient counts against the
weekly limit, and whether the giver can be a child or a past recipient (not on the saved page).

## Built status (2026-11-18)

`src/core/feastexchange.ts` and `src/content/feast-exchange.json`, tests `tests/feastexchange.test.ts`.
`queueFeastLetter` runs in `sleep.ts` before mail is delivered, so the Winter 18 letter (a dynamic
letter, placeholder text) names the recipient. `Friendship.giftFeast` is the x5 gift outside the
limits. In `FarmScene.meetVillager`, holding an item and talking to the recipient on the feast map
runs `feastGive` (gift, reveal, present, or post when the pack is full). Without a held item the
recipient's talk adds a line about the lantern. Draws are kept in `festivalsJoined`
(`feast-recipient`, `feast-given`, `feast-giver`). Not built: the lantern prop and its lit state
(only the text hint), real lines, the multiplayer draws. Not looked at in a browser.
