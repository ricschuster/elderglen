/**
 * Tracker (note 07, foraging level 10 under Gatherer): arrows at the screen
 * edge point to forage that is out of sight on the current map. Pure rules:
 * which forage is off screen and which way it lies. The scene draws the arrows.
 */

/** The visible part of the map, in tiles (fractions allowed). */
export interface TileView {
  left: number;
  top: number;
  right: number;
  bottom: number;
}

export interface TrackerArrow {
  /** The forage tile this arrow points at. */
  x: number;
  y: number;
  /** Direction from the middle of the view to the forage, in radians (0 is east, pi/2 is south). */
  angle: number;
  /** Where on the screen edge the arrow sits, as 0 to 1 across and down the view. */
  edgeX: number;
  edgeY: number;
  /** Distance from the middle of the view, in tiles. */
  distance: number;
  /** Eight-way compass word, for text hints and tests. */
  compass: string;
}

/** Most arrows shown at once: the nearest ones. */
export const MAX_ARROWS = 6;
/** How far in from the screen edge an arrow sits, as a share of the view. */
export const EDGE_INSET = 0.04;

const COMPASS = [
  "east",
  "south-east",
  "south",
  "south-west",
  "west",
  "north-west",
  "north",
  "north-east",
];

/** The eight-way compass word for an angle in radians (0 east, pi/2 south). */
export function compassOf(angle: number): string {
  const turn = (angle + 2 * Math.PI) % (2 * Math.PI);
  return COMPASS[Math.round(turn / (Math.PI / 4)) % 8]!;
}

/** True if the tile's centre is inside the view. */
export function inView(view: TileView, x: number, y: number): boolean {
  const cx = x + 0.5;
  const cy = y + 0.5;
  return (
    cx >= view.left && cx <= view.right && cy >= view.top && cy <= view.bottom
  );
}

/**
 * The arrows for forage tiles that are off screen, nearest first, at most
 * `max`. Each sits where the line from the middle of the view to the forage
 * crosses the view's edge, drawn a little inside it.
 */
export function trackerArrows(
  spots: Iterable<{ x: number; y: number }>,
  view: TileView,
  max = MAX_ARROWS,
): TrackerArrow[] {
  const w = view.right - view.left;
  const h = view.bottom - view.top;
  if (w <= 0 || h <= 0) return [];
  const mx = view.left + w / 2;
  const my = view.top + h / 2;
  const out: TrackerArrow[] = [];
  for (const s of spots) {
    if (inView(view, s.x, s.y)) continue;
    const dx = s.x + 0.5 - mx;
    const dy = s.y + 0.5 - my;
    // Scale the vector until it just touches the inset edge of the view.
    const halfW = (w / 2) * (1 - 2 * EDGE_INSET);
    const halfH = (h / 2) * (1 - 2 * EDGE_INSET);
    const k = Math.min(
      dx === 0 ? Infinity : halfW / Math.abs(dx),
      dy === 0 ? Infinity : halfH / Math.abs(dy),
    );
    const angle = Math.atan2(dy, dx);
    out.push({
      x: s.x,
      y: s.y,
      angle,
      edgeX: 0.5 + (dx * k) / w,
      edgeY: 0.5 + (dy * k) / h,
      distance: Math.hypot(dx, dy),
      compass: compassOf(angle),
    });
  }
  out.sort((a, b) => a.distance - b.distance);
  return out.slice(0, max);
}
