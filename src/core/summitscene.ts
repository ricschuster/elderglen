import { hatById } from "./hats";
import { SUMMIT_SCENE } from "./summit";

/**
 * The summit scene's script (`docs/design/39_completion_total.md`, step 4).
 * Pure: the scene reads the beats and draws them. Order: the steward's toast,
 * Old Greencoat, each household head, the player's one choice, the steward's
 * answer, then the steward's closing line.
 */
export type SummitBeat =
  | { kind: "line"; speaker: string; hat: string; text: string }
  | { kind: "choice"; options: { id: string; label: string }[] };

export function summitChoiceIds(): string[] {
  return SUMMIT_SCENE.choices.map((c) => c.id);
}

/** Beats up to and including the choice prompt. */
export function summitBeatsBeforeChoice(): SummitBeat[] {
  const s = SUMMIT_SCENE;
  const beats: SummitBeat[] = [];
  for (const text of s.toast) {
    beats.push({
      kind: "line",
      speaker: s.steward.name,
      hat: s.steward.hat,
      text,
    });
  }
  beats.push({
    kind: "line",
    speaker: s.greencoat.name,
    hat: s.greencoat.hat,
    text: s.greencoat.line,
  });
  for (const g of s.guests) {
    beats.push({ kind: "line", speaker: g.name, hat: g.hat, text: g.line });
  }
  beats.push({
    kind: "choice",
    options: s.choices.map((c) => ({ id: c.id, label: c.label })),
  });
  return beats;
}

/**
 * Beats after the player's choice: the steward's reply to it, then the closing
 * line. An unknown choice id gets the closing line alone.
 */
export function summitBeatsAfterChoice(choiceId: string): SummitBeat[] {
  const s = SUMMIT_SCENE;
  const beats: SummitBeat[] = [];
  const choice = s.choices.find((c) => c.id === choiceId);
  if (choice) {
    beats.push({
      kind: "line",
      speaker: s.steward.name,
      hat: s.steward.hat,
      text: choice.reply,
    });
  }
  beats.push({
    kind: "line",
    speaker: s.steward.name,
    hat: s.steward.hat,
    text: s.closing,
  });
  return beats;
}

/** Placeholder colour of a hat id, or a plain grey for an unknown id. */
export function hatColor(hatId: string): string {
  return hatById(hatId)?.color ?? "#888888";
}

/** Every person at the table, steward and Old Greencoat first. */
export function summitCast(): { name: string; hat: string }[] {
  const s = SUMMIT_SCENE;
  return [
    { name: s.steward.name, hat: s.steward.hat },
    { name: s.greencoat.name, hat: s.greencoat.hat },
    ...s.guests.map((g) => ({ name: g.name, hat: g.hat })),
  ];
}
