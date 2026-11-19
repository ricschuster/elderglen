import { type FailKind, type GameEntry } from "./lobby";
import type { ParsedAddress } from "./address";
import { normalizeHostOptions, type HostOptions } from "./hostoptions";

export interface HostInfo {
  name: string;
  /** Address guests type, such as 192.168.1.20:8787. */
  address: string;
}

export type ConnectResult = { ok: true } | { ok: false; kind: FailKind };

/**
 * The seam between the Host and Join screens and the socket (note 53).
 * No real implementation yet: the Room and socket are not built.
 */
export interface LobbyTransport {
  /** False in a browser tab (cannot host) or where discovery is unavailable. */
  readonly canHost: boolean;
  /** UDP discovery needs the router run (needs-hands); false means type the address. */
  readonly canDiscover: boolean;
  startHosting(name: string, options?: HostOptions): Promise<HostInfo>;
  stopHosting(): void;
  /** Listen for announcements. Returns a stop function. */
  discover(onGames: (games: GameEntry[]) => void): () => void;
  connect(
    address: Extract<ParsedAddress, { ok: true }>,
  ): Promise<ConnectResult>;
}

/** Test and placeholder transport with scripted results. */
export class FakeTransport implements LobbyTransport {
  canHost = true;
  canDiscover = false;
  hosting: HostInfo | undefined;
  hostOptions: HostOptions | undefined;
  games: GameEntry[] = [];
  /** Hosts that answer; anything else is unreachable. */
  reachable = new Set<string>();
  connectCalls: string[] = [];
  private listeners = new Set<(g: GameEntry[]) => void>();

  async startHosting(name: string, options?: HostOptions): Promise<HostInfo> {
    this.hostOptions = normalizeHostOptions(options);
    this.hosting = { name, address: "192.168.0.10:8787" };
    return this.hosting;
  }
  stopHosting(): void {
    this.hosting = undefined;
  }
  discover(onGames: (games: GameEntry[]) => void): () => void {
    this.listeners.add(onGames);
    onGames(this.games);
    return () => this.listeners.delete(onGames);
  }
  /** Test hook: announce games to listeners. */
  announce(games: GameEntry[]): void {
    this.games = games;
    this.listeners.forEach((l) => l(games));
  }
  async connect(
    a: Extract<ParsedAddress, { ok: true }>,
  ): Promise<ConnectResult> {
    this.connectCalls.push(a.url);
    return this.reachable.has(a.url)
      ? { ok: true }
      : { ok: false, kind: "unreachable" };
  }
}
