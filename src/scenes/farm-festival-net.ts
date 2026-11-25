import {
  FESTIVAL_RETURN,
  festivalDayToday,
  festivalOfMap,
} from "../core/festivals";
import { festivalLayout } from "../core/festivalroutes";
import type { FestivalView, Intent } from "../core/protocol";
import {
  GuestSession,
  HostSession,
  sendWorldIntent,
  type NetSession,
} from "../net/session";
import type { FarmScene } from "./FarmScene";

// The farm scene's part of festivals with several players (note 111): the gate (entering, the waiting line,
// leaving together), the festival lines the host sends, and the hunt drawn from the host's view. Free of game
// rules: the host's Room judges everything.

/** The festival view for today, from whichever side of the session this player is, if any. */
export function festivalView(
  net: NetSession | undefined,
  day: number,
): FestivalView | undefined {
  const v = net?.festival;
  return v && v.day === day ? v : undefined;
}

/**
 * Send a festival intent. The host's answer is at once, a guest's arrives a moment later; `then` runs with the
 * refusal or undefined. Without a session `then` runs at once with undefined (single player acts locally).
 */
export function festivalAsk(
  net: NetSession | undefined,
  intent: Intent,
  then: (why?: string) => void,
): void {
  if (net instanceof GuestSession) return net.ask(intent, then);
  if (net instanceof HostSession) return then(sendWorldIntent(net, intent));
  then(undefined);
}

/** Tell the host this player has gone in (a walk through the festival gate, or into the place held in place). */
export function enterFestivalNet(
  farm: FarmScene,
  then: (why?: string) => void,
): void {
  festivalAsk(farm.net, { kind: "festival-enter" }, (why) => {
    if (why !== undefined) {
      farm.message = why;
      farm.render();
      return;
    }
    then();
  });
}

/** The last waiting line and the day it was handled, so a line or the end shows once. */
interface Seen {
  line: string;
  endedDay: number;
}
const seen = new WeakMap<FarmScene, Seen>();

/**
 * Each frame in a session: show the host's festival lines (prizes, winners), the waiting line while this player is
 * in and others are not, and when the festival ends send everyone back where they came in (the clock is the host's).
 */
export function pollFestivalNet(farm: FarmScene): void {
  const net = farm.net;
  if (!net) return;
  const lines = net.takeFestivalLines();
  const day = farm.state.day.clock.day;
  const view = festivalView(net, day);
  let s = seen.get(farm);
  if (!s) seen.set(farm, (s = { line: "", endedDay: -1 }));
  if (lines.length > 0) {
    farm.message = lines.join(" ");
    farm.render();
  }
  if (!view) return;
  const me = net.localId;
  if (view.line !== s.line) {
    s.line = view.line;
    if (view.line && view.entered.includes(me) && lines.length === 0) {
      farm.message = view.line;
      farm.render();
    }
  }
  if (view.ended && s.endedDay !== day && view.entered.includes(me)) {
    s.endedDay = day;
    if (festivalOfMap(farm.mapId)) farm.travel("farm", FESTIVAL_RETURN);
    else {
      farm.message = "The festival is over.";
      farm.render();
    }
  }
}

/**
 * The seed hunt in a session: the packets still lying and the counts come from the host's view; the host
 * picks them up from where each player stands, so nothing is sent from here.
 */
export function updateHuntView(farm: FarmScene): void {
  const view = festivalView(farm.net, farm.state.day.clock.day)?.hunt;
  // The hunt is on the Forest map, which is not a festival map: it is drawn wherever the packets are.
  const f = festivalDayToday(farm.state.day.clock.day);
  const onMap = f && festivalLayout(f)?.map === farm.mapId;
  if (!view || view.done || !onMap) {
    farm.huntGfx?.destroy();
    farm.huntText?.destroy();
    farm.huntGfx = farm.huntText = undefined;
    return;
  }
  const ts = farm.map.tileSize;
  if (!farm.huntGfx) {
    farm.huntGfx = farm.add.graphics().setDepth(850);
    farm.uiCamera.ignore(farm.huntGfx);
    const { width } = farm.scale.gameSize;
    farm.huntText = farm.add
      .text(width / 2, 48, "", { fontSize: "18px", color: "#ffffff" })
      .setOrigin(0.5, 0)
      .setScrollFactor(0)
      .setDepth(2000);
    farm.cameras.main.ignore(farm.huntText);
  }
  farm.huntGfx.clear().fillStyle(0xf0d040, 1);
  for (const t of view.packets)
    farm.huntGfx.fillRect(t[0] * ts + 4, t[1] * ts + 4, ts - 8, ts - 8);
  const mine = view.counts[farm.net!.localId] ?? 0;
  farm.huntText?.setText(`Seed hunt: ${view.left}s  ${mine}/${view.target}`);
}
