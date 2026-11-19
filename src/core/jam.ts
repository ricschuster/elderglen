// Local soft pass for two players who block each other (note 53, Q5).
// Pure state machine, one JamTracker per local client. No Phaser, no DOM.

/** Blocked this long (ms) by one other player before the pass starts. */
export const JAM_BLOCK_MS = 500;
/** How long (ms) the pass-through lasts once started. */
export const JAM_PASS_MS = 1000;

interface PairState {
  /** Continuous time blocked by this player, ms. */
  blockedMs: number;
  /** Time left passing through this player, ms (0 when not passing). */
  passMs: number;
}

/**
 * Tracks one state per other player id. Each tick the client reports which
 * players its attempted move was blocked by. Players not listed are treated
 * as not blocking (moving freely, standing still, or separated).
 */
export class JamTracker {
  private pairs = new Map<string, PairState>();

  /** Advance by dtMs. `blockedBy` holds ids that stopped a real move attempt this tick. */
  tick(dtMs: number, blockedBy: Iterable<string>): void {
    const blocking = new Set(blockedBy);
    for (const id of blocking) {
      if (!this.pairs.has(id)) this.pairs.set(id, { blockedMs: 0, passMs: 0 });
    }
    for (const [id, s] of this.pairs) {
      if (s.passMs > 0) {
        s.passMs -= dtMs;
        if (s.passMs <= 0) {
          // Window over: start fresh, so a still-stuck pair needs a new 0.5 s.
          this.pairs.delete(id);
        }
        continue;
      }
      if (!blocking.has(id)) {
        this.pairs.delete(id);
        continue;
      }
      s.blockedMs += dtMs;
      if (s.blockedMs >= JAM_BLOCK_MS) {
        // Carry the overshoot so the window length does not depend on frame time.
        s.passMs = JAM_PASS_MS - (s.blockedMs - JAM_BLOCK_MS);
        s.blockedMs = 0;
        if (s.passMs <= 0) this.pairs.delete(id);
      }
    }
  }

  /** True while the local player should ignore collision with this player. */
  isPassing(id: string): boolean {
    return (this.pairs.get(id)?.passMs ?? 0) > 0;
  }

  reset(): void {
    this.pairs.clear();
  }
}
