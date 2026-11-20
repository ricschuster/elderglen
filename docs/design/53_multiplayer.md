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
   **Adapter built (2026-11-18, #965, #968, #969).** `src/core/roomworld.ts`: `GameRoomWorld(g, opts)` is a
   `RoomWorld` over a real `GameState`. `admit` runs `joinNeedsCabin` and refuses with its reason (the new
   optional `RoomWorld.admit`; `Room.refusal` carries the reason to the `refused` message, now also
   "no-free-cabin", shown to the guest as "refused"); `onCabinRefused` and `cabinOffer` tell the host, who
   calls `buyCabin(site)` (100 gold from the host's wallet). `addPlayer` makes a `PlayerRecord` with its own
   `Energy`, `snapshot` is `serialize`, `playerDropped` and `playerRejoined` drive `DayEndTracker`. Intents:
   `ship` (to the sender's bin lines, paid per wallet mode at night), `spend` (from `players.balance`), `sleep`,
   `wake`, `buy-cabin` (host only); anything else is rejected. `step` calls `tracker.check`; at the day end guests
   who pass out pay the single player cost from their wallet, guests wake with full or 75% energy, then `sleep()`
   runs for the world (`lastReport`, `lastPassOuts`). Tests: `tests/roomworld.test.ts` (NodeHost over a real
   socket, two guests). Left: the cabin book is not in the save; moving a dropped guest's character to their
   cabin; guest energy is not yet spent by real actions or saved back as the day's; more intent kinds (till,
   plant, water, harvest, buy, sell); ship multipliers (professions) for guests; the host's own wake/sleep
   from the scene; cabin `blocked` and area from the real farm map.
7. The money mode and per-player shipping proceeds. **Built (2026-11-18, issue 972).** `WalletMode` ("shared" default | "separate"), chosen by `newGame(farmType, walletMode)`; `Players.wallet/balance/pay`; the local `money` accessor follows the wallet. Bin lines carry `by`; `bin.settle(g.players)` pays per shipper. Save version 4 (note 52). Host screen wallet choice (button cycles shared/separate, passed as `HostOptions` through `startHosting`; `src/net/hostoptions.ts`) and the bin and shipping summary split (`src/core/settlementsplit.ts`) built 2026-11-18. Left: a wallet choice on the new-game screen (no obvious place yet), wiring the option into the real host starter, guest purchases using `balance`.
8. Native hosting in the wrapper, then the tablet plugin. **Host route set by ADR 0015 (2026-11-19):** `SocketPipe`
   (`src/net/pipe.ts`), `RoomHost` over it (`roomhost.ts`), `NodePipe`, `CapacitorPipe` and the Java `ElderHostPlugin` are
   built; a real SM-T500 hosted 8 through the plugin (ADR 0015 "Result"). Left: the Electron pipe, the real host
   starter (the host's own scene sharing the `Room`'s world), (UDP announce and discover are built and checked on the two tablets, port 24650; the Lobby join list shows them
   once the Lobby is given a `CapacitorPipe`.)

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
**Jam rule under latency (2026-11-19, #966).** `tests/jam-latency.test.ts`: the real Room on a manual clock with a delayed
message queue (60 ms, 100 ms plus 40 ms jitter, 150 ms plus 60 ms jitter one way; 10 Hz snapshots, 20 Hz guest
positions, five seeds each). Two slow walkers (1 tile a second) blocked by each other are free in under 1.5 s and the
host holds and rebroadcasts the passing positions with the pass ids. At a full walk (3 tiles a second) stale positions let
two players overlap before they see each other, so no jam forms (not a bug). The same file loads host plus 8 guests for
60 s of ticks: well under the 100 ms budget. Still needs hands: a run on a real LAN.

**Needs hands.** (1) Run `host.mjs` on the desktop and join from the tablet and a second machine on your router, and
note client isolation and the typed address fallback. (2) The tablet host load on the SM-T500 with the Capacitor plugin
(step 8; this spike did not build the plugin). (3) A person-played late-game farm save for one more size check.

**Recommended follow-ups (not filed).** Build order steps 1 to 8 above stand unchanged. Add to step 2 a delta format
(positions every tick, world changes as intents) and to step 3 the jam rule test.

## M4 spike results, tablet runs (2026-11-19, issue 948)

Run by the agent with two real tablets on USB and the owner's router (TELUS5390, 5 GHz, signal -54 to -62 dBm): a
Galaxy Tab A (SM-T500, 2.7 GB RAM, 60 Hz) and a Galaxy Tab A9+ (SM-X210, 3.5 GB RAM, 90 Hz), both on the "Elderglen DBG"
app. The desktop host was itself on Wi-Fi (not wired), so every path crossed two wireless hops. Harness, all in
`spikes/m4/`: `tabletguest.mjs` (guest pages for a tablet browser), `realhost.ts` and `realguest.ts` (the real `NodeHost`,
`Room`, `GameRoomWorld` and `GuestClient`), `devperf.mjs`, `devhost.mjs` and `devsoak.mjs` (frame rate, host load and a
soak inside the app over the WebView DevTools socket).

**Q1, link (measured).** There is no client isolation: both tablets and the desktop reach each other. A typed address
(`ws://192.168.1.71:port`) joined every time. Not tested: a game list by mDNS or broadcast (step 4 builds it). Idle ping
to the desktop averaged about 100 ms (min 29, max 280) and tablet to tablet 180 to 225 ms, which is Wi-Fi power saving.
With steady traffic (a ping every 0.2 s) it is 38 to 48 ms average (min 22 to 29). Through the game's WebSocket the round
trip, measured from our own timestamp echoed in a snapshot, was: one tablet alone, median 135 ms, p95 233, max 242; both
tablets plus 6 synthetic guests (8 players, 60 s), SM-T500 median 168, p95 228, max 268, SM-X210 median 135, p95 229,
max 324. Snapshot gaps stayed at 100 ms (p95 105 to 153, worst 234). The real stack (real `GuestClient`, a 66 KB late
farm on join): joined in 279 to 284 ms, round trip median 125 to 133, p95 226 to 230, max 243 (host plus 2 guests,
45 s). The median is about 45 ms of network, up to 100 ms waiting for the 10 Hz tick, and the guest's send time.
Expect 130 to 170 ms median and a tail to about 320 ms. Consequences for the guest: client prediction for the guest's
own player (already the plan), and other players drawn by interpolating over at least two snapshots (200 ms). A wired
desktop host should trim some of the tail; not measured.

**Q2, tablet host load, compute side (measured; the Capacitor host plugin does not exist yet).** The real `Room` plus
`GameRoomWorld` ran inside the app's page with 8 players (the host plus 7 guests, the cap the cabins allow) on the
`late-game-100` stage, with all 38 maps loaded, doing the decode, tick and encode work `NodeHost` does around the room.
Tick cost: SM-T500 median 0.1 ms, p99 0.2, worst 8 ms; SM-X210 median under 0.1 ms, worst 5 ms. The nightly `sleep()` for
the whole world: SM-T500 27 ms median (worst 49), SM-X210 10 ms (worst 27). `serialize` (the save and the join
snapshot): 3.3 ms and 1.2 ms. Building the stage state took 225 ms and 98 ms. Memory: the app uses 180 to 230 MB (PSS) with
a late-game farm on screen and the host loop running; the SM-T500 starts with about 580 MB free, so it is the tight one.
Five minute soak with the game on `late-game-100` and a 10 Hz host loop carrying 7 guests: 3,366 and 3,337 ticks, none
late, median 0.4 ms (SM-T500) and 0.1 ms (SM-X210), worst 16 ms and 9 ms. Frame rate did not move (SM-T500 36 to 38 fps
with the host against 36 without, SM-X210 44 against 43). Battery temperature rose from 27 to 28.5 C and from 23.5 to
24.1 C. Not measured: battery drain (both were on USB power), and the cost of the socket server in the native plugin.
The compute side gives no reason to lower the cap of 8 players on a tablet host. The recommendation stands as "8, check
again once the plugin exists" (step 8, #973).

**Frame rate on the tablets (measured, one finding).** Frames a second in the app over 12 s: SM-T500 48 to 52 on a new
farm, the hall, the mines (floors 30 and 100), the Night Market and a home with two children; SM-X210 62 to 65. The
exception is `late-game-100` (day 100, full pack, all skills 8): SM-T500 36 fps (p95 frame 50 ms, worst 83 ms), SM-X210 43
fps. That is a single-player cost of a built-up farm, not a hosting cost, and it is worth a profile before M3d.

**Saves.** `navigator.storage.persist()` returns false on both real tablets, the same as the emulator, so saves live in
WebView storage without the persistent flag (the reported quota is 10 GB). The save split and export (note 52) are the
protection.

**Still needs hands or building.** (1) The Capacitor host plugin and a tablet-hosted session with the second tablet as
guest (#973, #976). (2) Battery drain unplugged over a real session. (3) The game list by mDNS or broadcast on this
router. (4) A person-played late-game farm for one more size check. (5) The jam rule with a person walking on each
tablet, after the scene detects "blocked by player X".

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
  - **Proposal:** one player offers the pendant (note 12) and the other accepts or declines. A decline costs nothing. Built 2026-11-19 (note 12 "Steps already decided"): core, intents, cards and ledger, placeholder, scenes untested in a browser.
  - **Home:** one moves into the other's cabin. The vacated cabin stays so a divorce has a place to return to. The
    couple share one bed, and each must get in it
    themselves: the normal every-player-in-bed day end applies (owner, 2026-11-19: "same as normal Stardew multiplayer").
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

## Built status: guest gaps (2026-11-19, issue 968)

- **Clock.** Every `snap` carries the host's `min` (minutes of the day, optional, so an older host still works). `GuestClient.minutes` keeps the latest; `GuestSession.followDay` copies it, and takes it on a day change too (the morning if none yet).
- **Menus are read-only for a guest until intents exist.** Rule: a guest may open only `menu`, `journal` and `catalogue` (`guestMayOpen`); every other screen (shop, bin, chest, cart, crafting, furnace and the rest) is refused with "Only the host can do that for now." In the menu, the tabs that change state are hidden (`GUEST_HIDDEN_TABS`: Pack, Craft, Animals, Special); Skills, Social, Map, Collect, Guide, Options and Exit stay as views.
- **Host loss.** `GuestSession.onHostLost` fires once when the socket closes; the farm scene stops its overlays and goes to Title, which shows "The host left, so the game ended." (`noteHostLost`, `takeLostNotice`).

## Built status: farm intents, interpolation, blocking (2026-11-19, issue 976)

- **Intents.** `src/core/roomintents.ts`: `till`, `plant`, `water` (`{x, y}`, plant also `seed`), `buy` and `sell` (`{id, n}`, n 1 to 999). Each runs the single player function (`actions.till/plant/water`, `shop.buy/sell`) as the sender through `asPlayer`: the local-player accessors point at their record and the day's energy object holds their energy for the call, so tool swings spend the guest's energy (and the can, skills, tool tiers and wallet are theirs); the host's energy is restored after. A refusal goes back to the sender only (`rejected`). Farm soil only (no greenhouse yet). Not checked: how near the player is to the tile, and the map they stand on.
- **Ship and sell multipliers.** `ship` and `sell` use `sellMultiplier` of the sender's skills (Tiller, Rancher, Artisan, Fisher, Angler). Pot price uses the sender's Trapper.
- **Interpolation.** `src/net/interp.ts` `RemoteInterpolator`: samples are kept when a remote moves, drawn 200 ms behind, never extrapolated, no blend across a map change. `RemotePlayerLayer.sync` uses it (scene edit, untested in a browser).
- **Blocking.** `playersAt`, `PlayerBlocking` and `resolveBlocking` (`src/net/interp.ts`, tested). The farm scene's walk calls `resolveBlocking` each frame when in a session: a step into another player is undone until the jam rule lets the walker through, and the `pass` list goes in the `pos` message (host and guest). Untested in a browser.
- **Guest applies the host's intents (no prediction).** `src/net/guestapply.ts` `applyServerMsg` runs `applyFarmIntent` on the guest's farm copy for each `applied` (own and other players' alike, once each, as the host sends it to everyone). The guest never changes its copy before the answer, so nothing double-applies and nothing needs a rollback; a `rejected` reaches `GuestSession.onRejected` and the scene shows the reason. `GuestSession.sendIntent`/`onChange`. In the scene a guest's Use with the hoe, can (not on water) or a crop seed on the farm map sends till, water or plant (`guestUse`, untested in a browser). A random roll (mixed seed, till drops) may differ between the copies; the next `farm` message corrects it.
- **Left.** Shop buy and sell for guests (the shop screen edits the local state directly, so shops stay host-only via `guestMayOpen`); bin and other screens; the other tool intents (animals; axe and pickaxe are built: `axe` and `pickaxe` intents, `{x, y}`, run `useHeld` on the farm map as the sender, so stumps, logs, trees, boulders and rocks give wood, stone and foraging or mining experience to the sender, with their tier and energy; farm map only, no mine floors or areas yet, and random rolls in the pickaxe may differ between copies until the next `farm` message; harvest is built: `harvest` intent, `{x, y}`, runs `actions.harvest` as the sender so the crop and farming experience go to the harvester, guest Action on a ripe farm crop sends it); mixed seed for guests; reach and map checks; greenhouse soil; replacing the copy when a `farm` message arrives mid-session.

## Built status: hosting the real farm (2026-11-19)

- `src/net/hostworld.ts`: `planHost(kv, choice, options)` decides the world to host. A slot hosts that slot's played state (day in progress if any) with its own wallet mode; a corrupt, newer-version or empty slot is refused in words and never touched. "A new farm" is a multiplayer start saved to the first empty slot (all used: refused), with the wallet choice. The Lobby has a "Farm:" button cycling new farm and each used slot, then runs `startHostSession` and enters the farm scene, as the Title Host button does. The host stays the owner of the save: only the slot it plays in is written. Guests never save (`nightSave` and `resumeSave` refuse while `isGuest()`).
- Left: the placeholder `makeWorld` in the Lobby transport is unused for hosting (kept for the transport tests); a new farm skips the farm-type screen (standard farm); nothing run on a device.

## Built status: shared day end wired (2026-11-19)

- The host's bed (and exhaustion) no longer calls `sleep()` in a session: `FarmScene.endDay` sends the `sleep` intent and shows "You are in bed". `Room.tick` steps `GameRoomWorld.step`, so the `DayEndTracker` ends the day once (everyone in bed after the 1.5 s settle, or the 2 am limit), runs `sleep()` for the world and charges each passed-out guest the single player cost.
- Reports. The host's scene takes the `SleepReport` once (`takeHostNight`, polled in `syncNet`) and runs the usual morning steps (`finishNight`); its report adds wedding and divorce lines (`marriageReportLines` now takes the weddings, and tells the filer "Your divorce from X is final"). Each guest gets a `night` message (`{day, lines, lost}`, `Room.tick` via `RoomWorld.takeNight`) and `GuestSession.onNight` opens the report screen with those lines.
- Beds for everyone (2026-11-19): each player must be in bed themselves, no shared-bed shortcut. A guest's `endDay` key, or Action on a bed service (the `bed` prompt is now a guest screen), sends `sleep`; Action again gets any player up (`wake`, host included). A `beds` message ({asleep, waiting}, names, sent when it changes; the host polls `bedStatus`) feeds the "who is left" line (`src/core/bednotice.ts`). After each night every connected guest gets the `farm` message (it replaces the `day` marker) and `GuestSession` swaps the copy in place, so random rolls cannot drift.
- Left: the guest's bed is any bed service on the scene's map (no cabin interior map yet, so "own cabin bed" is not enforced); a guest cannot tell they were put to bed by the limit except through the report; the bed, wake and notice flow is untested in a browser.
- Left (2026-11-20, ground drops): axe and pickaxe intents now leave drops as ground piles on the host's ground (note 43), and only the host's own player walks over them to pick them up, so a guest's drops need a guest pickup path (a `pickup` intent or collecting by sender position) and the piles are not in the `farm` sync message yet.

**Added 2026-11-20 (owner, checked in Stardew):** the Social tab lists the other players above the spouse, then the roster, then the children. Not built (the tab shows no player rows yet).
