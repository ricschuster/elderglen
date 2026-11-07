// Build the web app, sync it into the Android project and build a debug APK.
import { execFileSync } from "node:child_process";
import { writeFileSync } from "node:fs";
import { env, sdk, apk } from "./env.mjs";

const run = (cmd, args, opts = {}) =>
  execFileSync(cmd, args, { stdio: "inherit", env, ...opts });

run("npm", ["run", "android:sync"]);
writeFileSync("android/local.properties", `sdk.dir=${sdk}\n`);
run("./gradlew", ["assembleDebug"], { cwd: "android" });
console.log(`\nAPK: ${apk}`);
