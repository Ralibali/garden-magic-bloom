import NativePushBridge from './NativePushBridge';
import { flushFieldDraft } from '@/lib/fieldDraftLifecycle';
import { useEffect } from 'react';
import { App as DeviceApp } from '@capacitor/app';
import { LocalNotifications } from '@capacitor/local-notifications';
import { useLocation, useNavigate, Navigate } from 'react-router-dom';
import type { PluginListenerHandle } from '@capacitor/core';
import type { MediaResult } from '@capacitor/camera';
import { isNativeApp, nativePathAllowed } from '@/lib/native';
import { fieldJournal, storeFieldPhoto, syncFieldNotifications } from '@/lib/fieldJournalDevice';
import { toast } from 'sonner';

export default function NativeShell({ children }: { children: React.ReactNode }) {
  const navigate = useNavigate();
  const { pathname } = useLocation();
  useEffect(() => {
    if (!isNativeApp()) return;
    let disposed = false;
    const handles: PluginListenerHandle[] = [];
    const listen = (promise: Promise<PluginListenerHandle>) => void promise.then(handle => { if (disposed) return handle.remove(); handles.push(handle); }).catch(() => undefined);
    const refresh = () => void fieldJournal.read().then(j => syncFieldNotifications(j)).catch(() => undefined);
    refresh();
    listen(DeviceApp.addListener('appStateChange', ({ isActive }) => { if (isActive) refresh(); else void flushFieldDraft().catch(() => toast.error('Utkastet kunde inte sparas. Öppna dagboken och försök igen.')); }));
    listen(DeviceApp.addListener('backButton', async ({ canGoBack }) => {
      try { if (await flushFieldDraft(true)) return; } catch { toast.error('Utkastet kunde inte sparas. Stanna kvar och försök igen.'); return; }
      if (document.querySelector('[role="dialog"][data-state="open"], [role="alertdialog"][data-state="open"]')) {
        document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
        return;
      }
      if (canGoBack) navigate(-1);
      else navigate('/faltdagbok', { replace: true });
    }));
    listen(LocalNotifications.addListener('localNotificationActionPerformed', async event => {
      try { await flushFieldDraft(); } catch { toast.error('Utkastet kunde inte sparas. Stanna kvar och försök igen.'); return; }
      const id = event.notification.extra?.fieldEntryId;
      navigate('/faltdagbok', { state: typeof id === 'string' ? { fieldEntryId: id } : null });
    }));
    // Android can kill the activity while the system camera is open. The draft
    // was committed before opening it; attach the recovered result to that draft.
    listen(DeviceApp.addListener('appRestoredResult', async event => {
      if (event.pluginId !== 'Camera' || !event.success) return;
      try {
        const result = event.methodName === 'chooseFromGallery' ? event.data?.results?.[0] : event.data;
        if (!result) return;
        const current = await fieldJournal.read();
        if (!current.draft || current.draft.photos.length >= 5) return;
        const photo = await storeFieldPhoto(result as MediaResult);
        await fieldJournal.update(j => ({ ...j, draft: j.draft?.id === current.draft?.id ? { ...j.draft, photos: [...j.draft.photos, photo].slice(0, 5) } : j.draft }));
        window.dispatchEvent(new Event('field-journal-recovered'));
        navigate('/faltdagbok');
        toast.success('Kamerabilden har återställts i ditt utkast.');
      } catch { toast.error('Bilden kunde inte återställas. Din anteckning finns kvar som utkast.'); }
    }));
    return () => { disposed = true; handles.forEach(handle => void handle.remove()); };
  }, [navigate]);
  if (isNativeApp() && !nativePathAllowed(pathname)) return <Navigate to="/faltdagbok" replace />;
  return <><NativePushBridge />{children}</>;
}
