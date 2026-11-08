import { animalReportLines } from "./animals";
import { WAITING_ROOMS_LINE } from "./house";
import { ordersReportLines } from "./orders";
import type { SleepReport } from "./sleep";

/** The words for the morning after: what happened overnight, one per line. */
export function reportLines(r: SleepReport): string[] {
  const lines: string[] = [];
  if (r.passedOut) {
    const why =
      r.reason === "energy"
        ? "You ran out of energy and passed out."
        : "You stayed up too late and passed out.";
    lines.push(why);
    lines.push(
      r.moneyLost > 0
        ? `Someone helped you home and kept ${r.moneyLost}g for the trouble.`
        : "Someone helped you home. It cost you nothing.",
    );
  } else {
    lines.push("You slept well.");
  }
  if (r.withered > 0) {
    lines.push(
      r.withered === 1
        ? "1 crop withered when the season ended."
        : `${r.withered} crops withered when the season ended.`,
    );
  }
  lines.push(...ordersReportLines(r.orders));
  lines.push(...r.requestsLapsed);
  for (const name of r.stuckTrees)
    lines.push(
      `Your ${name.toLowerCase()} tree cannot grow. Clear the ground around it.`,
    );
  if (r.houseFinished) {
    lines.push("The carpenter has finished. Your new rooms are ready.");
    if (r.houseTier === 2) lines.push(WAITING_ROOMS_LINE);
  }
  lines.push(...animalReportLines(r.animals, r.coopFinished, r.barnFinished));
  if (r.furnaceGifted) lines.push("The smith left a furnace by your house.");
  for (const name of r.achievements)
    lines.push(`Achievement: ${name}. The hatter has a new hat on sale.`);
  if (r.completionGain > 0)
    lines.push(`Collections: ${r.completion} percent complete.`);
  if (r.newMail > 0) lines.push("There is mail.");
  if (r.toolReady)
    lines.push(
      `Your ${r.toolReady === "can" ? "watering can" : r.toolReady} is ready at the smith.`,
    );
  lines.push(
    r.weather === "stormy"
      ? "A thunderstorm rolls over the valley. The rain watered your crops."
      : r.weather === "rainy"
        ? "It is raining. The rain watered your crops."
        : r.weather === "snowy"
          ? "Snow is falling."
          : "The sun is out.",
  );
  return lines;
}

/** A heading for the season notice, shown on a new season's first day. */
export function seasonNotice(r: SleepReport): string | undefined {
  return r.newSeason ? `A new season begins: ${r.newSeason}` : undefined;
}
