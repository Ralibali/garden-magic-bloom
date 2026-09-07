/**
 * Delad hjälp för att skapa påminnelser från valfri sida i appen.
 * Påminnelser lagras i reminder_settings.settings.reminders (JSON).
 */
import { seedRpc } from '@/lib/seedPlans';

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
    await seedRpc('change_garden_reminder', { p_action: 'add', p_item: { ...reminder, id: crypto.randomUUID(), done: false, completed_at: null, display_text: reminder.display_text || reminder.title } });
    return true;
  } catch {
    return false;
  }
}
