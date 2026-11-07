# Android tablets

The game runs on Android tablets as a Capacitor app (ADR 0008). The app wraps
the Vite build, so it is the same game as the browser. The `android/` folder is
the generated Capacitor project, committed. Debug build only: no signing or
store release yet.

## One time on each tablet

1. Settings, About tablet: tap Build number seven times to turn on Developer
   options.
2. Settings, Developer options: turn on USB debugging. On Android 11 and later
   you can use Wireless debugging instead.

## Connect and install

USB: plug the tablet in, accept the "Allow USB debugging" prompt, then run
`npm run android:install`.

Wireless (Android 11 and later): on the tablet open Developer options, Wireless
debugging, Pair device with pairing code. Then on this machine:

```bash
~/Android/Sdk/platform-tools/adb pair <ip>:<pairing port>
~/Android/Sdk/platform-tools/adb connect <ip>:<connect port>
npm run android:install
```

`npm run android:install` installs on every tablet that adb can see, replaces
an older copy, and starts the game. Saves survive a reinstall of the same app,
but not an uninstall.

## Update after a code change

`npm run android:apk` builds the web app, syncs it into `android/` and builds
`android/app/build/outputs/apk/debug/app-debug.apk`. Then `npm run
android:install`.

## Tools

Needs JDK 21 and the Android SDK (platform 36, build tools). The scripts look in
`~/Android/jdk-21` and `~/Android/Sdk`. Override with `JAVA_HOME` and
`ANDROID_HOME`.

## What the wrapper does

Landscape only, full screen (swipe from an edge to show the system bars). No
native plugins yet. Multiplayer hosting needs the plugin of ADR 0008, later.
