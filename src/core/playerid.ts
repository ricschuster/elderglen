/** The id of the host, and of the only player in a single-player game (note 53). Its own file so low-level modules can read it without loading `players.ts`. */
export const LOCAL_PLAYER = "p1";

/**
 * The host's marriage: the farm's own, whoever the local player is. The spouse route, the spouse room and the
 * children in the house are the host's (a guest's spouse has no drawn home yet, note 110).
 */
export function hostMarriage<M>(g: {
  marriage?: M;
  players?: { get(id: string): { marriage: M } };
}): M {
  return g.players?.get(LOCAL_PLAYER).marriage ?? g.marriage!;
}
