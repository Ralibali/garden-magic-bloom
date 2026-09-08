import { describe, expect, it } from 'vitest';
import { createJournalRepository, emptyJournal, fieldEntrySchema, mergeFieldJournals, newFieldEntry, notificationPlan } from '@/lib/fieldJournal';
import { journalSlotStorage } from '@/lib/journalSlots';
import { nativePathAllowed } from '@/lib/native';
import { hasAiConsent, requireAiConsent, setAiConsent } from '@/lib/aiConsent';
import { deleteAccountPhotos, isGardenSubscription, GARDEN_YEARLY_PRICE } from '../../supabase/functions/_shared/accountDeletion';

describe('a field journal that survives interruptions', () => {
  it('serializes competing draft and save writes without losing either entry', async () => {
    let value: string | null = null;
    const repo = createJournalRepository({ read: async () => value, write: async v => { await Promise.resolve(); value = v; } });
    const a = newFieldEntry(), b = newFieldEntry([a]);
    await Promise.all([repo.update(j => ({ ...j, entries: [...j.entries, a] })), repo.update(j => ({ ...j, entries: [...j.entries, b] }))]);
    expect((await repo.read()).entries.map(e => e.id)).toEqual([a.id, b.id]);
    const relaunched = createJournalRepository({ read: async () => value, write: async v => { value = v; } });
    expect((await relaunched.read()).entries).toHaveLength(2);
  });
  it('does not replace corrupt or future-version data with an empty diary', async () => {
    let writes = 0;
    for (const raw of ['{partial', '{"version":2,"entries":[]}']) {
      const repo = createJournalRepository({ read: async () => raw, write: async () => { writes++; } });
      await expect(repo.update(() => emptyJournal())).rejects.toThrow();
    }
    expect(writes).toBe(0);
  });
  it('recovers the last complete generation after power loss during a write', async () => {
    const disk = new Map<string, string>(); let interrupt = false;
    const adapter = journalSlotStorage({ list: async () => [...disk.keys()], read: async path => disk.get(path)!, write: async (path, value) => { disk.set(path, interrupt ? value.slice(0, 20) : value); if (interrupt) throw new Error('power loss'); } });
    const first = { ...emptyJournal(), entries: [newFieldEntry()] };
    await adapter.write(JSON.stringify(first));
    interrupt = true;
    await expect(adapter.write(JSON.stringify(emptyJournal()))).rejects.toThrow('power loss');
    expect(JSON.parse((await adapter.read())!)).toEqual(first);
    interrupt = false;
    await adapter.write(JSON.stringify(emptyJournal()));
    expect(JSON.parse((await adapter.read())!).entries).toEqual([]);
  });
  it('refuses a write when neither stored generation is recoverable', async () => {
    let written = false;
    const adapter = journalSlotStorage({ list: async () => ['field-journal-a.json'], read: async () => 'broken', write: async () => { written = true; } });
    await expect(adapter.write(JSON.stringify(emptyJournal()))).rejects.toThrow();
    expect(written).toBe(false);
  });
  it('does not overwrite either generation after a transient read failure', async () => {
    const disk = new Map<string, string>();
    let fail = false, writes = 0;
    const adapter = journalSlotStorage({ list: async () => [...disk.keys()], read: async path => { if (fail && path === 'field-journal-b.json') throw new Error('temporary I/O'); return disk.get(path)!; }, write: async (path, value) => { writes++; disk.set(path, value); } });
    await adapter.write(JSON.stringify(emptyJournal()));
    const newer = { ...emptyJournal(), entries: [newFieldEntry()] };
    await adapter.write(JSON.stringify(newer));
    fail = true;
    await expect(adapter.write(JSON.stringify(emptyJournal()))).rejects.toThrow('temporary I/O');
    expect(writes).toBe(2);
    fail = false;
    expect(JSON.parse((await adapter.read())!)).toEqual(newer);
  });
  it('keeps imported drafts aligned with remapped reminder IDs and preserves existing entries', () => {
    const a = { ...newFieldEntry(), reminderId: 5 };
    const b = { ...newFieldEntry(), reminderId: 5 };
    const result = mergeFieldJournals({ ...emptyJournal(), entries: [a] }, { ...emptyJournal(), entries: [a, b], draft: b });
    expect(result.entries).toHaveLength(2);
    expect(result.entries[0]).toEqual(a);
    expect(result.entries[1].reminderId).not.toBe(5);
    expect(result.draft?.reminderId).toBe(result.entries[1].reminderId);
  });
  it('rejects invalid dates, external image paths and oversized notes', () => {
    const entry = newFieldEntry();
    for (const patch of [{ date: '2026-02-31' }, { photos: ['https://example.com/a.jpg'] }, { note: 'a'.repeat(5001) }, { reminderId: -1 }]) expect(fieldEntrySchema.safeParse({ ...entry, ...patch }).success).toBe(false);
  });
});

describe('device reminder plans', () => {
  it('keeps only future, active reminders; no exact-alarm permission', () => {
    const now = Date.parse('2026-09-08T10:00:00Z');
    const entry = { ...newFieldEntry(), reminderAt: '2026-09-08T11:00:00Z' };
    const rows = [entry, { ...newFieldEntry(), reminderAt: entry.reminderAt, done: true }, { ...newFieldEntry(), reminderAt: entry.reminderAt, deleted: true }, { ...newFieldEntry(), reminderAt: '2026-09-08T09:00:00Z' }];
    const result = notificationPlan(rows, now);
    expect(result).toHaveLength(1); expect(result[0].id).toBe(entry.reminderId);
    expect(result[0].schedule.at.toISOString()).toBe('2026-09-08T11:00:00.000Z');
    expect(result[0].isExactNotification).toBe(false);
  });
  it('selects the nearest 60 reminders below the iOS limit', () => {
    const now = Date.now();
    const rows = Array.from({ length: 90 }, (_, i) => ({ ...newFieldEntry(), reminderAt: new Date(now + (90 - i) * 60000).toISOString() }));
    const result = notificationPlan(rows, now);
    expect(result).toHaveLength(60);
    expect(result[0].schedule.at.getTime()).toBe(now + 60000);
    expect(result[59].schedule.at.getTime()).toBe(now + 60 * 60000);
  });
});

describe('native navigation and AI sharing', () => {
  it.each(['/app/premium', '/APP/Premium', '/app/%70remium', '/app/admin/', '/app/%41dmin', '/priser', '/%2Fexample.com', '/app/%', '/app/premium/checkout'])('blocks %s', path => expect(nativePathAllowed(path)).toBe(false));
  it.each(['/', '/faltdagbok', '/login', '/terms', '/radera-konto', '/app/odlingar', '/app/timeline'])('allows %s', path => expect(nativePathAllowed(path)).toBe(true));
  it('requires explicit user-scoped consent and respects revocation', () => {
    localStorage.clear(); expect(hasAiConsent('a')).toBe(false);
    expect(() => requireAiConsent('a')).toThrow();
    setAiConsent('a', true); expect(hasAiConsent('a')).toBe(true); expect(hasAiConsent('b')).toBe(false);
    setAiConsent('a', false); expect(() => requireAiConsent('a')).toThrow();
  });
});

describe('account deletion boundaries', () => {
  it('enumerates nested photos completely before removing batches', async () => {
    const user = '12345678-1234-1234-1234-123456789abc';
    const calls: string[] = []; const deleted: string[] = [];
    const files = Array.from({ length: 215 }, (_, i) => ({ name: `${i}.jpg`, id: String(i) }));
    await deleteAccountPhotos({ list: async (prefix, { offset, limit }) => { calls.push('list'); return { error: null, data: prefix === user ? [{ name: 'plants', id: null }] : files.slice(offset, offset + limit) }; }, remove: async paths => { calls.push('remove'); deleted.push(...paths); return { error: null }; } }, user);
    expect(deleted).toHaveLength(215); expect(new Set(deleted).size).toBe(215);
    expect(deleted.every(path => path.startsWith(`${user}/plants/`))).toBe(true);
    expect(calls).toEqual(['list', 'list', 'list', 'list', 'remove']);
  });
  it('propagates storage failure instead of declaring deletion successful', async () => {
    await expect(deleteAccountPhotos({ list: async () => ({ data: null, error: new Error('offline') }), remove: async () => ({ error: null }) }, '12345678-1234-1234-1234-123456789abc')).rejects.toThrow('offline');
  });
  it('never cancels another product or another explicitly identified owner', () => {
    const subscription = { items: { data: [{ price: { id: GARDEN_YEARLY_PRICE } }] } };
    expect(isGardenSubscription(subscription, 'a')).toBe(true);
    expect(isGardenSubscription({ ...subscription, metadata: { user_id: 'b' } }, 'a')).toBe(false);
    expect(isGardenSubscription({ items: { data: [{ price: { id: 'unrelated' } }] } }, 'a')).toBe(false);
  });
});
