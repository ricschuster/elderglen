# Playtest crash investigation (2026-11-14)

Status (2026-11-14, updated 20:15): leading cause is the root NVMe (Samsung 960 PRO, btrfs) dropping
out or hanging at runtime, not the playtests or the scheduler. Freeze 5 happened with no playtest
running, and a photo of the screen showed btrfs write errors (EIO) on `nvme0n1p4`. See the 20:15
correction at the end of this file. Heavy Chromium load (`sweep.mjs` at `WORKERS=12`) makes it more likely
but is not required. Not yet confirmed: test with `nvme_core.default_ps_max_latency_us=0 pcie_aspm=off`,
reseat the drive, back up first. The sections below record the earlier (superseded) scheduler and
hardware hypotheses and are kept as history. Update the trace log at the end of this file at each milestone.

## What happened

The machine froze three times on 2026-11-14 (MST). The owner hard reset it each time. It
did not answer `ping` or `ssh` while frozen, so it is a full kernel or hardware hang, not
only a display, GPU driver or Claude session problem. Each freeze came within minutes of a
many-worker sweep starting (8 to 13 headless Chromium browsers):

| # | Time | Kernel evidence | What was running |
|---|------|-----------------|------------------|
| 1 | 09:32 oops, froze about 09:40 | Oops in `chrome-headless` exit, `sched_mm_cid_remove_user` | A sub-agent's festival sweep at `WORKERS=11` then `12` (09:19 to 09:31), several dev servers on port 5199, `pkill -f chrom`, then `npm run check` |
| 2 | 18:41 | Oops in `__schedule` via `sched_yield` (a write to a kernel-text address) at 18:41:29; hard-lockup watchdogs on many CPUs in `native_queued_spin_lock_slowpath` at 18:41:50 | secret-woods, sweep and vitest launched together at 18:39; about 8 Chromium scopes started 18:39:51 to :56 |
| 3 | about 10:27 | None: the log just stops (last line 10:27:51), so it froze before anything reached the disk | A foreground `sweep.mjs` started 10:25:12; 13 Chromium scopes started at 10:25 |

Notes on the table:
- Crash 1: the machine kept running for minutes after the oops (agent commands continue to
  09:38), then wedged. A scheduler oops can leave a lock held.
- Crash 2: all CPUs stuck waiting on one spinlock after a scheduler oops fits a runqueue
  lock that was never released.
- Worker counts: sub-agents used 11 to 12. #932 later cut the default to 4. The count for
  crash 3 is unknown (the pre-#932 file is not in git history).
- Sub-agents are not the cause as such. Crash 3's session had none. They raise the odds
  because they start their own sweeps and dev servers at once.
- The owner first suspected sub-agents. The transcripts show a many-worker sweep in all
  three windows, with or without one.

Other sessions running at the time (owner, 2026-11-14): the owner also had a Claude
session on the finance-tracker project (Electron: Chromium plus a GPU process). Its
transcripts show activity only at freeze 2: session `028f2850` ran 17:03 to 18:39 (with
sub-agents 17:57 to 18:06), and at 18:35 to 18:39 it ran `rebuild:electron`, `build` and a
loop of Electron UI scripts, two minutes before the freeze. No finance sessions ran
09:10 to 09:41 or 10:10 to 10:28. Whether the app was open at freezes 1 and 3: the owner
is not sure, but usually does not have it open, so probably not. It adds Chromium and NVIDIA GPU load but does not change the pattern that
each freeze had a many-worker sweep in its window.

## Ruled out

- Memory exhaustion: 251 GB RAM, no OOM-killer entries, Chromium scopes peak at 20 to 65 MB.
- A display or GPU-only hang: the machine does not answer `ping` or `ssh`.
- One bad core: userland segfaults hit CPUs 4, 11, 16, 36 and 37.
- Playtest script bugs: both oopses are in kernel scheduler code.
- Not ruled out, not tested: RAM or CPU instability (no ECC counters, so a clean log
  proves little), and the proprietary NVIDIA module (580.178.04, tainted P and O, absent
  from both traces).

## Environment and timeline

Kernel `7.0.0-43-generic` (`7.0.0-42` is still installed), Threadripper 3960X, 256 GB
RAM, ROG Zenith II Extreme, 48 threads.

- 2026-11-07: kernel `-42` installed. Boots up to then ran `-38`.
- 2026-11-10: kernel `-43` installed. First booted Nov 11 05:30 and ran 3 days under heavy
  playtests with no oops until Nov 14 09:32. So `-43` plus playtests did not crash it at once.
- 2026-11-11 04:52 to 05:26 (on `-42`): a burst of random userland segfaults (gwenview,
  firefox, node, chrome-headless-shell). A separate event, no freeze. Random segfaults in
  unrelated programs suggest unstable hardware or settings, or a kernel bug.
- 2026-11-13 03:02: Playwright Chromium 1254 installed (earlier runs used 1248).
- 2026-11-13 12:44: unattended glibc upgrade (2.43-2ubuntu2.4 to .7).
- The Electron crashes in coredumpctl from Nov 13 are the owner's new finance-tracker
  project (started Nov 13). They are not a signal about this problem.

## Hypotheses, ranked

1. Intermittent hardware or settings instability (RAM profile, CPU boost) that only
   shows under heavy multithreaded load. Fits the random userland segfaults on `-42`.
2. A new userland trigger (Chromium 1254 or the glibc update) hitting a kernel scheduler
   bug. Both precede the first oops.
3. A plain kernel `-43` regression. Rated lowest, because the earlier 3-day run on `-43`
   was fine. An upstream report matches crash 1 (lkml, Feb 2026, "sched_mm_cid_exit+0xe2:
   page fault on CID bitmap write", 6.19.0, fixed by commit `1e83ccd5921a`; related patch
   "sched/mmcid: Don't assume CID is CPU owned on mode switch"). No report names
   `7.0.0-43`, and crash 2 is in `__schedule`, a different function.

## Test plan

All read-only checks are done. Steps, in order:

1. Baseline (running, started 19:05): one expert playtest, `SPEED=2`, Chromium 1248,
   CPU-capped (800%) with a memory limit. Gentle: 7 to 9 Chromium processes. A clean pass
   proves little.
2. Stress test (queued, starts about 20 s after the baseline): `sweep.mjs` at `WORKERS=4`,
   then 8, then 12, each limited to 10 minutes, 30 s apart. Chromium 1254, no CPU cap
   (the crashes had none).
3. If a step freezes the machine, that step is the threshold. Repeat it on Chromium 1248
   (`CHROMIUM_PATH`), then on kernel `-42` (owner reboots into it).
4. Owner: `sudo dmidecode -t memory | grep -iE "speed|configured"` (is RAM above its
   JEDEC speed? try the default), then memtest86+.
5. If only `-43` freezes and memtest is clean: report to Ubuntu with the oops traces
   (09:32 `sched_mm_cid_remove_user`, 18:41 `__schedule`).

Diagnostic setting applied by the owner at 19:33 (not persistent, lost at reboot):
`kernel.panic_on_oops=1` and `kernel.panic=10`. An oops now reboots the machine after 10 s
instead of leaving it wedged, and `efi_pstore` is loaded so the trace may be kept (check
`/sys/fs/pstore/` and `journalctl -b -1 -k`). If it freezes anyway with no oops, that points
away from scheduler code toward hardware or the GPU driver.

## Rejected mitigations

The owner rejected anything that only hides the problem: a run lock in `lib.mjs` (written
and tested, then reverted), and a CLAUDE.md rule that sub-agents never start sweeps. Do not
add mitigations until the cause is found. (Memory note `project-parallel-playtests` says run
one playtest at a time, which is a working habit, not a fix.)

## Reading the trace after a freeze

The session scratchpad is lost after a reboot, so a mirror copies the logs every 10 s to
`playtest-out/crash-trace/` (git-ignored, in the repo folder):
- `heartbeat.txt`: time the mirror last ran. If it goes stale, that is the freeze time.
- `steps.log`: which stress step was running.
- `r3-sampler.log`: load, free memory, Chromium count every 3 s. `sampler.log` is the baseline.
- `playtest.log`, `r3-sweep-<N>.log`, `dev.log`.

Kernel evidence after the reset: `journalctl -b -1 -k | grep -E "Oops|BUG|LOCKUP"`.
While frozen, try `ping` and `ssh` from another device and note the result.

## Minor gap (not a cause)

`marriage.mjs`, `secret-woods.mjs` and the sweep probe have no try/finally around the
browser. Playwright's exit handlers clean up unless the process is SIGKILLed.

## Trace log (append a line at each milestone)

- 19:05 baseline started.
- 19:13 stress test queued, mirror running.
- 19:33 owner applied the sysctl (`panic_on_oops=1`, `panic=10`).
- 19:35 baseline still running (about 1,800 s, day 5, load about 11, nothing wrong).
- 19:36 baseline stopped by the owner's call (too gentle to matter). It ended with the bot
  message "day 5 script error: select 5 got 4", exit 1: a bot-script issue, not related.
- 19:51 owner noted the finance app was also running; see 'Other sessions' above.
- 19:36:48 stress step 1 started: `sweep.mjs` at `WORKERS=4`, Chromium 1254, no CPU cap.
- 19:46 step 1 (`WORKERS=4`) finished, 140 runs, no freeze. 19:47 step 2 (`WORKERS=8`) started; load about 67, 56 Chromium processes at 19:51.
- Next if 12 workers survive: add a second load (vitest, a parallel playtest, an Electron run) alongside, as in freeze 2.
- 19:57 step 2 (`WORKERS=8`) finished its 10 minutes with no freeze (peak load 75, 79 Chromium processes). Step 3 (`WORKERS=12`) started 19:57:48.
- Correction to the earlier remark about sweep "failures": the `timeout 600` cap killed each
  sweep before it finished (63 of 140 done at 4 workers, 106 at 8). The FAIL lines are
  "Target page, context or browser has been closed" from that kill, not bot bugs. The load
  ran for the full 10 minutes either way, so it is still a valid stress step.
- 20:00:12 FREEZE 4, reproduced on demand. Step 3 (`WORKERS=12`, Chromium 1254, kernel `-43`) froze
  the machine about 2.5 minutes in (37 to 41 of 140 runs done, load 88, 84 Chromium processes,
  240 GB free). Heartbeat last at 20:00:10, last journal line 20:00:12 (sysstat), then nothing
  until the owner's reboot at 20:02. No Oops, BUG, lockup, MCE or EDAC lines in `journalctl -b -1 -k`.
  The sysctl (`panic_on_oops=1`) was set for that boot, so a scheduler oops would have rebooted
  it. It did not. Result: a silent hang with no kernel trace, which points away from the
  scheduler oops of freezes 1 and 2 and toward hardware, the NVIDIA module or a hang too early
  for the log. Threshold on this kernel and browser: 4 and 8 workers survive 10 minutes, 12 hangs
  within 3 minutes (load 80+, about 84 Chromium processes). `pstore` needs sudo to read, not checked.
  Next: repeat `WORKERS=12` on kernel `-42` (owner reboots into it), then on Chromium 1248,
  then memtest and the RAM speed check (step 4).
- 20:10 owner checked `sudo ls /sys/fs/pstore`: empty. No panic or oops was recorded for freeze 4,
  so the kernel never got as far as writing one. Fits a hard hang (hardware, power, thermal, or
  the GPU driver) rather than a software crash the kernel could catch.
- 20:05:22 FREEZE 5, with no playtest. Boot 20:02:00 (after the hard reset for freeze 4) ran only 3 minutes
  and the journal stops mid-activity (kded, PackageKit). No Chromium, Playwright, sweep or Claude process
  in that boot, only the desktop and the owner's `sudo ls /sys/fs/pstore` at 20:05:11. No Oops, BUG, MCE,
  EDAC, Xid or thermal lines. Owner rebooted again, boot 20:09:54 (idle temps fine: Tctl 53 C, NVMe 59 C,
  GPU 57 C). The sysctl was lost at reboot (`panic_on_oops=0`). Result: the hang does not need playtest
  load, so heavy Chromium load is a trigger that makes it likelier, not the cause. Points to hardware, power
  or the NVIDIA driver. A reset-without-power-cycle right before it may matter (freeze 5 came straight after
  a hard reset). Next: full power-off (PSU switch off, 30 s) before booting, then `-42` kernel, then memtest.
- 20:15 CORRECTION to freeze 5 (and likely freezes 1 to 4). The owner photographed the screen after freeze 5:
  btrfs write errors on the root disk (`nvme0n1p4`, error -5 EIO, wr counter 270+ and climbing, about 355 to
  385 s after boot). So the root NVMe stopped completing writes, which is why the journal "stops" with no
  trace and pstore is empty: the log could not be written, not necessarily a CPU or kernel hang. SMART
  (Samsung 960 PRO 1TB, 19,662 power-on hours, 206 TB written): PASSED, critical warning 0, spare 100%, used
  10%, media errors 0, unsafe shutdowns 116. The 29,601 error log entries are harmless rejected admin
  commands (0x4004 Invalid Field, 0x421a Feature Not Saveable). `btrfs device stats` is all zero because
  the filesystem could not commit the counters. PCIe link is Gen3 x4 with no AER errors this boot. APST is
  on (default_ps_max_latency_us=100000). So: drive reports healthy but dropped out or hung at runtime.
  Suspects: controller hang in a power state, M.2 slot, heatsink or seating, PSU or board power. Test: add
  `nvme_core.default_ps_max_latency_us=0 pcie_aspm=off` to the kernel command line. Next freeze: photograph
  the TOP of the screen (the first nvme line says why), or run `dmesg -w` over ssh from another device.
