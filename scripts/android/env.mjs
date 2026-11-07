// Shared paths for the Android scripts. Override with JAVA_HOME / ANDROID_HOME.
import { homedir } from "node:os";
import { join } from "node:path";

export const javaHome =
  process.env.JAVA_HOME ?? join(homedir(), "Android/jdk-21");
export const sdk = process.env.ANDROID_HOME ?? join(homedir(), "Android/Sdk");
export const env = { ...process.env, JAVA_HOME: javaHome, ANDROID_HOME: sdk };
export const adb = join(sdk, "platform-tools/adb");
export const apk = "android/app/build/outputs/apk/debug/app-debug.apk";
