// Screens drawn over the farm (shop, bin) for a guest: they send intents and redraw when the
// host's `applied` comes back (note 53). Free of game rules.
import type Phaser from "phaser";
import type { Intent } from "../core/protocol";
import type { GameState } from "../core/save";
import { LOCAL_PLAYER } from "../core/players";
import { applyScreenIntent } from "../core/screenintents";
import { applyFarmIntent } from "../core/roomintents";
import type { ScreenRef } from "../core/screens";
import {
  currentSession,
  GuestSession,
  HostSession,
  sendWorldIntent,
} from "../net/session";

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

/**
 * Open a screen that other players share (note 108): the host's book takes the lock and checks
 * where this player stands, then `go` shows the screen. The host answers at once, a guest's answer
 * arrives a moment later; a refusal goes to `refuse` with its reason. Single player just goes.
 */
export function openShared(
  ref: ScreenRef,
  go: () => void,
  refuse: (why: string) => void,
): void {
  const net = currentSession();
  const intent: Intent = { kind: "open", screen: ref };
  if (net instanceof GuestSession)
    return net.ask(intent, (why) => (why === undefined ? go() : refuse(why)));
  if (net instanceof HostSession) {
    const why = sendWorldIntent(net, intent);
    return why === undefined ? go() : refuse(why);
  }
  go();
}

/** Tell the host this player's screen is closed, when `scene` shuts down (frees a chest lock). */
export function closeWhenDone(scene: Phaser.Scene): void {
  const net = currentSession();
  if (!net) return;
  scene.events.once("shutdown", () => {
    const intent: Intent = { kind: "close" };
    if (net instanceof GuestSession) net.sendIntent(intent);
    else sendWorldIntent(net, intent);
  });
}

/**
 * The screen-action dispatcher (note 108). Single player applies the action to the local state at
 * once. The host sends it through its Room, so it reaches every guest's copy as an `applied`. A
 * guest sends it and the screen redraws when the host's answer reaches its copy. Returns the
 * refusal when there is one and "sent" for a guest's request still on its way.
 */
export function dispatch(
  g: GameState,
  intent: Intent,
): string | undefined | "sent" {
  const net = currentSession();
  if (net instanceof GuestSession) {
    net.sendIntent(intent);
    return "sent";
  }
  if (net instanceof HostSession) return sendWorldIntent(net, intent);
  const s = applyScreenIntent(g, LOCAL_PLAYER, intent);
  if (s !== null) return s;
  const r = applyFarmIntent(g, LOCAL_PLAYER, intent, Math.random);
  return r === null ? `unknown action ${intent.kind}` : r;
}
