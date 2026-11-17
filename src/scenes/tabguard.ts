import type Phaser from "phaser";
import { HEARTBEAT_MS, isNativeApp } from "../core/tabguard";
import { tabGuard } from "./storage";

/**
 * Starts the two-tab guard (note 52): a heartbeat on the lock, and a cover over
 * the game with the choice to play here when another tab owns the saves. The
 * game sleeps behind the cover. Playing here reloads the page, so the tab
 * starts again from what the other tab saved and never from a stale state.
 */
export function installTabGuard(game: Phaser.Game): void {
  // The installed app has one WebView and no second window. A force-stop or
  // crash fires no pagehide, so its lock would cover the next launch for 10 s.
  if (isNativeApp(window)) return;
  let cover: HTMLDivElement | undefined;

  const show = (): void => {
    if (cover) return;
    game.loop.sleep();
    cover = document.createElement("div");
    cover.style.cssText =
      "position:fixed;inset:0;z-index:1000;display:flex;flex-direction:column;" +
      "align-items:center;justify-content:center;gap:20px;padding:24px;" +
      "background:#10201af2;color:#fff;font:20px sans-serif;text-align:center";
    const text = document.createElement("p");
    text.textContent =
      "Elderglen is open in another window. Playing in two windows would overwrite each other's saves, so this one has paused.";
    const take = document.createElement("button");
    take.textContent = "Play here instead";
    take.style.cssText =
      "font:20px sans-serif;padding:12px 24px;background:#3f7d3a;color:#fff;border:2px solid #fff;border-radius:6px;cursor:pointer";
    take.onclick = () => {
      tabGuard.takeOver();
      location.reload();
    };
    const note = document.createElement("p");
    note.style.cssText = "font-size:14px;opacity:.7;margin:0";
    note.textContent =
      "The other window will pause. Anything done in this one since it opened is not saved.";
    cover.append(text, take, note);
    document.body.append(cover);
    take.focus();
  };

  const beat = (): void => {
    if (tabGuard.check()) show();
  };
  beat();
  window.setInterval(beat, HEARTBEAT_MS);
  document.addEventListener("visibilitychange", () => {
    if (!document.hidden) beat();
  });
  window.addEventListener("pagehide", () => tabGuard.release());
}
