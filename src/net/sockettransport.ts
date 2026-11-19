// The real LobbyTransport (note 53, step 3): connects over a WebSocket. Hosting needs Node or
// the Capacitor plugin, so it is injected; in a plain browser canHost is false.
import { GuestClient, JoinFailed } from "./client";
import type { ParsedAddress } from "./address";
import type { GameEntry } from "./lobby";
import type { ConnectResult, HostInfo, LobbyTransport } from "./transport";

export interface HostHandle {
  address: string;
  stop(): void;
}

export class SocketTransport implements LobbyTransport {
  readonly canDiscover = false;
  /** The joined client after a successful connect; the game takes it from here. */
  client: GuestClient | undefined;
  private hosting: HostHandle | undefined;

  constructor(
    private readonly startHost?: (name: string) => Promise<HostHandle>,
    private readonly guestName = "Guest",
  ) {}

  get canHost(): boolean {
    return this.startHost !== undefined;
  }

  async startHosting(name: string): Promise<HostInfo> {
    if (!this.startHost) throw new Error("hosting is not available here");
    this.hosting = await this.startHost(name);
    return { name, address: this.hosting.address };
  }

  stopHosting(): void {
    this.hosting?.stop();
    this.hosting = undefined;
  }

  discover(onGames: (games: GameEntry[]) => void): () => void {
    onGames([]);
    return () => {};
  }

  async connect(
    address: Extract<ParsedAddress, { ok: true }>,
  ): Promise<ConnectResult> {
    try {
      this.client = await GuestClient.connect(address.url, {
        name: this.guestName,
      });
      return { ok: true };
    } catch (e) {
      return {
        ok: false,
        kind: e instanceof JoinFailed ? e.kind : "unreachable",
      };
    }
  }
}
