import React, { useEffect, useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Plus, Sprout, Shovel, Droplets, Check, Bell, AlertTriangle, BellRing, Clock3, Sparkles } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { toast } from '@/hooks/use-toast';
import { Skeleton } from '@/components/ui/skeleton';
import ConfirmDeleteButton from '@/components/ConfirmDeleteButton';
import AppEmptyState from '@/components/AppEmptyState';
import { recordProductActivity } from '@/lib/analytics';

interface Reminder {
  id: string;
  title: string;
  type: 'sowing' | 'transplant' | 'watering' | 'other';
  date: string;
  done: boolean;
  bed?: string;
  created_at?: string;
  completed_at?: string | null;
  source_action_id?: string;
}

const typeConfig = {
  sowing: { icon: Sprout, label: 'Sådd', color: 'text-primary', background: 'bg-primary/9' },
  transplant: { icon: Shovel, label: 'Utplantering', color: 'text-accent', background: 'bg-accent/10' },
  watering: { icon: Droplets, label: 'Vattning', color: 'text-blue-600 dark:text-blue-300', background: 'bg-blue-500/10' },
  other: { icon: Bell, label: 'Övrigt', color: 'text-muted-foreground', background: 'bg-muted' },
};

function dateKey(date = new Date()) {
  return date.toISOString().slice(0, 10);
}

function daysUntil(dateString: string) {
  const target = new Date(`${dateString}T12:00:00`);
  const today = new Date();
  today.setHours(12, 0, 0, 0);
  return Math.round((target.getTime() - today.getTime()) / 86400000);
}

function addDays(dateString: string, days: number) {
  const date = new Date(`${dateString}T12:00:00`);
  date.setDate(date.getDate() + days);
  return date.toISOString().slice(0, 10);
}

export default function Reminders() {
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newType, setNewType] = useState<Reminder['type']>('sowing');
  const [newDate, setNewDate] = useState(dateKey());
  const [permission, setPermission] = useState<NotificationPermission | 'unsupported'>(() => typeof Notification === 'undefined' ? 'unsupported' : Notification.permission);

  const { data: settingsData, isLoading } = useQuery({ queryKey: ['reminder-settings'], queryFn: api.getReminderSettings });
  const settings = ((settingsData?.settings as any) || {}) as { reminders?: Reminder[]; notifications_enabled?: boolean; smart_action_state?: Record<string, any> };
  const reminders = settings.reminders || [];

  const saveSettings = useMutation({
    mutationFn: (nextSettings: Partial<typeof settings>) => api.updateReminderSettings({ settings: { ...settings, ...nextSettings } }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['reminder-settings'] }),
    onError: (error: any) => toast({ title: 'Kunde inte spara', description: error?.message || 'Försök igen.', variant: 'destructive' }),
  });

  const upcoming = useMemo(() => reminders.filter((reminder) => !reminder.done).sort((a, b) => a.date.localeCompare(b.date)), [reminders]);
  const completed = useMemo(() => reminders.filter((reminder) => reminder.done).sort((a, b) => String(b.completed_at || '').localeCompare(String(a.completed_at || ''))), [reminders]);
  const urgent = upcoming.filter((reminder) => daysUntil(reminder.date) <= 3);
  const completedThisWeek = completed.filter((reminder) => reminder.completed_at && Date.now() - new Date(reminder.completed_at).getTime() <= 7 * 86400000).length;

  useEffect(() => {
    if (permission !== 'granted' || !settings.notifications_enabled) return;
    const due = upcoming.filter((reminder) => daysUntil(reminder.date) <= 0);
    if (!due.length) return;
    const storageKey = `odlingsdagboken_reminder_notice_${dateKey()}`;
    let shownIds: string[] = [];
    try { shownIds = JSON.parse(localStorage.getItem(storageKey) || '[]'); } catch {}
    const alreadyShown = new Set(shownIds);
    const unseen = due.filter((reminder) => !alreadyShown.has(reminder.id));
    if (!unseen.length) return;
    new Notification(unseen.length === 1 ? unseen[0].title : `${unseen.length} odlingspåminnelser`, {
      body: unseen.length === 1 ? 'Öppna Odlingsdagboken och markera uppgiften när den är klar.' : 'Du har uppgifter som är förfallna eller ska göras idag.',
      icon: '/pwa-192x192.png',
    });
    localStorage.setItem(storageKey, JSON.stringify([...alreadyShown, ...unseen.map((reminder) => reminder.id)]));
  }, [permission, settings.notifications_enabled, upcoming]);

  const requestNotifications = async () => {
    if (typeof Notification === 'undefined') return;
    const result = await Notification.requestPermission();
    setPermission(result);
    if (result === 'granted') {
      saveSettings.mutate({ notifications_enabled: true });
      void recordProductActivity('reminder_notifications_enabled');
      toast({ title: 'Webbläsaraviseringar aktiverade', description: 'Du får en avisering om dagens och försenade uppgifter när appen öppnas.' });
    }
  };

  const saveReminders = (next: Reminder[]) => saveSettings.mutate({ reminders: next });

  const toggleDone = (id: string) => {
    const now = new Date().toISOString();
    const next = reminders.map((reminder) => reminder.id === id ? { ...reminder, done: !reminder.done, completed_at: reminder.done ? null : now } : reminder);
    saveReminders(next);
    const target = next.find((reminder) => reminder.id === id);
    void recordProductActivity(target?.done ? 'reminder_completed' : 'reminder_reopened', { reminder_id: id });
  };

  const snooze = (id: string, days = 1) => {
    const next = reminders.map((reminder) => reminder.id === id ? { ...reminder, date: addDays(reminder.date < dateKey() ? dateKey() : reminder.date, days) } : reminder);
    saveReminders(next);
    void recordProductActivity('reminder_snoozed', { reminder_id: id, days });
    toast({ title: days === 1 ? 'Flyttad till imorgon' : `Flyttad ${days} dagar` });
  };

  const removeReminder = (id: string) => {
    saveReminders(reminders.filter((reminder) => reminder.id !== id));
    void recordProductActivity('reminder_deleted', { reminder_id: id });
  };

  const handleAdd = () => {
    if (!newTitle.trim() || !newDate) return;
    const reminder: Reminder = { id: crypto.randomUUID(), title: newTitle.trim(), type: newType, date: newDate, done: false, created_at: new Date().toISOString(), completed_at: null };
    saveReminders([...reminders, reminder]);
    setNewTitle('');
    setNewDate(dateKey());
    setOpen(false);
    void recordProductActivity(reminders.length === 0 ? 'first_reminder_created' : 'reminder_created', { reminder_id: reminder.id, type: reminder.type, date: reminder.date });
    toast({ title: 'Påminnelse sparad 🌱' });
  };

  if (isLoading) return <div className="max-w-6xl mx-auto space-y-4"><Skeleton className="h-36 rounded-[1.35rem]" /><Skeleton className="h-64 rounded-[1.35rem]" /></div>;

  return (
    <div className="max-w-6xl mx-auto space-y-6 animate-fade-in">
      <section className="premium-panel relative overflow-hidden p-5 sm:p-6">
        <div className="absolute right-0 top-0 h-32 w-32 rounded-full bg-primary/8 blur-3xl" />
        <div className="relative flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
          <div><span className="section-kicker mb-3"><Sparkles className="h-3.5 w-3.5" /> Din personliga arbetslista</span><h1 className="page-title">Påminnelser</h1><p className="mt-2 max-w-2xl text-sm text-muted-foreground">Samla sådant du själv planerat och sådant som dagens smarta rekommendationer har gjort till riktiga uppgifter.</p></div>
          <Button onClick={() => setOpen(true)} className="gap-2"><Plus className="h-4 w-4" /> Ny påminnelse</Button>
        </div>
        <div className="relative mt-6 grid grid-cols-3 gap-3 max-w-xl">
          <div className="metric-card p-3 sm:p-4"><p className="text-2xl font-bold">{upcoming.length}</p><p className="text-[9px] uppercase tracking-[0.1em] text-muted-foreground">kommande</p></div>
          <div className="metric-card p-3 sm:p-4"><p className="text-2xl font-bold text-destructive">{urgent.length}</p><p className="text-[9px] uppercase tracking-[0.1em] text-muted-foreground">behöver fokus</p></div>
          <div className="metric-card p-3 sm:p-4"><p className="text-2xl font-bold text-primary">{completedThisWeek}</p><p className="text-[9px] uppercase tracking-[0.1em] text-muted-foreground">klara 7 dagar</p></div>
        </div>
      </section>

      <Dialog open={open} onOpenChange={setOpen}><DialogContent><DialogHeader><DialogTitle>Ny påminnelse</DialogTitle></DialogHeader><div className="space-y-4"><Input placeholder="Till exempel: Förodla tomater" value={newTitle} onChange={(event) => setNewTitle(event.target.value)} /><Select value={newType} onValueChange={(value) => setNewType(value as Reminder['type'])}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="sowing">Sådd</SelectItem><SelectItem value="transplant">Utplantering</SelectItem><SelectItem value="watering">Vattning</SelectItem><SelectItem value="other">Övrigt</SelectItem></SelectContent></Select><Input type="date" value={newDate} onChange={(event) => setNewDate(event.target.value)} /><Button className="w-full" onClick={handleAdd} disabled={!newTitle.trim() || !newDate || saveSettings.isPending}>Spara påminnelse</Button></div></DialogContent></Dialog>

      {permission !== 'unsupported' && permission !== 'granted' && <Card className="border-primary/20 bg-primary/5"><CardContent className="p-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"><div className="flex gap-3"><BellRing className="h-5 w-5 text-primary mt-0.5" /><div><p className="font-semibold text-sm">Aktivera webbläsaraviseringar</p><p className="text-xs text-muted-foreground mt-1">Aviserar om uppgifter som är idag eller försenade när appen öppnas.</p></div></div><Button size="sm" variant="outline" onClick={requestNotifications}>Aktivera</Button></CardContent></Card>}

      {urgent.length > 0 && <Card className="border-destructive/25 bg-destructive/5"><CardContent className="p-4"><div className="flex items-center gap-2"><AlertTriangle className="h-4 w-4 text-destructive" /><p className="font-semibold text-sm text-destructive">{urgent.length} {urgent.length === 1 ? 'uppgift behöver' : 'uppgifter behöver'} uppmärksamhet</p></div></CardContent></Card>}

      {upcoming.length === 0 ? (
        <AppEmptyState icon={Bell} eyebrow="Lugn arbetslista" title="Inga öppna påminnelser" description="Dagens smarta rekommendationer visas på översikten. Därifrån kan du skapa en påminnelse med ett tryck, eller lägga in något eget här." actionLabel="Skapa påminnelse" onAction={() => setOpen(true)} />
      ) : (
        <Card><CardHeader><CardTitle className="text-lg">Kommande</CardTitle></CardHeader><CardContent className="space-y-2">{upcoming.map((reminder) => { const config = typeConfig[reminder.type] || typeConfig.other; const Icon = config.icon; const days = daysUntil(reminder.date); return <div key={reminder.id} className="group flex items-center gap-3 rounded-2xl border border-border/60 bg-card/70 p-3 transition-colors hover:border-primary/20 sm:p-4"><button onClick={() => toggleDone(reminder.id)} className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full border-2 border-border hover:border-primary" aria-label={`Markera ${reminder.title} som klar`} /><div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${config.background}`}><Icon className={`h-4.5 w-4.5 ${config.color}`} /></div><div className="min-w-0 flex-1"><p className="font-semibold text-sm truncate">{reminder.title}</p><p className="mt-1 text-xs text-muted-foreground">{reminder.date} · {config.label}</p></div><Badge variant={days <= 0 ? 'destructive' : days <= 3 ? 'default' : 'secondary'} className="hidden sm:inline-flex">{days < 0 ? `${Math.abs(days)} d sen` : days === 0 ? 'Idag' : days === 1 ? 'Imorgon' : `${days} dagar`}</Badge><Button variant="ghost" size="sm" onClick={() => snooze(reminder.id)} disabled={saveSettings.isPending}><Clock3 className="h-3.5 w-3.5" /><span className="hidden lg:inline">Imorgon</span></Button><ConfirmDeleteButton itemName={reminder.title} description="Påminnelsen tas bort permanent." disabled={saveSettings.isPending} onConfirm={() => removeReminder(reminder.id)} /></div>; })}</CardContent></Card>
      )}

      {completed.length > 0 && <Card><CardHeader><CardTitle className="text-lg text-muted-foreground">Avklarade</CardTitle></CardHeader><CardContent className="space-y-2">{completed.slice(0, 12).map((reminder) => { const config = typeConfig[reminder.type] || typeConfig.other; const Icon = config.icon; return <div key={reminder.id} className="flex items-center gap-3 rounded-2xl bg-muted/35 p-3 opacity-70"><button onClick={() => toggleDone(reminder.id)} className="flex h-7 w-7 items-center justify-center rounded-full border-2 border-primary bg-primary/15"><Check className="h-3.5 w-3.5 text-primary" /></button><Icon className={`h-4 w-4 ${config.color}`} /><div className="min-w-0 flex-1"><p className="text-sm font-medium line-through truncate">{reminder.title}</p><p className="text-[10px] text-muted-foreground">Klar {reminder.completed_at ? new Date(reminder.completed_at).toLocaleDateString('sv-SE') : reminder.date}</p></div><ConfirmDeleteButton itemName={reminder.title} description="Påminnelsen tas bort permanent." disabled={saveSettings.isPending} onConfirm={() => removeReminder(reminder.id)} /></div>; })}</CardContent></Card>}
    </div>
  );
}
