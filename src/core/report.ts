import { animalReportLines } from "./animals";
import { WAITING_ROOMS_LINE } from "./house";
import { ordersReportLines } from "./orders";
import type { SleepReport } from "./sleep";
import { itemById } from "./items";
import { SUMMIT_TEXT } from "./summit";

/** The words for the morning after: what happened overnight, one per line. */
export function reportLines(r: SleepReport): string[] {
  const lines: string[] = [];
  if (r.defeat) {
    lines.push("You were knocked out and carried out of the mine.");
    lines.push(
      r.moneyLost > 0
        ? `The bearers kept ${r.moneyLost}g for the trouble.`
        : "The bearers asked for nothing.",
    );
    for (const l of r.defeat.lost)
      lines.push(
        `Lost for good: ${l.count} ${itemById(l.id)?.name.toLowerCase() ?? l.id}.`,
      );
    if (r.defeat.posted)
      lines.push(
        "The trainer keeps them at her counter. You can buy one back.",
      );
  } else if (r.passedOut) {
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
  if (r.quarryBridge)
    lines.push(
      "The bridge east of the stonekeeper's yard is mended. The Quarry is open.",
    );
  if (r.ferryMended)
    lines.push("The ferry on the delta is repaired. The Lake cove is open.");
  if (r.cartsRunning)
    lines.push(
      "The carts are running. Find one at the town square, the hall, your farm or the mine mouth.",
    );
  if (r.guestsBonus.length > 0)
    lines.push(
      "The Guests' Board is done. The people you have met think the better of you.",
    );
  if (r.houseFinished) {
    lines.push("The carpenter has finished. Your new rooms are ready.");
    if (r.houseTier === 2) lines.push(WAITING_ROOMS_LINE);
  }
  lines.push(
    ...animalReportLines(
      r.animals,
      r.coopFinished,
      r.barnFinished,
      r.siloFinished,
      r.stableFinished,
    ),
  );
  if (r.horseWasOut)
    lines.push("Your horse spent the night outside and is back in the stable.");
  if (r.furnaceGifted) lines.push("The smith left a furnace by your house.");
  for (const name of r.achievements)
    lines.push(`Achievement: ${name}. The hatter has a new hat on sale.`);
  if (r.completionGain > 0)
    lines.push(`Collections: ${r.completion} percent complete.`);
  if (r.summitCall) lines.push(SUMMIT_TEXT.callLine);
  if (r.newMail > 0) lines.push("There is mail.");
  if (r.toolReady)
    lines.push(
      `Your ${r.toolReady === "can" ? "watering can" : r.toolReady} is ready at the smithy in Hearthwell.`,
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
