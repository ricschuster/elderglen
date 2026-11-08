# 00 Project Brief (draft)

Status: draft. The pillars and non-goals below are proposals drawn from
`docs/design/01_system_map.md`, not decisions. Sections marked TBD are still
template placeholders.

## What this is

TBD. The game's name is Elderglen (`docs/decisions/0011-game-name-elderglen.md`).
"Beaver Valley" survives only as the repo and build working title.

A cozy farming-life game, inspired by Stardew Valley but with its own setting,
names, art, audio and text (see `docs/decisions/0002-stardew-valley-inspired.md`).
The player runs a home farm, helps a village finish a chain of community
projects, and ventures into a wider world under a quiet, ambient threat.

## Identity (draft, issue #15)

Decided in discussion on 2026-10-15.

- **Two halves of the hook.** The community project chain is a big part of
  what the game is. Almost as important is the setting: a Middle-earth style
  fantasy world, in the spirit of The Lord of the Rings.
- **Core game stays close to Stardew Valley.** Day cycle, farming, foraging,
  skills, selling and bundles follow the original's approach (see ADR 0002).
- **Setting from the fantasy tradition.** Shire-like homeliness, old roads and
  ruins, a wider world beyond the valley. The content is our own: world, names,
  peoples and lore are invented (see
  `docs/decisions/0003-middle-earth-style-setting.md`).
- **Mood is much lighter.** Funny, warm and gentle, not epic or grim. The
  shadow in the wider world is backdrop, not a threat to the player.
- **No urgency.** No pressure to finish tasks beyond what the original does:
  seasons turn, and that is all.
- **A good evening feels** cozy and unhurried, with progress, curiosity and
  some humour.

## Who it is for

Decided 2026-10-15 (issue #13, draft like the rest of this brief):

- Release intent: a free hobby release, not a commercial Steam game. The
  Steam EULA and a commercial name check are therefore low priority. Art,
  audio, text and names must still be original or properly licensed (ADR 0002).
- Team: solo.
- Time: about 5 to 10 hours per week.
- Target length: 40+ hours for the main arc (the chain of community
  projects), and open ended after that, so play can continue past the ending.

Tension to manage: a solo developer at 5 to 10 hours per week cannot build a
40+ hour game quickly. The long length is the destination, not the first
playable. The first playable stays small and content is added in layers
(see Scope layers and `03_milestones.md`).

## The core idea (one screen)

Each day the player spends a limited amount of energy on the farm and in the
nearby world, then gathers, grows and makes goods. Those goods go toward
community project bundles. Finishing a project opens the next one, which
reaches further out. The farm is a safe, funny home base. The wider world is
where the bigger rewards and the quiet threat are.

## Pillars (draft)

These are the ideas every design choice should be checked against.

1. **Cozy first.** The default feel is relaxed and low-pressure. Losses are
   mild and recoverable, and nothing worsens just because time passes.
2. **A day is a set of choices.** Limited energy makes each day a small
   decision about what to do, rather than a to-do list that clears itself.
3. **Always a next goal.** A chain of community projects keeps a main goal in
   view after the first one is done. Each project must feel different in
   mechanics, not only bigger.
4. **Home base, wider world.** The farm and village are the heart. Expeditions
   are day trips that feed back into home, not a replacement for it.
5. **Warm, wry humour.** Affectionate comedy about everyday life and eccentric
   villagers. The ambient threat can be absurd as much as grim.
6. **Original throughout.** All names, places, characters, text and art are our
   own.

## Scope layers

Layers share one core: the day cycle, farming, and community bundles.

1. **Layer 1, home valley (ring 1).** Farm, village, village hall (centre 1),
   basic foraging, fishing and animals. Open from the start.
2. **Layer 2, the regions (ring 2).** About 4 or 5 biomes gated by tool or
   bridge upgrades. Centre 2 sits at a crossroads and draws on several regions.
3. **Layer 3, the dark edge (ring 3).** Optional, late, high risk, entered in
   runs. Centre 3 may sit here. Not settled.

Pacing target for an experienced player: about 1.5 years in game for centre 1,
about the same for centre 2, about 1 year for centre 3.

## MVP scope

TBD. Proposed starting point, to be confirmed and recorded in
`docs/design/03_milestones.md`: the day and energy cycle, farming and
foraging with their skills, selling, and a small version of centre 1, all in
the home valley only.

## Explicit non-goals (for now)

"For now" means not before the earlier layers are playable and fun. None of
these is ruled out forever.

- **Ring 3 and centre 3.** No dark edge until layers 1 and 2 work.
- **Real-time combat.** The largest scope item. The first playable has none.
- **A real-time threat clock.** The threat is ambient. No timers or game overs.
- **Multiplayer.** Not in the first playable or M3. Planned as milestone M4,
  between the ring 1 systems (M3b) and the rest of ring 1 (decided 2026-11-02, ADR 0007, moved by ADR 0012, which
  reverses the 2026-10-15 decision in issue #18). A design note settles its
  form first. Until then, single player is the build.
- **Generated content.** Regions are hand-built first.
- **Deep relationship systems.** The first playable has at most a few simple
  villagers.
- **Copying the original.** No Stardew Valley names, art, audio, characters,
  text or code.
- **Polish and store release.** The name is chosen (Elderglen). Not before there is a fun
  playable.

## Design principles

1. Prove the core loop with rough art before adding systems.
2. Cut or defer before adding. New ideas become issues, not scope.
3. Prefer systems that can be added later without reworking the base (for
   example the threat options in the system map).
4. Record big decisions in an ADR and design notes in `docs/design/`.

## Open questions

- Project name. Avoid names that sit close to the original's branding or to
  Tolkien's names. Also avoid anything beaver related (reader 1, 2026-10-27).
  Direction: build the name from the lore names (Brimmers, Thimblemoss,
  Hearthwell, The Long Table), which the reader liked.
- Engine and language (needs an ADR).
- What centre 3 is (issue #5).
- Whether ring 3 has combat, and how much.
- The repo licence: decided, see `docs/decisions/0006-project-licence.md`.
