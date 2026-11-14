# M4 hosting spike: issue text

**DRAFT. The owner approves this before it is filed. Do not copy it into a GitHub issue until then.**

## Title

M4 hosting spike: prove a host and guests on a real router, size the tablet host and the farm state

## Why

M4 (multiplayer, ADR 0007, moved behind M3b by ADR 0012) is blocked on a hosting spike
(`docs/design/03_milestones.md`, M4 row; `docs/design/53_multiplayer.md`, build order step 0).
Hosting cost and feasibility were unknown in ADR 0007, and M3c and M3d now wait behind M4, so a
wrong answer late is expensive. The design (note 53) says: same network only, up to 8 players,
the host runs the world, guests are thin clients, WebSocket carrying JSON, a desktop host
through Electron and a tablet host through a Capacitor plugin (ADR 0008). Several claims there
are untested, and three other notes parked questions for this spike:

- Note 53 Open: eight players on a tablet host was never measured (the earlier prototype measured a
  host and two guests, about 30 ms round trips). Snapshot size, full state against changes
  only, "settled in the spike".
- Note 81, decision 9: the largest map is 120 by 120 tiles and a client holds one map in
  memory (ADR 0005). A host may need several maps at once, because players can be on
  different maps and the nightly area rules run for every area. Not checked in the code. It
  may change the cap. The SM-T500 load test is by hand (#523).
- Note 81, decision 12 and note 53 "Layout effects": players block each other, and the rules
  need a way to free a jam.
- ADR 0014: committed map files are never rewritten, so placed items, buildings, tilled soil
  and trees live in the save. The spike must confirm that farm player state in the save stays
  small enough to send and to store per player.

## Questions to answer

1. **Link.** Do a host and a guest talk reliably on a real home router (desktop host, tablet
   host, browser tab guest)? What are the round trips, and what breaks (client isolation,
   mDNS or broadcast for the game list, typed address fallback)?
2. **Tablet host load.** With the Capacitor host plugin on the SM-T500 class tablet, how many
   guests can it carry (target 8 players including the host, may be 4)? Measure frame time, memory,
   battery and heat under 2, 4 and 8 simulated players walking, farming and fighting.
3. **Several maps on the host.** Does the host need more than one map in memory at once (players
   on different maps, nightly area rules for every area)? What does this cost with a 120 by 120
   map, and does it force a lower cap, a lazy load, or a rule that rules run on map data
   without tile layers?
4. **Farm state size.** How big is the farm part of the save and of a join snapshot (placed items,
   buildings, soil, trees; ADR 0014) on a late-game farm? Full snapshot against deltas: which one, and
   how often? What is the per-player record size across 8 players?
5. **Jam freeing.** Which rule frees a jam (slide past, push through after a moment, brief pass-through) and
   does it hold up with latency? Does it need host authority, or can it be local?

## Scope and timebox

- Timebox: about one week of work, one branch, one PR. Stop and report if it grows. The spike produces
  numbers and a recommendation, not shipped features.
- A throwaway Node test host plus a minimal guest that joins and walks (build order steps 2 and 3 in
  reduced form), kept under `scripts/` or `spikes/`, not in `src/core/`.
- A synthetic load generator for 8 players on the host, and a state-size measure on a generated
  late-game farm.
- By-hand runs on the owner's real router and tablet. The agent writes the harness and the
  owner (or a helper) runs it; list what needs hands in the result.

## Out of scope

- Play over the internet, a relay or any hosting bill (note 53 says not planned).
- The Host and Join screens, cabins, money modes, shared day end, chat (build order steps 4 to 7).
- Native Electron hosting and the tablet plugin as product code (step 8). The spike may use a minimal
  plugin only to measure.
- Splitting `GameState` into world and players (step 1), beyond what a measurement needs.
- Any change to map sizes or the 120 by 120 cap. The spike only recommends one.
- Marriage, regions, story work.

## Acceptance (what the spike must produce)

- A short report in `docs/design/` (or an addition to note 53) with measured numbers for each question above.
- A recommended tablet player cap, and either confirmation of the 120 by 120 map cap for a host or a
  proposed change (an ADR if it changes).
- A recommendation on snapshot format (full or deltas), with measured sizes, and a verdict on whether
  the farm state in the save stays small enough (closes the ADR 0014 follow-up).
- A recommended jam-freeing rule for the M4 rules, with a note on where it runs.
- The measurements and test harness committed so they can be re-run.
- Notes 53, 81 and the M4 row in `03_milestones.md` updated, and a new ADR if the hosting plan or cost changes
  (ADR 0007 consequence).
- Follow-up issues listed for M4 build order steps 1 to 8, in the M4 milestone.

## Labels and milestone (suggestions)

- Milestone: M4 (multiplayer). It is the first item, and it gates the rest of M4.
- Labels: `work-package`, `design-question`, and `next-payoff` only if the owner wants it to lead the queue
  once M3b is finished.
- Link: #523 (SM-T500 load test), ADR 0007, 0008, 0012, 0014, notes 53 and 81.
