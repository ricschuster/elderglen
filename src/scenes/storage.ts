import type { SaveStore } from "../core/save";
import {
  activeSlot,
  migrateLegacySave,
  setActiveSlot,
  slotStore,
  type KeyValue,
} from "../core/slots";
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
    } catch {
      // Private windows and full storage can refuse a write. Play on unsaved.
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

/** The save store of the slot being played. Reads and writes never throw. */
export const browserStore: SaveStore = {
  read: () => slotStore(browserKv, activeSlot(browserKv)).read(),
  write: (text) => slotStore(browserKv, activeSlot(browserKv)).write(text),
};

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
