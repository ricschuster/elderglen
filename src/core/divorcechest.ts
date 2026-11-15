/**
 * Where the divorce chest is and when it shows (note 85, "Divorce"). A leaf
 * module, so `worldflags.ts` can read it without importing the house.
 */

/** The condition under which the divorce chest shows in the bedroom. */
export const DIVORCE_CHEST_HOLD = "divorce-chest";

/** The house map the chest stands in (`HOUSE_MAP` in `house.ts`). */
export const DIVORCE_CHEST_MAP = "house";

/** The bedroom's south-east corner: (31, 20) in the old frame, shifted by (20, 11). */
export const DIVORCE_CHEST_TILE = { x: 51, y: 31 } as const;
