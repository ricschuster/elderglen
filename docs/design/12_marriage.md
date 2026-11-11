# 12 Marriage (draft)

Status: draft. Written from the design talk of 2026-10-27; the open questions
were settled on 2026-10-29 (see Decided). Nothing here is
built. Marriage is not in the first playable or M3; it follows once the
friendship system (M3) and ring 1's cast exist. Needs this note before any
code (see CLAUDE.md, Scope). Target: after M3, with the ring 1 cast.

## Why

Marriage is a long-term goal in Stardew Valley and a main reason players keep
going. The owner wants it eventually. It also deepens the "few full
relationships" idea: in rings 2 and 3, only a few villagers get the full
treatment, and some of those can be marriage candidates.

## Shape (follows Stardew, in our own content)

1. **Friendship hearts** build as set out in `09_story_and_lore.md`: talk,
   gifts, events. No decay (see Neglect there). The points and gift rules are in
   `61_friendship_and_gifts.md`.
2. **Candidates.** A marked subset of villagers can be courted. Not everyone.
   The rest stay friends at any heart level.
3. **Courtship.** At a set heart level the player can give a courtship gift.
   Our own item, not a copy of Stardew's. Candidates then have extra events
   and a higher heart cap.
4. **Proposal.** A second item and a high heart level. The candidate can accept
   or the player can wait; refusal ends nothing.
5. **Wedding.** A short scene and a day off. The spouse then moves to the farm.
6. **Married life.** A spouse has a daily routine on the farm and a few lines
   per day. They may help in small ways, such as watering a few crops or
   feeding animals. They give a gentle bonus, never a duty (see Rules).

## Rules for this game

- No decay and no anger, as for every villager. A spouse never nags,
  scolds or leaves.
- Divorce is possible, but only the player can start it (decided 2026-10-27).
  The spouse never leaves, however the player plays. The cost and the aftermath
  are open (see Stardew mechanics below). Keep the aftermath gentle: no
  anger, and the ex-spouse stays a friendly villager.
- Optional. Nothing in the bundles, the hall or the ending requires marriage.
- Who can be a candidate is a matter of cast writing, not code. The player
  character's look and the candidates' roles stay open to any pairing the
  writing supports; this should be decided when the cast is written, not here.
- Children: in, by player choice only (see Decided).

## Stardew mechanics as ideas

Ideas to borrow or reject, noted 2026-10-27. Items marked (checked) came from
the Stardew Valley wiki via search; the rest are recalled from memory and need
checking before use.

- Spouse chores (checked): the spouse waters crops in the growing seasons, feeds
  animals and repairs fences. A good fit for a gentle bonus. Decide which jobs
  we want so the farm is not made too easy.
- Spouse perk (checked): a late-heart gift, a Stardrop at 12.5 hearts, a
  rare permanent boost. We could give a rare, one-off item.
- Roommate (checked): a character who shares the house, does not marry or have
  children, and pays a little rent each week. A useful option for characters
  who are not meant as romance, and it could cover friendship without romance.
- Children (checked, thinly): a crib in the house, then the spouse has a child
  after a few days. Children are optional, and we have not decided to include
  them. They add art and writing cost.
- Divorce (partly checked): one source says a fee is paid at an office, another
  claims a friendship loss; neither was confirmed. Our rule is
  player-only, with a gentle aftermath.
- A bouquet starts courtship and a pendant-like item proposes (memory). Both are
  items that gate on hearts. Ours would be our own items and names.
- A wedding happens a few days after the proposal, with a short scene (memory).
- Spouse room or corner in the house, with daily lines and events by heart
  level (memory).
- House size gates having children, through upgrades (memory). Ties to house
  upgrades in `10_customisation.md`.

Anything we copy must be our own expression: items, names, text and art, per
ADR 0002.

## Fit with the lore

- The Brimmers keep favour ledgers and wear hats that show standing. A wedding
  could be a ledger event: two ledgers joined, with hats given. This ties
  marriage to the hat customs (see `10_customisation.md`).
- A marriage candidate in a distant ring (say a road-folk, dwarf or elf) can
  ask the player to complete a task in their home ring, which gives a reason to
  explore.
- A wedding is a good festival-sized event and gives a reason for clothes.

## Data and build

- A marriage-candidate flag and a heart cap per villager (a villager row, not a
  new system).
- A save field for spouse and wedding state, in the save version bump when
  friendship ships.
- A spouse as a non-player character on the farm map needs a routine, a bed
  and a home placement in the house.
- Sprites for each candidate: wedding clothes, home animations.

## Suggested slices

1. Marriage flag and heart cap in villager data, built with friendship (M3).
2. One candidate's courtship, proposal and wedding, end to end, to prove the
   loop.
3. Spouse routine and small helping jobs.
4. More candidates, as the cast is written.

## Decided (2026-10-29)

Settled with the owner, closing issue #137.

- **Candidates in ring 1: 14** (9 women, 5 men), as listed in
  `20_ring1_cast.md`. Any player character can court any candidate, whatever
  the player's gender. Writing load is held by doing layer 1 for everyone before
  layer 3 for anyone (`18_dialogue.md`).
- **Pairing limits: none, and one spouse at a time.** Relatives and friends of a
  candidate (the hat-maker and their sibling, say) stay courtable.
- **Courtship gift: flowers.** A bouquet, made from our own flowers. The
  traditional gesture, kept simple.
- **Proposal item: a ring-like token that is not worn.** Our own object, not
  wearable, so the item set has no clothing in it. Its form and name are open
  until the item notes (a placeholder is "promise token"). The wedding as a
  joining of ledgers (see Fit with the lore) is kept as flavour, not as an item.
- **Spouse chores: small helps only.** The spouse feeds animals and waters a few
  crops near the house. The cap keeps the farm from becoming too easy. No
  repairs, no full watering.
- **Divorce: player-only, a small gold fee, friendship stays.** A short ledger
  scene. The ex-spouse stays a friendly villager at their old heart level, with
  no anger and no loss.
- **Roommate option: not in.** Left out to hold scope.
- **Children: in, by player choice.** Offered only once a house upgrade adds a
  spare room (`10_customisation.md`). Never automatic and never pressed. Costs
  a crib, child sprites and writing, which go in the art and writing plans.
- **The spouse lives on the farm and keeps their village job** (changed
  2026-11-11, note 84). The spouse never travels to other rings and
  there is no second home. Candidates in rings 2 and 3 can still exist; their
  counts are set in those ring notes.
- **Wedding look: left to the art pass** (#58). It is a ledger-joining scene
  with a day off.

## Open

- Candidate counts for rings 2 and 3, set in those ring notes.
- The proposal item's form and name, and the flower types, set in the item
  notes.
- The fee amount for divorce, and the size of the spouse's helps (placeholder
  numbers in `07_tuning_numbers.md` when built).
- What the child does day to day. The nursery is house tier 2 (`41_house.md`) and comes
  furnished with a crib and two child beds (note 85, Stardew checked). Ours has no
  "remove crib" choice, since the offer is never pressed.
- The look of the wedding scene and festival (art pass, #58).
