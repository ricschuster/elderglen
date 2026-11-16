# 52 Save and exit (draft)

Status: draft. The build design for the split is "Build design (2026-11-16)" below. Decided with the owner on 2026-11-02. Nothing here is built
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
- **Five slots (decided 2026-11-11, built 2026-11-11 except export and import, which Options does not have yet).** Replaces the one slot.
  The title screen shows five slot cards. A used card reads farm name, season
  and day, year and gold, with Continue and Delete; an empty card has New game.
  Slots are fixed at five, as the owner chose (Stardew lists every saved farm
  with no fixed cap, from memory, SC-124). Delete asks to confirm. Each slot
  keeps its own two records (the day-end save and the resume record), so
  rolling back one never touches another. Export and import work on the chosen
  slot, and import asks which slot to fill. The existing single save moves into
  slot 1 the first time the new build loads, nothing lost. Settings stay apart.
  Storage keys carry the slot number (`elderglen-save-slot-N`, `src/core/slots.ts`).
  The move needed no save version bump: the record is unchanged, only its key
  moves, and the old key is dropped after the copy reads back identical. The
  slot last played is remembered, so `?new` and Start over use it.
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

## Built status

- 2026-11-14: Exit saves the day in progress (with the clock) and goes to the
  title, no confirm, so Continue resumes it. This uses the one slot record the
  game already writes. The split into a night record and a resume record is
  not built, so there is no Restart this day, no page-hidden write, and Exit
  overwrites the morning save. The stale comment above `save()` is fixed.

## Build design (2026-11-16)

Design only. Written against the code as of 2026-11-16: one record per slot,
`serialize`/`deserialize`/`saveGame`/`loadGame` in `src/core/save.ts`,
`slotKey` and `slotStore` in `src/core/slots.ts`, `browserKv` and
`browserStore` in `src/scenes/storage.ts`, `FarmScene.save()`, `ExitScene` and
`TitleScene`.

### What the code does today, and why that is a problem

- `FarmScene.save()` writes on sleeping (`endDay`, after `sleep()` has already
  advanced the day), on menu close and map change, and from Exit. All of them
  write the **same key** (`elderglen-save-slot-N`). So the morning save is
  overwritten by the first menu that closes. There is no night record in
  practice.
- Other scenes call `saveGame(browserStore, state)` directly: `LedgerScene`,
  `HallScene`, `HeartEventScene`, `SummitScene`, `ChildAskScene` and
  `EndScene` (new game). Under the split each must say which record it writes.
- `TitleScene.begin()` calls `state.forage.respawn` and `respawnAreaForage` on
  every Continue, so the forage field rerolls on each load. The forage fields
  (`GameState.forage`, and `areas[id].forage`) are not in `SaveData`.
- `KeyValue.set` swallows failures, so no caller can tell a write failed.
- The player's tile is not saved. Only `resumeMap` is, and only for the cellar
  (`resumeAt` in `src/core/house.ts`). Continue after Exit puts you at the map
  entry, not where you stood.
- Nothing listens for `visibilitychange` or `pagehide`.

### Storage layout

Two keys per slot. The existing key stays the night record, so nothing moves.

| Key | Holds | Written by |
| --- | --- | --- |
| `elderglen-save-slot-N` (unchanged) | the **night record**: the state at the morning | sleeping, new game, import |
| `elderglen-resume-slot-N` (new) | the **resume record**: the day in progress | the resume events, Exit, page hidden |

Why two keys and not one envelope: a resume write is frequent and must not
rewrite, and so risk, the night record. The cost is that the pair is not
written atomically, which the day check below absorbs.

`deleteSlot` and Start over remove both keys. `slots.ts` gains `resumeKey(slot)`
and `slotStores(kv, slot)` returning `{ night: SaveStore; resume: SaveStore &
{ clear(): void } }`. `browserStore` becomes `browserStores`.

### Data shapes

Both records are the existing `SaveData` JSON, read by the one `deserialize`.
`SAVE_VERSION` stays 3 (no field changes meaning or becomes required). These
optional fields are added; old saves lack them and old loaders ignore them:

```ts
interface SaveData {
  // existing fields ...
  /** Which record this is. Absent on saves from before the split: read as night. */
  kind?: "night" | "resume";
  /** Wall clock ms when written. Display and tie-break only, never game logic. */
  savedAt?: number;
  /** Resume only. Where the player stands, so Continue puts them back. */
  at?: { map: string; x: number; y: number };
  /** The day's wild goods, rolled once and stored (the rolls rule). */
  forage?: ForageSave; // the farm field; areas[id].forage likewise
}
type ForageSave = Array<{ x: number; y: number; id: string }>;
```

- `at` generalises `resumeMap`. Keep reading `resumeMap` for one version so
  records from before still resume in the cellar; stop writing it. `resumeAt`
  reads `at` first.
- `ForageField` gains `save()` and `load()` over its `found` map. A missing
  `forage` means "roll on load", the old behaviour, so the loader needs no
  migration. `TitleScene.begin()` rolls only when the field is missing.
- The morning roll in `sleep()` happens before `saveNight`, so the night
  record holds the day's forage and weather.
- Everything else rolled in a day is already in the records (weather,
  `tomorrow`, the bin, ground items, creature lists with `creaturesDay`, mine
  floors with `day`). A new daily roll is added to `serialize` the day it is
  built.
- `at` is written only on maps that load from a plain tile (farm, house,
  cellar, village). In the mines and combat areas it is omitted and Continue
  uses the map entry, since a tile inside a fight is not safe to restore.

### Core API (`src/core/save.ts`, free of Phaser and the DOM)

```ts
saveNight(stores, g): WriteResult   // night write, then resume.clear()
saveResume(stores, g, at?): WriteResult
loadSlot(stores): LoadedSlot
type WriteResult = { ok: true } | { ok: false; reason: "refused" | "quota" };
type LoadedSlot =
  | { status: "empty" }
  | { status: "broken" } // neither record reads
  | { status: "used"; night?: GameState; resume?: GameState;
      play: GameState; // the resume if valid, else the night
      note?: "resume-unreadable" | "night-unreadable" };
```

Rules inside `loadSlot`:

1. Parse the night record with `deserialize`.
2. Parse the resume record. It is **valid** only if it parses and its day
   number equals the night record's (sleeping advances the day). With no night
   record it is valid on its own.
3. `play` is the resume when valid, else the night.
4. An unreadable resume with a readable night plays the night and sets
   `note: "resume-unreadable"`; the title says so once.
5. A stale resume (an earlier day) is ignored, and removed on the next write.

`saveGame` is deleted so the compiler lists every call site:

| Site | Becomes |
| --- | --- |
| `FarmScene.endDay` (after `sleep()`) | `saveNight` |
| `FarmScene.save()` on menu close and map change | `saveResume` |
| `ExitScene.press` | `saveResume`, then to the title |
| `LedgerScene`, `HallScene`, `HeartEventScene`, `SummitScene` | `saveResume` (they run mid-day) |
| `ChildAskScene` (runs inside `endDay`, after sleep) | `saveNight` |
| `EndScene` and `FarmChoiceScene` (a new game) | `saveNight` of the new game |

`endDay` order: `sleep()`, `saveNight` (which clears the resume), then the
report scenes. Stardew saves after the profit screen is accepted (saved Day
Cycle page, SC-198); ours saves before, so a page kill during the report loses
nothing. The report is not saved, so a reload during it skips it; accepted.

### Write triggers

A small `ResumeWriter` in `src/scenes/` (it touches the DOM), owned by the farm
scene:

- Calls `saveResume` on: a menu or sub-scene closing, a map change,
  `visibilitychange` to hidden, `pagehide`, and Exit.
- Skips a write when nothing changed, using a dirty flag set where actions
  already call `render()`. Never on a timer.
- Debounces to one write per 2 seconds, except the hidden, pagehide and Exit
  writes, which are immediate and unconditional.
- `serialize` and `localStorage.setItem` are synchronous, which is why this
  works in `pagehide` where IndexedDB would not.
- Does nothing while `state.day.over` (between `sleep` and `saveNight`), so a
  resume of the old day cannot land over the night.
- Exists only while the farm scene runs, so the title and farm-choice scenes
  never write.

Size: measure one late-game `serialize` string before step 1 (`npm run sim`
output is enough). Browsers allow about 5 MB per origin; five slots of two
records must stay under it. If a record passes about 400 KB, decide then what
to trim; nothing is decided now.

### Restart this day

- Shown on a slot card only when a valid resume record exists.
- The first press turns the button to "Sure?" (as Delete does), because it
  discards the resume record for good.
- On confirm: `resume.clear()`, then play the night record. Forage and weather
  are the stored morning ones, so the day replays the same.
- Not offered when the night record is unreadable.
- Never touches the other slots or the settings.

### Title summary

`SlotInfo` gains the `LoadedSlot` fields. A used card reads as today (farm,
season and day, year, gold) with a second small line when a resume exists:
"Day in progress, 2:40 pm, 1,240g", taken from the resume, so the player sees
what Continue loads. Buttons: Continue, Restart this day (when a resume
exists), Delete. The card is 50 px tall at 58 px spacing; a second line needs
about 62 px, which does not fit five cards in 540 px without shrinking the
heading. Settled when built; the fallback is the second line replacing the
"year" text. Enter continues the last played slot, as now.

### Export and import (Options)

Export, for the chosen slot, downloads `elderglen-slot-N-day-D.json` (a Blob
and an `<a download>`; the installed app needs a Capacitor file path, a later
step under ADR 0008):

```json
{
  "format": "elderglen-export",
  "exportVersion": 1,
  "game": 3,
  "exportedAt": 1788000000000,
  "night": { "...": "the night SaveData, verbatim" },
  "resume": { "...": "the resume SaveData, omitted when none" }
}
```

Settings are never included (they are per device). Import reads a chosen file
and checks, in order:

1. Over 5 MB: refused before parsing.
2. Not JSON, or wrong `format`: "That file is not an Elderglen save."
3. `exportVersion` or `game` newer than known: "That file is from a newer
   version of the game."
4. `deserialize` of the night fails: "That save could not be read."
5. A resume that fails `deserialize` or the day check is dropped, and the
   result line says so; the night still imports.
6. Asks which slot to fill; an occupied slot asks to confirm replacing it.
7. Writes in the order **clear resume, write night, write resume**, then reads
   each back and compares. On a mismatch it says "Could not store the save".
   Any stopping point is a coherent slot (the old night with no resume, or the
   new night), so it never half-applies.

It never throws. The failed-write notice (decided above) lands in step 6:
`KeyValue.set` returns a boolean, `saveNight` and `saveResume` return
`WriteResult`, and a small notice in the farm scene shows "Could not save.
Export from Options to keep your game." once a session. Quota errors count.
`navigator.storage.persist()` is called once at first run in `storage.ts`.

### Migration of existing saves

Existing slots hold one record at `elderglen-save-slot-N`. Some were written
by Exit or a menu mid-day, so their clock is not the morning.

- No version bump and no rewrite on load. The old record is read as the night
  record (`kind` absent). No resume key exists, so Continue loads the night
  record and Restart this day is hidden.
- The first resume write after the update creates the resume record. The night
  record is not touched again until the player sleeps, so a mid-day old save
  stays "the morning" it never was, and Restart this day on that slot goes back
  to that old mid-day point. That is the best the data allows; it affects only
  the first day after the update (open question 6).
- The legacy keys (`elderglen-save`, `beaver-valley-save`) still move into
  slot 1 first through `migrateLegacySave`, as now.
- Forage missing from old records is rolled on load, as today.
- A test builds an old-shape record (no `kind`, `at` or `forage`), checks it
  loads as night and Continue plays it, and that the first `saveResume` leaves
  the night key's bytes unchanged.

### Failure cases

| Case | Result |
| --- | --- |
| Kill between `saveNight` and the resume clear | Resume holds the old day, night the new: the day check rejects it, and it is removed on the next write |
| Resume unreadable (cut off, bad JSON) | Continue plays the night; title note "Today's progress could not be read. Continuing from the morning." |
| Night unreadable, resume readable | Continue plays the resume; no Restart; the card says so; Export is offered |
| Both unreadable | Card "could not be read" as today, with Delete |
| Night write refused or over quota | Notice once; the game goes on; the resume is cleared only if the night write worked, so an old resume is never left paired with a failed night |
| Resume write refused | Notice once; the day plays on unsaved |
| Two tabs on one slot | Last write wins, as today. A tab whose loaded `savedAt` is older than the stored one, checked when it becomes visible again, shows "This game was changed in another window" and stops writing |
| Private window, storage disabled | `set` returns false; the notice shows once |
| Save from a newer build | `deserialize` refuses as now; the card should say "from a newer version" rather than "could not be read", which needs `deserialize` to return a reason |
| Reload during the report | The report is skipped; the new day is already saved |
| Page hidden while `day.over` | No write |

### Build plan, small steps

Each step leaves `npm run check` green and is testable alone.

1. **Records in core.** `resumeKey`, `slotStores`, `saveNight`, `saveResume`,
   `loadSlot`, the day check, `kind` and `savedAt`; `KeyValue.set` returns a
   boolean. Tests: night then resume round trip, stale resume ignored,
   unreadable resume falls back, unreadable night plays the resume, sleeping
   clears the resume, `deleteSlot` removes both, an old-shape record loads.
2. **Forage in the records.** `ForageField.save/load`, `forage` in
   `serialize` (farm and areas), `begin()` rolls only when missing. Tests:
   identical forage after save and load; a missing field rolls.
3. **Move every call site.** Delete `saveGame`, fix the sites in the table,
   rename `FarmScene.save` to `saveResume` and add `saveNight` in `endDay`.
   Run the `sim` bot to confirm it still sleeps and loads.
4. **Resume writer and `at`.** The triggers, `visibilitychange` and
   `pagehide`, the dirty flag and debounce, `at` on safe maps, `resumeAt`
   reading it. Playtest: close the tab mid-day, reopen, same tile.
5. **Title.** The summary line, Restart this day with its Sure? press, the
   notes for unreadable records, the card layout.
6. **Failed-write notice** and `storage.persist()`.
7. **Export and import** in Options, browser download first. The installed
   app's file path is a later step.
8. **Optional: a previous night.** On `saveNight`, copy the old night record to
   `elderglen-prev-slot-N` first. Only if the owner wants it (question 5).
9. **Docs.** Update Built status here, the Exit row in note 49, the handoff.

## Open

Questions for the owner from this design, each with Stardew first (claims in
SC-195 to SC-198, unchecked ones marked there):

1. Where Continue puts the player after a mid-day resume. (Stardew) The start
   of the day, in bed on desktop; the mobile behaviour is unchecked (SC-195).
   Ours (Recommended): back on the tile where they stood, except in the mines
   and combat areas, which use the map entry.
2. Restart this day. (Stardew) No such button: exiting mid-day on desktop
   returns you to the morning, so Exit is the restart. Ours (Recommended):
   keep the button, shown only when a day is in progress, with a Sure? press.
3. Writing the resume record on desktop. (Stardew) Desktop never saves
   mid-day; only mobile does (saved Player Menu page). Ours (Recommended): write
   it on every device, so a crash or closed tab never loses a day.
4. What an export holds. (Stardew) The save file is the morning state only, and
   there is no in-game export (from memory, SC-197). Ours (Recommended): both
   records in one file, so a day in progress travels too. The alternative is
   the morning only.
5. A backup of the previous night. (Stardew) Keeps an older copy of the save
   file, from memory, unchecked (SC-196). Ours (Recommended): keep one previous
   night record per slot, so a bad night write can be undone. The alternative
   is none.
6. Old saves written mid-day by Exit. (Stardew) Not applicable, since it never
   saved them. Ours (Recommended): load as the morning record as is, with
   Restart hidden until a resume exists. The alternative is to copy the old
   record into both records, so Restart returns to that same point at once.

Also open:

- Whether `navigator.storage.persist()` helps on a tablet browser, found by
  trying it on the real device (#59, #63).
- Whether a late-game record is small enough for five slots of two records
  (measure in step 1).
