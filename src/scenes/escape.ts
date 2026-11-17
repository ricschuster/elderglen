/**
 * Esc closes only the top screen. Several scenes listen for Esc at once (a
 * gallery opened over the collections tab of the menu, with the menu strip
 * still running), and the order they hear it in is not fixed. The scene that
 * closes on a key press marks the frame, and any other scene that would also
 * close on the same press checks the mark first.
 */
interface FrameClock {
  game: { getFrame(): number };
}

let takenFrame = -1;

/** Call when this scene closes itself on Esc. */
export function takeEsc(scene: FrameClock): void {
  takenFrame = scene.game.getFrame();
}

/** True when another scene already used this Esc press. */
export function escTaken(scene: FrameClock): boolean {
  return takenFrame === scene.game.getFrame();
}
