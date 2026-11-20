// Player marriage intents (note 12, two-player steps): the same function runs on the host and on
// every guest copy, so the bond book stays equal. The promise token is held while a proposal is
// open: used up on accept, handed back on decline, withdrawal and expiry (owner, 2026-11-19).
// Free of Phaser and the DOM.
import { TOKEN } from "./courtship";
import { DIVORCE_FEE, TOKEN_PRICE } from "./marriage";
import type { PlayerId } from "./players";
import * as pm from "./playermarriage";
import type { Intent } from "./protocol";
import type { GameState } from "./save";

const reason = (
  r: { ok: true } | { ok: false; reason: string },
): string | undefined => (r.ok ? undefined : r.reason);

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
