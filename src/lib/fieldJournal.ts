import { z } from 'zod';

const date = z.string().regex(/^\d{4}-\d{2}-\d{2}$/).refine(value => {
  const parsed = new Date(`${value}T12:00:00Z`);
  return !Number.isNaN(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value;
}, 'Välj ett giltigt datum.');
export const fieldEntrySchema = z.object({
  id: z.string().uuid(),
  title: z.string().trim().min(1, 'Ge anteckningen ett namn.').max(100),
  date,
  place: z.string().trim().max(100),
  note: z.string().trim().max(5000),
  kind: z.enum(['observation', 'sowing', 'care', 'harvest']),
  photos: z.array(z.string().regex(/^field-photos\/[a-f0-9-]+\.jpg$/)).max(5),
  reminderAt: z.string().datetime().nullable(),
  reminderId: z.number().int().min(1).max(2147483647),
  done: z.boolean(),
  deleted: z.boolean(),
  updatedAt: z.string().datetime(),
});
export type FieldEntry = z.infer<typeof fieldEntrySchema>;
export const fieldJournalSchema = z.object({ version: z.literal(1), entries: z.array(fieldEntrySchema), draft: fieldEntrySchema.nullable() }).refine(j => new Set(j.entries.map(e => e.id)).size === j.entries.length, 'Dagboken innehåller dubbla anteckningar.');
export type FieldJournal = z.infer<typeof fieldJournalSchema>;
export const emptyJournal = (): FieldJournal => ({ version: 1, entries: [], draft: null });
export function mergeFieldJournals(current: FieldJournal, imported: FieldJournal): FieldJournal {
  const ids = new Map(current.entries.map(e => [e.id, e.reminderId]));
  const used = new Set([...ids.values(), ...(current.draft ? [current.draft.reminderId] : [])]);
  const remap = (entry: FieldEntry) => {
    let reminderId = ids.get(entry.id);
    if (!reminderId) {
      reminderId = entry.reminderId;
      while (used.has(reminderId)) reminderId = reminderId === 2147483647 ? 1 : reminderId + 1;
      used.add(reminderId); ids.set(entry.id, reminderId);
    }
    return { ...entry, reminderId };
  };
  const existing = new Set(current.entries.map(e => e.id));
  const added = imported.entries.filter(e => !existing.has(e.id)).map(remap);
  return { ...current, entries: [...current.entries, ...added], draft: current.draft || (imported.draft ? remap(imported.draft) : null) };
}
export const localDate = (now = new Date()) => `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
export function newFieldEntry(entries: FieldEntry[] = []): FieldEntry {
  const used = new Set(entries.map(entry => entry.reminderId));
  let reminderId = Math.floor(Math.random() * 2147483646) + 1;
  while (used.has(reminderId)) reminderId = reminderId === 2147483647 ? 1 : reminderId + 1;
  return { id: crypto.randomUUID(), title: 'Min anteckning', date: localDate(), place: '', note: '', kind: 'observation', photos: [], reminderAt: null, reminderId, done: false, deleted: false, updatedAt: new Date().toISOString() };
}
export function notificationPlan(entries: FieldEntry[], now = Date.now()) {
  // Stay below iOS's limit of 64 pending notifications. Refresh on resume/save.
  return entries.filter(e => !e.deleted && !e.done && e.reminderAt && Date.parse(e.reminderAt) > now)
    .sort((a, b) => Date.parse(a.reminderAt!) - Date.parse(b.reminderAt!)).slice(0, 60)
    .map(e => ({ id: e.reminderId, title: 'Dags för din odling', body: e.title, schedule: { at: new Date(e.reminderAt!) }, extra: { fieldEntryId: e.id }, channelId: 'field-journal', isExactNotification: false }));
}
export interface JournalStorage { read(): Promise<string | null>; write(value: string): Promise<void> }
export function createJournalRepository(storage: JournalStorage) {
  let queue: Promise<unknown> = Promise.resolve();
  const read = async () => {
    const raw = await storage.read();
    return raw === null ? emptyJournal() : fieldJournalSchema.parse(JSON.parse(raw));
  };
  return {
    read,
    update(change: (current: FieldJournal) => FieldJournal): Promise<FieldJournal> {
      const operation = queue.then(async () => {
        const next = fieldJournalSchema.parse(change(await read()));
        await storage.write(JSON.stringify(next));
        return next;
      });
      queue = operation.catch(() => undefined);
      return operation;
    },
  };
}
