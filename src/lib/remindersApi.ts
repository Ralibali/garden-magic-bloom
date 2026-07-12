import { supabase } from '@/integrations/supabase/client';

export type ReminderType = 'sowing' | 'transplant' | 'watering' | 'other';

export interface GardenReminderRecord {
  id: string;
  title: string;
  type: ReminderType;
  date: string;
  done: boolean;
  bed?: string;
  created_at?: string;
  completed_at?: string | null;
  source_action_id?: string;
  source_pest_log_id?: string;
}

const db = supabase as any;

async function getUserId() {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Inte inloggad');
  return user.id;
}

function isMissingDatabaseObject(error: any) {
  return error?.code === '42P01' || error?.code === '42883' || error?.code === 'PGRST202' || error?.code === 'PGRST205';
}

function mapRow(row: any): GardenReminderRecord {
  return {
    id: row.id,
    title: row.title,
    type: row.reminder_type,
    date: row.due_date,
    done: !!row.done,
    bed: row.bed || undefined,
    created_at: row.created_at,
    completed_at: row.completed_at,
    source_action_id: row.source_action_id || undefined,
    source_pest_log_id: row.source_pest_log_id || undefined,
  };
}

async function getSettingsRow() {
  const userId = await getUserId();
  const { data, error } = await supabase.from('reminder_settings').select('*').eq('user_id', userId).maybeSingle();
  if (error) throw new Error(error.message);
  if (data) return data;

  const { data: created, error: createError } = await supabase
    .from('reminder_settings')
    .insert({ user_id: userId })
    .select()
    .single();
  if (createError) throw new Error(createError.message);
  return created;
}

async function writeLegacyReminders(reminders: GardenReminderRecord[]) {
  const row = await getSettingsRow();
  const current = ((row.settings as any) || {}) as Record<string, any>;
  const { data, error } = await supabase
    .from('reminder_settings')
    .update({ settings: { ...current, reminders } })
    .eq('user_id', row.user_id)
    .select()
    .single();
  if (error) throw new Error(error.message);
  return data;
}

export async function getReminderBundle() {
  const row = await getSettingsRow();
  const rawSettings = ((row.settings as any) || {}) as Record<string, any>;
  const { data, error } = await db
    .from('garden_reminders')
    .select('*')
    .order('done', { ascending: true })
    .order('due_date', { ascending: true })
    .order('created_at', { ascending: true });

  if (error && !isMissingDatabaseObject(error)) throw new Error(error.message);
  const reminders = error ? (rawSettings.reminders || []) : (data || []).map(mapRow);

  return {
    ...row,
    settings: {
      ...rawSettings,
      reminders,
    },
  };
}

export async function mergeReminderSettings(patch: Record<string, any>) {
  const cleanPatch = { ...patch };
  delete cleanPatch.reminders;

  const { data, error } = await db.rpc('merge_reminder_settings', { p_patch: cleanPatch });
  if (!error) return data;
  if (!isMissingDatabaseObject(error)) throw new Error(error.message);

  const row = await getSettingsRow();
  const current = ((row.settings as any) || {}) as Record<string, any>;
  const { data: updated, error: updateError } = await supabase
    .from('reminder_settings')
    .update({ settings: { ...current, ...cleanPatch } })
    .eq('user_id', row.user_id)
    .select()
    .single();
  if (updateError) throw new Error(updateError.message);
  return updated?.settings;
}

export async function createReminder(reminder: GardenReminderRecord) {
  const userId = await getUserId();
  const payload = {
    id: reminder.id,
    user_id: userId,
    title: reminder.title.trim(),
    reminder_type: reminder.type,
    due_date: reminder.date,
    done: reminder.done,
    bed: reminder.bed || null,
    source_action_id: reminder.source_action_id || null,
    source_pest_log_id: reminder.source_pest_log_id || null,
    created_at: reminder.created_at || new Date().toISOString(),
    completed_at: reminder.completed_at || null,
    updated_at: new Date().toISOString(),
  };

  const { data, error } = await db.from('garden_reminders').insert(payload).select().single();
  if (!error) return mapRow(data);
  if (error.code === '23505' && reminder.source_action_id) {
    const { data: existing, error: existingError } = await db
      .from('garden_reminders')
      .select('*')
      .eq('source_action_id', reminder.source_action_id)
      .eq('done', false)
      .maybeSingle();
    if (!existingError && existing) return mapRow(existing);
  }
  if (!isMissingDatabaseObject(error)) throw new Error(error.message);

  const bundle = await getReminderBundle();
  const reminders = ((bundle.settings as any)?.reminders || []) as GardenReminderRecord[];
  await writeLegacyReminders([...reminders, reminder]);
  return reminder;
}

export async function updateReminder(id: string, patch: Partial<GardenReminderRecord>) {
  const databasePatch: Record<string, any> = { updated_at: new Date().toISOString() };
  if (patch.title !== undefined) databasePatch.title = patch.title.trim();
  if (patch.type !== undefined) databasePatch.reminder_type = patch.type;
  if (patch.date !== undefined) databasePatch.due_date = patch.date;
  if (patch.done !== undefined) databasePatch.done = patch.done;
  if (patch.bed !== undefined) databasePatch.bed = patch.bed || null;
  if (patch.completed_at !== undefined) databasePatch.completed_at = patch.completed_at;
  if (patch.source_action_id !== undefined) databasePatch.source_action_id = patch.source_action_id || null;
  if (patch.source_pest_log_id !== undefined) databasePatch.source_pest_log_id = patch.source_pest_log_id || null;

  const { data, error } = await db.from('garden_reminders').update(databasePatch).eq('id', id).select().single();
  if (!error) return mapRow(data);
  if (!isMissingDatabaseObject(error)) throw new Error(error.message);

  const bundle = await getReminderBundle();
  const reminders = (((bundle.settings as any)?.reminders || []) as GardenReminderRecord[])
    .map((reminder) => reminder.id === id ? { ...reminder, ...patch } : reminder);
  await writeLegacyReminders(reminders);
  return reminders.find((reminder) => reminder.id === id);
}

export async function deleteReminder(id: string) {
  const { error } = await db.from('garden_reminders').delete().eq('id', id);
  if (!error) return;
  if (!isMissingDatabaseObject(error)) throw new Error(error.message);

  const bundle = await getReminderBundle();
  const reminders = (((bundle.settings as any)?.reminders || []) as GardenReminderRecord[])
    .filter((reminder) => reminder.id !== id);
  await writeLegacyReminders(reminders);
}
