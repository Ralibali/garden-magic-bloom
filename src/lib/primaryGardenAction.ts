export type PrimaryGardenActionKind = 'bed' | 'sowing' | 'harvest' | 'calendar';

export interface PrimaryGardenAction {
  kind: PrimaryGardenActionKind;
  label: string;
  path: string;
  reason: string;
}

interface PrimaryGardenActionInput {
  bedCount: number;
  sowingCount: number;
  month: number;
}

/**
 * Chooses one clear next action instead of showing the same generic CTA to everyone.
 */
export function getPrimaryGardenAction({ bedCount, sowingCount, month }: PrimaryGardenActionInput): PrimaryGardenAction {
  if (bedCount === 0) {
    return {
      kind: 'bed',
      label: 'Skapa första platsen',
      path: '/app/beds',
      reason: 'En odlingsplats behövs för att koppla ihop sådder, skörd och historik.',
    };
  }

  if (sowingCount === 0) {
    return {
      kind: 'sowing',
      label: 'Logga första sådden',
      path: '/app/sowings',
      reason: 'En första sådd gör att appen kan börja ge tidsbaserade råd.',
    };
  }

  if (month >= 6 && month <= 10) {
    return {
      kind: 'harvest',
      label: 'Logga skörd',
      path: '/app/harvests',
      reason: 'Under skördesäsongen ger uppföljning störst värde inför nästa år.',
    };
  }

  if (month === 11 || month === 12 || month <= 2) {
    return {
      kind: 'calendar',
      label: 'Planera säsongen',
      path: '/app/calendar',
      reason: 'Lågsäsongen är bästa tiden att planera sorter och såtider.',
    };
  }

  return {
    kind: 'sowing',
    label: 'Ny sådd',
    path: '/app/sowings',
    reason: 'Vårsäsongen handlar främst om att få nästa sådd på plats.',
  };
}
