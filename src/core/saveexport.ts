import { loadSlot, type SlotStores } from "./records";
import { SAVE_VERSION, deserialize, type GameState } from "./save";

/**
 * Export and import of one save slot (note 52). The file holds both records,
 * so a day in progress travels too. Settings are per device and never in it.
 * Free of Phaser and the DOM: the scene does the download and the file pick.
 */

export const EXPORT_FORMAT = "elderglen-export";
export const EXPORT_VERSION = 1;
/** A file over this is refused before it is parsed. */
export const MAX_IMPORT_BYTES = 5 * 1024 * 1024;

export interface ExportFile {
  format: typeof EXPORT_FORMAT;
  exportVersion: number;
  /** The save version of the records inside. */
  game: number;
  exportedAt: number;
  night: unknown;
  resume?: unknown;
}

export type ExportResult =
  { ok: true; filename: string; text: string } | { ok: false; message: string };

/** The slot as one downloadable file. Only records that read are included. */
export function exportSlot(
  stores: SlotStores,
  slot: number,
  now: number,
): ExportResult {
  const loaded = loadSlot(stores);
  if (loaded.status !== "used" || !loaded.night)
    return { ok: false, message: "Nothing readable to export in this slot." };
  const nightText = stores.night.read();
  if (nightText === null)
    return { ok: false, message: "Nothing readable to export in this slot." };
  const file: ExportFile = {
    format: EXPORT_FORMAT,
    exportVersion: EXPORT_VERSION,
    game: SAVE_VERSION,
    exportedAt: now,
    night: JSON.parse(nightText),
  };
  const resumeText = stores.resume.read();
  if (loaded.resume && resumeText !== null)
    file.resume = JSON.parse(resumeText);
  const day = loaded.night.day.clock.day;
  return {
    ok: true,
    filename: `elderglen-slot-${slot}-day-${day}.json`,
    text: JSON.stringify(file),
  };
}

export type ImportParse =
  | {
      ok: true;
      night: string;
      resume?: string;
      /** True when the file held a resume that was dropped (unreadable or another day). */
      droppedResume: boolean;
      game: GameState;
    }
  | { ok: false; message: string };

/** Check an export file in the order of note 52. Never throws. */
export function parseImport(text: string, bytes = text.length): ImportParse {
  if (bytes > MAX_IMPORT_BYTES)
    return { ok: false, message: "That file is too large to be a save." };
  let raw: unknown;
  try {
    raw = JSON.parse(text);
  } catch {
    return { ok: false, message: "That file is not an Elderglen save." };
  }
  if (
    typeof raw !== "object" ||
    raw === null ||
    (raw as ExportFile).format !== EXPORT_FORMAT
  )
    return { ok: false, message: "That file is not an Elderglen save." };
  const f = raw as Partial<ExportFile>;
  if (
    typeof f.exportVersion !== "number" ||
    typeof f.game !== "number" ||
    f.exportVersion > EXPORT_VERSION ||
    f.game > SAVE_VERSION
  )
    return {
      ok: false,
      message: "That file is from a newer version of the game.",
    };
  if (f.night === undefined || f.night === null)
    return { ok: false, message: "That save could not be read." };
  const night = JSON.stringify(f.night);
  const game = deserialize(night);
  if (!game) return { ok: false, message: "That save could not be read." };
  let resume: string | undefined;
  let droppedResume = false;
  if (f.resume !== undefined) {
    const text = JSON.stringify(f.resume);
    const g = deserialize(text);
    if (g && g.day.clock.day === game.day.clock.day) resume = text;
    else droppedResume = true;
  }
  return {
    ok: true,
    night,
    ...(resume ? { resume } : {}),
    droppedResume,
    game,
  };
}

/**
 * Store a checked import in a slot. The order is clear resume, write night,
 * write resume, so any stopping point is a coherent slot (the old night with
 * no resume, or the new night). Each record is read back and compared.
 */
export function applyImport(
  stores: SlotStores,
  parsed: Extract<ImportParse, { ok: true }>,
): boolean {
  stores.resume.clear();
  const old = stores.night.read();
  if (!stores.night.write(parsed.night)) return false;
  if (old !== null) stores.prev.write(old);
  if (stores.night.read() !== parsed.night) return false;
  if (parsed.resume !== undefined) {
    if (!stores.resume.write(parsed.resume)) return false;
    if (stores.resume.read() !== parsed.resume) return false;
  }
  return true;
}
