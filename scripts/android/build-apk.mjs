// Build the web app, sync it into the Android project and build an APK.
// `--debug` includes the dev tools (stage jumper, debug menu) and builds the
// separate "Elderglen DBG" app, so real saves are never touched.
import { execFileSync } from "node:child_process";
import { writeFileSync } from "node:fs";
import { env, sdk, apk, debugBuild } from "./env.mjs";

const run = (cmd, args, opts = {}) =>
  execFileSync(cmd, args, { stdio: "inherit", env, ...opts });

run("npm", ["run", "android:sync"], {
  env: { ...env, VITE_DEBUG_TOOLS: debugBuild ? "1" : "" },
});
writeFileSync("android/local.properties", `sdk.dir=${sdk}\n`);
run("./gradlew", [debugBuild ? "assembleDbgDebug" : "assembleNormalDebug"], { cwd: "android" });
console.log(`\nAPK: ${apk}`);
