import {
  saveNight,
  saveResume,
  type SlotStores,
  type WriteResult,
} from "../core/records";
import type { GameState, ResumeSpot } from "../core/save";
import {
  activeSlot,
  migrateLegacySave,
  setActiveSlot,
  slotStores,
  type KeyValue,
} from "../core/slots";
import { isGuest } from "../net/session";
import { stableTabId, TabGuard } from "../core/tabguard";
import {
  loadSettings,
  type Settings,
  type SettingsStore,
} from "../core/bindings";

/** Browser storage as plain key and value. Reads and writes never throw. */
export const browserKv: KeyValue = {
  get(key) {
    try {
      return localStorage.getItem(key);
    } catch {
      return null;
    }
  },
  set(key, value) {
    try {
      localStorage.setItem(key, value);
      return true;
    } catch {
      // Private windows and full storage can refuse a write. Play on unsaved.
      return false;
    }
  },
  remove(key) {
    try {
      localStorage.removeItem(key);
    } catch {
      // Nothing to remove.
    }
  },
};

// The one save from before slots, and the "beaver-valley" one before it, move
// into slot 1 the first time this loads (note 52, ADR 0011).
migrateLegacySave(browserKv);

/** Make a slot the one every save and load uses, and remember it. */
export function useSlot(slot: number): void {
  setActiveSlot(browserKv, slot);
}

/** The records of the slot being played. Reads and writes never throw. */
export function browserStores(): SlotStores {
  return slotStores(browserKv, activeSlot(browserKv));
}

let failed = false;
let noticeShown = false;

/** Remember a refused write so the farm can say so once (note 52). */
function noted(r: WriteResult): WriteResult {
  if (!r.ok) failed = true;
  return r;
}

/** True once, after a write was refused: the farm shows "Could not save". */
export function takeSaveNotice(): boolean {
  if (!failed || noticeShown) return false;
  noticeShown = true;
  return true;
}

/** Where the player stands, supplied by the farm scene while it runs. */
let spotProvider: (() => ResumeSpot | undefined) | undefined;

export function setSpotProvider(
  p: (() => ResumeSpot | undefined) | undefined,
): void {
  spotProvider = p;
}

/** Session storage as plain key and value, for the tab id. Never throws. */
const sessionKv: KeyValue = {
  get(key) {
    try {
      return sessionStorage.getItem(key);
    } catch {
      return null;
    }
  },
  set(key, value) {
    try {
      sessionStorage.setItem(key, value);
      return true;
    } catch {
      return false;
    }
  },
  remove(key) {
    try {
      sessionStorage.removeItem(key);
    } catch {
      // Nothing to remove.
    }
  },
};

/** This tab's claim on the saves; a second tab is blocked (note 52, `installTabGuard`). */
export const tabGuard = new TabGuard(
  browserKv,
  stableTabId(sessionKv, () => Math.random().toString(36).slice(2)),
  Date.now,
);

const BLOCKED: WriteResult = { ok: false, reason: "refused" };

/** Write the night record (after sleeping, a new game, start over). */
export function nightSave(g: GameState): WriteResult {
  if (tabGuard.blocked || isGuest()) return BLOCKED;
  return noted(saveNight(browserStores(), g));
}

/** Write the resume record, with the player's tile where the farm gives one. */
export function resumeSave(g: GameState, at?: ResumeSpot): WriteResult {
  if (tabGuard.blocked || isGuest()) return BLOCKED;
  return noted(saveResume(browserStores(), g, at ?? spotProvider?.()));
}

/**
 * Ask the browser to keep this origin's storage when space is short. Called
 * once at first run; a refusal changes nothing.
 */
try {
  void navigator.storage?.persist?.();
} catch {
  // No storage manager here.
}

const SETTINGS_KEY = "elderglen-settings";
const LEGACY_SETTINGS_KEY = "beaver-valley-settings";

/** The settings record, kept per device and apart from the save. */
export const browserSettingsStore: SettingsStore = {
  read() {
    try {
      return (
        localStorage.getItem(SETTINGS_KEY) ??
        localStorage.getItem(LEGACY_SETTINGS_KEY)
      );
    } catch {
      return null;
    }
  },
  write(text) {
    try {
      localStorage.setItem(SETTINGS_KEY, text);
    } catch {
      // Play on with the settings unsaved.
    }
  },
};

/** This device's settings. A coarse primary pointer picks touch on first run. */
export function loadDeviceSettings(): Settings {
  let coarse = false;
  try {
    coarse = window.matchMedia("(pointer: coarse)").matches;
  } catch {
    // No matchMedia: assume a mouse.
  }
  return loadSettings(browserSettingsStore, coarse);
}
