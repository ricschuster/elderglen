/**
 * Dev tools (debug menu, stage jumper, `farmGive`, speed-up) are on in `npm run
 * dev` and in the "Elderglen DBG" app (`npm run android:apk -- --debug`, which
 * sets `VITE_DEBUG_TOOLS=1`, docs/android.md). The normal build has none.
 */
export const DEBUG_TOOLS: boolean =
  import.meta.env.DEV || import.meta.env.VITE_DEBUG_TOOLS === "1";
