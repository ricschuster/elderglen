// Install the debug APK on every tablet that adb can see (USB or wireless).
import { execFileSync } from "node:child_process";
import { existsSync } from "node:fs";
import { adb, apk, env } from "./env.mjs";

if (!existsSync(apk)) {
  console.error("No APK yet. Run: npm run android:apk");
  process.exit(1);
}
const run = (...args) =>
  execFileSync(adb, args, { env, timeout: 15000 }).toString();

// Reconnect paired wireless tablets. Their IP and port change (DHCP, toggling
// Wireless debugging), so ask mDNS where they are now.
try {
  for (const line of run("mdns", "services").split("\n")) {
    const m = line.match(/_adb-tls-connect\._tcp\s+(\S+:\d+)/);
    if (!m) continue;
    try {
      run("connect", m[1]);
    } catch {
      // Stale mDNS record: the tablet is off or moved. Skip it.
    }
  }
} catch {
  console.warn("mDNS discovery failed; using devices adb already has.");
}

// One entry per physical tablet: USB, IP and mDNS-name entries of the same
// tablet share a serial. Prefer USB, then ip:port.
const rank = (id) => (id.includes(":") ? 1 : id.startsWith("adb-") ? 2 : 0);
const bySerial = new Map();
for (const [id, state] of run("devices")
  .split("\n")
  .slice(1)
  .map((l) => l.split("\t"))) {
  if (state?.trim() !== "device") continue;
  let serial;
  try {
    serial = run("-s", id, "shell", "getprop", "ro.serialno").trim();
  } catch {
    continue;
  }
  const have = bySerial.get(serial);
  if (!have || rank(id) < rank(have)) bySerial.set(serial, id);
}
const devices = [...bySerial.values()];
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
