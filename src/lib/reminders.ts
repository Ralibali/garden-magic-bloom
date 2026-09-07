/**
 * Delad hjälp för att skapa påminnelser från valfri sida i appen.
 * Påminnelser lagras i user_settings.settings.reminders (JSON).
 */
import { api } from '@/lib/api';

export interface NewReminder {
  title: string;
  type: 'sowing' | 'transplant' | 'watering' | 'other';
  /** YYYY-MM-DD */
  date: string;
  bed?: string;
  source_action_id?: string;
  sowing_id?: string | null;
  bed_id?: string | null;
  display_text?: string;
  source?: string;
}

/** Lägger till en påminnelse. Returnerar true om den sparades. */
export async function addReminder(reminder: NewReminder): Promise<boolean> {
  try {
    const settingsData = await api.getReminderSettings();
    const settings = ((settingsData?.settings as any) || {}) as { reminders?: any[] };
    const reminders = settings.reminders || [];

    // Undvik dubbletter: samma titel och datum räknas som samma påminnelse
    const exists = reminders.some(
      (r: any) => !r.done && r.title === reminder.title && r.date === reminder.date,
    );
    if (exists) return true;

    const next = [
      ...reminders,
      {
        id: crypto.randomUUID(),
        title: reminder.title,
        type: reminder.type,
        date: reminder.date,
        done: false,
        bed: reminder.bed,
        sowing_id: reminder.sowing_id ?? null,
        bed_id: reminder.bed_id ?? null,
        display_text: reminder.display_text || reminder.title,
        source: reminder.source,
        created_at: new Date().toISOString(),
        completed_at: null,
        source_action_id: reminder.source_action_id,
      },
    ];
    await api.updateReminderSettings({ ...settings, reminders: next });
    return true;
  } catch {
    return false;
  }
}
