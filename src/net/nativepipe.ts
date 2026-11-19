// The pipe the installed app hosts and discovers with (ADR 0015). Undefined in a plain browser,
// which cannot listen; the Electron preload bridge (window.elderHost) selects ElectronPipe.
import { CapacitorPipe } from "./pipe-capacitor";
import { ElectronPipe, findBridge } from "./pipe-electron";
import type { SocketPipe } from "./pipe";

const native = (
  globalThis as { Capacitor?: { isNativePlatform?: () => boolean } }
).Capacitor?.isNativePlatform?.();

const bridge = findBridge();

/** A fresh pipe for each hosting session, or undefined where this device cannot host. */
export const makeNativePipe: (() => SocketPipe) | undefined = native
  ? () => new CapacitorPipe()
  : bridge
    ? () => new ElectronPipe(bridge)
    : undefined;
