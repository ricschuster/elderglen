// The real LobbyTransport (note 53): connects over a WebSocket. Hosting needs Node or
// the Capacitor plugin, so it is injected; in a plain browser canHost is false.
import { GuestClient, JoinFailed } from "./client";
import { parseAnnounce } from "./announce";
import type { SocketPipe } from "./pipe";
import type { ParsedAddress } from "./address";
import { mergeAnnouncement, visibleGames, type GameEntry } from "./lobby";
import { normalizeHostOptions, type HostOptions } from "./hostoptions";
import type { ConnectResult, HostInfo, LobbyTransport } from "./transport";

export interface HostHandle {
  address: string;
  stop(): void;
}

export class SocketTransport implements LobbyTransport {
  /** The joined client after a successful connect; the game takes it from here. */
  client: GuestClient | undefined;
  private hosting: HostHandle | undefined;

  constructor(
    private readonly startHost?: (
      name: string,
      options: HostOptions,
    ) => Promise<HostHandle>,
    private readonly guestName = "Guest",
    /** A pipe that can listen for announcements (UDP); without one, guests type the address. */
    private readonly discovery?: SocketPipe,
  ) {}

  get canDiscover(): boolean {
    return this.discovery?.discover !== undefined;
  }

  get canHost(): boolean {
    return this.startHost !== undefined;
  }

  async startHosting(name: string, options?: HostOptions): Promise<HostInfo> {
    if (!this.startHost) throw new Error("hosting is not available here");
    this.hosting = await this.startHost(name, normalizeHostOptions(options));
    return { name, address: this.hosting.address };
  }

  stopHosting(): void {
    this.hosting?.stop();
    this.hosting = undefined;
  }

  discover(onGames: (games: GameEntry[]) => void): () => void {
    const pipe = this.discovery;
    if (!pipe?.discover) {
      onGames([]);
      return () => {};
    }
    let list: GameEntry[] = [];
    // Always hand over the current list, with fresh `seen` times: the screen drops a game that
    // has not been refreshed, so a changes-only emit would hide a live game after a few seconds.
    const emit = () => onGames(visibleGames(list, Date.now()));
    onGames([]);
    const stop = pipe.discover((text, from) => {
      const g = parseAnnounce(text, from, Date.now());
      if (g) list = mergeAnnouncement(list, g);
      emit();
    });
    // Games that stop announcing drop off the list.
    const timer = setInterval(emit, 1000);
    return () => {
      clearInterval(timer);
      stop();
    };
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
