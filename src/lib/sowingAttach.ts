/**
 * Sowing is the operational hub. Attach harvest / photo / pest / reminder / log
 * via sowing_id when the object exists. Bed-level or garden-level still allowed.
 */

export interface SowingRef {
  id: string;
  bed_id?: string | null;
  variety?: string | null;
  beds?: { name?: string | null } | null;
}

export interface AttachTarget {
  sowing_id?: string | null;
  bed_id?: string | null;
  variety?: string;
  display_text?: string;
  source?: string;
}

export function attachToSowing(
  sowing: SowingRef | null | undefined,
  extra: Partial<AttachTarget> = {},
): AttachTarget {
  if (!sowing?.id) {
    return {
      sowing_id: extra.sowing_id ?? null,
      bed_id: extra.bed_id ?? null,
      variety: extra.variety,
      display_text: extra.display_text ?? extra.variety,
      source: extra.source,
    };
  }
  return {
    sowing_id: sowing.id,
    bed_id: extra.bed_id ?? sowing.bed_id ?? null,
    variety: extra.variety ?? sowing.variety ?? undefined,
    display_text: extra.display_text ?? sowing.variety ?? extra.variety,
    source: extra.source ?? 'sowing',
  };
}

export function reminderFromSowing(
  sowing: SowingRef,
  fields: { title: string; type: 'sowing' | 'transplant' | 'watering' | 'other'; date: string; source?: string },
) {
  const attached = attachToSowing(sowing, { source: fields.source ?? 'sowing' });
  return {
    title: fields.title,
    type: fields.type,
    date: fields.date,
    bed: sowing.beds?.name || undefined,
    sowing_id: attached.sowing_id,
    bed_id: attached.bed_id,
    display_text: fields.title,
    source: attached.source,
  };
}

export function harvestFromSowing(sowing: SowingRef, fields: { harvest_date: string; weight_grams: number; notes?: string }) {
  const attached = attachToSowing(sowing);
  return {
    variety: attached.variety || sowing.variety || '',
    sowing_id: attached.sowing_id || undefined,
    bed_id: attached.bed_id || undefined,
    harvest_date: fields.harvest_date,
    weight_grams: fields.weight_grams,
    notes: fields.notes,
  };
}
