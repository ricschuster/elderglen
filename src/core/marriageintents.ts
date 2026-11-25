// Player marriage intents (note 12, two-player steps): the same function runs on the host and on
// every guest copy, so the bond book stays equal. The promise token is held while a proposal is
// open: used up on accept, handed back on decline, withdrawal and expiry (owner, 2026-11-19).
// Free of Phaser and the DOM.
import { TOKEN, finishWedding } from "./courtship";
import { asPlayer } from "./asplayer";
import { cancelDivorce, divorceProblem, fileDivorce } from "./divorce";
import { DIVORCE_FEE, TOKEN_PRICE } from "./marriage";
import type { PlayerId } from "./players";
import * as pm from "./playermarriage";
import type { Intent } from "./protocol";
import type { GameState } from "./save";

const reason = (
  r: { ok: true } | { ok: false; reason: string },
): string | undefined => (r.ok ? undefined : r.reason);

/** Whether a player is engaged or married to a villager. */
const villagerBound = (g: GameState, key: PlayerId): boolean => {
  const m = g.players.has(key) ? g.players.get(key).marriage : undefined;
  return m !== undefined && (m.stage === "engaged" || m.stage === "married");
};

/** Hand a token back to a player. A full pack gets its price in gold instead. */
function refundToken(g: GameState, to: PlayerId): void {
  if (!g.players.has(to)) return;
  const rec = g.players.get(to);
  if (!rec.inventory.add(TOKEN, 1)) g.players.pay(to, TOKEN_PRICE);
}

/**
 * Apply one marriage intent as player `by`. `null` when the kind is not a marriage intent,
 * `undefined` when it worked, else the reason it was refused.
 */
export function applyMarriageIntent(
  g: GameState,
  by: PlayerId,
  intent: Intent,
): string | undefined | null {
  const b = g.playerMarriage;
  const players = g.players;
  switch (intent.kind) {
    case "propose": {
      const to = intent.to;
      if (typeof to !== "string" || !players.has(to)) return "unknown player";
      // One spouse in all: a player promised or wed to a villager is spoken for (note 12).
      if (villagerBound(g, by)) return "You are already promised or wed.";
      if (villagerBound(g, to)) return "They are already promised or wed.";
      if (players.get(by).inventory.count(TOKEN) < 1)
        return "You need a promise token.";
      const r = pm.propose(b, by, to);
      if (r.ok) players.get(by).inventory.remove(TOKEN, 1);
      return reason(r);
    }
    case "accept-proposal":
    case "decline-proposal": {
      const accept = intent.kind === "accept-proposal";
      const open = pm.proposalFor(b, by);
      if (accept && villagerBound(g, by))
        return "You are already promised or wed.";
      const r = pm.respond(b, by, accept, g.day.clock.day);
      if (r.ok && open && !accept) refundToken(g, open.proposer);
      return reason(r);
    }
    case "withdraw-proposal": {
      const r = pm.withdraw(b, by);
      if (r.ok) refundToken(g, by);
      return reason(r);
    }
    case "call-off":
      return reason(pm.callOff(b, by));
    case "file-divorce": {
      const r = pm.fileDivorce(b, by, players.balance(by));
      if (r.ok) players.pay(by, -DIVORCE_FEE);
      return reason(r);
    }
    case "cancel-divorce": {
      const r = pm.cancelDivorce(b, by);
      if (r.ok) players.pay(by, DIVORCE_FEE);
      return reason(r);
    }
    // A villager marriage, run as the sender so the guest's own marriage, purse and friendship change (note 12).
    case "villager-divorce":
      return asPlayer(g, by, () => {
        const why = divorceProblem(g);
        if (why) return why;
        return fileDivorce(g) ? undefined : "It cannot be filed.";
      });
    case "villager-divorce-cancel":
      return asPlayer(g, by, () =>
        cancelDivorce(g) ? undefined : "Nothing is filed.",
      );
    case "villager-wedding":
      return asPlayer(g, by, () =>
        finishWedding(g) ? undefined : "There is no wedding to finish.",
      );
    case "wedding-seen":
      pm.takeWeddingScene(b, by);
      return undefined;
    default:
      return null;
  }
}

/** The day end: unanswered proposals expire and the token goes back. Returns who got one. */
export function expireProposalsAndRefund(g: GameState): PlayerId[] {
  const back = pm.expireProposals(g.playerMarriage);
  for (const k of back) refundToken(g, k);
  return back;
}
