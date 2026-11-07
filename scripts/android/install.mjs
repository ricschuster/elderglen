// Install the debug APK on every tablet that adb can see (USB or wireless).
import { execFileSync } from "node:child_process";
import { existsSync } from "node:fs";
import { adb, apk, env } from "./env.mjs";

if (!existsSync(apk)) {
  console.error("No APK yet. Run: npm run android:apk");
  process.exit(1);
}
const out = execFileSync(adb, ["devices"], { env }).toString();
const devices = out
  .split("\n")
  .slice(1)
  .map((l) => l.split("\t"))
  .filter(([, state]) => state?.trim() === "device")
  .map(([id]) => id);
if (devices.length === 0) {
  console.error("No tablet found. See docs/android.md to connect one.");
  process.exit(1);
}
for (const id of devices) {
  console.log(`Installing on ${id}`);
  execFileSync(adb, ["-s", id, "install", "-r", apk], {
    stdio: "inherit",
    env,
  });
  execFileSync(
    adb,
    ["-s", id, "shell", "monkey", "-p", "app.elderglen.game", "1"],
    { stdio: "ignore", env },
  );
}
