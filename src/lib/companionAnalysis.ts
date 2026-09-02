/**
 * Matches user sowings against the folklore companion table.
 * Same-bed hits are tradition labels, not proven pest-control.
 */
import { COMPANION_DATA } from '@/lib/weatherTips';

export type CompanionRelation = 'good' | 'bad';

export interface CompanionPair {
  plantA: string;
  plantB: string;
  relation: CompanionRelation;
  /** Bäddnamn om båda växterna är i samma bädd, annars null */
  bedName: string | null;
}

/** Matchar ett sortnamn mot samplanteringstabellen, t.ex. "Tomat – Sungold" → "Tomat". */
export function findCompanionPlant(variety: string | null | undefined): string | null {
  if (!variety) return null;
  const normalized = variety.toLowerCase();
  // Längsta namnet först så att t.ex. "Jordgubbar" vinner över kortare träffar
  const names = Object.keys(COMPANION_DATA).sort((a, b) => b.length - a.length);
  for (const name of names) {
    if (normalized.includes(name.toLowerCase())) return name;
  }
  return null;
}

interface SowlingLike {
  variety: string;
  bed_id?: string | null;
  beds?: { name?: string } | null;
}

/** Kontrollerar relationen mellan två växter i någon riktning. */
export function relationBetween(a: string, b: string): CompanionRelation | null {
  const infoA = COMPANION_DATA[a];
  const infoB = COMPANION_DATA[b];
  if (!infoA || !infoB) return null;
  if (infoA.bad.includes(b) || infoB.bad.includes(a)) return 'bad';
  if (infoA.good.includes(b) || infoB.good.includes(a)) return 'good';
  return null;
}

/**
 * Analyserar sådder och returnerar unika par med relation.
 * Dubletter (A+B och B+A) slås ihop; samma växt upprepas inte.
 */
export function analyzeUserSowings(sowings: SowlingLike[]): { good: CompanionPair[]; bad: CompanionPair[] } {
  // En post per unik växt (+ bädd den växer i)
  const plants: { name: string; bedId: string | null; bedName: string | null }[] = [];
  const seen = new Set<string>();
  for (const s of sowings) {
    const name = findCompanionPlant(s.variety);
    if (!name) continue;
    const key = `${name}|${s.bed_id ?? ''}`;
    if (seen.has(key)) continue;
    seen.add(key);
    plants.push({ name, bedId: s.bed_id ?? null, bedName: s.beds?.name ?? null });
  }

  const good: CompanionPair[] = [];
  const bad: CompanionPair[] = [];
  const pairSeen = new Set<string>();

  for (let i = 0; i < plants.length; i++) {
    for (let j = i + 1; j < plants.length; j++) {
      const a = plants[i];
      const b = plants[j];
      const relation = relationBetween(a.name, b.name);
      if (!relation) continue;
      const sameBed = a.bedId && b.bedId && a.bedId === b.bedId;
      const pairKey = [a.name, b.name].sort().join('|') + (sameBed ? `|${a.bedId}` : '');
      if (pairSeen.has(pairKey)) continue;
      pairSeen.add(pairKey);
      const pair: CompanionPair = {
        plantA: a.name,
        plantB: b.name,
        relation,
        bedName: sameBed ? (a.bedName || b.bedName) : null,
      };
      (relation === 'good' ? good : bad).push(pair);
    }
  }

  // Sortera: par i samma bädd först (viktigast att agera på)
  const byBed = (p: CompanionPair) => (p.bedName ? 0 : 1);
  good.sort((x, y) => byBed(x) - byBed(y));
  bad.sort((x, y) => byBed(x) - byBed(y));
  return { good, bad };
}
