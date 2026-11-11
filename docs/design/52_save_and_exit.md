# 52 Save and exit (draft)

Status: draft. Decided with the owner on 2026-11-02. Nothing here is built
except what the code already does: one save in `localStorage`, written on
sleeping and when a menu closes, with the time of day stored
(`src/core/save.ts`, `src/scenes/storage.ts`). Stardew's behaviour here is from
memory; SC-01 (owner, 2026-11-03) confirms it saves only on sleeping and that
Exit to Title discards the day.

## Why not Stardew's strict save

Stardew saves only when the player sleeps (from memory). Its reasons look like
a clean daily reset point, villagers and monsters in motion that would be hard
to store mid-day, and a day that cannot be taken back. Our state is small plain
data, so the cost argument does not apply. The tablet argument is strong: a
mobile browser can kill the page whenever the player switches apps, and losing a
whole day to that would be worse than any undo it prevents. So we depart.

## Decisions

- **Two records (decided 2026-11-02, ours).** The **night record** is the
  committed save, written when the player sleeps. It holds the state at the
  morning the new day starts. The **resume record** is the day in progress,
  written quietly while playing. The night record is the only thing sleeping
  has to protect; the resume record is crash protection.
- **When the resume record is written.** When a menu closes, when the map
  changes, when the page is hidden or closed (the browser's `visibilitychange`
  and `pagehide` events, which matter most on a tablet), and when the player
  uses Exit. Never on a timer while the player stands still. Sleeping writes the
  night record and deletes the resume record.
- **Continue resumes the day (decided 2026-11-02).** If a resume record exists
  and belongs to the same day as the night record, Continue loads it, clock and
  all. The title shows "Day N, time, gold" for what Continue will load.
- **Restart this day (decided 2026-11-02, ours).** A second title button loads
  the night record, so a day that went wrong can start again from its morning.
  It asks to confirm, because it discards the resume record. It is shown only
  when a resume record exists.
- **Exit saves, then goes to the title (decided 2026-11-02, ours).** This
  reverses note 49's "Exit does not save" (Stardew, from memory). Exit writes
  the resume record. It needs no confirm, since nothing is lost. Exit Game for
  an installed app still waits for the wrapper ADR.
- **Reload is an accepted undo, rolls are not (decided 2026-11-02).** A player
  can reload to undo a mistake. This is cheap in a single-player cozy game and
  is taken as a known property. What must not happen is a reload that rerolls
  anything. The rule: **randomness is rolled once and stored.** Forage spawns,
  today's weather, the forecast, the shipping bin and goods on the ground all go
  in both records. Today the forage field is not saved and respawns on load
  (`GameState.forage`); that changes. Any future daily roll (a fish, a drop, a
  luck value) follows the same rule and is added to the records when it is built.
- **Export and import in Options (decided 2026-11-02, ours).** ADR 0004 asks
  for an export path because browser storage can be cleared. Export downloads one
  JSON file holding both records. Import takes such a file, checks it as a load
  does, asks to confirm replacing the current save, and says plainly if the file
  is unreadable or from another version. It never throws and never half-applies.
- **Ask the browser to keep the data.** Call `navigator.storage.persist()` on
  first run where it exists, so the browser is less likely to evict the save.
  Whether it helps on a tablet is untested.
- **A failed write is shown once (decided 2026-11-02).** Today a refused write
  is silent. The game shows a small notice, "Could not save. Export from Options
  to keep your game.", the first time it fails in a session and then stays quiet.
- **Five slots (decided 2026-11-11, not built).** Replaces the one slot.
  The title screen shows five slot cards. A used card reads farm name, season
  and day, year and gold, with Continue and Delete; an empty card has New game.
  Slots are fixed at five, as the owner chose (Stardew lists every saved farm
  with no fixed cap, from memory, SC-124). Delete asks to confirm. Each slot
  keeps its own two records (the day-end save and the resume record), so
  rolling back one never touches another. Export and import work on the chosen
  slot, and import asks which slot to fill. The existing single save moves into
  slot 1 the first time the new build loads, nothing lost. Settings stay apart.
  Storage keys carry the slot number; a save version bump covers the move.
- **Settings stay apart** (`45_controls_profiles.md`): per device, never in
  either record, never exported with a save.

## Record contents

Both records have the same shape, so one loader reads either. They carry the
version, the day and clock, energy, money, pack, farm, trees, ground, bin,
skills and professions, hall, tool tiers, house tier and build, weather, the
forecast, forage, festivals joined, and the later systems (the letter queue in
note 51, quests in 50, the journal and collections in 49 and 38). A record holds
the **player** fields (pack, money, skills, tool tiers) and the **world** fields
(farm, trees, weather, forage, hall, house) as separate groups in the code, so
the record is not welded to one person's whole life. Multiplayer is milestone M4
(ADR 0007) and designed in note 53. In Stardew co-op the host owns the world and saves on
sleep; a future mode might keep both records host-only, and Restart this day
would affect every player. No multiplayer work is added here.

## Versions

A record from another `SAVE_VERSION` is refused, as `deserialize` does. In practice
(`SAVE_VERSION` is 2) a new slice adds an optional field that old saves lack and
the loader defaults, so the version bumps only when a field changes meaning or
becomes required. A migration is written then if players exist who need one. The two records are
written together, so they share a version.

## Build order

1. The two records in `src/core/save.ts`, with forage saved, and tests: night
   written on sleep, resume on the events above, resume ignored when its day
   does not match, a bad record falling back to the other, a round trip.
2. The title: Continue with the resume summary, Restart this day.
3. The Exit tab: write the resume record, go to the title (needs the menu
   shell in note 49 step 1).
4. Export and import in Options, and the one-time failed-write notice.
5. Fix the stale comment above `save()` in `FarmScene.ts` ("the clock is not
   saved"), which the code no longer matches.

## Open

- Nothing blocks a build. Both Stardew claims (saves only on sleeping, Exit to
  Title discards the day) are confirmed by the owner (SC-01).
- Whether `navigator.storage.persist()` helps on a tablet browser, found by
  trying it on the real device (#59, #63).
