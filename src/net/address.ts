/** Default port of a host (matches spikes/m4/host.mjs). */
export const DEFAULT_PORT = 8787;

export type ParsedAddress =
  | { ok: true; host: string; port: number; url: string }
  | { ok: false; reason: string };

const LABEL = /^[a-z0-9]([a-z0-9-]*[a-z0-9])?$/i;

function validHost(host: string): boolean {
  if (/^[0-9.]+$/.test(host)) {
    const parts = host.split(".");
    return (
      parts.length === 4 &&
      parts.every((p) => /^\d{1,3}$/.test(p) && Number(p) <= 255)
    );
  }
  return host.length <= 253 && host.split(".").every((l) => LABEL.test(l));
}

/**
 * Reads what a guest typed: `192.168.1.20`, `192.168.1.20:9000`, `farmhost.local`,
 * or the same with a `ws://` prefix. No scheme other than ws is taken.
 */
export function parseAddress(
  input: string,
  defaultPort = DEFAULT_PORT,
): ParsedAddress {
  let s = input.trim();
  if (!s)
    return {
      ok: false,
      reason: "Type the address shown on the host's screen.",
    };
  s = s.replace(/^ws:\/\//i, "").replace(/\/+$/, "");
  if (/^[a-z]+:\/\//i.test(s))
    return { ok: false, reason: "Use just the numbers, like 192.168.1.20." };
  let host = s;
  let port = defaultPort;
  const colon = s.lastIndexOf(":");
  if (colon >= 0) {
    host = s.slice(0, colon);
    const p = s.slice(colon + 1);
    if (!/^\d{1,5}$/.test(p) || Number(p) < 1 || Number(p) > 65535)
      return {
        ok: false,
        reason: "The port must be a number from 1 to 65535.",
      };
    port = Number(p);
  }
  if (!host || /\s/.test(host) || !validHost(host))
    return {
      ok: false,
      reason: "That does not look like an address. Check the host's screen.",
    };
  host = host.toLowerCase();
  return { ok: true, host, port, url: `ws://${host}:${port}` };
}
