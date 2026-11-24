/** True for a plain object (not null, not an array): the shape check for saved data. */
export const isObject = (v: unknown): v is Record<string, unknown> =>
  typeof v === "object" && v !== null && !Array.isArray(v);

/** True for a finite number: the shape check for saved numbers. */
export const isNum = (v: unknown): v is number =>
  typeof v === "number" && Number.isFinite(v);

/** The longest name an animal or horse keeps. */
export const NAME_MAX = 16;

/** A name with the extra space trimmed and cut to the limit. */
export function cleanName(raw: string, max: number = NAME_MAX): string {
  return raw.trim().replace(/\s+/g, " ").slice(0, max);
}
