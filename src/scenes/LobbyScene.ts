import Phaser from "phaser";
import { parseAddress } from "../net/address";
import {
  gameLabel,
  gameStatus,
  joinStep,
  visibleGames,
  type GameEntry,
  type JoinState,
} from "../net/lobby";
import { PROTOCOL_VERSION } from "../core/protocol";
import {
  DEFAULT_HOST_OPTIONS,
  nextWalletMode,
  walletModeLabel,
  type HostOptions,
} from "../net/hostoptions";
import { SocketTransport } from "../net/sockettransport";
import { makeHostStarter } from "../net/hoststarter";
import { GameRoomWorld } from "../core/roomworld";
import { newGame } from "../core/save";
import { makeNativePipe } from "../net/nativepipe";
import { GuestSession, setSession } from "../net/session";
import { START } from "../core/maps";
import { STATE_KEY } from "./state";
import type { LobbyTransport } from "../net/transport";

const OUR_VERSION = PROTOCOL_VERSION;
const LAST_HOST_KEY = "elderglen.lastHost";
const KEYS = ["1234567890", "abcdef:.-/"];

/**
 * The transport the screen uses: the real socket. Joining by typed address works
 * wherever WebSocket does. Hosting needs a Node or native host, which the shell
 * injects (the host starter is undefined in a plain browser, so canHost is false).
 * The installed Android app lists games announced on the network (UDP, ADR 0015); a
 * browser tab cannot listen, so it types the address.
 */
export const lobbyTransport: LobbyTransport = new SocketTransport(
  makeNativePipe
    ? makeHostStarter({
        makePipe: makeNativePipe,
        // A new farm for a game hosted from here; the Title Host button hosts a saved farm.
        makeWorld: (_name, o) =>
          new GameRoomWorld(newGame(undefined, o.walletMode)),
      })
    : undefined,
  "Guest",
  makeNativePipe?.(),
);

/**
 * Play together (note 53 step 4): host a game, or join from the list or by a
 * typed address. Touch-sized keys, so it works on a tablet with no keyboard.
 * The list fills from announcements
 * on the installed Android app; elsewhere typing is the way in.
 */
export class LobbyScene extends Phaser.Scene {
  private typed = "";
  private join: JoinState = { phase: "idle" };
  private field!: Phaser.GameObjects.Text;
  private status!: Phaser.GameObjects.Text;
  private hostText!: Phaser.GameObjects.Text;
  private listText: Phaser.GameObjects.Text[] = [];
  private games: GameEntry[] = [];
  private hostOptions: HostOptions = { ...DEFAULT_HOST_OPTIONS };
  private walletText!: Phaser.GameObjects.Text;
  private stopDiscover: (() => void) | undefined;

  constructor() {
    super("lobby");
  }

  init(): void {
    this.typed = "";
    this.join = { phase: "idle" };
    this.games = [];
    try {
      this.typed = localStorage.getItem(LAST_HOST_KEY) ?? "";
    } catch {
      /* no storage */
    }
  }

  create(): void {
    const t = lobbyTransport;
    this.add
      .text(480, 34, "Play together", { fontSize: "32px", color: "#ffe9a0" })
      .setOrigin(0.5);

    // Host side.
    this.add
      .rectangle(240, 250, 430, 330, 0x1f2a22, 0.9)
      .setStrokeStyle(2, 0xffffff, 0.35);
    this.add
      .text(240, 110, "Host a game", { fontSize: "22px", color: "#d8e8c8" })
      .setOrigin(0.5);
    this.hostText = this.add
      .text(
        240,
        200,
        t.canHost
          ? "Start a game others can join."
          : "A browser tab cannot host. Use the desktop or tablet app.",
        {
          fontSize: "15px",
          color: "#ffffffcc",
          align: "center",
          wordWrap: { width: 380 },
        },
      )
      .setOrigin(0.5);
    if (t.canHost) {
      this.hostOptions = { ...DEFAULT_HOST_OPTIONS };
      this.button(240, 232, 330, 40, "", 0x3a4a5a, () => {
        this.hostOptions.walletMode = nextWalletMode(
          this.hostOptions.walletMode,
        );
        this.walletText.setText(walletModeLabel(this.hostOptions.walletMode));
      });
      this.walletText = this.add
        .text(240, 232, walletModeLabel(this.hostOptions.walletMode), {
          fontSize: "16px",
          color: "#ffffff",
        })
        .setOrigin(0.5);
    }
    if (t.canHost)
      this.button(
        240,
        290,
        280,
        52,
        "Host this farm",
        0x3f7d3a,
        () => void this.host(),
      );

    // Join side.
    this.add
      .rectangle(720, 250, 430, 330, 0x1f2a22, 0.9)
      .setStrokeStyle(2, 0xffffff, 0.35);
    this.add
      .text(720, 110, "Join a game", { fontSize: "22px", color: "#d8e8c8" })
      .setOrigin(0.5);
    for (let i = 0; i < 3; i++)
      this.listText.push(
        this.add
          .text(520, 140 + i * 36, "", { fontSize: "15px", color: "#ffffff" })
          .setOrigin(0, 0.5),
      );
    this.add
      .rectangle(660, 262, 300, 40, 0x1c2c24, 1)
      .setStrokeStyle(2, 0xffffff, 0.8);
    this.field = this.add
      .text(520, 262, "", { fontSize: "18px", color: "#ffffff" })
      .setOrigin(0, 0.5);
    this.button(850, 262, 90, 40, "Join", 0x3f7d3a, () => void this.connect());
    KEYS.forEach((row, r) =>
      [...row].forEach((ch, i) =>
        this.button(
          538 + i * 46,
          316 + r * 46,
          42,
          42,
          ch,
          0x3a4a5a,
          () => this.press(ch),
          16,
        ),
      ),
    );
    this.button(
      578,
      408,
      120,
      42,
      "Delete",
      0xa0482e,
      () => this.press("Backspace"),
      16,
    );
    this.button(
      718,
      408,
      120,
      42,
      "Clear",
      0x4a5a7a,
      () => {
        this.typed = "";
        this.refresh();
      },
      16,
    );

    this.status = this.add
      .text(480, 446, "", {
        fontSize: "15px",
        color: "#ffe9a0",
        align: "center",
        wordWrap: { width: 880 },
      })
      .setOrigin(0.5);
    this.button(480, 504, 200, 44, "Back", 0x4a5a7a, () => this.back(), 18);

    const kb = this.input.keyboard;
    kb?.on("keydown", (e: KeyboardEvent) => {
      if (e.key === "Enter") return void this.connect();
      if (e.key === "Escape") return this.back();
      if (e.ctrlKey || e.metaKey || e.altKey) return;
      this.press(e.key);
    });
    this.stopDiscover = t.canDiscover
      ? t.discover((g) => {
          this.games = g;
          this.refresh();
        })
      : undefined;
    this.events.once("shutdown", () => this.stopDiscover?.());
    this.refresh();
  }

  update(): void {
    this.refresh();
  }

  private press(key: string): void {
    if (key === "Backspace") this.typed = this.typed.slice(0, -1);
    else if (
      key.length === 1 &&
      /[a-z0-9:.\-/]/i.test(key) &&
      this.typed.length < 60
    )
      this.typed += key;
    this.refresh();
  }

  private refresh(): void {
    this.field.setText(this.typed || "address, such as 192.168.1.20");
    this.field.setAlpha(this.typed ? 1 : 0.5);
    const shown = visibleGames(this.games, Date.now());
    this.listText.forEach((tx, i) => {
      const g = shown[i];
      tx.setText(
        g
          ? gameLabel(g, OUR_VERSION)
          : i === 0
            ? lobbyTransport.canDiscover
              ? "No games found yet."
              : "Finding games on the network is not ready yet. Type the address."
            : "",
      );
      tx.removeAllListeners();
      if (g && gameStatus(g, OUR_VERSION) === "open")
        tx.setInteractive({ useHandCursor: true }).on("pointerdown", () => {
          this.typed = `${g.host}:${g.port}`;
          void this.connect();
        });
    });
    const j = this.join;
    this.status.setText(
      j.phase === "connecting"
        ? `Connecting to ${j.target}...`
        : j.phase === "failed"
          ? j.message
          : j.phase === "joined"
            ? "Joined. Loading the farm..."
            : "",
    );
  }

  private async host(): Promise<void> {
    const info = await lobbyTransport.startHosting("My farm", this.hostOptions);
    this.hostText.setText(
      `Hosting "${info.name}".\nGuests type this address:\n${info.address}`,
    );
  }

  private async connect(): Promise<void> {
    const address = parseAddress(this.typed);
    this.join = joinStep(this.join, { type: "start", address });
    this.refresh();
    if (this.join.phase !== "connecting" || !address.ok) return;
    try {
      localStorage.setItem(LAST_HOST_KEY, this.typed.trim());
    } catch {
      /* no storage */
    }
    const r = await lobbyTransport.connect(address);
    this.join = joinStep(
      this.join,
      r.ok ? { type: "connected" } : { type: "fail", kind: r.kind },
    );
    this.refresh();
    if (r.ok) this.enterGuestFarm();
  }

  /** Take the farm the host sent, make the guest session, and start the farm scene. */
  private enterGuestFarm(): void {
    const client = lobbyTransport.client;
    const session = client ? new GuestSession(client) : undefined;
    const g = session?.loadFarm();
    if (!session || !g) {
      client?.leave();
      this.join = { phase: "idle" };
      this.status.setText("The host's farm could not be read.");
      return;
    }
    this.registry.set(STATE_KEY, g);
    setSession(session);
    const at = session.spawnTile();
    this.scene.start("farm", { map: START.map, entry: START.entry, ...at });
  }

  private back(): void {
    lobbyTransport.stopHosting();
    this.scene.start("title");
  }

  private button(
    x: number,
    y: number,
    w: number,
    h: number,
    text: string,
    color: number,
    run: () => void,
    size = 20,
  ): void {
    this.add
      .rectangle(x, y, w, h, color, 1)
      .setStrokeStyle(2, 0xffffff, 0.8)
      .setInteractive({ useHandCursor: true })
      .on("pointerdown", run);
    this.add
      .text(x, y, text, { fontSize: `${size}px`, color: "#ffffff" })
      .setOrigin(0.5);
  }
}
