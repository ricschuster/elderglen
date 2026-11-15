import { CATEGORY_NAMES, type ArtisanCategory } from "./artisan";
import { rewardText, ROOMS } from "./bundles";
import { dateOf } from "./calendar";
import { weddingMark } from "./courtship";
import { itemById } from "./items";
import { letterOf } from "./mail";
import { daysLeft, ready, wantText } from "./quests";
import type { GameState } from "./save";

/**
 * The journal's three sections (note 49): Quests, Projects and Mail. Plain
 * lines of text read from the game state, never changing it, so the scene only
 * draws them and tests can check them.
 */
export const JOURNAL_SECTIONS = [
  { key: "quests", label: "Quests" },
  { key: "projects", label: "Projects" },
  { key: "mail", label: "Mail" },
] as const;

export type JournalSection = (typeof JOURNAL_SECTIONS)[number]["key"];

/** The open requests, each with its want, pay, time left and progress. */
export function questLines(g: GameState): string[] {
  const open = g.quests.open();
  const wedding = weddingMark(g);
  const mark = wedding ? [wedding] : [];
  if (open.length === 0)
    return [
      ...mark,
      "No open requests.",
      "Take one from the request board and it will be listed here.",
    ];
  const day = g.day.clock.day;
  const lines: string[] = [...mark];
  for (const q of open) {
    lines.push(wantText(q));
    const left = daysLeft(q, day);
    const progress =
      q.type === "gathering"
        ? `${Math.min(q.progress, q.want.count)} of ${q.want.count} gathered`
        : ready(g, q)
          ? "You have it in the pack"
          : "Not enough in the pack yet";
    lines.push(
      `   ${progress}. Pays ${q.reward.gold}g. ${left} ${left === 1 ? "day" : "days"} left.`,
    );
  }
  return lines;
}

const goodName = (id: string): string =>
  itemById(id)?.name ?? CATEGORY_NAMES[id as ArtisanCategory] ?? id;

/** The village hall: each open room's bundles, with goods handed in and still needed. */
export function projectLines(g: GameState): string[] {
  const { hall } = g;
  const lines: string[] = [];
  for (const room of ROOMS) {
    const status = hall.roomStatus(room.id);
    if (status !== "ready" && status !== "done") continue;
    lines.push(`${room.name}${status === "done" ? " (done)" : ""}`);
    for (const b of hall.bundlesIn(room.id)) {
      if (hall.complete(b.id)) {
        lines.push(`   ${b.name}: done`);
        continue;
      }
      lines.push(
        `   ${b.name}: ${hall.handedIn(b.id).length} of ${b.required}. Reward: ${rewardText(b)}`,
      );
      const given = hall.handedIn(b.id);
      const need = b.items
        .filter((i) => !given.includes(i.id))
        .map(
          (i) =>
            `${i.name ?? goodName(i.id)}${i.count > 1 ? ` ${hall.have(b.id, i.id)}/${i.count}` : ""}`,
        );
      const done = given.map(goodName);
      if (need.length) lines.push(`      Still needs: ${need.join(", ")}`);
      if (done.length) lines.push(`      Handed in: ${done.join(", ")}`);
    }
  }
  return lines.length ? lines : ["The hall has no project open yet."];
}

/** Letters received, newest first, with whether a gift waits. */
export function mailLines(g: GameState): string[] {
  const kept = g.mail.kept();
  if (kept.length === 0) return ["No letters yet."];
  return kept.map((e) => {
    const l = letterOf(e);
    const { season, dayOfSeason } = dateOf(e.received ?? e.due);
    const mark =
      e.state === "waiting"
        ? "unread"
        : e.state === "opened"
          ? "gift waiting"
          : "read";
    return `${l?.title ?? e.id}   ${l?.sender ?? ""}   ${season} ${dayOfSeason}   (${mark})`;
  });
}

export function journalLines(g: GameState, section: JournalSection): string[] {
  return section === "quests"
    ? questLines(g)
    : section === "projects"
      ? projectLines(g)
      : mailLines(g);
}
