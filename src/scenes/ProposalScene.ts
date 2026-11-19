import Phaser from "phaser";
import { proposalCard } from "../core/marriagecard";
import type { GameState } from "../core/save";
import { currentSession, playerNameOf, sendWorldIntent } from "../net/session";
import { frame, Menu } from "./panel";
import { STATE_KEY } from "./state";

/**
 * The yes or no card on the asked player's client (note 12, two-player steps). Yes sends
 * `accept-proposal`, no (or Esc) sends `decline-proposal`. Placeholder text. Untested in a browser.
 */
export class ProposalScene extends Phaser.Scene {
  private state!: GameState;
  private menu!: Menu;

  constructor() {
    super("proposal");
  }

  init(): void {
    this.state = this.registry.get(STATE_KEY) as GameState;
  }

  create(): void {
    const net = currentSession();
    const me = net?.localId ?? this.state.players.localId;
    const card = proposalCard(this.state.playerMarriage, me, (id) =>
      playerNameOf(net, id),
    );
    const { message } = frame(this, "A promise token", () =>
      this.answer(false),
    );
    message.setText(card?.text ?? "The offer is gone.");
    this.menu = new Menu(this, {
      x: 24,
      y: 64,
      w: 912,
      title: card ? playerNameOf(net, card.from) : "",
      buttonsOnly: true,
    });
    this.menu.setRows([
      {
        label: "Yes",
        detail: "You are engaged. The wedding is in three days",
        buttons: [{ text: "Yes", run: () => this.answer(true) }],
      },
      {
        label: "No",
        detail: "Nothing is lost. The token goes back to them",
        buttons: [{ text: "No", run: () => this.answer(false) }],
      },
    ]);
    this.menu.setFocus(true);
    const kb = this.input.keyboard;
    kb?.on("keydown-UP", () => this.menu.move(-1));
    kb?.on("keydown-DOWN", () => this.menu.move(1));
    kb?.on("keydown-ENTER", () => this.menu.press(0));
    kb?.on("keydown-ESC", () => this.answer(false));
  }

  private answer(yes: boolean): void {
    const net = currentSession();
    if (net)
      sendWorldIntent(net, {
        kind: yes ? "accept-proposal" : "decline-proposal",
      });
    this.scene.stop();
    this.scene.resume("farm");
  }
}
