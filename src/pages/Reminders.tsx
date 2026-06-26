import React, { useEffect, useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Plus, Sprout, Shovel, Droplets, Check, Bell, AlertTriangle, BellRing } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { toast } from '@/hooks/use-toast';
import { Skeleton } from '@/components/ui/skeleton';
import ConfirmDeleteButton from '@/components/ConfirmDeleteButton';
import { recordProductActivity } from '@/lib/analytics';

interface Reminder {
  id: string;
  title: string;
  type: 'sowing' | 'transplant' | 'watering' | 'other';
  date: string;
  done: boolean;
  bed?: string;
}

const typeConfig = {
  sowing: { icon: Sprout, label: 'Sådd', color: 'text-primary' },
  transplant: { icon: Shovel, label: 'Utplantering', color: 'text-accent' },
  watering: { icon: Droplets, label: 'Vattning', color: 'text-blue-500' },
  other: { icon: Bell, label: 'Övrigt', color: 'text-muted-foreground' },
};

function daysUntil(dateString: string) {
  const target = new Date(`${dateString}T12:00:00`);
  const today = new Date();
  today.setHours(12, 0, 0, 0);
  return Math.round((target.getTime() - today.getTime()) / 86400000);
}

export default function Reminders() {
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newType, setNewType] = useState<Reminder['type']>('sowing');
  const [newDate, setNewDate] = useState('');
  const [permission, setPermission] = useState<NotificationPermission | 'unsupported'>(() => typeof Notification === 'undefined' ? 'unsupported' : Notification.permission);

  const { data: settingsData, isLoading } = useQuery({ queryKey: ['reminder-settings'], queryFn: api.getReminderSettings });
  const settings = ((settingsData?.settings as any) || {}) as { reminders?: Reminder[]; notifications_enabled?: boolean };
  const reminders = settings.reminders || [];

  const saveSettings = useMutation({
    mutationFn: (nextSettings: { reminders?: Reminder[]; notifications_enabled?: boolean }) => api.updateReminderSettings({ settings: { ...settings, ...nextSettings } }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['reminder-settings'] }),
    onError: (error: any) => toast({ title: 'Kunde inte spara', description: error?.message || 'Försök igen.', variant: 'destructive' }),
  });

  const upcoming = useMemo(() => reminders.filter((reminder) => !reminder.done).sort((a, b) => a.date.localeCompare(b.date)), [reminders]);
  const completed = reminders.filter((reminder) => reminder.done);
  const urgent = upcoming.filter((reminder) => daysUntil(reminder.date) <= 3);

  useEffect(() => {
    if (permission !== 'granted' || !settings.notifications_enabled) return;
    const due = upcoming.filter((reminder) => daysUntil(reminder.date) <= 0);
    if (!due.length) return;
    const dayKey = new Date().toISOString().slice(0, 10);
    const storageKey = `odlingsdagboken_reminder_notice_${dayKey}`;
    let shownIds: string[] = [];
    try { shownIds = JSON.parse(localStorage.getItem(storageKey) || '[]'); } catch {}
    const alreadyShown = new Set<string>(shownIds);
    const unseen = due.filter((reminder) => !alreadyShown.has(reminder.id));
    if (!unseen.length) return;
    new Notification(unseen.length === 1 ? unseen[0].title : `${unseen.length} odlingspåminnelser`, { body: unseen.length === 1 ? 'Öppna Odlingsdagboken och markera uppgiften när den är klar.' : 'Du har uppgifter som är förfallna eller ska göras idag.', icon: '/pwa-192x192.png' });
    localStorage.setItem(storageKey, JSON.stringify([...alreadyShown, ...unseen.map((reminder) => reminder.id)]));
  }, [permission, settings.notifications_enabled, upcoming]);

  const requestNotifications = async () => {
    if (typeof Notification === 'undefined') return;
    const result = await Notification.requestPermission();
    setPermission(result);
    if (result === 'granted') {
      saveSettings.mutate({ notifications_enabled: true });
      void recordProductActivity('reminder_notifications_enabled');
      toast({ title: 'Webbläsaraviseringar aktiverade', description: 'Du får en avisering för förfallna uppgifter när appen öppnas. Bakgrundspush kräver ett senare serversteg.' });
    }
  };

  const saveReminders = (nextReminders: Reminder[]) => saveSettings.mutate({ reminders: nextReminders });
  const toggleDone = (id: string) => { const next = reminders.map((reminder) => reminder.id === id ? { ...reminder, done: !reminder.done } : reminder); saveReminders(next); const target = next.find((reminder) => reminder.id === id); void recordProductActivity(target?.done ? 'reminder_completed' : 'reminder_reopened', { reminder_id: id }); };
  const removeReminder = (id: string) => { saveReminders(reminders.filter((reminder) => reminder.id !== id)); void recordProductActivity('reminder_deleted', { reminder_id: id }); };

  const handleAdd = () => {
    if (!newTitle.trim() || !newDate) return;
    const reminder: Reminder = { id: crypto.randomUUID(), title: newTitle.trim(), type: newType, date: newDate, done: false };
    saveReminders([...reminders, reminder]);
    setNewTitle(''); setNewDate(''); setOpen(false);
    void recordProductActivity(reminders.length === 0 ? 'first_reminder_created' : 'reminder_created', { reminder_id: reminder.id, type: reminder.type, date: reminder.date });
    toast({ title: 'Påminnelse sparad! 🌱' });
  };

  if (isLoading) return <div className="max-w-5xl mx-auto space-y-4"><Skeleton className="h-10 w-64" /><Skeleton className="h-64" /></div>;

  return (
    <div className="max-w-5xl mx-auto space-y-4 sm:space-y-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3"><div><h1 className="text-2xl sm:text-3xl font-serif">Påminnelser 🌱</h1><p className="text-sm text-muted-foreground mt-1">Håll koll på sådd, utplantering och vattning</p></div><Dialog open={open} onOpenChange={setOpen}><DialogTrigger asChild><Button className="gap-2 w-full sm:w-auto"><Plus className="h-4 w-4" /> Ny påminnelse</Button></DialogTrigger><DialogContent><DialogHeader><DialogTitle className="font-serif">Ny påminnelse</DialogTitle></DialogHeader><div className="space-y-3 pt-2"><Input placeholder="Titel, till exempel Förodla tomater" value={newTitle} onChange={(event) => setNewTitle(event.target.value)} /><Select value={newType} onValueChange={(value) => setNewType(value as Reminder['type'])}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="sowing">🌱 Sådd</SelectItem><SelectItem value="transplant">🪴 Utplantering</SelectItem><SelectItem value="watering">💧 Vattning</SelectItem><SelectItem value="other">🔔 Övrigt</SelectItem></SelectContent></Select><Input type="date" value={newDate} onChange={(event) => setNewDate(event.target.value)} /><Button className="w-full" onClick={handleAdd} disabled={!newTitle.trim() || !newDate || saveSettings.isPending}>Spara påminnelse</Button></div></DialogContent></Dialog></div>

      {permission !== 'unsupported' && permission !== 'granted' && <Card className="border-primary/20 bg-primary/5"><CardContent className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3"><div className="flex gap-3"><BellRing className="h-5 w-5 text-primary mt-0.5" /><div><p className="font-medium text-sm">Aktivera webbläsaraviseringar</p><p className="text-xs text-muted-foreground mt-1">Aviserar om uppgifter som är idag eller försenade när du öppnar appen.</p></div></div><Button size="sm" variant="outline" onClick={requestNotifications}>Aktivera</Button></CardContent></Card>}

      {urgent.length > 0 && <Card className="bg-destructive/5 border-destructive/30"><CardContent className="p-4"><div className="flex items-center gap-2 mb-2"><AlertTriangle className="h-4 w-4 text-destructive" /><span className="font-serif text-sm text-destructive">Behöver uppmärksamhet</span></div>{urgent.slice(0, 4).map((reminder) => <p key={reminder.id} className="text-sm"><strong>{reminder.title}</strong> – {daysUntil(reminder.date) < 0 ? `${Math.abs(daysUntil(reminder.date))} dagar försenad` : daysUntil(reminder.date) === 0 ? 'idag' : `om ${daysUntil(reminder.date)} dagar`}</p>)}</CardContent></Card>}

      <Card><CardHeader className="px-4 sm:px-6"><CardTitle className="font-serif text-base sm:text-lg">Kommande ({upcoming.length})</CardTitle></CardHeader><CardContent className="p-0">{upcoming.length === 0 ? <p className="px-6 py-8 text-center text-sm text-muted-foreground">Inga kommande påminnelser. Skapa din första! 🌿</p> : <div className="divide-y divide-border">{upcoming.map((reminder) => { const config = typeConfig[reminder.type]; const days = daysUntil(reminder.date); return <div key={reminder.id} className="flex items-center gap-3 px-4 sm:px-6 py-3"><button onClick={() => toggleDone(reminder.id)} className="shrink-0 w-6 h-6 rounded-full border-2 border-border hover:border-primary" aria-label={`Markera ${reminder.title} som klar`} /><config.icon className={`h-4 w-4 shrink-0 ${config.color}`} /><div className="flex-1 min-w-0"><p className="text-xs sm:text-sm font-medium truncate">{reminder.title}</p><p className="text-[10px] sm:text-xs text-muted-foreground">{reminder.date} · {config.label}</p></div><Badge variant={days <= 0 ? 'destructive' : days <= 7 ? 'default' : 'secondary'} className="text-[10px] shrink-0">{days < 0 ? 'Försenad' : days === 0 ? 'Idag' : `${days} dagar`}</Badge><ConfirmDeleteButton itemName={reminder.title} description="Påminnelsen tas bort permanent." disabled={saveSettings.isPending} onConfirm={() => removeReminder(reminder.id)} /></div>; })}</div>}</CardContent></Card>

      {completed.length > 0 && <Card><CardHeader className="px-4 sm:px-6"><CardTitle className="font-serif text-base sm:text-lg text-muted-foreground">Avklarade ({completed.length})</CardTitle></CardHeader><CardContent className="p-0"><div className="divide-y divide-border">{completed.map((reminder) => { const config = typeConfig[reminder.type]; return <div key={reminder.id} className="flex items-center gap-3 px-4 sm:px-6 py-3 opacity-70"><button onClick={() => toggleDone(reminder.id)} className="shrink-0 w-6 h-6 rounded-full bg-primary/20 border-2 border-primary flex items-center justify-center"><Check className="h-3 w-3 text-primary" /></button><config.icon className={`h-4 w-4 shrink-0 ${config.color}`} /><div className="flex-1 min-w-0"><p className="text-xs sm:text-sm font-medium line-through truncate">{reminder.title}</p><p className="text-[10px] text-muted-foreground">{reminder.date}</p></div><ConfirmDeleteButton itemName={reminder.title} description="Påminnelsen tas bort permanent." disabled={saveSettings.isPending} onConfirm={() => removeReminder(reminder.id)} /></div>; })}</div></CardContent></Card>}
    </div>
  );
}
