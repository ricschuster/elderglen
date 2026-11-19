import { WALLET_MODES, type WalletMode } from "../core/players";

/** What the host chooses before starting (note 53 step 7). */
export interface HostOptions {
  walletMode: WalletMode;
}

export const DEFAULT_HOST_OPTIONS: HostOptions = { walletMode: "shared" };

/** The next wallet mode when the choice button is tapped. */
export function nextWalletMode(m: WalletMode): WalletMode {
  return (
    WALLET_MODES[(WALLET_MODES.indexOf(m) + 1) % WALLET_MODES.length] ??
    "shared"
  );
}

/** Placeholder button text for the choice. */
export function walletModeLabel(m: WalletMode): string {
  return m === "shared" ? "Money: shared pool" : "Money: separate wallets";
}

/** Fill gaps and reject unknown values. */
export function normalizeHostOptions(o?: Partial<HostOptions>): HostOptions {
  return {
    walletMode: WALLET_MODES.includes(o?.walletMode as WalletMode)
      ? (o?.walletMode as WalletMode)
      : DEFAULT_HOST_OPTIONS.walletMode,
  };
}
