// Shared paths for the Android scripts. Override with JAVA_HOME / ANDROID_HOME.
import { homedir } from "node:os";
import { join } from "node:path";

export const javaHome =
  process.env.JAVA_HOME ?? join(homedir(), "Android/jdk-21");
export const sdk = process.env.ANDROID_HOME ?? join(homedir(), "Android/Sdk");
export const env = { ...process.env, JAVA_HOME: javaHome, ANDROID_HOME: sdk };
export const adb = join(sdk, "platform-tools/adb");
// `--debug` builds the "dbg" flavour: dev tools on, own package id and saves.
export const debugBuild = process.argv.includes("--debug");
export const appId = debugBuild ? "app.elderglen.game.dbg" : "app.elderglen.game";
export const apk = debugBuild
  ? "android/app/build/outputs/apk/dbg/debug/app-dbg-debug.apk"
  : "android/app/build/outputs/apk/normal/debug/app-normal-debug.apk";
