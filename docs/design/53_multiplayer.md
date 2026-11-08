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
2. The `Room` and the protocol in `src/core/` and `src/net/`, no socket.
3. The socket, the Node test host, and a guest that joins and walks.
4. Host and Join screens, the game list, and the typed address.
5. Shared day end and a dropped guest.
6. Cabins (free at start, bought otherwise) and the join-needs-a-cabin rule.
7. The money mode and per-player shipping proceeds.
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
  gold each, instantly. A cabin is upgraded by its occupant. Demolishing one
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
