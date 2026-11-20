# 12 Marriage (draft)

Status: built to shell level (2026-11-14, slices 1 to 6, issues #934 to #939), with placeholder text, numbers and art. Written from the design talk of 2026-10-27; the open questions
were settled on 2026-10-29 and 2026-11-14 (see Decided). Marriage is not in the first playable or M3. Since 2026-11-14 it is in
M3b (owner). Left: the owner's play (nothing in slices 2 to 5 has been seen in a browser by the owner), the still open
questions (kiss energy, heart cap, MAX_CHILDREN), real lines, events and art (M3d), and multiplayer (M4).
The questions of handoff 2026-11-14j were settled on 2026-11-16 (see "Decided 2026-11-16"). This note is the design note CLAUDE.md asks for.

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

## Build slices (M3b, drafted 2026-11-14)

Each slice ends with `npm run check` and is playable. Placeholder art and text until
M3d. Numbers go in `07_tuning_numbers.md`.

1. **Data and state.** Candidate flag and heart cap on the 14 villager rows; save fields
   for courting, engaged, married, spouse id, wedding day, child count; save version bump
   and migration test. Core code in `src/core/`, no Phaser.
2. **Courtship to wedding.** Bouquet at 8 hearts sets courting; the token (5,000g, rainy
   day seller, own item) at 10 hearts; wedding three days later on the festival green
   (note 84), a day off, spouse moves in. Heart events above 8 (note 62) unlock after the
   bouquet. One candidate end to end first, then all 14 as data.
3. **Spouse life.** Spouse room (note 85, shared, per-spouse prop block), daily routine
   and lines (notes 79, 80, 84), chores (4 to 6 tiles, feeding), the daily kiss that restores
   player energy, gentle jealousy line, 12.5 heart one-off item. Unblocks #874.
4. **Divorce.** 50,000g, a ledger scene, cancel before day end, ex-spouse keeps hearts,
   room and chores removed next morning, wedding state cleared.
5. **Children.** Nursery at house tier 2 (note 85), the ask after bed, child as a villager
   with hearts, lines and small actions, no needs.
6. **Docs and checks (built, #939: wiki draft text for the bouquet and token, planned-list entry, overview and valley-map rows, `npm run playtest:marriage`, handoff).** Wiki and Guide rows, overview and valley-map JSON, playtest bot
   covers a wedding, handoff.

Slice 2 is the risk: it touches friendship, items, festival scene, schedules and the
save at once. Keep multiplayer in mind (M4, ADR 0007): spouse state is per farm.

Slice 3 built (#936, `src/core/spouse.ts`, `src/content/spouse.json`, `tests/spouse.test.ts`): the
spouse route built from the person's own (`spousePlan`, `spouseVillager`, read by `villagersOn`) from
the morning after the wedding; the farm places (`farm:house/spouse-bed`, `-kitchen`, `-room`,
`farm:yard`, `farm:corner`) in `villagers.json`; the spouse morning in `sleep()` (feeds hay from the
silo only, waters 4 to 6 crops nearest the door, growing seasons, dry mornings); the daily kiss
(`kiss`, energy once a day, a heart float in the scene, `kissDay` in the marriage save); daily lines
by heart level; the gentle jealousy line; the 12.5 heart elderfruit (note 39 source 3, flag
`elderfruit-spouse`) left at wake-up; a spouse takes a gift every day, with no weekly limit and
halved points (note 61); the `spouse-props` mark and the placeholder prop block drawn in the
spouse room; a journal mark for the wedding day; the heart event cap raised to 14, spouse events
(above 10 hearts) read the spouse route and start only for the married person. Not built: divorce
(slice 4), children (slice 5), the real spouse events and lines (M3d), the ex-spouse not attending.
Wedding put-off for a town square event was built in slice 2 (`weddingBlock`: any festival day).

Slice 4 built (#937, `src/core/divorce.ts`, `src/scenes/LedgerScene.ts`, `tests/divorce.test.ts`): the
ledger is a new service (`ledger`, kind `ledger`) in the hall map. The fee is paid on filing and handed
back on cancel (our choice, Stardew's refund is unchecked). The next morning `sleep()` ends the marriage,
drops the spouse cap, raises `ex-<id>`, and moves the spouse room's furniture and chests into the divorce
chest at (51, 31). An ex can be courted again (see "Decided 2026-11-16"). Children: see slice 5. `weddingGuests` is the guest
list of the wedding scene (see "Decided 2026-11-16").

Slice 5 built (#938, `src/core/children.ts`, `src/content/children.json`, `src/scenes/ChildAskScene.ts`,
`tests/children.test.ts`): children, by player choice only. The ask: `sleep()` sets `childAsk` on the
report when `childAskDue` holds (married, not divorcing, house tier 2 so the nursery exists, a free bed,
no child already on the way, 7 days after the wedding, 7 days after the last ask). The scene
`childask` puts yes or not now before the morning report. "Not now" only waits the gap, so it never
blocks and is never pressed. A yes sets `childDue` 3 days on and `childMorning` (in `sleep()`) brings the
child. A child is `Child` in `marriage.kids` (`child-1`, `child-2`, name, birth day, points, last talk
day); MAX_CHILDREN stays 2, matching the nursery's two beds. The old `children` count still saves and
loads (an old count becomes placeholder children). Stages: baby (days 0 to 13, in the crib all day),
toddler (14 to 41) and child (42 on), by age in days, each a route in data; `childVillager` builds a
villager row so `whereAt` and `villagersOn` place them with no per-child code (nursery, kitchen, bed
spots in the house map, placeholder tiles). Talking (`meet` routes child ids to `talkToChild`) gives a
line by stage and +20 points once a day, up to 10 hearts, from the child's own counter (not the
friendship model, which is keyed by villager rows). No needs, no neglect, no chores. Names and lines
are placeholders; child sprites reuse a villager sprite until M3d.

Divorce and children (our choice, flagged for the owner, notes say nothing): the children stay with the
player on the farm with their hearts, and the marriage's end changes nothing for them. A child still on
the way does not come, and the ask restarts if the player marries again. The ex visits them
weekly (see "Decided 2026-11-16"). A report line says the children stay. Not built: children at
festivals, events, adult children.

## Earlier suggested slices (superseded by the list above)

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
- **Courtship gift: flowers.** A bouquet, bought at the general store (200g, decided 2026-11-16; not
  crafted). The traditional gesture, kept simple.
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

## Decided (2026-11-14, question batch)

- **Milestone: folded into M3b** (owner). Supersedes "after M3" in the status line and
  "Later, not M3" in note 03. Update `03_milestones.md`, ADR 0012's scope and CLAUDE.md
  when it is built. #874 (spouse source) unblocks with it.
- **Courtship: bouquet at 8 hearts, proposal at 10 hearts** (Stardew). No breakup
  mechanic, since there is no decay or anger.
- **Proposal token: 5,000g from a rainy-day seller** (Stardew's pendant structure, our
  own item and seller).
- **Divorce: 50,000g, can be cancelled before the day ends** (Stardew). Friendship stays
  at its old level (our rule, not Stardew's reset to 0).
- **Spouse chores: waters 4 to 6 tiles near the house, feeds animals, no repairs.**
- **Spouse perk: a Stardrop-like one-off at 12.5 hearts** (Stardew). Our own item.
- **Children: lines and small ambient actions, the child can be talked to and has hearts
  that grow.** No needs, no neglect.
- **Exhaustion: the player's, as Stardew (SC-180).** The first kiss of the day restores
  the player's energy. The spouse does not tire and never skips chores. Confirmed with
  the owner 2026-11-14 after the first answer was found to describe a different idea.
- **Jealousy: a gentle comment only**, no penalty. **Messy house: not in** (no answer
  given; treated as out under the no-nag rule).
- **Spouse room:** one shared room for all 14, with a per-spouse prop block (note 85).

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

## Decided 2026-11-16

Settled with the owner after the shell build. Slice 4 and 5 text above is updated to match.

- **Cancel refunds the fee.** Filing the divorce takes the 50,000g, and cancelling before day end hands it
  back (as built). Stardew's refund is unchecked (SC-201).
- **An ex can be dated and married again.** The bouquet works on an ex like on anyone: 8 hearts or more,
  nobody else courted. Accepting it lifts the `ex-<id>` flag, so they are an ordinary courted person again
  and the token and the wedding follow as usual. Heart level: friendship is left as the divorce left it
  (the rule of slice 4, no anger and no reset), so an ex at 8 hearts or more can be courted at once. A
  Stardew-like lowered level was considered and not taken, to keep "no loss" (note 61). Stardew's own rule
  is unchecked (SC-202). Core: `courtGift` in `courtship.ts`.
- **The children stay with the player, and the ex visits.** The most recent ex comes to the farm yard once a
  week, on the last day of the week (Sun), 10:00 to 15:00, on dry days that are not a festival, while the
  farm has at least one child. Built as a route override in `src/core/exvisit.ts` (`exVisitor`,
  `exVisitVillager`, read by `villagerForDay`), so it needs no save field. Talking to the ex is ordinary
  friendship. If the player is courting or married to that same person again, the visit does not apply.
  Stardew's own rule is unchecked (SC-183, SC-203).
- **An ex attends weddings as a guest.** At the player's wedding, every ex bar the person being married is placed
  on the green as a guest (`weddingGuests` in `divorce.ts`, passed to `weddingEvent`). A festival wedding
  scene does not exist yet; when one is built, it reads the same guest list (SC-203).
- **The ledger stays in the hall at (30,5), and the bouquet stays sold at the general store.** The text
  "made from our own flowers" is dropped.

## Two-player wedding and divorce steps (draft, owner answered Q1 to Q4 2026-11-18)

Draft for M4. Built 2026-11-19, placeholder text, scenes untested in a browser: core (`src/core/playermarriage.ts`, `marriageintents.ts`, `marriagecard.ts`, `tests/playermarriage.test.ts`) with the token held while a proposal is open (used up on accept, handed back on decline, withdrawal and expiry), proposals expiring at the day end, calling off an engagement free, the bond book saved in the game state (`playerMarriage`, additive in save version 4, no bump) and carried in the guest snapshot, guests applying the same intents, a shared bed (each partner counts only when they sleep themselves, decided 2026-11-19). Screens: `ProposalScene` (yes or no card), `LedgerScene` (player rows: call off, divorce, cancel), `WeddingScene` (text cutscene), engaged notice in `ReportScene`, all opened from `FarmScene.checkMarriageCards`. Not built: one spouse per villager (needs a per player courtship record), the told divorce line for a guest (the bond is gone from their copy), the vacated cabin visuals. It turns the player marriage rulings of note 53 ("Player marriage, first
rulings") into steps. Stardew facts are from the saved Multiplayer page (read 2026-11-18) or from memory, as marked.
The page says: players marry each other with a craftable Wedding Ring, a married pair get the Stardrop in a purple
giftbox by their home bed, children go in a home both players sleep in, and an NPC can be married by one player only.

### Steps already decided (note 53)

1. **Proposal.** One player offers the token (this note) to the other. The other accepts or declines. A decline costs
   nothing. Needs one new screen: a yes or no card on the receiving player's client.
2. **Engaged.** Both journals carry the wedding mark (`weddingMark`), three days on. Per player data: each record
   gains `partner: playerKey`, kept on the host.
3. **Wedding.** The villager wedding scene with both players as the couple. Other players and villagers are guests.
   Same postponement as a villager wedding (`weddingBlock`: a festival day or rain). The scene runs on every client,
   driven by the host. A guest is not held up: they may walk away and the scene still plays.
4. **Home.** One moves into the other's cabin. The vacated cabin stays. One bed, but each partner must get in it
   themselves for the day end, as in normal multiplayer (note 53, decided 2026-11-19).
5. **After.** No spouse chores and no daily kiss from a partner (only villager spouses do chores). The 12.5 heart
   one-off does not apply; a couple get the one-off item once, by the shared bed, after the wedding (as the page
   describes for Stardew).
6. **Divorce.** Either player files at the ledger and pays the 50,000g fee from their own purse. The other is told next
   morning in the report. Cancel before the day ends refunds. The mover returns to the empty cabin. Friendship is
   unaffected (no loss, as for villagers).
7. **One spouse per villager.** A villager engaged or married to a player cannot be courted by another player. The
   others keep their hearts.

### Decided 2026-11-18 (owner)

- **Q1: the wedding plays after night 3, with no wait for the partner (Stardew, from memory, SC-207).** The absent
  partner sees the scene when they next join. This replaces the recommended "wait for both".
- **Q2: the proposer's cabin is home** (recommended).
- **Q3: the player who files pays the fee** (recommended).
- **Q4: the ledger is in the hall at (30,5)** (recommended). Note 53's "at the carpenter" line is to be fixed.

### Decided 2026-11-19 (owner)

- **Token is used up on accept.** It is refunded on a decline and on expiry, so "a decline costs nothing" (note 53) stands.
  The owner first picked "used up when offered (Stardew)", then chose the refund rule when the clash with note 53 was
  shown. Stardew has no decline case; its Marriage page says the pendant is presented to the villager.
- **An unanswered proposal expires at the end of that day** (recommended). The card goes away and the token returns.
- **Engaged couples can call it off free at the hall ledger** (recommended). The 50,000g divorce fee is for married
  couples only. The token is not refunded when an accepted engagement is called off.

### The questions as asked

**Q1. The wedding notice and the two players' day ends.** When a pair are engaged, the three days run on the host's
calendar. The wedding is on the wake-up of day 3, so it only needs both players connected that morning.

- **(Recommended) Wait for both, up to a morning.** Each player's day end report shows "Wedding tomorrow with X". If
  both are in the game at wake-up the scene plays. If one is missing, it is put off a day, like a festival, and the
  notice repeats. No wedding ever happens without both. Matches the villager rule that a blocked wedding moves on a
  day.
- **Play whenever both are present, any day after day 3.** The wedding scene is a pending event and fires the first
  morning both are connected. A longer wait, but never a lost day.
- **(Stardew) From memory: the wedding plays after the third night, with no wait for the partner.** Not checked
  against a saved page (SC-207). If the partner is away, the scene plays when they next join. Unchecked.

**Q2. Which cabin is home.** Note 53 says one moves into the other's. Who chooses?

- **(Recommended) The proposer's cabin, unless the pair agree on the other at the proposal card.** Quick, no extra
  screen after the wedding.
- **The accepter's cabin.** No reason found for this.
- **(Stardew) Not stated on the saved page** (SC-208). The page says children go in the home both sleep in.

**Q3. Who pays the divorce fee.**

- **(Recommended) The player who files.** Simple, and the other pays nothing.
- **Split evenly.** Fairer, needs both purses to hold half.
- **(Stardew) Not on a saved page** (SC-209).

**Q4. The ledger's place.** Note 53 says "at the carpenter" for a player divorce. This note builds the ledger in the
hall at (30,5). Recommend the hall, as built, so that the same screen serves both; fix the line in note 53.

### Two-player screens needed

Proposal card (accept or decline); engaged notice in the day end report; wedding scene as a driven cutscene on all
clients (the guest view is the same scene, with their controls free); ledger screen showing "your partner is told
tomorrow"; one-line morning report for the divorced partner. Everything else (token, bouquet, hearts, nursery) reuses
the villager screens.

### Build notes

- Reuse `weddingEvent`, `weddingBlock`, `weddingGuests` and `divorce.ts`; the partner is a second `playerKey`, not a
  villager id, so `weddingEvent` needs an optional second couple member for the scene lines.
- Children (note 53): a home both sleep in and fewer than two children; the host offers the ask to one player.
