import type { KeyValue } from "./slots";

/**
 * The two-tab guard (note 52). Saves live in the browser's storage, which two
 * tabs of the game share. The tab that is playing keeps a lock in storage and
 * refreshes it on a heartbeat. A second tab that finds a fresh lock from
 * someone else is blocked: it stops writing saves and offers to take over.
 * Taking over writes the lock, and the first tab finds it on its next beat and
 * is blocked in turn. A lock nobody refreshed for `STALE_MS` (a closed or
 * crashed tab) is free. Free of Phaser and the DOM.
 */
export const TAB_LOCK_KEY = "elderglen-tab-lock";
/** How often the playing tab refreshes its lock. */
export const HEARTBEAT_MS = 3000;
/** A lock older than this is from a tab that is gone. */
export const STALE_MS = 10000;

interface Lock {
  id: string;
  at: number;
}

function readLock(kv: KeyValue): Lock | undefined {
  const text = kv.get(TAB_LOCK_KEY);
  if (text === null) return undefined;
  try {
    const raw = JSON.parse(text) as Partial<Lock> | null;
    if (raw && typeof raw.id === "string" && typeof raw.at === "number")
      return { id: raw.id, at: raw.at };
  } catch {
    // A broken lock counts as no lock.
  }
  return undefined;
}

export class TabGuard {
  /** True while another tab owns the saves. Writes must wait. */
  blocked = false;

  constructor(
    private readonly kv: KeyValue,
    private readonly id: string,
    private readonly now: () => number,
  ) {}

  private other(): boolean {
    const lock = readLock(this.kv);
    return (
      lock !== undefined &&
      lock.id !== this.id &&
      this.now() - lock.at < STALE_MS
    );
  }

  private claim(): void {
    this.kv.set(
      TAB_LOCK_KEY,
      JSON.stringify({ id: this.id, at: this.now() } satisfies Lock),
    );
  }

  /** Call on load, on every heartbeat and when the tab becomes visible. Returns `blocked`. */
  check(): boolean {
    if (this.blocked) return true;
    if (this.other()) {
      this.blocked = true;
      return true;
    }
    this.claim();
    return false;
  }

  /** The player chose to play here: the other tab is blocked at its next check. */
  takeOver(): void {
    this.claim();
    this.blocked = false;
  }

  /** Free the lock on closing, if it is still ours. */
  release(): void {
    if (readLock(this.kv)?.id === this.id) this.kv.remove(TAB_LOCK_KEY);
  }
}
