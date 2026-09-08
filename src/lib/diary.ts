import type { Tables } from '@/integrations/supabase/types';
import { localDateKey } from '@/lib/gardenToday';

export type DiaryKind = 'sowing' | 'transplant' | 'harvest' | 'photo' | 'note' | 'care' | 'pest' | 'season';
export interface DiaryEvent {
  id: string;
  sourceId: string;
  date: string;
  kind: DiaryKind;
  title: string;
  body: string;
  place: string;
  placeId: string;
  subject: string;
  subjectId?: string;
  subjectIds?: string[];
  href: string;
  imagePath?: string;
  weightGrams?: number;
}

export interface DiarySources {
  sowings: (Tables<'sowings'> & { beds: { name: string } | null })[];
  harvests: (Tables<'harvests'> & { beds: { name: string } | null })[];
  photos: (Tables<'plant_photos'> & { beds: { name: string } | null; sowings: { variety: string } | null; my_plants: { custom_name: string | null; plants: { name_sv: string } | null } | null })[];
  notes: Tables<'plant_logs'>[];
  care: (Tables<'plant_care_events'> & { my_plants: { custom_name: string | null; plants: { name_sv: string } | null } | null })[];
  pests: (Tables<'pest_logs'> & { beds: { name: string } | null })[];
  seasons: (Tables<'season_summaries'> & { beds: { name: string } | null })[];
}

export const DIARY_LABELS: Record<DiaryKind, string> = {
  sowing: 'Sådd', transplant: 'Utplantering', harvest: 'Skörd', photo: 'Foto',
  note: 'Anteckning', care: 'Växtvård', pest: 'Observation', season: 'Säsongslärdom',
};
const CARE_LABELS: Record<string, string> = {
  note: 'Antecknade', watered: 'Vattnade', health_check: 'Hälsokoll', observation: 'Tittade till',
  fertilized: 'Gödslade', repotted: 'Planterade om', pruned: 'Beskärde', moved: 'Flyttade',
};

export function isDiaryDate(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = new Date(`${value}T12:00:00Z`);
  return Number.isFinite(date.getTime()) && date.toISOString().slice(0, 10) === value;
}

export function diaryDate(value: string | null): string {
  if (!value) return '';
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) return isDiaryDate(value) ? value : '';
  const parsed = new Date(value);
  return Number.isFinite(parsed.getTime()) ? localDateKey(parsed) : '';
}

export function validateDiaryNote(note: string, date: string, today = localDateKey()): string {
  if (!note.trim()) return 'Skriv något du vill komma ihåg.';
  if (note.trim().length > 5000) return 'Anteckningen kan innehålla högst 5 000 tecken.';
  if (!isDiaryDate(date) || date < '1900-01-01') return 'Välj ett giltigt datum.';
  if (date > today) return 'Välj idag eller ett tidigare datum. Framtida uppgifter hör hemma i påminnelser.';
  return '';
}

export function buildDiary(sources: DiarySources): DiaryEvent[] {
  const result: DiaryEvent[] = [];
  const add = (kind: DiaryKind, sourceId: string, date: string | null, title: string, body: string | null, extra: Partial<DiaryEvent> = {}) => {
    const day = diaryDate(date);
    if (!day) return;
    result.push({ id: `${kind}-${sourceId}`, sourceId, date: day, kind, title, body: body || '', place: '', placeId: '', subject: '', href: '/app/timeline', ...extra });
  };
  const bed = (item: { bed_id: string | null; beds: { name: string } | null }) => ({ placeId: item.bed_id ? `bed:${item.bed_id}` : '', place: item.beds?.name || '' });

  for (const sowing of sources.sowings) {
    const extra = { ...bed(sowing), subject: sowing.variety, subjectId: `sowing:${sowing.id}`, href: '/app/sowings' };
    add('sowing', sowing.id, sowing.sow_date, `Sådde ${sowing.variety}`, sowing.notes, extra);
    if (sowing.transplant_date) add('transplant', sowing.id, sowing.transplant_date, `Planterade ut ${sowing.variety}`, null, extra);
  }
  for (const harvest of sources.harvests) {
    add('harvest', harvest.id, harvest.harvest_date, `Skördade ${harvest.variety}`, harvest.notes, {
      ...bed(harvest), subject: harvest.variety, subjectId: harvest.sowing_id ? `sowing:${harvest.sowing_id}` : undefined, href: '/app/harvests', weightGrams: harvest.weight_grams,
    });
  }
  for (const photo of sources.photos) {
    add('photo', photo.id, photo.taken_at, photo.caption || 'Ett ögonblick i odlingen', '', {
      ...bed(photo), subject: photo.sowings?.variety || photo.my_plants?.custom_name || photo.my_plants?.plants?.name_sv || '',
      subjectIds: [photo.sowing_id ? `sowing:${photo.sowing_id}` : '', photo.my_plant_id ? `plant:${photo.my_plant_id}` : ''].filter(Boolean), subjectId: photo.sowing_id ? `sowing:${photo.sowing_id}` : photo.my_plant_id ? `plant:${photo.my_plant_id}` : undefined, imagePath: photo.photo_url, href: '/app/photos',
      ...(photo.my_plant_id && !photo.bed_id ? { placeId: `plant:${photo.my_plant_id}`, place: photo.my_plants?.custom_name || photo.my_plants?.plants?.name_sv || 'Krukväxt' } : {}),
    });
  }
  // Structured care already mirrors plant_logs/watering_log. Only standalone
  // notes are added from plant_logs so a check-in appears exactly once.
  for (const note of sources.notes) {
    if (note.plant_id || note.log_type !== 'note') continue;
    add('note', note.id, note.created_at, 'Anteckning från odlingen', note.note);
  }
  for (const care of sources.care) {
    const name = care.my_plants?.custom_name || care.my_plants?.plants?.name_sv || 'Min växt';
    add('care', care.id, care.occurred_at, `${CARE_LABELS[care.event_type] || 'Växtvård'} · ${name}`, care.note, {
      placeId: `plant:${care.plant_id}`, place: name, subject: name, subjectId: `plant:${care.plant_id}`, href: '/app/my-plants',
    });
  }
  for (const pest of sources.pests) {
    add('pest', pest.id, pest.observed_date, pest.pest_name,
      [pest.notes, pest.treatment ? `Åtgärd: ${pest.treatment}` : '', pest.resolved ? 'Markerad som löst.' : ''].filter(Boolean).join('\n'),
      { ...bed(pest), subjectId: pest.sowing_id ? `sowing:${pest.sowing_id}` : undefined, href: '/app/pests' });
  }
  for (const season of sources.seasons) {
    // These records describe a season, even when written the following year.
    const created = diaryDate(season.created_at);
    const date = created.startsWith(String(season.year)) ? created : `${season.year}-12-31`;
    const again = season.grow_again ? ({ yes: 'Ja', no: 'Nej', partly: 'Delvis' }[season.grow_again] || season.grow_again) : '';
    const body = [season.went_well && `Det gick bra: ${season.went_well}`, season.didnt_work && `Att förbättra: ${season.didnt_work}`, again && `Odla igen: ${again}`, season.learnings && `Min lärdom: ${season.learnings}`].filter(Boolean).join('\n\n');
    add('season', season.id, date, `Lärdomar från ${season.year}`, body, { ...bed(season), href: '/app' });
  }
  return result.sort((a, b) => b.date.localeCompare(a.date) || a.id.localeCompare(b.id));
}

export interface DiaryFilters { query: string; year: string; month: string; kind: DiaryKind | 'all'; place: string; subjectId?: string }
export function filterDiary(events: DiaryEvent[], filters: DiaryFilters): DiaryEvent[] {
  const words = filters.query.toLocaleLowerCase('sv-SE').trim().split(/\s+/).filter(Boolean);
  return events.filter(event => {
    if (filters.subjectId && filters.subjectId !== event.subjectId && !event.subjectIds?.includes(filters.subjectId)) return false;
    if (filters.year !== 'all' && !event.date.startsWith(filters.year)) return false;
    if (filters.month !== 'all' && event.date.slice(5, 7) !== filters.month) return false;
    if (filters.kind !== 'all' && event.kind !== filters.kind) return false;
    if (filters.place !== 'all' && event.placeId !== filters.place) return false;
    const text = `${event.title} ${event.body} ${event.place} ${event.subject} ${DIARY_LABELS[event.kind]}`.toLocaleLowerCase('sv-SE');
    return words.every(word => text.includes(word));
  });
}
