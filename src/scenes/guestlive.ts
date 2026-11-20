// Screens drawn over the farm (shop, bin) for a guest: they send intents and redraw when the
// host's `applied` comes back (note 53). Free of game rules.
import type Phaser from "phaser";
import { currentSession, GuestSession } from "../net/session";

/**
 * While `scene` is open, a guest's farm changes and refusals redraw it. `refresh` redraws and `say` shows a
 * message. Does nothing for the host and for single player. The farm's own handlers come back
 * when the screen shuts down.
 */
export function followGuest(
  scene: Phaser.Scene,
  refresh: () => void,
  say: (text: string) => void,
): void {
  const net = currentSession();
  if (!(net instanceof GuestSession)) return;
  const keptChange = net.onChange;
  const keptRejected = net.onRejected;
  net.onChange = () => {
    keptChange?.();
    refresh();
  };
  net.onRejected = (reason) => say(`The host said no: ${reason}.`);
  scene.events.once("shutdown", () => {
    net.onChange = keptChange;
    net.onRejected = keptRejected;
  });
}
