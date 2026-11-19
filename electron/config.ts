// Pure choices for the Electron wrapper (ADR 0016), kept apart from the electron import so
// they are unit tested.

/** The dev server `npm run dev` starts; the wrapper loads it unless told otherwise. */
export const DEV_URL = "http://localhost:5173";

/** The name the preload exposes on `window` (what src/net/pipe-electron.ts looks for). */
export const BRIDGE_KEY = "elderHost";

/** The page the window loads: a dev server URL, or the built game. */
export function pageTarget(
  env: Record<string, string | undefined>,
  distDir: string,
): { kind: "url"; url: string } | { kind: "file"; path: string } {
  const url = env.ELDERGLEN_URL;
  if (url) return { kind: "url", url };
  if (env.ELDERGLEN_DEV === "1") return { kind: "url", url: DEV_URL };
  return { kind: "file", path: `${distDir}/index.html` };
}

/** True for a URL the window may navigate to: the game's own page only. */
export function allowNavigation(target: string, pageUrl: string): boolean {
  try {
    const a = new URL(target);
    const b = new URL(pageUrl);
    return a.protocol === b.protocol && a.host === b.host;
  } catch {
    return false;
  }
}

/** Window settings. Context isolation and the sandbox stay on; no Node in the page. */
export function webPreferences(preload: string) {
  return {
    preload,
    contextIsolation: true,
    nodeIntegration: false,
    sandbox: true,
  };
}
