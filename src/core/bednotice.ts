// The "who is left" notice at day end (note 53, shared day end). Pure: the scene shows the line.
import type { BedStatus } from "./room";

function list(names: string[]): string {
  if (names.length <= 1) return names.join("");
  return `${names.slice(0, -1).join(", ")} and ${names[names.length - 1]}`;
}

/**
 * What a player sees about the beds. In bed themselves: who is still up. Up themselves: who is
 * in bed already. Empty when nobody is in bed, or the player is the only one left to say.
 */
export function bedNotice(s: BedStatus, inBed: boolean): string {
  if (inBed)
    return s.waiting.length > 0
      ? `You are in bed. Waiting for ${list(s.waiting)}. Action gets you up.`
      : "You are in bed.";
  if (s.asleep.length === 0) return "";
  return `${list(s.asleep)} ${s.asleep.length === 1 ? "is" : "are"} in bed. The day ends when everyone is.`;
}
