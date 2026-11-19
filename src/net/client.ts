// The guest's side of the socket: speaks the protocol to a NodeHost. Uses the standard
// WebSocket, so it runs in a browser, in Capacitor and in Node 22 (the headless guest).
import type { PlayerId } from "../core/players";
import {
  encode,
  type ClientMsg,
  type Intent,
  type PlayerInfo,
  type PosRow,
  type ServerMsg,
} from "../core/protocol";
import type { FailKind } from "./lobby";

export class JoinFailed extends Error {
  constructor(readonly kind: FailKind) {
    super(`join failed: ${kind}`);
  }
}

export interface ConnectOptions {
  name: string;
  /** The id from an earlier join, to come back as the same player. */
  rejoinId?: PlayerId;
  timeoutMs?: number;
}

export class GuestClient {
  id: PlayerId = "";
  day = 0;
  farm = "";
  /** Top-left tile of this guest's cabin, from the host's hello. */
  home: { x: number; y: number } | undefined;
  players = new Map<PlayerId, PlayerInfo>();
  /** Latest position row of every connected player. */
  positions: Record<PlayerId, PosRow> = {};
  snapN = -1;
  /** Every message received, in order (kept for tests and debugging). */
  log: ServerMsg[] = [];
  closed = false;
  /** Called for each message after state is updated. */
  onMessage?: (m: ServerMsg) => void;
  onClose?: () => void;
  private seq = 1;
  private ws: WebSocket | undefined;

  /** Connect and join. Resolves once the hello and the farm have arrived. */
  static connect(url: string, o: ConnectOptions): Promise<GuestClient> {
    const g = new GuestClient();
    return new Promise((resolve, reject) => {
      let settled = false;
      let gotHello = false;
      const fail = (k: FailKind) => {
        if (settled) return;
        settled = true;
        clearTimeout(timer);
        g.ws?.close();
        reject(new JoinFailed(k));
      };
      const timer = setTimeout(() => fail("timeout"), o.timeoutMs ?? 5000);
      let ws: WebSocket;
      try {
        ws = new WebSocket(url);
      } catch {
        return fail("unreachable");
      }
      g.ws = ws;
      ws.onopen = () => g.send({ t: "join", name: o.name, id: o.rejoinId });
      ws.onerror = () => fail("unreachable");
      ws.onclose = () => {
        g.closed = true;
        if (!settled) fail("unreachable");
        g.onClose?.();
      };
      ws.onmessage = (e) => {
        const m = JSON.parse(String(e.data)) as ServerMsg;
        if (m.t === "refused")
          return fail(
            m.reason === "full"
              ? "full"
              : m.reason === "no-free-cabin"
                ? "refused"
                : "in-use",
          );
        g.apply(m);
        if (m.t === "hello") gotHello = true;
        if (m.t === "farm" && gotHello && !settled) {
          settled = true;
          clearTimeout(timer);
          resolve(g);
        }
      };
    });
  }

  private apply(m: ServerMsg): void {
    this.log.push(m);
    switch (m.t) {
      case "hello":
        this.id = m.id;
        this.day = m.day;
        this.home = m.home;
        this.players = new Map(m.players.map((p) => [p.id, p]));
        break;
      case "farm":
        this.farm = m.farm;
        this.day = m.day;
        break;
      case "day":
        this.day = m.day;
        break;
      case "snap":
        this.snapN = m.n;
        this.positions = m.p;
        break;
      case "joined":
        this.players.set(m.player.id, m.player);
        break;
      case "left":
        this.players.delete(m.id);
        break;
    }
    this.onMessage?.(m);
  }

  private send(m: ClientMsg): void {
    if (this.ws?.readyState === WebSocket.OPEN) this.ws.send(encode(m));
  }

  /** Report where this guest stands. Returns the ts sent (echoed back in snapshots). */
  sendPos(
    x: number,
    y: number,
    map = "farm",
    dir = 0,
    pass: PlayerId[] = [],
  ): number {
    const ts = performance.now();
    this.send({ t: "pos", x, y, map, dir, pass, ts });
    return ts;
  }

  /** Ask for a world change. Returns the seq, matched by `applied` or `rejected`. */
  sendIntent(intent: Intent): number {
    const seq = this.seq++;
    this.send({ t: "intent", seq, intent });
    return seq;
  }

  setAway(away: boolean): void {
    this.send({ t: "away", away });
  }

  /** Leave on purpose (the host marks the player dropped). */
  leave(): void {
    this.send({ t: "leave" });
    this.ws?.close();
  }

  /** Drop the socket without saying goodbye, as a lost connection does. */
  close(): void {
    this.ws?.close();
  }
}
