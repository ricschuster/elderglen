# Audio reference

Design: `docs/design/107_audio.md`. Decision: `docs/decisions/0017-audio.md`. Licences:
`docs/audio/LICENCES.md`.

## What ships

`public/audio/` holds Ogg Vorbis files, committed. `src/content/audio-manifest.json` is generated from them.

| Folder | What | Made by |
| --- | --- | --- |
| `sfx/` | 91 effect ids, 152 files (variants as `id_1.ogg`, `id_2.ogg`) | `scripts/audio/sfx/*.mjs` |
| `ambient/` | 7 seamless loops | `scripts/audio/sfx/ambient.mjs` |
| `music/` | 18 slots, loops or a stinger | downloaded CC0 tracks (12 slots) or `scripts/audio/music/` |

## Rebuild

1. `npm run audio:build` (ffmpeg with libvorbis on the path). Seeded, so the same inputs give the same notes.
2. `npm run audio:verify`.
3. Commit `public/audio/` and `src/content/audio-manifest.json`.

Loops are stored with 0.5 s of their own tail before them and head after them (`loopStart` and `loopEnd` in
the manifest), so codec edge effects never reach the loop and playback is gapless.

## Tune a sound

Effects: edit the def in `scripts/audio/sfx/defs-a.mjs` or `defs-b.mjs` (`gain` is the in-game level,
`peakDb` the file peak, `pitch` and `gainJitter` the per-play jitter, `variants`, `cooldownMs`), then
`npm run audio:build -- --only <id>`. Ambient: `scripts/audio/sfx/ambient.mjs` (`gain`, `level` in LUFS).
Music placeholder: `scripts/audio/music/tracks.mjs` (tempo, mode, progression, voices, mix, reverb). Mixer
defaults, ducking, cross fades and the map to area table: `src/content/audio-rules.json`.

## Swap in a file

Music: `node scripts/audio/ingest.mjs <file> <slot> --author "Name" --title "Title" --url <page> --licence CC0`
(add `--loopready` when the file already loops, `--oneshot` for a stinger). It trims silence, cross fades the
tail into the head, normalises to -18 LUFS, encodes, writes `public/audio/music/<slot>.ogg`, records the slot
in `scripts/audio/external.json` and adds the ledger row. Then `npm run audio:build`, `audio:verify`, and
`node scripts/audio/credits.mjs`. To go back to the placeholder, delete the slot from `external.json`, delete
nothing else, and run `npm run audio:build`.

Effects and ambient: save a recorded sound (CC0 or CC-BY, row in the ledger) over the file at the same path,
for example `public/audio/sfx/tool.hoe_1.ogg`, keep its peak near -6 dBFS, and do not run `audio:build` for
that id again (use `--only` for the others). To keep a replacement safe from a full rebuild, change its def's
`id` list in the script or remove the def and keep the manifest entry by hand.

## Licence rules

CC0 and CC-BY only. A CC-BY file must appear in `src/content/audio-credits.json` (the Options "Sound credits"
row shows it; the credits script builds it from the ledger). Never use Stardew audio (ADR 0002). Sites that
block automated clients: list URLs in `docs/audio/urls_music.txt` for the owner to save by hand
(today: Kenney's CC0 sound packs, optional recorded effects to swap in; kenney.nl answers automated clients with 403
and FreePD is closed).

## Checks

- `npm run audio:verify`: per file clipping, true peak, loudness, head and tail silence, loop seam, size.
- `npm test` (`tests/audio.test.ts`): ids in code exist, files exist, selection rules, mixer maths, settings.
- `npm run playtest:audio`: real play fires the events and changes the music.
- Audition by ear: `npm run dev`, open `/audio.html`.

## Not auditioned

Downloaded tracks were picked from page descriptions and measured loudness, not by ear. The synthesised
effects and music were checked by measurement only. Expect to swap some.
