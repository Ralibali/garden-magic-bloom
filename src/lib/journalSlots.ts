import { fieldJournalSchema, type JournalStorage } from './fieldJournal';

interface SlotFiles { list(): Promise<string[]>; read(path: string): Promise<string>; write(path: string, value: string): Promise<void> }
const slots = ['field-journal-a.json', 'field-journal-b.json'];
export function journalSlotStorage(files: SlotFiles): JournalStorage {
  const latest = async () => {
    const names = await files.list();
    const present = slots.filter(slot => names.includes(slot));
    const valid: { slot: string; revision: number; value: string }[] = [];
    for (const slot of present) {
      const raw = await files.read(slot); // A transient I/O failure must not select older data.
      try {
        const record = JSON.parse(raw);
        if (!Number.isSafeInteger(record.revision) || record.revision < 1) continue;
        const journal = fieldJournalSchema.parse(JSON.parse(record.value));
        valid.push({ slot, revision: record.revision, value: JSON.stringify(journal) });
      } catch { /* Keep the other complete generation after an interrupted write. */ }
    }
    if (present.length && !valid.length) throw new Error('Dagboken kunde inte läsas. Inget har skrivits över.');
    return valid.sort((a, b) => b.revision - a.revision)[0] || null;
  };
  return {
    async read() { return (await latest())?.value ?? null; },
    async write(value) {
      fieldJournalSchema.parse(JSON.parse(value));
      const previous = await latest();
      const slot = previous?.slot === slots[0] ? slots[1] : slots[0];
      const record = JSON.stringify({ revision: (previous?.revision || 0) + 1, value });
      // Write the older slot. Never delete or overwrite the current generation.
      await files.write(slot, record);
      if (await files.read(slot) !== record) throw new Error('Sparandet kunde inte verifieras. Försök igen.');
    },
  };
}
