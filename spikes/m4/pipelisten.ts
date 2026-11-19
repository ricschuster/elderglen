// Game list discovery in the page of the app on a tablet, through the ElderHost plugin: listens and
// keeps what the real SocketTransport.discover shows. pipelisten.mjs injects this and reads games().
import { CapacitorPipe } from "../../src/net/pipe-capacitor";
import { SocketTransport } from "../../src/net/sockettransport";
import type { GameEntry } from "../../src/net/lobby";

let shown: GameEntry[] = [];
let stop: (() => void) | undefined;
const raw: { text: string; from: string; at: number }[] = [];

export function start() {
  const pipe = new CapacitorPipe();
  const inner = pipe.discover.bind(pipe);
  pipe.discover = (cb) =>
    inner((text, from) => {
      raw.push({ text, from, at: Math.round(performance.now()) });
      cb(text, from);
    });
  const t = new SocketTransport(undefined, "Guest", pipe);
  stop = t.discover((g) => (shown = g));
  return t.canDiscover;
}

export function games() {
  return { shown, datagrams: raw.length, first: raw[0] };
}

export function end() {
  stop?.();
}
