/**
 * Shared garden context for Pulse (wired) and Gro (export only this PR).
 * Do not dump the entire DB — callers pick a scope.
 */

import { identityFromSowing, type CropIdentity } from './cropIdentity';
import { localDateKey } from './gardenToday';

export type GardenContextScope =
  | 'TODAY'
  | 'BED'
  | 'SOWING'
  | 'CROP'
  | 'VARIETY'
  | 'SEASON'
  | 'PROBLEM'
  | 'HARVEST'
  | 'SEED';

export interface GardenContextInput {
  scope: GardenContextScope;
  today?: string;
  climateZone?: number;
  beds?: Array<{ id: string; name: string; season_notes?: string | null }>;
  sowings?: Array<{
    id: string;
    variety: string;
    bed_id?: string | null;
    sow_date?: string;
    status?: string;
    crop_key?: string | null;
    variety_name?: string | null;
    seed_inventory_id?: string | null;
    beds?: { name?: string | null } | null;
  }>;
  harvests?: Array<{ id: string; variety: string; harvest_date: string; weight_grams?: number; sowing_id?: string | null; bed_id?: string | null }>;
  reminders?: Array<{ id: string; title: string; date: string; done?: boolean; sowing_id?: string; bed_id?: string }>;
  pests?: Array<{ id: string; pest_name: string; observed_date: string; resolved?: boolean | null; sowing_id?: string | null; bed_id?: string | null }>;
  seeds?: Array<{ id: string; variety: string; brand?: string | null }>;
  focus?: { bedId?: string; sowingId?: string; cropKey?: string };
}

export interface GardenContextItem {
  kind: 'bed' | 'sowing' | 'harvest' | 'reminder' | 'problem' | 'seed';
  id: string;
  sowing_id?: string | null;
  bed_id?: string | null;
  crop_key?: string;
  variety_name?: string;
  display_text: string;
  date?: string;
  identity?: CropIdentity;
}

export interface GardenContext {
  scope: GardenContextScope;
  today: string;
  climateZone: number;
  items: GardenContextItem[];
}

function sowingItem(sowing: NonNullable<GardenContextInput['sowings']>[number]): GardenContextItem {
  const identity = identityFromSowing(sowing);
  return {
    kind: 'sowing',
    id: sowing.id,
    sowing_id: sowing.id,
    bed_id: sowing.bed_id,
    crop_key: identity.crop_key,
    variety_name: identity.variety_name,
    display_text: identity.display_text,
    date: sowing.sow_date,
    identity,
  };
}

export function getGardenContext(input: GardenContextInput): GardenContext {
  const today = input.today || localDateKey();
  const climateZone = input.climateZone ?? 3;
  const sowings = input.sowings || [];
  const beds = input.beds || [];
  const harvests = input.harvests || [];
  const reminders = (input.reminders || []).filter((item) => !item.done);
  const pests = input.pests || [];
  const seeds = input.seeds || [];
  const focus = input.focus || {};

  let items: GardenContextItem[] = [];

  switch (input.scope) {
    case 'BED':
      items = beds
        .filter((bed) => !focus.bedId || bed.id === focus.bedId)
        .map((bed) => ({ kind: 'bed' as const, id: bed.id, bed_id: bed.id, display_text: bed.name }));
      break;
    case 'SOWING':
      items = sowings.filter((sowing) => !focus.sowingId || sowing.id === focus.sowingId).map(sowingItem);
      break;
    case 'CROP':
    case 'VARIETY':
      items = sowings
        .filter((sowing) => !focus.cropKey || identityFromSowing(sowing).crop_key === focus.cropKey)
        .map(sowingItem);
      break;
    case 'HARVEST':
      items = harvests.map((harvest) => ({
        kind: 'harvest' as const,
        id: harvest.id,
        sowing_id: harvest.sowing_id,
        bed_id: harvest.bed_id,
        display_text: harvest.variety,
        date: harvest.harvest_date,
      }));
      break;
    case 'PROBLEM':
      items = pests.filter((pest) => !pest.resolved).map((pest) => ({
        kind: 'problem' as const,
        id: pest.id,
        sowing_id: pest.sowing_id,
        bed_id: pest.bed_id,
        display_text: pest.pest_name,
        date: pest.observed_date,
      }));
      break;
    case 'SEED':
      items = seeds.map((seed) => ({
        kind: 'seed' as const,
        id: seed.id,
        display_text: seed.variety,
        identity: identityFromSowing({ variety: seed.variety }),
      }));
      break;
    case 'SEASON':
      items = [
        ...sowings.map(sowingItem),
        ...harvests.slice(0, 20).map((harvest) => ({
          kind: 'harvest' as const,
          id: harvest.id,
          sowing_id: harvest.sowing_id,
          bed_id: harvest.bed_id,
          display_text: harvest.variety,
          date: harvest.harvest_date,
        })),
      ];
      break;
    case 'TODAY':
    default:
      items = [
        ...reminders
          .filter((reminder) => reminder.date <= today)
          .map((reminder) => ({
            kind: 'reminder' as const,
            id: reminder.id,
            sowing_id: reminder.sowing_id,
            bed_id: reminder.bed_id,
            display_text: reminder.title,
            date: reminder.date,
          })),
        ...sowings.filter((sowing) => sowing.status !== 'done').slice(0, 12).map(sowingItem),
      ];
  }

  return { scope: input.scope, today, climateZone, items };
}
