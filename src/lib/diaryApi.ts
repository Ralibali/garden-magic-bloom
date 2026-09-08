import { supabase } from '@/integrations/supabase/client';
import { buildDiary, validateDiaryNote } from '@/lib/diary';

interface Page<T> { data: T[] | null; error: { message: string } | null }
// Supabase caps individual reads. Page through history rather than silently
// dropping the oldest seasons when a gardener passes that limit.
export async function readAll<T>(fetchPage: (from: number, to: number) => PromiseLike<Page<T>>): Promise<T[]> {
  const result: T[] = [];
  for (let start = 0; ; start += 500) {
    const { data, error } = await fetchPage(start, start + 499);
    if (error) throw new Error(error.message);
    result.push(...(data || []));
    if (!data || data.length < 500) return result;
  }
}

export async function getDiary() {
  const [sowings, harvests, photos, notes, care, pests, seasons] = await Promise.all([
    readAll((from, to) => supabase.from('sowings').select('*, beds(name)').order('id').range(from, to)),
    readAll((from, to) => supabase.from('harvests').select('*, beds(name)').order('id').range(from, to)),
    readAll((from, to) => supabase.from('plant_photos').select('*, beds(name), sowings(variety), my_plants(custom_name, plants(name_sv))').order('id').range(from, to)),
    readAll((from, to) => supabase.from('plant_logs').select('*').is('plant_id', null).eq('log_type', 'note').order('id').range(from, to)),
    readAll((from, to) => supabase.from('plant_care_events').select('*, my_plants(custom_name, plants(name_sv))').order('id').range(from, to)),
    readAll((from, to) => supabase.from('pest_logs').select('*, beds(name)').order('id').range(from, to)),
    readAll((from, to) => supabase.from('season_summaries').select('*, beds(name)').order('id').range(from, to)),
  ]);
  return buildDiary({ sowings, harvests, photos, notes, care, pests, seasons });
}

async function userId() {
  const { data: { user }, error } = await supabase.auth.getUser();
  if (error || !user) throw new Error('Logga in igen för att spara i dagboken.');
  return user.id;
}

export async function saveDiaryNote({ id, note, date }: { id?: string; note: string; date: string }) {
  const validation = validateDiaryNote(note, date);
  if (validation) throw new Error(validation);
  const user_id = await userId();
  const record = { note: note.trim(), created_at: new Date(`${date}T12:00:00Z`).toISOString() };
  const query = id
    ? supabase.from('plant_logs').update(record).eq('id', id).eq('user_id', user_id).is('plant_id', null).eq('log_type', 'note')
    : supabase.from('plant_logs').insert({ ...record, user_id, plant_id: null, log_type: 'note' });
  const { data, error } = await query.select('id').single();
  if (error) throw new Error(error.message);
  return data;
}

export async function deleteDiaryNote(id: string) {
  const user_id = await userId();
  const { data, error } = await supabase.from('plant_logs').delete().eq('id', id).eq('user_id', user_id).is('plant_id', null).eq('log_type', 'note').select('id').single();
  if (error) throw new Error(error.message);
  return data;
}

export async function getDiaryPhotoUrl(path: string) {
  if (/^https:\/\//i.test(path)) return path;
  const { data, error } = await supabase.storage.from('plant-photos').createSignedUrl(path, 3600);
  if (error || !data?.signedUrl) throw new Error('Bilden kunde inte hämtas.');
  return data.signedUrl;
}
