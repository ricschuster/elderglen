import summitData from "../content/summit.json";

/**
 * The summit call (`docs/design/39_completion_total.md`, "Summit build
 * decisions", step 3). When the `summit` achievement fires the night's check
 * arms the call. The next morning the hall steward walks over from the Outpost
 * and calls the player in to the hall, and the scene (step 4) is owed until it
 * has been played. A festival day is never interrupted: the call waits for the
 * first morning that is not one. Pure rules, free of Phaser; the whole state
 * survives save and load.
 */
export const SUMMIT_ACHIEVEMENT = "summit";

export const SUMMIT_TEXT = summitData as {
  callLine: string;
  callTitle: string;
};

export interface SummitPerson {
  name: string;
  hat: string;
}

/** The scene's placeholder script (`src/content/summit.json`). */
export const SUMMIT_SCENE = summitData as unknown as {
  sceneTitle: string;
  steward: SummitPerson;
  toast: string[];
  greencoat: SummitPerson & { line: string };
  guests: (SummitPerson & { line: string })[];
  choices: { id: string; label: string; reply: string }[];
  closing: string;
};

export interface SummitSave {
  armed: boolean;
  scenePending: boolean;
  seen: boolean;
}

export class SummitCall {
  /** The achievement fired and the steward has not yet called. */
  private armed = false;
  /** The steward has called and the scene has not been played: the step 4 hook. */
  private pending = false;
  /** The scene has been played. */
  private done = false;

  /** Mark the call owed. Does nothing once the call was made or the scene seen. */
  arm(): void {
    if (!this.pending && !this.done) this.armed = true;
  }

  get isArmed(): boolean {
    return this.armed;
  }

  /** True while the scene is owed: the hook the scene (step 4) reads. */
  get scenePending(): boolean {
    return this.pending;
  }

  get seen(): boolean {
    return this.done;
  }

  /**
   * Called each morning. True on the morning the steward calls: the call is
   * armed and the day is free. The scene then stays pending until `finish`.
   */
  callToday(festivalDay: boolean): boolean {
    if (!this.armed || festivalDay) return false;
    this.armed = false;
    this.pending = true;
    return true;
  }

  /** The scene was played (or skipped): clear the pending flag for good. */
  finish(): void {
    this.pending = false;
    this.armed = false;
    this.done = true;
  }

  save(): SummitSave {
    return { armed: this.armed, scenePending: this.pending, seen: this.done };
  }

  load(raw: unknown): void {
    const r = (typeof raw === "object" && raw !== null ? raw : {}) as Partial<
      Record<keyof SummitSave, unknown>
    >;
    this.armed = r.armed === true;
    this.pending = r.scenePending === true;
    this.done = r.seen === true;
    if (this.done) {
      this.armed = false;
      this.pending = false;
    }
  }
}
