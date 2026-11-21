// What the two-player marriage screens show (note 12, "Two-player screens needed"): the yes or no
// proposal card, the hall ledger rows and the wedding cutscene text. Pure view models, so the
// scenes stay thin. Free of Phaser and the DOM. Placeholder text.
import { DIVORCE_FEE } from "./marriage";
import type { PlayerId } from "./players";
import * as pm from "./playermarriage";

type NameOf = (id: PlayerId) => string;

export interface ProposalCard {
  from: PlayerId;
  text: string;
}

/** The card for the asked player, or undefined when nobody is asking them. */
export function proposalCard(
  b: pm.PlayerMarriageBook,
  key: PlayerId,
  nameOf: NameOf,
): ProposalCard | undefined {
  const x = pm.proposalFor(b, key);
  if (!x) return undefined;
  return {
    from: x.proposer,
    text: `PLACEHOLDER TEXT: ${nameOf(x.proposer)} holds out a promise token. Say yes and the wedding is in three days. Unanswered, the offer lapses tonight.`,
  };
}

export interface LedgerRow {
  /** The intent kind to send, or "" for a row that only informs. */
  intent: "call-off" | "file-divorce" | "cancel-divorce" | "";
  label: string;
  detail: string;
  /** Shown dimmed: the action is not open to this player now. */
  dim: boolean;
}

/** The ledger rows for a player's bond with another player. Empty when they have none to file. */
export function ledgerRows(
  b: pm.PlayerMarriageBook,
  key: PlayerId,
  gold: number,
  nameOf: NameOf,
): LedgerRow[] {
  const x = pm.bondOf(b, key);
  if (!x || x.stage === "proposed") return [];
  const name = nameOf(pm.partnerOf(b, key)!);
  if (x.stage === "engaged")
    return [
      {
        intent: "call-off",
        label: `Call off the engagement with ${name}`,
        detail: "Free. The token is not handed back",
        dim: false,
      },
    ];
  if (x.filedBy)
    return [
      {
        intent: x.filedBy === key ? "cancel-divorce" : "",
        label:
          x.filedBy === key
            ? "Cancel the divorce"
            : `${nameOf(x.filedBy)} has filed for divorce`,
        detail:
          x.filedBy === key
            ? `Filed. It takes effect in the morning. The ${DIVORCE_FEE}g fee is handed back`
            : "It takes effect in the morning",
        dim: x.filedBy !== key,
      },
    ];
  const why = pm.divorceProblem(b, key, gold);
  return [
    {
      intent: "file-divorce",
      label: `Divorce ${name}`,
      detail:
        `${DIVORCE_FEE}g from your purse. It takes effect tomorrow morning and you can cancel until tonight. ${why}`.trim(),
      dim: why !== "",
    },
  ];
}

/** Whether this player has a wedding scene waiting. */
export const weddingWaiting = (b: pm.PlayerMarriageBook, key: PlayerId) =>
  b.unseenWedding.includes(key);

/** The wedding cutscene: short placeholder lines, the couple named, everyone else a guest. */
export function weddingLines(
  b: pm.PlayerMarriageBook,
  key: PlayerId,
  nameOf: NameOf,
): string[] {
  const x = pm.bondOf(b, key);
  if (x?.stage !== "married") return [];
  const a = nameOf(x.proposer);
  const o = nameOf(x.other);
  return [
    "PLACEHOLDER TEXT: The wedding",
    `The village gathers on the green. ${a} and ${o} stand together.`,
    `The two ledgers are read and joined. ${a} and ${o} are wed.`,
    `They will share ${a}'s cabin from tonight.`,
  ];
}

/** Where the couple stand on the stage (screen x, y is fixed) for each wedding line, in order. */
export interface WeddingBeat {
  /** The proposer's x, then the other's x. */
  a: number;
  o: number;
  /** The couple and guests hop for joy (the ledgers are joined). */
  hop: boolean;
}

/** Where they start: offstage left and right of the green. */
export const WEDDING_START = { a: -40, o: 1000 } as const;

/**
 * The couple's staging per `weddingLines` line (placeholder): the title walks them in, the
 * gathering brings them down the aisle, the joining makes them hop, the last line walks them
 * off toward the farm. Out-of-range steps hold the nearest mark.
 */
export function weddingBeat(step: number): WeddingBeat {
  const beats: WeddingBeat[] = [
    { a: 300, o: 660, hop: false },
    { a: 440, o: 520, hop: false },
    { a: 440, o: 520, hop: true },
    { a: 1000, o: 1040, hop: false },
  ];
  return beats[Math.max(0, Math.min(step, beats.length - 1))]!;
}

/** Guest x marks on the green, left and right of the aisle. */
export const WEDDING_GUEST_SLOTS: readonly number[] = [
  120, 200, 280, 680, 760, 840,
];
