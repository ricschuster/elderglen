#!/bin/bash
# The ingest commands used for the downloaded slots (files were saved from OpenGameArt into $1).
# Re-run after changing the encoder settings. Ledger rows are added once by ingest.mjs.
set -e
D=${1:?"usage: ingest-downloads.sh <folder with the saved source files>"}
I() { node "$(dirname "$0")/ingest.mjs" "$@"; }
I "$D/catmint__catmint_in_c_major_looped.ogg" title --loopready --max 150
I "$D/daisy__daisy_0.ogg" spring --max 120
I "$D/2-whimsical-rpg-themes__RPG Overworld.flac" summer
I "$D/apple-cider-juiced__apple_cider_loop.wav" fall --loopready
I "$D/bluebonnet__bluebonnet_in_b_major_looped_0.ogg" winter --loopready --max 120
I "$D/another-august__013_Another_August_0.mp3" night --max 150
I "$D/calm-piano-1-vaporware__003_Vaporware_2.mp3" rain --max 150
I "$D/2-whimsical-rpg-themes__RPG town.flac" village
I "$D/beautiful-forest-orchestra__beautiful_forest_16bit_44.1khz_1.ogg" woods
I "$D/bossa-town__Bossa Town.wav_2.flac" beach --max 120
I "$D/a-small-fire-will-do-calming-loop__a_small_fire_will_do.wav" interior
I "$D/apple-cider-juiced__victory_3.wav" bundle --oneshot
