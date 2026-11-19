# 53 Multiplayer (draft)

Status: draft. Decided with the owner on 2026-11-02, as the first design for
milestone M4 (`docs/decisions/0007-multiplayer-milestone.md`, moved to follow M3b by ADR 0012). Nothing here is
built. Stardew's behaviour was checked against the saved Multiplayer wiki page on 2026-11-02 (see "Checked against Stardew"). Claims not in that page are still from memory.
The model is the owner's own game beaver_cycle, whose same-network multiplayer is
built and measured (its ADR 0014 and note 42). Only ideas are taken from it, no
code.

## Decisions

- **Same network only (decided 2026-11-02, ours).** Friends on one router, no
  internet service, no relay and no hosting bill. Play over the internet is not
  planned.
- **Up to 8 players, host included (decided 2026-11-02; Stardew 1.6 from
  memory).** Whether a tablet host can carry 8 is untested (see Open).
- **The host runs the world (decided 2026-11-02).** One device runs the whole
  simulation: clock, farm, trees, weather, hall. A guest is a thin client. It
  sends what the player wants to do (the intents of note 47) and draws the state
  the host sends back. Only the host changes the world. This works because
  `src/core/` is free of Phaser and the DOM.
- **Any player can host, desktop or tablet (Stardew, decided 2026-11-02).**
  Browsers cannot listen on a socket, and neither can a tablet WebView, so:
  - The desktop app hosts through its own native socket server.
  - A tablet app hosts through a small native plugin. beaver_cycle built and
    measured one (about 30 ms round trips on one router).
  - A browser tab joins as a guest only. A small Node program stands in as the
    host for testing before the wrapper exists, as beaver_cycle's host bridge
    does.
- **The final form is a standalone desktop game, not a browser game (owner,
  2026-11-02).** The browser build stays for development and as a guest. This
  makes the wrapper ADR a prerequisite for M4: it must pick a wrapper that can
  listen on a socket, and a tablet route for hosting. ADR 0008 chooses Electron on desktop and Capacitor with a host plugin on tablets.
- **Transport: WebSocket carrying JSON (decided 2026-11-02, the beaver_cycle
  choice).** Every message is checked on arrival. Both ends send the game
  version, and a mismatch is refused with a plain message. WebRTC needs a
  signalling step that has no good form without internet, so it is not used.
- **Finding a host: a list of games on the network, or a typed address
  (decided 2026-11-02).** A desktop or tablet host announces itself on the local
  network (a UDP broadcast). A guest that can listen for it shows a list of games
  by name. A browser cannot listen, so it types the host's address. Typing also
  stays as a fallback for routers that block broadcasts. The guest remembers the
  last host. The host's screen shows its address.
- **A player's character lives in the host's save (Stardew from memory,
  decided 2026-11-02).** A guest's pack, skills, tools and cabin belong to that
  world and are kept on the host under a key the guest's device made, so a
  returning guest is the same character. A guest's device keeps only settings
  and the look. See "Travelling characters" for the later option.
- **Homes (decided 2026-11-02).** It depends on how the game began:
  - A game **started as multiplayer** gives every player a free cabin on the
    farm when they join, up to the cap.
  - A **single-player game turned into multiplayer** has the host buy cabins
    from the carpenter (Stardew from memory). A guest cannot join without a free
    cabin and is told so.
- **Money: the host chooses at creation, shared or separate (Stardew,
  decided 2026-11-02).** Shared is one purse. Separate gives each player their
  own, and the shipping bin pays the player who shipped each item.
- **A day ends when every player is in bed, with a timer fallback (Stardew,
  decided 2026-11-02).** The clock is the host's and shared. Players still up see
  who is left. At the day limit everyone who is not in bed passes out, with the
  usual cost (`src/core/sleep.ts`). Decided 2026-11-03 (ours): the pass-out
  cost is the single player cost, with no separate multiplayer rule.
- **A dropped guest does not stall the day (decided 2026-11-02, ours).** A
  guest who disconnects counts as in bed for the day end, and their character is
  put in their cabin. They rejoin as the same character by their key.
- **Day end rules for 2 to 8 players (placeholder, 2026-11-18, ours; `src/core/dayend.ts`).** Only connected
  players count. The day ends when every connected player is in bed (after a `settleMs` of 1500 ms of steady
  all-asleep, so the last player's bed is seen), or at the day limit, when everyone still up passes out with the
  single player cost. Dropped guests are skipped, so a host alone ends the day by sleeping. Getting out of bed
  before the end is allowed and restarts the settle. A lone player holding everyone up for `nagAfterMs` (30 s)
  only shows a hint; nobody is forced. A guest who rejoins is awake in their cabin with their record restored by
  id, counts again at once, and gets the full farm (as on any join); `needsFullSnapshot(seenDay, day)` is the
  rule for the day-change case. The Room calls `RoomWorld.playerDropped` and `playerRejoined`, which the adapter
  wires to `DayEndTracker.drop` and `rejoin` and to moving the character to the cabin.
- **Menus do not pause the clock in a multiplayer game (decided 2026-11-02,
  Stardew, checked).** Note 49's pause is a single-player rule, since one
  player cannot stop the others.
- **Quests, mail and journal are per player (decided 2026-11-02, Stardew from
  memory; the saved pages do not state it).** Hall bundles stay shared.
- **The wallet mode can change later (Stardew, decided 2026-11-02).** The host
  changes it from a screen. Turning separation on splits the money evenly;
  turning it off pools every purse.
- **A guest may join at any time (Stardew, decided 2026-11-02).** No host action
  is needed beyond the game being open to others. The host sees a notice.
- **A bought cabin costs 100 gold and is built instantly (Stardew, checked,
  decided 2026-11-02).** Cabins chosen at game start are free. Our building
  costs are not settled, so the price is revisited in the tuning note.
- **Join control is kick and ban, no password (Stardew, checked, decided
  2026-11-02).** Stardew's `kick` disconnects a player who may return. Its `ban`
  blocks the person, not just their character, for that farm, and `unban` and
  `unbanAll` undo it. Ours:
  - **Kick** disconnects a guest, who may rejoin.
  - **Ban** also blocks their device key from joining this world.
  - **Unban** has a one-player and an all-players form (Stardew).
  - The host reaches them from a players list on the host screen, one row per
    player with Kick and Ban buttons that ask to confirm. Stardew uses typed
    chat commands, which we have no chat for and which suit tablets badly.
  - A banned player's character and cabin stay in the save, so an unban restores
    them. The page does not say what Stardew does with the character.
  - The banned list is kept in the host's world save, so it survives a restart.
- **Profit margin at creation (Stardew, decided 2026-11-02).** The host picks 25,
  50, 75 or 100 percent of sale and seed prices to offset more players farming.
  The numbers are in `07_tuning_numbers.md` ("Profit margin"), and the setting is
  offered in single player too.
- **The request board is one shared board, and every player gets the reward
  (owner's recollection of Stardew, decided 2026-11-02, not checked).** The saved
  wiki pages and a web search do not say how Stardew pays a finished Help Wanted
  quest in multiplayer. Check when note 50 is revisited.
- **Achievements are per player (Stardew from web forum posts, decided
  2026-11-02, not on the wiki pages).** Forum players report that each player
  earns their own, with a few world milestones such as the Community Center
  shared. Which of ours are shared is settled with note 38.

## What is shared and what is per player

| Shared | Per player |
| --- | --- |
| Farm, crops, trees, forage, weather, forecast | Pack, held slot, energy |
| Clock and calendar | Skills, professions, tool tiers, equipment |
| Village hall bundles and projects | Cabin and bed |
| Shipping bin (proceeds follow the money rule) | Journal (quests, mail, collections) |
| Money, when the host chose shared | Money, when the host chose separate |
| Festivals joined, house and cabin builds | Look and name |

Quests, mail, the request board and achievements each need a ruling when their
notes are revisited (see Open).

## Saves and exit

Builds on note 52. The host holds the night and resume records, with every
player's record inside, so a guest never saves the world.

- **Exit by the host ends the session for everyone.** Guests return to their
  title screen, and the world stays on the host. A guest's Exit just leaves.
- **Restart this day is the host's, and it affects everyone.** It asks first and
  says so.
- **Export and import move the host's whole world file**, guests' records
  included.
- A guest's record is self-contained in the code (see below) so the file can be
  read, split and checked as one piece per player.

## Travelling characters (later option, recorded 2026-11-02)

The owner finds a character that lives on the guest's device interesting. It is
not built in M4. The pros and cons, so the idea is not lost:

- **For:** friends can visit each other's farms with one character. A guest keeps
  their progress if a host's save is lost. It needs no server.
- **Against:** a guest can arrive with maxed tools, gold or rare items and
  trivialise a host's world, and the shared hall is the sharpest case. Cabins,
  beds, quests, hall contributions and unlocks belong to a world and do not
  travel. A shared wallet has no clear place for a guest's own gold. Two devices
  need one character format across game versions. Tampering with a local file
  becomes the host's problem.
- **What keeps it possible:** a player's record is self-contained and split into
  portable parts (name, look, maybe skills) and world-bound parts (pack, tools,
  gold, cabin, quests). A later option would be a host switch at world creation,
  like the money choice, with a rule on what a visitor may bring, such as a small
  satchel.

## What changes in the code

- `GameState` holds one player's things (`inventory`, `money`, skills, tool
  tiers, energy) next to the world's. M4 splits it into a world and a list of
  player records keyed by player id. This is a refactor that single player needs
  too, with no change to what a single-player game does.
- A `Room` in `src/core/` takes intents from players, steps the world and makes
  snapshots, with no socket, so it is unit tested with several fake players, as
  beaver_cycle's room is. The socket sits outside it in `src/net/`.
- The save gains a player list and a wallet mode (note 52's version bump).

## Build order

0. The wrapper ADR (host route on desktop and tablet), and a spike that proves a
   host and a guest talk on a real router, with a Node test host. Include a
   load check of 8 players against a tablet host.
1. Split `GameState` into world and players, still single player, with tests.
   **Built (2026-11-18, issue 964).** `src/core/players.ts`: `PlayerId`, `LOCAL_PLAYER` ("p1"),
   `PlayerRecord` (money, inventory, skills, toolTiers, canWater, energy), `Players`
   (`add`, `get`, `remove`, `local`, `ids`, `each`) and `localView`. `save.ts`: `WorldState` is the
   shared part; `GameState` is `WorldState` plus `players`, with `money`, `inventory`, `skills`,
   `toolTiers` and `canWater` kept as accessors onto `players.local`, so existing code is unchanged.
   Left for later steps: the local record's `energy` is the same object as `day.energy` (give each
   player their own when the day end is shared, step 5); still per player but still in `WorldState`:
   journal (quests, mail, friendship, marriage), equipment, wardrobe, cabin and bed, `toolOrder`,
   `elderfruit`, `combat`, `galleryClaimed`. Save format: the save still writes the flat single-player
   fields. Note 52's version bump needs a `players` list (id, name, record), a wallet mode, and
   a read path that loads the old flat fields as player "p1".
2. The `Room` and the protocol in `src/core/` and `src/net/`, no socket.
   **Built (2026-11-18, issue 965).** `src/core/room.ts`: `Room` (`join(name, rejoinId?)`, `disconnect`,
   `receive`, `hostIntent`, `tick`, `drain`, `position`, `ids`, `connectedIds`) over a `RoomWorld` adapter
   (`day`, `snapshot`, `apply`, optional `step`, `addPlayer`). `src/core/protocol.ts` (re-exported by
   `src/net/protocol.ts`): `ClientMsg`, `ServerMsg`, `Intent`, `encode`, `decodeClient`. Delta format: a `snap`
   of positions every tick (with the jam `pass` ids), world changes as `applied` intents sent to everyone,
   `rejected` to the sender only, the full `farm` text only on join or rejoin and on a day change for a guest
   marked `away`; other guests get a small `day` message. Tests: `tests/room.test.ts`. Left: a `RoomWorld`
   adapter over `GameState`, with the real intent kinds (step 3 and later); a position send rate and
   interpolation on the guest; the socket (step 3).
3. The socket, the Node test host, and a guest that joins and walks.
   **Built (2026-11-18, issue 966).** `src/net/wsserver.ts` (minimal Node WebSocket server), `src/net/host-node.ts`
   (`NodeHost.start({world, port?, tickHz?, maxPlayers?, latencyMs?})` runs a `Room` over real sockets; `room`,
   `port`, `close()`), `src/net/client.ts` (`GuestClient.connect(url, {name, rejoinId?})`, `sendPos`, `sendIntent`,
   `leave`, `close`; standard WebSocket, so it runs in Node 22 and browsers), `src/net/sockettransport.ts` (real
   `LobbyTransport`; hosting is injected, `canHost` false in a browser). Added a `refused` server message (full, id in
   use). `tests/socket.test.ts` (localhost, random port): join with farm, walk seen by a second guest, intents,
   drop and rejoin as the same id, refusals, junk input, lobby seam, host plus 8 guests (tick work under 5 ms), and the
   jam rule against the real Room with 40 ms each way: two blockers freed in under 1.5 s and the host holds the passing
   positions. Left: `LobbyScene` still uses `FakeTransport` (swap to `SocketTransport` with a hosting factory in step 4);
   the `GameState` `RoomWorld` adapter; the scene's "blocked by player X" detection; guest interpolation; a run on a
   real LAN (needs hands). `maxPlayers` counts the host, so host plus 8 guests needs 9.
4. Host and Join screens, the game list, and the typed address.
5. Shared day end and a dropped guest.
6. Cabins (free at start, bought otherwise) and the join-needs-a-cabin rule.
7. The money mode and per-player shipping proceeds. **Built (2026-11-18, issue 972).** `WalletMode` ("shared" default | "separate"), chosen by `newGame(farmType, walletMode)`; `Players.wallet/balance/pay`; the local `money` accessor follows the wallet. Bin lines carry `by`; `bin.settle(g.players)` pays per shipper. Save version 4 (note 52). Left: the Host screen choice, the bin summary split in the scene, guest purchases using `balance`.
8. Native hosting in the wrapper, then the tablet plugin.

## For later

- **Travelling characters** (above).
- **Chat and quick phrases.** Quick phrases, not typing, as beaver_cycle did, for
  tablets.
- **Play over the internet.** Not planned. It would need a relay and a cost.
- **Co-op festival and hall moments**, with the story and hall notes.

## Open

- **Eight players on a tablet host.** beaver_cycle measured a host and two
  guests, not eight. Decided 2026-11-02: 8 stays the target and the real-tablet
  load check sets the tablet cap (it may be lower, such as 4).
- **Snapshot size**: full state against changes only, settled in the spike.
- Existing notes that change when M4 starts: 49 (menu pause), 52 (save), 28
  (bin), 50, 51, 38, 42 (the debug menu) and `src/core/sleep.ts`.

- **Layout effects (owner, 2026-11-11, note 81).** Cabins are placed freely
  through the carpenter (SC-120) and players block each other (SC-121, ours).
  Open for the spike: how a jam is freed, and whether a tablet host needs
  several maps in memory (note 81 decision 9).

## M4 spike results (2026-11-18, issue 948)

Harness: `spikes/m4/` (README there). Desktop only, loopback only. The questions that need your router and
tablet are listed last. Numbers are from one machine (Node 22), so read them as relative sizes, not tablet speeds.

**Q4, farm state size (measured).** The expert sim bot's full save, by day: 63 KB (day 1), 131 KB (28), 298 KB (56),
442 KB (84); gzipped 6.7, 15.7, 41.7 and 63.9 KB. About 70% is `areas` (the other map areas' worlds), then `trees`
(25%). Everything else together is under 25 KB. The bot builds little, so a heavily built farm will be larger; the
ADR 0014 follow-up (placed items, buildings and soil in the save) has no sign of trouble, but needs one re-measure on a
late-game farm played by a person. Per-player records (inventory, skills, friendship) are small, hundreds of bytes
each, so 8 players do not move the total.

**Q4 again, a built-up late farm (measured on a synthetic fill, `spikes/m4/latefarm.ts`).** Not a person's save: the day 84
bot save with 900 tilled tiles (600 planted), 80 sprinklers, 60 working machines, 30 full chests (10 of them big), 160
lamps and torches, 60 fruit trees, 24 animals in a tier 3 coop and barn, a full pack and bin, and 94 gallery donations.
Total 573 KB raw, 78 KB gzipped. By area, raw and gzipped KB: other map areas 300 and 50; trees, rocks, weeds, grass
123 and 9.6; soil and crops 72 and 4.1; placed items (machines, chests, lamps) 63 and 8.8; fruit trees 3.7 and 0.4;
animals 4.4 and 0.5; pack and bin 3.5 and 0.9; gallery 1.5 and 0.8; everything else 2.9 and 1.4. The built-up farm
adds only about 130 KB raw, 15 KB gzipped, over the bot's day 84 save, and the other map areas stay the biggest part.
The recommendation holds: one full snapshot on join (under 80 KB gzipped, well under a second on a LAN), deltas after.
A real played save is still worth one check, since chest contents and the area worlds vary.

**Snapshot format (measured, transport only).** Position snapshots at 10 Hz for 8 guests cost 0.18 ms of host time
a tick and 235 KB/s in all. Sending the day 84 farm blob in every tick instead cost 17.8 ms a tick and 42 MB/s in all.
Recommendation: the full farm snapshot is sent once on join (and on a day change if a guest was away); between
those, small deltas (positions every tick, world changes as intents applied). Never a full state per tick.

**Q1 and Q2, link and load (partly measured).** On loopback a host plus 2, 4 and 8 synthetic guests all gave a
median round trip of 88 to 95 ms with a maximum under 120 ms. That figure is the 10 Hz tick wait (up to 100 ms),
not the network, so the real LAN cost on top of it is a few ms (the earlier beaver_cycle prototype measured about
30 ms with a host and two guests). Host memory for 8 guests: 68 MB resident for the transport alone. Not measured:
the real core rules stepping for 8 players (the harness has no `Room` yet, build order step 2), a tablet host, battery
and heat.

**Q3, maps on a host (measured).** `src/core/` already loads all 38 maps (3.3 MB of JSON) into one registry, about 69
MB of heap, and the nightly area rules run on that data without Phaser tile layers. So a host needs no extra map
loading: the "one map in memory" rule (ADR 0005) is about the Phaser scene, and each client still shows one map.
Recommendation: keep the 120 by 120 cap; no ADR. A tablet host also draws its own player's map, so its memory is
this 69 MB plus one scene; check that on the SM-T500 (#523).

**Q5, jam freeing (reasoned, not measured).** Recommendation: a local soft pass. Players are solid to each other, but
if two bodies overlap a blocked move for more than 0.5 s, the moving player's client passes through the other for
1 s. It runs on each client with no host authority, because each client already predicts its own player's movement and
the host only receives positions. The host stays the judge of where a player is, so it accepts the passing positions.
Needs a latency test once the real room exists (step 3).

**Jam rule tested (2026-11-18).** `src/core/jam.ts` (`JamTracker`, constants `JAM_BLOCK_MS` 500 and `JAM_PASS_MS`
1000) with `tests/jam.test.ts`: 10 tests pass. They cover no jam while moving or standing still, the 0.5 s timer, the
1 s pass window, reset on separating, two clients passing together, three players tracked per pair, and 16 ms against
100 ms frames. The tests exposed three rule details, now fixed in the module. (1) The timer counts only a real move
attempt that was stopped by a player, so standing next to someone never jams. (2) The overshoot past 0.5 s is taken off
the pass window, so total length is the same at any frame rate (within one frame). (3) Once started, the pass runs its
full second even if the block stops being reported, and a pair still stuck afterwards needs a fresh 0.5 s. Still
untested: real latency, and how the scene detects "blocked by player X" (no multiplayer scene yet).

**Needs hands.** (1) Run `host.mjs` on the desktop and join from the tablet and a second machine on your router, and
note client isolation and the typed address fallback. (2) The tablet host load on the SM-T500 with the Capacitor plugin
(step 8; this spike did not build the plugin). (3) A person-played late-game farm save for one more size check.

**Recommended follow-ups (not filed).** Build order steps 1 to 8 above stand unchanged. Add to step 2 a delta format
(positions every tick, world changes as intents) and to step 3 the jam rule test.

## Systems added since the first design (owner, 2026-11-18)

The systems below were designed after 2026-11-02. How each behaves with several players is settled here at design
level only. Nothing is built, and the build waits for M4.

- **Ancestors' shrine (note 83): one shared score, one scene on the host's farm (Stardew from memory, SC-204).** The
  world rows (hall, bundles) count once. Rows that are about one player (skills, hearts, earnings) use the best player
  for each row, so one strong player can carry the farm. The statue is shared. A Diamond for a redo can come from
  any player. A guest sees the scene when they are present, and is not held up by it.
- **Gallery (note 104): one shared gallery for the farm (Stardew from memory, SC-200).** Any player's donation counts
  for everyone. Rewards are collected by each player from the librarian, so each player gets their own.
- **Marriage (note 12): villagers and other players, both from M4 (Stardew from memory, SC-205).** Player marriage
  needs its own design before it is built: the proposal, a shared home, the both-in-bed rule and spouse routes for
  two players. That design is the first task after the spike. Until it is written, only villager marriage is built.
- **Player marriage, first rulings (owner, 2026-11-18, all from memory of Stardew, SC-205).**
  - **Proposal:** one player offers the pendant (note 12) and the other accepts or declines. A decline costs nothing.
  - **Home:** one moves into the other's cabin. The vacated cabin stays so a divorce has a place to return to. The
    couple share one bed and count as both in bed.
  - **Children:** the same shared question as villager marriage (note 12), one child shown in the home, both
    partners are the parents.
  - **One spouse per villager:** a villager married or engaged to a player is off limits to the others, who keep
    their hearts but cannot propose.
  - **Wedding (owner, 2026-11-18):** the villager wedding scene with both players as the couple. The other players
    and the villagers are guests. Same notice as a villager wedding.
  - **Divorce:** either player starts it at the ledger in the hall (30,5) for the note 12 fee. The other is told next morning. The
    mover returns to the empty cabin.
  - **Spouse help:** none for a player couple. Only villager spouses do the morning chore.
  - **Settled 2026-11-18 (owner), see note 12 "Two-player wedding and divorce steps":** the wedding plays after night 3
    with no wait for the partner (Stardew from memory, SC-207), the proposer's cabin is home, the player who files pays
    the fee, and the ledger is in the hall. Do not ask these again.
- **Special orders and the request board (notes 65 and 50): one shared board, and every player gets the reward
  (owner, 2026-11-18, extends the request board decision above, SC-206).** A hand-in order takes goods from the
  player handing in and still pays every player. This is not checked against Stardew.
- **Festivals (notes 82 and 14):** counts and joining for the Feast, the gift exchange (note 105) and the in-place
  festivals are still open for the spike, not settled here.

## Cabin rules (step 6, 2026-11-18, `src/core/cabins.ts`)

Pure rules and tests; no scene yet. Labelled placeholders, set where the note was open:

- **Cap:** 7 cabins beside the host's house (8 players). A joiner past the cap is refused as "full".
- **Footprint:** 4 by 3 tiles, placeholder until the note 85 art. Placement is free (SC-120): any clear
  tiles, no overlap with another cabin; the caller says which tiles are blocked.
- **Default spot (multiplayer start):** the first fitting site in row-major order inside the farm's open
  cabin area (note 55). If none fits the joiner is refused as "no free cabin".
- **Join in a converted game:** takes a cabin the host already bought; with none the guest is refused
  "no free cabin" and told so, and the host is offered the 100 gold purchase.
- **A returning key** gets the same cabin. A banned player's cabin stays.
- **Demolish** returns the evicted occupant's key so things go to a chest (Stardew). The vacated cabin of a
  player marriage stays, owned by the mover, so a divorce has a place to return to.

## Checked against Stardew (2026-11-02)

From the saved Multiplayer page. Not copied, only compared.

- **Matches:** 1 to 8 players (PC), one host who holds the save and a world that
  is closed when the host is offline, shared farmland, per-player energy,
  skills and relationships, bedtime chosen together by entering a bed, shared or
  separate money, and a cabin per joining player.
- **Menus and the clock:** Stardew does not pause for menus in multiplayer. Time
  only stops for the end-of-day screens, festivals with an event, and the host's
  pause command. At 02:00 a player with a menu open does not pass out until it
  closes. We keep "no menu pause". Decided 2026-11-03 (ours, not Stardew): at 02:00
  an open menu closes by itself, so one player cannot stall the day end.
- **Wallet:** Stardew can change the mode later and splits money evenly when
  separation is turned on. Sale prices use the professions of all online players
  that raise the price most.
- **Cabins:** Stardew starts with up to 3 (7 on PC) and Robin builds more for 100
  gold each, instantly. A cabin is upgraded by its occupant, and its interior is identical to the
  farmhouse (checked on the saved Cabin page, note 85). Whether a cabin can be renovated is unchecked (SC-143). Demolishing one
  removes the occupant and puts their things in a chest. Our bought cabin price is 100 gold, built instantly (checked, above).
- **Quests and progress:** quests, recipes and mail are per player, while mine
  progress, the museum, the bridge and hall bundles are shared. A bundle's
  reward applies to everyone, but only the player who finished it collects the
  item. Experience goes to the player who does the action (harvester, last
  swing). Daily luck is averaged. This answers the quest open item for Stardew.
- **Joining:** a game must be opened to others by the host. Guests join from a
  friend list, an invite code, or an IP address (UDP port 24642 by default).
  There is no join password, but the host can kick and ban. We have no kick or
  ban yet, which is worth adding to the host's screen.
- **Host tools worth considering:** pause, a ping readout, private messages, a
  "sleep announce" setting, and a profit margin chosen at creation (25, 50, 75
  or 100 percent of sale and seed prices) to offset more players farming. A
  profit margin is a new idea for our tuning note, not decided.
- **Mobile:** multiplayer on mobile is "experimental" and can join PC games. The
  page does not say whether a phone or tablet can host.
- **Not in the page:** how a dropped player counts for bedtime, and snapshot
  size. Those stay ours.
