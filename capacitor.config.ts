import type { CapacitorConfig } from "@capacitor/cli";

const config: CapacitorConfig = {
  appId: "app.elderglen.game",
  appName: "Elderglen",
  webDir: "dist",
  android: { backgroundColor: "#1b2a1f" },
  // The game hides the system bars itself (MainActivity) and should fill the
  // screen under a phone's camera cutout, so no padding for window insets.
  plugins: { SystemBars: { insetsHandling: "disable" } },
};

export default config;
