// The pipe the installed app hosts and discovers with (ADR 0015). Undefined in a plain browser,
// which cannot listen; the Electron pipe will join this when it is built.
import { CapacitorPipe } from "./pipe-capacitor";
import type { SocketPipe } from "./pipe";

const native = (
  globalThis as { Capacitor?: { isNativePlatform?: () => boolean } }
).Capacitor?.isNativePlatform?.();

/** A fresh pipe for each hosting session, or undefined where this device cannot host. */
export const makeNativePipe: (() => SocketPipe) | undefined = native
  ? () => new CapacitorPipe()
  : undefined;
