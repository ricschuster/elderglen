import type { PlayerId } from "./players";
import type { GameState } from "./save";

/**
 * Run `fn` with the game state acting as player `by`: the local-player accessors (inventory, can,
 * skills, tool tiers, money) point at their record, and the day's energy object holds their energy
 * for the call, so `day.act` and `day.over` spend and test theirs. Everything is put back after.
 */
export function asPlayer<T>(g: GameState, by: PlayerId, fn: () => T): T {
  const players = g.players;
  if (by === players.localId) return fn();
  const rec = players.get(by);
  const day = g.day.energy;
  const kept = { current: day.current, max: day.max };
  const prev = players.localId;
  day.max = rec.energy.max;
  day.current = rec.energy.current;
  players.localId = by;
  try {
    return fn();
  } finally {
    rec.energy.current = day.current;
    rec.energy.max = day.max;
    day.current = kept.current;
    day.max = kept.max;
    players.localId = prev;
  }
}
