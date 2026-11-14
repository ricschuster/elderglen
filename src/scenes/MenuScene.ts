import Phaser from "phaser";

/** The tabs of the in-game menu, in Stardew's order (note 49). */
export const MENU_TABS = [
  { key: "pack", label: "Pack" },
  { key: "skills", label: "Skills" },
  { key: "social", label: "Social" },
  { key: "map", label: "Map" },
  { key: "crafting", label: "Craft" },
  { key: "animals", label: "Animals" },
  { key: "special", label: "Special" },
  { key: "collections", label: "Collect" },
  { key: "options", label: "Options" },
  { key: "exit", label: "Exit" },
] as const;

export type MenuTab = (typeof MENU_TABS)[number]["key"];

/** What a tab scene may offer the menu that hosts it. */
interface TabHooks {
  /** True while the tab owns the keyboard (a key capture), so Esc, E and Page keys wait. */
  menuBusy?: () => boolean;
  /** Called before the menu closes, so the tab can save. */
  beforeMenuClose?: () => void;
}

const TAB_W = 90;
const TAB_H = 40;
const TAB_GAP = 4;

/**
 * The tabbed in-game menu (note 49). It draws only the tab strip. Each tab is
 * its own scene, launched under the strip with `menuHost` set so its frame
 * leaves the top band alone. Esc or E closes, Page Up and Page Down switch.
 * The farm stays paused behind it, and so does the clock.
 */
export class MenuScene extends Phaser.Scene {
  private tab: MenuTab = "pack";
  private boxes: Phaser.GameObjects.Rectangle[] = [];

  constructor() {
    super("menu");
  }

  init(data?: { tab?: MenuTab }): void {
    this.tab = MENU_TABS.some((t) => t.key === data?.tab)
      ? (data!.tab as MenuTab)
      : "pack";
    this.boxes = [];
  }

  create(): void {
    const left = (960 - (MENU_TABS.length * (TAB_W + TAB_GAP) - TAB_GAP)) / 2;
    MENU_TABS.forEach((t, i) => {
      const x = left + i * (TAB_W + TAB_GAP);
      const box = this.add
        .rectangle(x, 4, TAB_W, TAB_H, 0x2f4a35, 1)
        .setOrigin(0)
        .setStrokeStyle(2, 0xffffff, 0.6)
        .setInteractive({ useHandCursor: true })
        .setDepth(10);
      box.on("pointerdown", () => this.show(t.key));
      this.add
        .text(x + TAB_W / 2, 4 + TAB_H / 2, t.label, {
          fontSize: "17px",
          color: "#ffffff",
        })
        .setOrigin(0.5)
        .setDepth(11);
      this.boxes.push(box);
    });
    const kb = this.input.keyboard;
    kb?.on("keydown-ESC", () => this.close());
    kb?.on("keydown-E", () => this.close());
    kb?.on("keydown-PAGE_UP", () => this.step(-1));
    kb?.on("keydown-PAGE_DOWN", () => this.step(1));
    this.events.once("shutdown", () => this.scene.stop(this.tab));
    this.launchTab();
  }

  private hooks(): TabHooks {
    return this.scene.get(this.tab) as unknown as TabHooks;
  }

  private busy(): boolean {
    return this.hooks().menuBusy?.() === true;
  }

  private show(tab: MenuTab): void {
    if (tab === this.tab || this.busy()) return;
    this.hooks().beforeMenuClose?.();
    this.scene.stop(this.tab);
    this.tab = tab;
    this.launchTab();
  }

  private step(by: number): void {
    const i = MENU_TABS.findIndex((t) => t.key === this.tab);
    this.show(MENU_TABS[(i + by + MENU_TABS.length) % MENU_TABS.length]!.key);
  }

  private launchTab(): void {
    this.scene.launch(this.tab, { menuHost: true });
    // Scenes draw in list order, and some tabs were registered before the farm:
    // put the tab above everything, then the strip above the tab.
    this.scene.bringToTop(this.tab);
    this.scene.bringToTop();
    this.boxes.forEach((b, i) => {
      const on = MENU_TABS[i]!.key === this.tab;
      b.setFillStyle(on ? 0xa0482e : 0x2f4a35, 1);
      b.setStrokeStyle(on ? 3 : 2, 0xffffff, on ? 1 : 0.6);
    });
  }

  private close(): void {
    if (this.busy()) return;
    this.hooks().beforeMenuClose?.();
    this.scene.stop(this.tab);
    this.scene.stop();
    this.scene.resume("farm");
  }
}
