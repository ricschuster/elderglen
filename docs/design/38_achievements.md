# 38 Achievements and hats

Built in part 2026-11-07 (session e): the first 13 goals the game could measure (19 are in
`achievements.json` now)
(money from sales, different recipes crafted, shipping, a skill at level 10, house
tiers), checked at day end and on load, each putting one hat on sale at the hatter
(`src/core/achievements.ts`, `src/content/achievements.json`). The hatter is a
counter on the achievements screen, reached from the Hats screen, until the valley
has a shop for her. Hat prices marked "set later" are a 3,000g placeholder. Not
built: the hatter's letter (the mail core exists and `letters.json` has an
achievement trigger; check the letter is wired before relying on this line), mail gifts, First Rosette (the Rosette Hat also has a token
counter), Nothing Left (no shipped item collection), All Trades and every goal
that waits for a later slice. The money goals count all gold received, as Stardew (owner, 2026-11-07, SC-61): sales and bundle rewards, built in parity pass 521. A wider
collections page is still to build.

Status: decided 2026-10-31 for the list and the hat rewards. The open items
were settled the same day (see "Settled open items"). The completion total (the
Perfection-style part of #196) is in `39_completion_total.md`.

Part of #196. It unblocks the first hat list in `10_customisation.md`, the
hatter's shop in `20_ring1_cast.md`, and bundle 24's festival hats.

## Decisions

Each had a Stardew option, checked against the saved Achievements and Hats
pages. All four followed Stardew.

1. **The whole list (Stardew).** Every in-game achievement on Stardew's list
   gets a counterpart here, under our own names. Where our game has no system
   behind one yet, the counterpart is listed and cannot be earned until that
   system exists. Where there is no sensible counterpart, it is flagged below,
   not invented.
2. **A unique hat each, and mail gifts for a few (Stardew).** Most achievements
   unlock one hat for sale at the hatter's shop. A few also send gold or an
   item by mail the day after.
3. **All listed and greyed, a few secret (Stardew).** Unearned achievements show
   greyed on a collections page with their goal. The top money tier is secret,
   and so is the arcade no-death run. Some appear only after earlier ones.
4. **Achievements and hats now, the completion total next.** The total needed
   the Perfection page, so it was written after it was saved
   (`39_completion_total.md`).

## How it works

- **Where it is seen.** A collections page in the pause menu, with an
  Achievements tab. Tablet friendly: tap a row for its goal and its hat.
- **The hatter's letter.** The day after the first achievement, the hat-makers
  send a letter saying hats are now for sale (`10_customisation.md`).
- **Hats are bought, not given.** Earning the achievement unlocks the hat in the
  shop. The player pays for it. Prices follow Stardew's, from 1,000g to 25,000g,
  and are listed where the saved Hats page gave one.
- **Hats are cosmetic and cannot be sold.** Wearing one is a standing cue among
  the Brimmers, with no bonus (`10_customisation.md`).
- **Checks run at day end,** with the shipping summary, as Stardew rechecks
  shipping then. Loading a save also rechecks, so an achievement missed by a
  bug or an older save is granted on the next sleep or load.
- **Our names, our hats.** Achievement and hat names here are ours. None of
  Stardew's names or text is used (`0002-stardew-valley-inspired.md`).
- **Counts scale to our lists.** Where Stardew says "every recipe" or "every
  fish" we mean our list. Fixed counts (cook 10, craft 15) are Stardew's and are
  checked again when our lists are final.

## Money

Stardew's thresholds, unscaled. Check them against our income before build
(`07_tuning_numbers.md`), since our economy is not yet Stardew's.

| Goal | Achievement | Hat | Price | Earnable |
| --- | --- | --- | --- | --- |
| Earn 15,000g | Pocketful | Clay Cap | 1,000g | Slice 1 |
| Earn 50,000g | Full Purse | Brass Bow | 2,000g | Slice 1 |
| Earn 250,000g | Landholder | Slate Cap | 5,000g | Slice 1 |
| Earn 1,000,000g | Hearthfortune | Gilded Derby | 10,000g | Slice 1 |
| Earn 10,000,000g (secret) | Hoard of Ages | Grand Sunhat | 25,000g | Slice 1 |

## Farm, crafting and shipping

| Goal | Achievement | Hat | Price | Earnable |
| --- | --- | --- | --- | --- |
| Craft 15 different items | Tinkerer | Buttercup Wreath | 1,000g | Slice 1 |
| Craft 30 different items | Maker | Peaked Cap | 2,000g | Slice 1 |
| Craft every item | Master Maker | Tall Red Cap | 5,000g | Slice 1 |
| Ship 15 of each crop | Every Furrow | Plaid Brim | 5,000g | Slice 1 |
| Ship 300 of one crop | One Field | Tall Brim | 5,000g | Slice 1 |
| Ship every item | Nothing Left | Imp Mask | 10,000g | Slice 1 |
| Reach level 10 in a skill | One Trade | Craftsman's Cap | Set later | Slice 1 |
| Reach level 10 in every skill | All Trades | Tower of Hats | Set later | Slice 3 |

Stardew gives no hat for the two skill goals. Ours do (see "Settled open
items"). Shipping every item needs the shipped-item collection that
`28_shipping_bin.md` leaves open.

## Hall, house and festivals

| Goal | Achievement | Reward | Earnable |
| --- | --- | --- | --- |
| Restore the village hall | Hall Restored | A trophy as furniture, and the Hall Laurel hat | Slice 5 |
| Upgrade the house | Roof Over | Thatch Pin, 1,000g | When the house upgrade is built |
| Upgrade to the maximum size | Room to Spare | Fur-lined Hood, 5,000g | When the house upgrade is built |
| First place at the Harvest Showing | First Rosette | Rosette Hat | Slice 1, once the judging is designed |

The trophy is furniture, which suits the decoration system. The house upgrade
list is still open, so which upgrade counts as the maximum is too. Stardew's
fair achievement is for first place at its fair and is rechecked on a repeat
win. Our Harvest Showing is the nearest festival, but its judging is not
designed (`14_festival_calendar.md`).

## Friendship, cooking and family

Friendship and cooking arrive in slice 4. Stardew counts a child's friendship
too.

| Goal | Achievement | Hat | Price | Earnable |
| --- | --- | --- | --- | --- |
| 5 hearts with someone | First Friend | Clover Bow | 1,000g | Slice 4 |
| 10 hearts with someone | Dear Friend | Fern Circlet | 2,000g | Slice 4 |
| 5 hearts with 4 people | Circle of Four | Garnet Circlet | 2,000g | Slice 4 |
| 5 hearts with 10 people | Ten Doors | Red Pom Hat | 2,000g | Slice 4 |
| 5 hearts with 20 people | Whole Village | Wool Ear Warmers | 4,000g | Slice 4 |
| 10 hearts with 8 people | Valley's Favourite | Fox Ears | 5,000g | Slice 4 |
| Cook 10 recipes | Home Cook | Ribbon Pin | 1,000g | Slice 4 |
| Cook 25 recipes | Kitchen Hand | Quince Beret | 2,000g | Slice 4 |
| Cook every recipe | Full Table | Tall Toque | 4,000g | Slice 4 |
| Marry and have two children | Full House | Hearthside Cap | Set later | Slice 4 |

We have 30 people, so 20 of them at 5 hearts is a large ask. Check it when the
cast's candidates and gift tastes are set. Stardew gives no hat for the family
goal. Ours does.

## Fishing

| Goal | Achievement | Reward | Earnable |
| --- | --- | --- | --- |
| Catch 10 different fish | First Ten | Oilskin Hat, 1,000g | Built, needs 10 fish |
| Catch 24 different fish | Harbour Hand | Harbour Cap, 2,000g | Built, needs 24 fish |
| Catch every fish | Whole Roster | Spyglass Band, 5,000g, and a mail gift | Built (hat only), needs all 47 fish |
| Catch 100 fish | A Hundred Lines | Dockside Band, 1,000g | Built |

We have 47 fish (`21_fishing.md`, with the Secret Woods pond's unique fish), so "24 different" is a little over half and
stands unless play says otherwise. Algae, weeds and jellies count toward these
in Stardew and trash does not, so water plants count and trash does not here.
The mail gift for the full roster is a rare seed or fruit, as Stardew's is
(decided 2026-11-03). Which item is open, since we have no rare crop yet, and
what Stardew gives is unchecked (SC-28). It needs a rare crop added to the
crop data.

## Mines, combat and arcade

| Goal | Achievement | Reward | Earnable |
| --- | --- | --- | --- |
| Reach the bottom of the mines | The Last Floor | Lantern Cap, and an unlock if the mines have one | Slice 3 |
| Reach the bottom in dangerous mode | Down in the Dark | Ember Helm | Slice 3 |
| Obtain the best weapon | Ash Crown | Crown hat | Slice 3 |
| Finish every slayer goal | Valley's Guard | Warden's Cap | Slice 3 |
| Beat the arcade game | Cabinet Champion | An arcade cabinet as furniture, and the Token Cap hat | When the minigame exists |
| Beat it without dying (secret) | Clean Run | Steady Hand Cap | When the minigame exists |

Stardew's bottom-of-the-mines reward is a key that opens a later area. Ours has
no such area, so the hat is the reward unless the mines design adds an unlock. Our arcade game is a minigame in
`11_minigames.md`, not yet scheduled.

## Counterparts that need a new system

These are on the list by the owner's choice. Each stays locked until its system
is built. The collection and the request board were settled on 2026-10-31 (see
"Settled open items").

| Stardew goal | Our counterpart | System needed |
| --- | --- | --- |
| Complete the museum collection | Complete the gallery set. Hat: Wide Leather Hat, 10,000g | The library gallery |
| Donate 40 different items | Donate 40 different finds. Hat: Linen Bonnet, 1,000g | The library gallery |
| Complete 10 Help Wanted requests | Ten requests. Hat: Spotted Bow, 1,000g. Mail gift 500g | The request board |
| Complete 40 Help Wanted requests | Forty requests. Hat: Hen Mask, 2,000g. Mail gift 2,500g | The request board |
| Read every book | Every book in the library | Power-up books, and the library's stock |
| See a movie | A festival show or similar | No cinema. A counterpart is a design call |
| Reach Ginger Island | Reach ring 2. Hat: Folded Paper Cap | Ring 2 (M5) |
| Delight the Governor | A ring 2 visitor | Ring 2 |
| Help the forest neighbours grow | A forest family goal | No such family yet |
| Find every stardrop | Find every rare boost item. Hat: Elderfruit Circlet | Elderfruit, seven sources (`39_completion_total.md`) |
| Reach the summit | Reach ring 1's 100 percent, and a valley summit when every ring is at 100 | The completion total, `39_completion_total.md` |

Stardew's rival-company achievement has no counterpart and is left out (see
"Settled open items"). Each of the Stardew achievements above also unlocks a
hat. Names not given here are set when their systems are designed.

## Settled open items

Decided 2026-10-31, each with a Stardew option.

- **A gallery in the library (Stardew's shape).** Stardew's museum is a gallery
  and a library in one building, run by a curator, with milestone rewards at 5,
  10 and so on up to its full set of 95 donations, and a one-copy-per-item rule.
  Ours is the library's gallery, run by the librarian
  (`20_ring1_cast.md`). Donated finds come from geodes and digging
  (`22_mines.md`). The donation list, the milestone rewards and the gallery
  interior are new design, and the surface artifact spots
  `25_stardew_system_review.md` calls missing belong with it.
- **A daily request board at the general store (Stardew).** Stardew posts a
  random request most days outside the general store, with 2 days to finish it,
  no penalty for skipping, and gold plus some friendship as pay. Its types
  include gathering, slaying, fishing, item delivery and talking to someone.
  Ours is the same shape in our content, and it counts toward the two errand
  achievements. Types, pay and rules are in `50_request_board_and_quests.md`.
- **No rival route.** Stardew's rival-company achievement is left out. Our hall
  has no rival, and a gold shortcut past the bundles would cut against the hall
  as the spine of the game (`16_bundles.md`).
- **A hat for every achievement.** Stardew gives no hat for the skill, family,
  slayer, arcade no-death and stardrop goals. Ours do, so the rule is uniform:
  One Trade is a Craftsman's Cap, All Trades a Tower of Hats, Full House a
  Hearthside Cap, Valley's Guard a Warden's Cap, Clean Run a Steady Hand Cap.
  Hat prices for these are set later.
- **Money thresholds stay Stardew's.** 15,000g to 10,000,000g, as the saved page
  lists them, and they are re-checked against our income at tuning
  (`07_tuning_numbers.md`).

## Build notes

- Data: an achievement is a record with id, goal, counter and threshold, reward
  hat id, mail gift and a secret flag, in a file under `src/content/`. Hats are
  item records.
- Core: counters live in `src/core/`, free of Phaser. Most are totals the game
  already keeps (money earned, shipped counts, fish caught). New totals need a
  save field.
- Save: store earned achievements and unlocked hats. Plan the version bump with
  the first slice that builds this (`10_customisation.md`).
- The gallery and the request board are new systems for later slices, each
  needing its own note before build.
- Slice 1 builds the tracker, the collections page, the hatter's letter and the
  achievements marked Slice 1. The rest are listed greyed with no way to earn
  them until their slice.

## Open

- The gallery's donation list and rewards. The request board is designed in
  `50_request_board_and_quests.md`.
- Hat prices for the hats Stardew does not give.
- Counterparts for the movie, Governor and forest-neighbour goals.

Details of Stardew's own list come from the saved Achievements and Hats pages,
read on 2026-10-31. The Hats page text was read only as far as its first
screen of rows, so hat prices past those are not known.
