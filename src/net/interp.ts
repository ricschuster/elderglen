// Guest-side smoothing and player blocking (note 53). Pure: no Phaser, no DOM, no clock of its own
// (callers pass `nowMs`). Other players are drawn a little in the past, between two snapshots.
import { JamTracker } from "../core/jam";
import type { PlayerId } from "../core/players";
import type { RemotePlayer } from "./session";

/** Remote players are shown this far behind the newest snapshot, so there are two to blend (note 53). */
export const INTERP_DELAY_MS = 200;
/** Samples kept per player. */
const KEEP = 8;

interface Sample {
  t: number;
  x: number;
  y: number;
  map: string;
  dir: number;
}

export class RemoteInterpolator {
  private readonly buf = new Map<PlayerId, Sample[]>();

  constructor(private readonly delayMs = INTERP_DELAY_MS) {}

  /** Record the latest remotes. A new sample is kept only when a player moved, turned or changed map. */
  observe(remotes: readonly RemotePlayer[], nowMs: number): void {
    const live = new Set<PlayerId>();
    for (const r of remotes) {
      live.add(r.id);
      let s = this.buf.get(r.id);
      if (!s) this.buf.set(r.id, (s = []));
      const last = s[s.length - 1];
      if (
        last &&
        last.x === r.x &&
        last.y === r.y &&
        last.map === r.map &&
        last.dir === r.dir
      )
        continue;
      s.push({ t: nowMs, x: r.x, y: r.y, map: r.map, dir: r.dir });
      if (s.length > KEEP) s.shift();
    }
    for (const id of this.buf.keys()) if (!live.has(id)) this.buf.delete(id);
  }

  /** The remotes as they should be drawn at `nowMs`. Never extrapolates past the newest snapshot. */
  sample(remotes: readonly RemotePlayer[], nowMs: number): RemotePlayer[] {
    const at = nowMs - this.delayMs;
    return remotes.map((r) => {
      const s = this.buf.get(r.id);
      if (!s || s.length === 0) return r;
      const first = s[0]!;
      const newest = s[s.length - 1]!;
      if (at >= newest.t) return this.at(r, newest);
      if (at <= first.t) return this.at(r, first);
      let i = s.length - 2;
      while (i > 0 && s[i]!.t > at) i -= 1;
      const a = s[i]!;
      const b = s[i + 1]!;
      // Across a map change there is nothing to blend: stay put until the new map's sample is due.
      if (a.map !== b.map) return this.at(r, a);
      const k = (at - a.t) / (b.t - a.t);
      return {
        ...r,
        map: b.map,
        x: a.x + (b.x - a.x) * k,
        y: a.y + (b.y - a.y) * k,
        dir: b.dir,
      };
    });
  }

  private at(r: RemotePlayer, s: Sample): RemotePlayer {
    return { ...r, x: s.x, y: s.y, map: s.map, dir: s.dir };
  }
}

/** Half-width of a player's body for blocking, in pixels (a tile is 16). */
export const BODY_RADIUS = 6;

/** Ids of remote players on `map` whose bodies overlap a body at (x, y). Pure. */
export function playersAt(
  x: number,
  y: number,
  map: string,
  remotes: readonly RemotePlayer[],
  radius = BODY_RADIUS,
): PlayerId[] {
  const d = radius * 2;
  return remotes
    .filter(
      (r) => r.map === map && Math.abs(r.x - x) < d && Math.abs(r.y - y) < d,
    )
    .map((r) => r.id);
}

/**
 * The jam rule on the guest (note 53, Q5): feed it each frame the players that stopped a real move
 * attempt; it returns the ids to walk through now (also sent as `pass` in the position message).
 * Wraps `JamTracker`, which holds the timing.
 */
export class PlayerBlocking {
  readonly jam = new JamTracker();

  /** `attempted` is the position the player tried to move to this frame, or undefined if standing. */
  tick(
    dtMs: number,
    attempted: { x: number; y: number; map: string } | undefined,
    remotes: readonly RemotePlayer[],
  ): PlayerId[] {
    const blockedBy = attempted
      ? playersAt(attempted.x, attempted.y, attempted.map, remotes).filter(
          (id) => !this.jam.isPassing(id),
        )
      : [];
    this.jam.tick(dtMs, blockedBy);
    return remotes.filter((r) => this.jam.isPassing(r.id)).map((r) => r.id);
  }
}

export interface Spot {
  x: number;
  y: number;
}

/**
 * One frame of player blocking for the local walker. `to` is where the walk ended after tile
 * collision. If another player's body (not being passed through) overlaps `to` and did not already
 * overlap `from`, the step is undone and counted as blocked; the jam rule then lets the walker
 * through after a short wait. Returns where to stand and the ids to send as `pass`.
 */
export function resolveBlocking(
  blocking: PlayerBlocking,
  dtMs: number,
  from: Spot,
  to: Spot,
  map: string,
  remotes: readonly RemotePlayer[],
): { x: number; y: number; pass: PlayerId[] } {
  const moved = from.x !== to.x || from.y !== to.y;
  const already = new Set(playersAt(from.x, from.y, map, remotes));
  const stopped = moved
    ? playersAt(to.x, to.y, map, remotes).filter(
        (id) => !already.has(id) && !blocking.jam.isPassing(id),
      )
    : [];
  if (stopped.length === 0)
    return { ...to, pass: blocking.tick(dtMs, undefined, remotes) };
  return { ...from, pass: blocking.tick(dtMs, { ...to, map }, remotes) };
}
