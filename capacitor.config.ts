import type { CapacitorConfig } from "@capacitor/cli";

const config: CapacitorConfig = {
  appId: "app.elderglen.game",
  appName: "Elderglen",
  webDir: "dist",
  android: {
    backgroundColor: "#1b2a1f",
    // The page is https://localhost, and a game on the local network is ws:// (no certificate
    // for a LAN address), so a guest in the app needs this. The app loads no remote content
    // (ADR 0008), so nothing but the local game page can use it.
    allowMixedContent: true,
  },
  // Android also refuses cleartext (ws://) traffic to anything but localhost unless allowed, and a
  // LAN game has no certificate. Same reasoning: the app loads no remote content (ADR 0008).
  server: { cleartext: true },
  // The game hides the system bars itself (MainActivity) and should fill the
  // screen under a phone's camera cutout, so no padding for window insets.
  plugins: { SystemBars: { insetsHandling: "disable" } },
};

export default config;
