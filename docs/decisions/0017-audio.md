# Audio: offline synthesised effects, CC0 or CC-BY music, WebAudio playback

## Status

Accepted (2026-11-21, owner answers in the build brief). Design: `docs/design/107_audio.md`. Closes #527.

## Context

The game had no sound. The owner wants effects, ambience and per-season and per-place music at
roughly a quarter of a cozy farming game's polish, fully original (ADR 0002), small enough for tablets
(under 30 MB) and playable in the browser, the Capacitor WebView and Electron.

## Decision

**Effects and ambience are synthesised by scripts and rendered offline to Ogg Vorbis.** Scripts in
`scripts/audio/` (seeded, so a rebuild is repeatable) write files into `public/audio/`, which are
committed. We chose offline rendering over runtime WebAudio synthesis because: it costs no CPU or
garbage on a tablet in the middle of a fight; every sound is a plain file, so a recorded or
downloaded replacement drops in by id; loudness and peaks can be measured and checked in CI-like
scripts; and the same loader serves music. The cost is repository size (about 3 MB), accepted.

**Music** is a downloaded CC0 or CC-BY track when a fit exists, otherwise a synthesised loop composed
as note data in `scripts/audio/music/` (plucked and piano-like voices, slow tempos, simple chords).
Downloaded tracks are normalised, loop-crossfaded and re-encoded by `scripts/audio/ingest.mjs`. We
prefer CC0 so no credits are owed; a CC-BY file needs a credits entry in Options.

**Format.** Ogg Vorbis (libvorbis through `ffmpeg`, the only encoder on the build machine besides
lame). Chromium based WebViews and Electron decode it; mp3 is not shipped. Budget 30 MB.

**Playback** is the WebAudio API directly (`src/audio/`), not Phaser's sound manager, so the mixer,
cross fades, ducking and ambient layers are ours and testable. Rules (what plays when) are pure code in
`src/core/audio.ts`. A director reads the running scenes, so most sounds need no per-scene calls.

**Licence rule.** CC0 and CC-BY only. Every third party file has a row in
`docs/reference/audio/LICENCES.md` (file, title, author, licence, source URL). Sites that block
automated clients are listed in `docs/reference/audio/urls_music.txt` for the owner to save by hand.

## Consequences

- Positive: original, deterministic, small, swappable by id, no runtime synthesis cost, objectively
  verifiable (loudness, clipping, seams).
- Negative: synthesised effects sound simpler than recorded ones, and the build cannot judge taste. The
  owner should audition (`audio.html`) and swap weak slots.
- The build needs `ffmpeg` on the machine that runs `npm run audio:build`; the output is committed so
  nobody else needs it.
