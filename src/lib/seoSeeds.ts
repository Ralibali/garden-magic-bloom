// Seed-listor för programmatisk SEO-generering
// Prioritetsordning baserad på svensk sökvolym

export const PLANT_SEEDS: { name: string; batch: 1 | 2 | 3 }[] = [
  // Omgång 1 – topp 15 mest sökta
  { name: "tomat", batch: 1 },
  { name: "potatis", batch: 1 },
  { name: "morot", batch: 1 },
  { name: "sallad", batch: 1 },
  { name: "gurka", batch: 1 },
  { name: "zucchini", batch: 1 },
  { name: "paprika", batch: 1 },
  { name: "chili", batch: 1 },
  { name: "squash", batch: 1 },
  { name: "rödbeta", batch: 1 },
  { name: "jordgubbe", batch: 1 },
  { name: "vitlök", batch: 1 },
  { name: "lök", batch: 1 },
  { name: "purjolök", batch: 1 },
  { name: "broccoli", batch: 1 },
  // Omgång 2 – nästa 15
  { name: "pumpa", batch: 2 },
  { name: "böna", batch: 2 },
  { name: "ärta", batch: 2 },
  { name: "majs", batch: 2 },
  { name: "sockerärta", batch: 2 },
  { name: "palsternacka", batch: 2 },
  { name: "rädisa", batch: 2 },
  { name: "rucola", batch: 2 },
  { name: "grönkål", batch: 2 },
  { name: "spenat", batch: 2 },
  { name: "mangold", batch: 2 },
  { name: "bondböna", batch: 2 },
  { name: "rabarber", batch: 2 },
  { name: "hallon", batch: 2 },
  { name: "vinbär", batch: 2 },
  // Omgång 3 – sista 10
  { name: "krusbär", batch: 3 },
  { name: "blåbär", batch: 3 },
  { name: "fikon", batch: 3 },
  { name: "druva", batch: 3 },
  { name: "oregano", batch: 3 },
  { name: "basilika", batch: 3 },
  { name: "persilja", batch: 3 },
  { name: "dill", batch: 3 },
  { name: "gräslök", batch: 3 },
  { name: "mynta", batch: 3 },
];

export const MONTH_SEEDS = [
  { number: 1, name: "januari" },
  { number: 2, name: "februari" },
  { number: 3, name: "mars" },
  { number: 4, name: "april" },
  { number: 5, name: "maj" },
  { number: 6, name: "juni" },
  { number: 7, name: "juli" },
  { number: 8, name: "augusti" },
  { number: 9, name: "september" },
  { number: 10, name: "oktober" },
  { number: 11, name: "november" },
  { number: 12, name: "december" },
];

export const ZONE_SEEDS = [1, 2, 3, 4, 5, 6, 7, 8].map((n) => ({ number: n, slug: `zon-${n}` }));

export function slugifySv(s: string): string {
  return s.toLowerCase()
    .replace(/å/g, "a").replace(/ä/g, "a").replace(/ö/g, "o")
    .replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}
