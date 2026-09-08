import { supabase } from '@/integrations/supabase/client';
import { api } from '@/lib/api';
import { readAll } from '@/lib/diaryApi';
import type { CultivationSources } from '@/lib/cultivations';
import type { GardenReminder, GardenActionState } from '@/lib/gardenToday';

export async function getCultivationData(): Promise<CultivationSources> {
  const [beds, sowings, plants, care, waterings, photos, harvests, pests, reminderData] = await Promise.all([
    readAll((f, t) => supabase.from('beds').select('*').order('id').range(f, t)),
    readAll((f, t) => supabase.from('sowings').select('*').order('id').range(f, t)),
    readAll((f, t) => supabase.from('my_plants').select('*, plants(name_sv, water, light, watering_interval_days)').order('id').range(f, t)),
    readAll((f, t) => supabase.from('plant_care_events').select('*').order('id').range(f, t)),
    readAll((f, t) => supabase.from('watering_log').select('*').order('id').range(f, t)),
    readAll((f, t) => supabase.from('plant_photos').select('*').order('id').range(f, t)),
    readAll((f, t) => supabase.from('harvests').select('*').order('id').range(f, t)),
    readAll((f, t) => supabase.from('pest_logs').select('*').order('id').range(f, t)),
    api.getReminderSettings(),
  ]);
  const settings = reminderData?.settings as { reminders?: GardenReminder[]; smart_action_state?: Record<string, GardenActionState> } | null;
  return { beds, sowings, plants, care, waterings, photos, harvests, pests, reminders: Array.isArray(settings?.reminders) ? settings.reminders : [], actionState: settings?.smart_action_state };
}
