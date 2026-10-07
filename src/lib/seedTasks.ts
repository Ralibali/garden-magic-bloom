import { deriveCropIdentity } from "./cropIdentity";
import { sowingMatrix } from "@/data/sowingMatrix";
import { isoWeekOfKey, weekInSpan } from "./gardenCalendar";
import { localDateKey } from "./gardenToday";
import { getExpiryStatus } from "./seedExpiry";
export interface InventorySeed {
  id: string;
  variety: string;
  expiry_date?: string | null;
  quantity?: string | null;
}
export function seedTasks(
  seeds: InventorySeed[],
  zone: number | null | undefined,
  today = localDateKey(),
) {
  const week = isoWeekOfKey(today);
  const validZone = Number.isInteger(zone) && zone! >= 1 && zone! <= 8;
  return seeds.flatMap((seed) => {
    const tasks: {
      id: string;
      title: string;
      detail: string;
      seed: InventorySeed;
      type: "sowing" | "other";
    }[] = [];
    const expiry = getExpiryStatus(
      seed.expiry_date,
      90,
      new Date(today + "T12:00:00"),
    );
    if (expiry === "soon" || expiry === "expired") {
      tasks.push({
        id: `seed-expiry-${seed.id}-${seed.expiry_date}`,
        title: `Groningstesta ${seed.variety}`,
        detail: `${
          expiry === "expired"
            ? "Bäst före har passerat"
            : "Bäst före närmar sig"
        } (${seed.expiry_date}). Fröna kan fortfarande gro. Prova några innan du sår hela påsen.`,
        seed,
        type: "other",
      });
    }
    if (!validZone || /^0(?:\s|$)/.test(seed.quantity?.trim() || "")) {
      return tasks;
    }
    const key = deriveCropIdentity(seed.variety).crop_key;
    const crop = [...sowingMatrix].sort((a, b) =>
      b.name.length - a.name.length
    ).find((c) =>
      seed.variety.toLocaleLowerCase("sv-SE").includes(
        c.name.toLocaleLowerCase("sv-SE"),
      )
    ) ?? (key !== "unknown"
      ? sowingMatrix.find((c) =>
        deriveCropIdentity(c.name).crop_key === key
      )
      : undefined);
    const t = crop?.zones[zone!];
    if (!t) {
      return tasks;
    }
    for (
      const [kind, start, end, label] of [[
        "indoor",
        t.preStart,
        t.preEnd,
        "Förodla",
      ], ["direct", t.directSowStart, t.directSowEnd, "Direktså"]] as const
    ) {
      if (start != null && end != null && weekInSpan(week, start, end)) {
        tasks.push({
          id: `seed-sow-${seed.id}-${today.slice(0, 4)}-${kind}`,
          title: `${label} ${seed.variety}`,
          detail:
            `Såperiod i zon ${zone}: vecka ${start}–${end}. Kontrollera påsens anvisningar och lokala förhållanden.`,
          seed,
          type: "sowing",
        });
      }
    }
    return tasks;
  });
}
