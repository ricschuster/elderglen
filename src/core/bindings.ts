/**
 * Desktop key bindings and the settings record (note 45). Free of Phaser and
 * the DOM. Keys are stored as `KeyboardEvent.code` values (`KeyW`, not `w`), so
 * they hold across keyboard layouts.
 */

import {
  clampPercent,
  DEFAULT_PERCENT,
  UI_MAX,
  UI_MIN,
  ZOOM_MAX,
  ZOOM_MIN,
} from "./view";

export type Profile = "desktop" | "touch";
export type TouchScheme = "tap" | "stick";

export const PROFILES: readonly Profile[] = ["desktop", "touch"];
export const TOUCH_SCHEMES: readonly TouchScheme[] = ["tap", "stick"];

export interface ActionInfo {
  id: string;
  label: string;
  /** The Stardew default, or ours where Stardew has no key. */
  key: string;
}

const SLOT_CODES = [
  "Digit1",
  "Digit2",
  "Digit3",
  "Digit4",
  "Digit5",
  "Digit6",
  "Digit7",
  "Digit8",
  "Digit9",
  "Digit0",
  "Minus",
  "Equal",
];

/** Every rebindable action, in the order the options screen lists them. */
export const ACTIONS: readonly ActionInfo[] = [
  { id: "moveUp", label: "Move up", key: "KeyW" },
  { id: "moveLeft", label: "Move left", key: "KeyA" },
  { id: "moveDown", label: "Move down", key: "KeyS" },
  { id: "moveRight", label: "Move right", key: "KeyD" },
  { id: "use", label: "Use the held tool", key: "KeyC" },
  { id: "action", label: "Action", key: "KeyX" },
  { id: "menu", label: "Open the menu", key: "KeyE" },
  { id: "nextSlot", label: "Next toolbar slot", key: "Tab" },
  { id: "nextRow", label: "Next toolbar row", key: "ShiftLeft" },
  ...SLOT_CODES.map((key, i) => ({
    id: `slot${i + 1}`,
    label: `Toolbar slot ${i + 1}`,
    key,
  })),
  { id: "eat", label: "Eat the held food", key: "KeyF" },
  { id: "skills", label: "Skills", key: "KeyK" },
  { id: "craft", label: "Crafting", key: "KeyR" },
  { id: "hats", label: "Hats", key: "KeyH" },
  { id: "endDay", label: "End the day", key: "KeyZ" },
  { id: "hints", label: "Show or hide the control hints", key: "KeyG" },
];

export type ActionId = string;
/** Action id to key code. */
export type Bindings = Record<ActionId, string>;

/**
 * Keys that cannot be bound: menu navigation, the arrow keys (a fixed extra way
 * to move) and the browser's own function keys.
 */
export function isReserved(code: string): boolean {
  return (
    code === "Escape" ||
    code === "Enter" ||
    code === "NumpadEnter" ||
    code.startsWith("Arrow") ||
    /^F\d{1,2}$/.test(code)
  );
}

/** A short name for a key code, for hints and the options screen. */
export function keyLabel(code: string): string {
  if (/^Key[A-Z]$/.test(code)) return code.slice(3);
  if (/^Digit\d$/.test(code)) return code.slice(5);
  const names: Record<string, string> = {
    Minus: "-",
    Equal: "=",
    ShiftLeft: "Left Shift",
    ShiftRight: "Right Shift",
    ControlLeft: "Left Ctrl",
    ControlRight: "Right Ctrl",
    AltLeft: "Left Alt",
    AltRight: "Right Alt",
    Backquote: "`",
    Backspace: "Backspace",
    Space: "Space",
  };
  return names[code] ?? code;
}

export function defaultBindings(): Bindings {
  return Object.fromEntries(ACTIONS.map((a) => [a.id, a.key]));
}

export type RebindResult =
  | { kind: "ok"; bindings: Bindings }
  | { kind: "reserved" }
  | { kind: "unknown" }
  /** The key is bound to another action. Call `swapBinding` to take it. */
  | { kind: "conflict"; with: ActionId };

/** Bind `code` to `action`. A key already in use is reported, not taken. */
export function rebind(
  bindings: Bindings,
  action: ActionId,
  code: string,
): RebindResult {
  if (!(action in bindings)) return { kind: "unknown" };
  if (isReserved(code)) return { kind: "reserved" };
  const owner = Object.keys(bindings).find(
    (id) => id !== action && bindings[id] === code,
  );
  if (owner !== undefined) return { kind: "conflict", with: owner };
  return { kind: "ok", bindings: { ...bindings, [action]: code } };
}

/** Give `action` the key of `other`, and `other` the key `action` had. */
export function swapBinding(
  bindings: Bindings,
  action: ActionId,
  other: ActionId,
): Bindings {
  return {
    ...bindings,
    [action]: bindings[other]!,
    [other]: bindings[action]!,
  };
}

/** Back to the default key for one action. A clash swaps, so keys stay unique. */
export function resetAction(bindings: Bindings, action: ActionId): Bindings {
  const key = ACTIONS.find((a) => a.id === action)?.key;
  if (key === undefined) return bindings;
  const owner = Object.keys(bindings).find(
    (id) => id !== action && bindings[id] === key,
  );
  return owner === undefined
    ? { ...bindings, [action]: key }
    : swapBinding(bindings, action, owner);
}

export function resetAll(): Bindings {
  return defaultBindings();
}

/** The action a key code triggers, if any. */
export function actionFor(
  bindings: Bindings,
  code: string,
): ActionId | undefined {
  return Object.keys(bindings).find((id) => bindings[id] === code);
}

export interface Settings {
  profile: Profile;
  touchScheme: TouchScheme;
  bindings: Bindings;
  /** World zoom in percent, 75 to 200 (note 64). */
  worldZoom: number;
  /** UI size in percent, 75 to 150 (note 64). */
  uiSize: number;
  /** Whether the control hint box shows on the farm. */
  showHints: boolean;
}

export const SETTINGS_VERSION = 1;

/** First run: a coarse primary pointer is a finger, anything else is a mouse. */
export function chooseProfile(coarsePointer: boolean): Profile {
  return coarsePointer ? "touch" : "desktop";
}

export function defaultSettings(coarsePointer = false): Settings {
  return {
    profile: chooseProfile(coarsePointer),
    touchScheme: "tap",
    bindings: defaultBindings(),
    worldZoom: DEFAULT_PERCENT,
    uiSize: DEFAULT_PERCENT,
    showHints: true,
  };
}

export function serializeSettings(s: Settings): string {
  return JSON.stringify({ version: SETTINGS_VERSION, ...s });
}

function isObject(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}

/** Keep valid entries. Any duplicate or reserved key sends all keys to default. */
function cleanBindings(raw: unknown): Bindings {
  const out = defaultBindings();
  if (!isObject(raw)) return out;
  for (const id of Object.keys(out)) {
    const v = raw[id];
    if (typeof v === "string" && v !== "") out[id] = v;
  }
  const keys = Object.values(out);
  const bad =
    keys.some((k) => isReserved(k)) || new Set(keys).size < keys.length;
  return bad ? defaultBindings() : out;
}

/**
 * Parse a saved record. Anything missing or unreadable falls back to the
 * defaults, field by field, so a bad record never crashes the game.
 */
export function deserializeSettings(
  text: string | null,
  coarsePointer = false,
): Settings {
  const base = defaultSettings(coarsePointer);
  if (text === null) return base;
  let raw: unknown;
  try {
    raw = JSON.parse(text);
  } catch {
    return base;
  }
  if (!isObject(raw) || raw.version !== SETTINGS_VERSION) return base;
  return {
    profile: PROFILES.find((p) => p === raw.profile) ?? base.profile,
    touchScheme:
      TOUCH_SCHEMES.find((t) => t === raw.touchScheme) ?? base.touchScheme,
    bindings: cleanBindings(raw.bindings),
    worldZoom: clampPercent(
      raw.worldZoom ?? base.worldZoom,
      ZOOM_MIN,
      ZOOM_MAX,
    ),
    uiSize: clampPercent(raw.uiSize ?? base.uiSize, UI_MIN, UI_MAX),
    showHints:
      typeof raw.showHints === "boolean" ? raw.showHints : base.showHints,
  };
}

export interface SettingsStore {
  read(): string | null;
  write(text: string): void;
}

export function loadSettings(
  store: SettingsStore,
  coarsePointer = false,
): Settings {
  return deserializeSettings(store.read(), coarsePointer);
}

export function saveSettings(store: SettingsStore, s: Settings): void {
  store.write(serializeSettings(s));
}
