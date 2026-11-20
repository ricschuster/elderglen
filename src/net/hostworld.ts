// Which farm a host plays and shares (note 53 step 8, note 52). Pure: the Lobby asks it for the
// world to host, from a save slot or a new farm, and gets a refusal in words when it cannot.
// The host stays the owner of the save: the slot is the one the farm scene writes to.
import { DEFAULT_FARM_TYPE } from "../core/farmtypes";
import { newGame, type GameState } from "../core/save";
import {
  MAX_SAVE_SLOTS,
  slotInfo,
  type KeyValue,
  type SlotInfo,
} from "../core/slots";
import type { HostOptions } from "./hostoptions";

/** What the host picked in the Lobby: a used slot, or a new farm. */
export type HostChoice =
  { kind: "slot"; slot: number } | { kind: "new"; farmType?: string };

export type HostPlan =
  | {
      ok: true;
      state: GameState;
      /** The slot the farm scene saves to for the whole session. */
      slot: number;
      announceName: string;
      isNew: boolean;
    }
  | { ok: false; message: string };

/** The slots that can be hosted, in order. */
export function hostableSlots(kv: KeyValue, count = MAX_SAVE_SLOTS): number[] {
  const out: number[] = [];
  for (let n = 1; n <= count; n++)
    if (slotInfo(kv, n).status === "used") out.push(n);
  return out;
}

/** The first empty slot, where a new multiplayer farm will be saved. */
export function firstEmptySlot(kv: KeyValue): number | undefined {
  for (let n = 1; n <= MAX_SAVE_SLOTS; n++)
    if (slotInfo(kv, n).status === "empty") return n;
  return undefined;
}

function refusal(info: SlotInfo): string {
  if (info.status === "newer")
    return `Slot ${info.slot} was saved by a newer version of the game. Update the game to host it.`;
  if (info.status === "broken")
    return `Slot ${info.slot} could not be read, so it cannot be hosted.`;
  return `Slot ${info.slot} is empty.`;
}

/**
 * Work out the world to host. A slot hosts that slot's played state (a day in progress if there
 * is one) and keeps its wallet mode; the options only shape a new farm, which is a multiplayer
 * start saved to the first empty slot (none empty: refused, so no save is overwritten).
 */
export function planHost(
  kv: KeyValue,
  choice: HostChoice,
  options: HostOptions,
): HostPlan {
  if (choice.kind === "slot") {
    const info = slotInfo(kv, choice.slot);
    if (info.status !== "used") return { ok: false, message: refusal(info) };
    return {
      ok: true,
      state: info.game,
      slot: info.slot,
      announceName: `Slot ${info.slot} farm`,
      isNew: false,
    };
  }
  const slot = firstEmptySlot(kv);
  if (slot === undefined)
    return {
      ok: false,
      message: "Every save slot is used. Delete one, or host a saved farm.",
    };
  return {
    ok: true,
    state: newGame(choice.farmType ?? DEFAULT_FARM_TYPE, options.walletMode),
    slot,
    announceName: `Slot ${slot} farm`,
    isNew: true,
  };
}

/** The choices the Lobby cycles through: a new farm, then each used slot. */
export function hostChoices(kv: KeyValue): HostChoice[] {
  return [
    { kind: "new" },
    ...hostableSlots(kv).map((slot): HostChoice => ({ kind: "slot", slot })),
  ];
}

export function hostChoiceLabel(c: HostChoice): string {
  return c.kind === "new" ? "Farm: a new farm" : `Farm: slot ${c.slot}`;
}
