import { journalSlotStorage } from './journalSlots';
import { Capacitor } from '@capacitor/core';
import { Filesystem, Directory, Encoding } from '@capacitor/filesystem';
import { Camera, MediaTypeSelection, type MediaResult } from '@capacitor/camera';
import { LocalNotifications } from '@capacitor/local-notifications';
import { Share } from '@capacitor/share';
import { createJournalRepository, emptyJournal, fieldJournalSchema, mergeFieldJournals, notificationPlan, type FieldJournal } from './fieldJournal';
import { isNativeApp } from './native';

const directory = Directory.Data;
const nativeStorage = journalSlotStorage({
  async list() { return (await Filesystem.readdir({ path: '', directory })).files.map(file => file.name); },
  async read(path) { return String((await Filesystem.readFile({ path, directory, encoding: Encoding.UTF8 })).data); },
  async write(path, value) { await Filesystem.writeFile({ path, directory, data: value, encoding: Encoding.UTF8 }); },
});
export const fieldJournal = createJournalRepository({
  read: () => isNativeApp() ? nativeStorage.read() : Promise.resolve(localStorage.getItem('od-field-journal-v1')),
  async write(value) {
    if (isNativeApp()) await nativeStorage.write(value);
    else localStorage.setItem('od-field-journal-v1', value);
  },
});

export async function storeFieldPhoto(result: MediaResult): Promise<string> {
  const url = result.webPath || (result.uri && Capacitor.convertFileSrc(result.uri));
  if (!url) throw new Error('Bilden saknas. Försök välja den igen.');
  const response = await fetch(url);
  if (!response.ok) throw new Error('Bilden kunde inte läsas.');
  const blob = await response.blob();
  if (blob.size > 35 * 1024 * 1024) throw new Error('Bilden är för stor. Välj en mindre bild.');
  // Re-encode pixels to discard EXIF/location metadata and limit private storage.
  const bitmap = await createImageBitmap(blob);
  const scale = Math.min(1, 1800 / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement('canvas');
  canvas.width = Math.round(bitmap.width * scale); canvas.height = Math.round(bitmap.height * scale);
  const context = canvas.getContext('2d');
  if (!context) { bitmap.close(); throw new Error('Bilden kunde inte förberedas.'); }
  context.drawImage(bitmap, 0, 0, canvas.width, canvas.height); bitmap.close();
  const data = canvas.toDataURL('image/jpeg', 0.82).split(',')[1];
  const photoPath = `field-photos/${crypto.randomUUID()}.jpg`;
  await Filesystem.writeFile({ path: photoPath, directory, data, recursive: true });
  return photoPath;
}

export async function captureFieldPhoto(source: 'camera' | 'gallery') {
  const result = source === 'camera'
    ? await Camera.takePhoto({ quality: 85, targetWidth: 1800, targetHeight: 1800, saveToGallery: false, includeMetadata: false, webUseInput: true })
    : (await Camera.chooseFromGallery({ mediaType: MediaTypeSelection.Photo, allowMultipleSelection: false, includeMetadata: false, quality: 85, targetWidth: 1800, targetHeight: 1800, webUseInput: true })).results[0];
  if (!result) return null;
  return storeFieldPhoto(result);
}

export async function fieldPhotoUrl(photoPath: string) {
  if (!/^field-photos\/[a-f0-9-]+\.jpg$/.test(photoPath)) throw new Error('Ogiltig bild.');
  if (isNativeApp()) return Capacitor.convertFileSrc((await Filesystem.getUri({ path: photoPath, directory })).uri);
  const result = await Filesystem.readFile({ path: photoPath, directory });
  return `data:image/jpeg;base64,${result.data}`;
}

async function updateFieldNotifications(ask = false) {
  const journal = await fieldJournal.read();
  if (!isNativeApp()) return false;
  let permission = await LocalNotifications.checkPermissions();
  if (permission.display !== 'granted' && ask) permission = await LocalNotifications.requestPermissions();
  const pending = await LocalNotifications.getPending();
  const ids = new Set(journal.entries.map(e => e.reminderId));
  const owned = pending.notifications.filter(n => n.extra?.fieldEntryId || ids.has(n.id));
  if (owned.length) await LocalNotifications.cancel({ notifications: owned.map(n => ({ id: n.id })) });
  if (permission.display !== 'granted') return false;
  if (Capacitor.getPlatform() === 'android') await LocalNotifications.createChannel({ id: 'field-journal', name: 'Odlingspåminnelser', importance: 3 });
  const notifications = notificationPlan(journal.entries);
  if (notifications.length) await LocalNotifications.schedule({ notifications });
  return true;
}

let notificationQueue: Promise<unknown> = Promise.resolve();
export function syncFieldNotifications(_journal: FieldJournal, ask = false): Promise<boolean> {
  const operation = notificationQueue.then(() => updateFieldNotifications(ask));
  notificationQueue = operation.catch(() => undefined);
  return operation;
}

export async function exportFieldJournal(journal: FieldJournal) {
  // Explicit export contains complete entries and images, so it can be restored on a new device.
  const photoPaths = [...new Set(journal.entries.flatMap(e => e.photos).concat(journal.draft?.photos || []))];
  const photos: Record<string, string> = {};
  for (const photoPath of photoPaths) {
    const { data } = await Filesystem.readFile({ path: photoPath, directory });
    if (typeof data !== 'string') throw new Error('Bilden kunde inte exporteras.');
    photos[photoPath] = data;
  }
  const data = JSON.stringify({ journal, photos }, null, 2);
  if (new Blob([data]).size > 100 * 1024 * 1024) throw new Error('Säkerhetskopian överstiger 100 MB. Behåll dagboken på enheten och kontakta support för hjälp med en större export.');
  const fileName = `odlingsdagboken-${new Date().toISOString().slice(0, 10)}.json`;
  if (isNativeApp()) {
    const file = await Filesystem.writeFile({ path: fileName, directory: Directory.Cache, data, encoding: Encoding.UTF8 });
    await Share.share({ title: 'Min fältdagbok', files: [file.uri], dialogTitle: 'Spara en kopia av dagboken' });
  } else {
    const url = URL.createObjectURL(new Blob([data], { type: 'application/json' }));
    const a = document.createElement('a'); a.href = url; a.download = fileName; a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
}

export async function importFieldJournal(file: File) {
  if (file.size > 100 * 1024 * 1024) throw new Error('Säkerhetskopian är för stor (max 100 MB).');
  const raw = JSON.parse(await file.text());
  const imported = fieldJournalSchema.parse(raw.journal);
  const paths = [...new Set(imported.entries.flatMap(e => e.photos).concat(imported.draft?.photos || []))];
  for (const path of paths) {
    if (typeof raw.photos?.[path] !== 'string' || !/^[A-Za-z0-9+/]+={0,2}$/.test(raw.photos[path])) throw new Error('Säkerhetskopian innehåller en ofullständig bild.');
  }
  const current = await fieldJournal.read();
  const existingPhotos = new Set(current.entries.flatMap(e => e.photos).concat(current.draft?.photos || []));
  for (const path of paths) {
    if (!existingPhotos.has(path)) await Filesystem.writeFile({ path, directory, data: raw.photos[path], recursive: true });
  }
  const saved = await fieldJournal.update(j => mergeFieldJournals(j, imported));
  return saved;
}

export async function clearFieldJournal() {
  const previous = await fieldJournal.read();
  // Cancel while IDs still exist. Overwrite both generations so a backup slot
  // cannot resurrect a diary the user deliberately erased.
  if (isNativeApp()) {
    const pending = await LocalNotifications.getPending();
    const ids = new Set(previous.entries.map(e => e.reminderId));
    await LocalNotifications.cancel({ notifications: pending.notifications.filter(n => n.extra?.fieldEntryId || ids.has(n.id)).map(n => ({ id: n.id })) });
  }
  await fieldJournal.update(() => emptyJournal());
  await fieldJournal.update(() => emptyJournal());
  // Delete all owned image files, including removed images and abandoned drafts.
  const root = await Filesystem.readdir({ path: '', directory });
  if (root.files.some(file => file.name === 'field-photos')) await Filesystem.rmdir({ path: 'field-photos', directory, recursive: true });
  const cache = await Filesystem.readdir({ path: '', directory: Directory.Cache });
  for (const file of cache.files) {
    if (/^odlingsdagboken-\d{4}-\d{2}-\d{2}\.json$/.test(file.name)) await Filesystem.deleteFile({ path: file.name, directory: Directory.Cache });
  }
  await syncFieldNotifications(emptyJournal());
}
