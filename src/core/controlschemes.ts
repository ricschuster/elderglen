/**
 * Touch control schemes (note 27). The list mirrors the nine Stardew offers on
 * its mobile options page. Each scheme is only a recipe: which parts it shows.
 * The scene builds the parts; nothing here knows Phaser.
 */

export type SchemeId =
  | "tapAuto"
  | "tapAim"
  | "invisTwo"
  | "invisOne"
  | "tapStickButtons"
  | "tapStickButtonsWeapon"
  | "tapStickWeaponButtons"
  | "tapStick"
  | "stickButtons";

/** A touch held longer than this many seconds is Action; shorter is Use (note 27, Stardew's rule). */
export const TAP_USE_MAX_SECONDS = 0.25;

/** True when a touch of this length (milliseconds) is Action rather than Use. */
export const tapIsAction = (heldMs: number): boolean =>
  heldMs > TAP_USE_MAX_SECONDS * 1000;

/** The stick's look: none, a ring drawn where the finger lands, or nothing drawn. */
export type StickLook = "none" | "visible" | "invisible";

/** When a part shows: always, never, or only while a weapon is held. */
export type When = "always" | "never" | "weapon";

export interface SchemeDef {
  id: SchemeId;
  /** The name as the list shows it. */
  name: string;
  /** Tap on the world walks and acts (note 27). */
  tap: boolean;
  stick: StickLook;
  /** The stick shows only while a weapon is held (otherwise always). */
  stickWhen: When;
  /** The Use and Action buttons. */
  buttons: When;
  /** No buttons: a short tap on the right half is Use, a long one is Action (`tapIsAction`). */
  tapDuration: boolean;
  /** A swing happens by itself at a creature in reach while a weapon is held. */
  autoAttack: boolean;
  /** A second stick aims and swings the weapon. */
  aimStick: boolean;
  /** True where we guessed Stardew's behaviour (SC-188). */
  guessed: boolean;
}

const base = {
  tap: false,
  stick: "none" as StickLook,
  stickWhen: "always" as When,
  buttons: "never" as When,
  tapDuration: false,
  autoAttack: false,
  aimStick: false,
  guessed: false,
};

export const SCHEMES: readonly SchemeDef[] = [
  {
    ...base,
    id: "tapAuto",
    name: "Tap-to-move and Auto-Attack",
    tap: true,
    autoAttack: true,
  },
  {
    ...base,
    id: "tapAim",
    name: "Tap-to-move and Attack Joystick",
    tap: true,
    aimStick: true,
    guessed: true,
  },
  {
    ...base,
    id: "invisTwo",
    name: "Invisible Joystick and 2 Buttons",
    stick: "invisible",
    buttons: "always",
    guessed: true,
  },
  {
    ...base,
    id: "invisOne",
    name: "Invisible Joystick and 1 Button",
    stick: "invisible",
    tapDuration: true,
  },
  {
    ...base,
    id: "tapStickButtons",
    name: "Tap-to-move and Joystick and Buttons",
    tap: true,
    stick: "visible",
    buttons: "always",
    guessed: true,
  },
  {
    ...base,
    id: "tapStickButtonsWeapon",
    name: "Tap-to-move and (Joystick and Buttons) (weapons)",
    tap: true,
    stick: "visible",
    stickWhen: "weapon",
    buttons: "weapon",
    guessed: true,
  },
  {
    ...base,
    id: "tapStickWeaponButtons",
    name: "Tap-to-move and Joystick and (Buttons) (weapons)",
    tap: true,
    stick: "visible",
    buttons: "weapon",
    guessed: true,
  },
  {
    ...base,
    id: "tapStick",
    name: "Tap-to-move and Joystick",
    tap: true,
    stick: "visible",
    guessed: true,
  },
  {
    ...base,
    id: "stickButtons",
    name: "Joystick and Buttons",
    stick: "visible",
    buttons: "always",
  },
];

export const SCHEME_IDS: readonly SchemeId[] = SCHEMES.map((s) => s.id);
export const DEFAULT_SCHEME: SchemeId = "tapAuto";

export const schemeById = (id: SchemeId): SchemeDef =>
  SCHEMES.find((s) => s.id === id)!;

/**
 * Read a saved scheme. The old two-way setting still loads: "tap" is the
 * tap-to-move default and "stick" is the floating stick with buttons.
 */
export function migrateScheme(raw: unknown): SchemeId {
  if (raw === "tap") return "tapAuto";
  if (raw === "stick") return "stickButtons";
  return SCHEME_IDS.find((s) => s === raw) ?? DEFAULT_SCHEME;
}

/** What shows right now: the scheme's parts, given whether a weapon is held. */
export interface Parts {
  tap: boolean;
  stick: StickLook;
  useButton: boolean;
  actionButton: boolean;
  /** The right half reads tap length: short is Use, long is Action. */
  tapDuration: boolean;
  aimStick: boolean;
  autoAttack: boolean;
}

const on = (w: When, weapon: boolean): boolean =>
  w === "always" || (w === "weapon" && weapon);

export function partsFor(id: SchemeId, weaponHeld: boolean): Parts {
  const s = schemeById(id);
  const buttons = on(s.buttons, weaponHeld);
  return {
    tap: s.tap,
    stick: on(s.stickWhen, weaponHeld) ? s.stick : "none",
    useButton: buttons,
    actionButton: buttons,
    tapDuration: s.tapDuration,
    aimStick: s.aimStick && weaponHeld,
    autoAttack: s.autoAttack && weaponHeld,
  };
}

/** True when the scheme can show a button, so the bars step left of it. */
export const hasButtons = (id: SchemeId): boolean =>
  schemeById(id).buttons !== "never";

/** True when the scheme taps to walk (the scene reads taps and plans routes). */
export const usesTap = (id: SchemeId): boolean => schemeById(id).tap;
