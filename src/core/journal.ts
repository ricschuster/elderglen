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

/** One open request: its title and the detail lines shown when expanded. */
export interface QuestEntry {
  id: string;
  title: string;
  details: string[];
}

/** The open requests as entries: title, then progress, pay and time left. */
export function questEntries(g: GameState): QuestEntry[] {
  const day = g.day.clock.day;
  return g.quests.open().map((q) => {
    const left = daysLeft(q, day);
    const progress =
      q.type === "gathering"
        ? `${Math.min(q.progress, q.want.count)} of ${q.want.count} gathered`
        : ready(g, q)
          ? "You have it in the pack"
          : "Not enough in the pack yet";
    return {
      id: q.id,
      title: wantText(q),
      details: [
        `${progress}.`,
        `Pays ${q.reward.gold}g. ${left} ${left === 1 ? "day" : "days"} left.`,
      ],
    };
  });
}

/** Which entries start open: only the one just added (the newest). */
export function defaultExpanded(entries: QuestEntry[]): Set<string> {
  const last = entries[entries.length - 1];
  return new Set(last ? [last.id] : []);
}

/** Flip one entry open or shut. Returns a new set. */
export function toggleExpanded(open: Set<string>, id: string): Set<string> {
  const next = new Set(open);
  if (!next.delete(id)) next.add(id);
  return next;
}

/** A journal line, with the quest id when it is an entry title (tap target). */
export interface JournalLine {
  text: string;
  quest?: string;
  /** The quest id when this line is a Cancel button (tap target). */
  cancel?: string;
  /** Confirm-step buttons: the quest id they answer for. */
  yes?: string;
  no?: string;
}

/** Give a request up from the journal. Costs nothing (note 50). True if it was open. */
export function cancelQuest(g: GameState, id: string): boolean {
  return g.quests.cancel(id);
}

/** Quest entries as lines: a marker and title, then details if expanded. */
export function questView(
  entries: QuestEntry[],
  open: Set<string>,
  selected?: string,
): JournalLine[] {
  const out: JournalLine[] = [];
  for (const e of entries) {
    const isOpen = open.has(e.id);
    out.push({
      text: `${e.id === selected ? ">" : " "} ${isOpen ? "[-]" : "[+]"} ${e.title}`,
      quest: e.id,
    });
    if (isOpen) {
      for (const d of e.details) out.push({ text: `       ${d}` });
      out.push({ text: "       [ Cancel request ]", cancel: e.id });
    }
  }
  return out;
}

/** The open requests, all expanded, as plain lines (also the empty text). */
export function questLines(g: GameState): string[] {
  const entries = questEntries(g);
  const wedding = weddingMark(g);
  const mark = wedding ? [wedding] : [];
  if (entries.length === 0)
    return [
      ...mark,
      "No open requests.",
      "Take one from the request board and it will be listed here.",
    ];
  return [
    ...mark,
    ...entries.flatMap((e) => [e.title, ...e.details.map((d) => `   ${d}`)]),
  ];
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
