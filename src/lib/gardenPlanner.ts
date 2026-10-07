import { deriveCropIdentity } from "./cropIdentity";
export interface BedLayout {
  bed_id: string;
  x: number;
  y: number;
  width: number;
  height: number;
  kind: "bed" | "raised" | "greenhouse";
}
export interface BedPlanting {
  id: string;
  bed_id: string;
  year: number;
  variety: string;
  x: number;
  y: number;
  user_id: string;
  beds?: { name: string } | null;
}
export const MAP_SIZE = 100;
export function clampLayout(layout: BedLayout): BedLayout {
  const number = (v: number, fallback: number) =>
    Number.isFinite(v) ? v : fallback;
  const width = Math.min(80, Math.max(8, number(layout.width, 20)));
  const height = Math.min(80, Math.max(8, number(layout.height, 14)));
  return {
    ...layout,
    width,
    height,
    x: Math.max(0, Math.min(100 - width, number(layout.x, 0))),
    y: Math.max(0, Math.min(100 - height, number(layout.y, 0))),
  };
}
const groups: Record<
  string,
  { label: string; crops: string[]; color: string }
> = {
  brassica: {
    label: "Kålväxter",
    crops: [
      "kal",
      "kalrot",
      "broccoli",
      "blomkal",
      "vitkal",
      "gronkal",
      "brysselkal",
      "pakchoi",
      "radisa",
      "ruccola",
    ],
    color: "bg-blue-100 text-blue-900",
  },
  nightshade: {
    label: "Potatisväxter",
    crops: ["tomat", "potatis", "chili"],
    color: "bg-red-100 text-red-900",
  },
  legume: {
    label: "Ärtväxter",
    crops: ["artor", "sockerart", "bonor", "bondbona"],
    color: "bg-green-100 text-green-900",
  },
  allium: {
    label: "Lökväxter",
    crops: ["lok", "vitlok", "purjolok", "graslok"],
    color: "bg-purple-100 text-purple-900",
  },
  apiaceae: {
    label: "Flockblommiga",
    crops: [
      "morot",
      "palsternacka",
      "selleri",
      "dill",
      "persilja",
      "koriander",
    ],
    color: "bg-orange-100 text-orange-900",
  },
  cucurbit: {
    label: "Gurkväxter",
    crops: ["gurka", "squash", "pumpa"],
    color: "bg-yellow-100 text-yellow-900",
  },
};
export function cropFamily(variety: string) {
  const key = deriveCropIdentity(variety).crop_key;
  const entry = Object.entries(groups).find(([, group]) =>
    group.crops.includes(key)
  );
  return entry ? { family: entry[0], ...entry[1] } : {
    family: "other",
    label: "Övrigt / okänd familj",
    color: "bg-muted text-muted-foreground",
  };
}
export function rotationWarnings(
  variety: string,
  bedId: string,
  year: number,
  history: {
    bed_id?: string | null;
    variety: string;
    year: number;
    planned?: boolean;
  }[],
) {
  const family = cropFamily(variety).family;
  if (family === "other") return [];
  return [
    ...new Set(
      history.filter((item) =>
        item.bed_id === bedId && item.year === year - 1 &&
        cropFamily(item.variety).family === family
      )
        .map((item) =>
          `${item.variety} ${
            item.planned ? "var planerad här" : "stod här"
          } i fjol. Överväg en annan växtfamilj.`
        ),
    ),
  ];
}
