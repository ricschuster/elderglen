// The other players on the farm (note 53): one placeholder sprite and a name label each, from
// the session's snapshots. Only players on the map this scene shows are drawn. Kept out of
// FarmScene (note 106); the scene makes one layer in create and calls `sync` each frame.
import Phaser from "phaser";
import { RemoteInterpolator } from "../net/interp";
import type { NetSession } from "../net/session";
import { sortDepth } from "./depth";
import { PLAYER_KEY } from "./placeholder-textures";

/** A tint per player slot, so the placeholder figures can be told apart. */
const TINTS = [0xffffff, 0x9ec9ff, 0xffb3b3, 0xb8f0a8, 0xffe08a, 0xd9b3ff];

interface Figure {
  body: Phaser.GameObjects.Image;
  label: Phaser.GameObjects.Text;
}

export class RemotePlayerLayer {
  private readonly figures = new Map<string, Figure>();
  private readonly interp = new RemoteInterpolator();

  constructor(
    private readonly scene: Phaser.Scene,
    private readonly session: NetSession,
    private readonly mapId: string,
    /** Hide a new object from the UI camera, which does not draw the world. */
    private readonly ignoreInUi: (o: Phaser.GameObjects.GameObject) => void,
  ) {}

  /** Move, add and remove figures to match the session. */
  sync(): void {
    const seen = new Set<string>();
    const now = performance.now();
    const raw = this.session.remotes();
    this.interp.observe(raw, now);
    for (const r of this.interp.sample(raw, now)) {
      if (r.map !== this.mapId) continue;
      seen.add(r.id);
      let f = this.figures.get(r.id);
      if (!f) {
        const n = Number(r.id.slice(1)) || 0;
        const body = this.scene.add
          .image(r.x, r.y, PLAYER_KEY)
          .setOrigin(0.5, 0.875)
          .setTint(TINTS[n % TINTS.length]!);
        const label = this.scene.add
          .text(r.x, r.y, r.name, { fontSize: "8px", color: "#ffffff" })
          .setOrigin(0.5, 1);
        this.ignoreInUi(body);
        this.ignoreInUi(label);
        f = { body, label };
        this.figures.set(r.id, f);
      }
      const depth = sortDepth(r.y);
      f.body.setPosition(r.x, r.y).setDepth(depth);
      if (f.label.text !== r.name) f.label.setText(r.name);
      f.label.setPosition(r.x, r.y - 22).setDepth(depth + 0.1);
    }
    for (const [id, f] of this.figures)
      if (!seen.has(id)) {
        f.body.destroy();
        f.label.destroy();
        this.figures.delete(id);
      }
  }

  destroy(): void {
    for (const f of this.figures.values()) {
      f.body.destroy();
      f.label.destroy();
    }
    this.figures.clear();
  }
}
