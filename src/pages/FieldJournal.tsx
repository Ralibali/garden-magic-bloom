import { registerFieldDraftFlusher } from '@/lib/fieldDraftLifecycle';
import { useEffect, useRef, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Bell, BookOpen, Camera, Check, ChevronRight, Download, ImagePlus, Leaf, Plus, Search, Sprout, Trash2, WifiOff } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { emptyJournal, fieldEntrySchema, localDate, newFieldEntry, type FieldEntry, type FieldJournal } from '@/lib/fieldJournal';
import { captureFieldPhoto, clearFieldJournal, exportFieldJournal, importFieldJournal, fieldJournal, fieldPhotoUrl, syncFieldNotifications } from '@/lib/fieldJournalDevice';
import { isNativeApp } from '@/lib/native';
import hero from '@/assets/hero-garden.jpg';

const kinds = { observation: 'Iakttagelse', sowing: 'Sådd', care: 'Skötsel', harvest: 'Skörd' } as const;
function Photo({ path, className = '' }: { path: string; className?: string }) {
  const [src, setSrc] = useState<string>();
  const [error, setError] = useState(false);
  useEffect(() => { let active = true; fieldPhotoUrl(path).then(url => { if (active) setSrc(url); }).catch(() => { if (active) setError(true); }); return () => { active = false; }; }, [path]);
  return error ? <span className="text-xs text-muted-foreground">Bilden kunde inte läsas</span> : <img src={src} alt="Foto från din odling" className={className} loading="lazy" />;
}
const describeError = (error: unknown) => error instanceof Error ? error.message : 'Det gick inte att spara. Försök igen.';
const dateTimeValue = (value: string | null) => {
  if (!value) return '';
  const date = new Date(value);
  return `${localDate(date)}T${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;
};

export default function FieldJournalPage() {
  const [journal, setJournal] = useState<FieldJournal>(emptyJournal);
  const [loaded, setLoaded] = useState(false);
  const [loadError, setLoadError] = useState(false);
  const [editor, setEditorState] = useState<FieldEntry | null>(null);
  const editorRef = useRef<FieldEntry | null>(null);
  const setEditor = (value: FieldEntry | null) => { editorRef.current = value; setEditorState(value); };
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState('all');
  const [busy, setBusy] = useState(false);
  const [online, setOnline] = useState(navigator.onLine);
  const [notice, setNotice] = useState('');
  const [clearOpen, setClearOpen] = useState(false);
  const [clearText, setClearText] = useState('');
  const importRef = useRef<HTMLInputElement>(null);
  const busyRef = useRef(false);
  const operationRef = useRef<Promise<void> | null>(null);
  const draftTimer = useRef<ReturnType<typeof setTimeout>>();
  const location = useLocation();
  const load = () => fieldJournal.read().then(j => { setJournal(j); setLoaded(true); setLoadError(false); return j; }).catch(() => { setLoadError(true); return null; });
  useEffect(() => {
    void load();
    const recovered = () => void load().then(j => { if (j?.draft) setEditor(j.draft); });
    const network = () => setOnline(navigator.onLine);
    window.addEventListener('field-journal-recovered', recovered);
    window.addEventListener('online', network); window.addEventListener('offline', network);
    return () => { window.removeEventListener('field-journal-recovered', recovered); window.removeEventListener('online', network); window.removeEventListener('offline', network); };
  }, []);
  useEffect(() => {
    const id = (location.state as { fieldEntryId?: string } | null)?.fieldEntryId;
    if (id && loaded) setEditor(editorRef.current || journal.draft || journal.entries.find(e => e.id === id && !e.deleted) || null);
    // Open a notification once after loading, without reopening after a save.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.key, loaded]);
  useEffect(() => {
    if (!editor || busy) return;
    draftTimer.current = setTimeout(() => {
      void fieldJournal.update(j => {
        const current = editorRef.current;
        return current && !busyRef.current ? { ...j, draft: { ...current, title: current.title.trim() || 'Min anteckning', date: current.date || localDate() } } : j;
      }).then(setJournal).catch(() => setNotice('Utkastet kunde inte sparas. Behåll sidan öppen och försök spara igen.'));
    }, 400);
    return () => clearTimeout(draftTimer.current);
  }, [editor, busy]);
  useEffect(() => {
    const flush = async (close = false) => {
      clearTimeout(draftTimer.current);
      await operationRef.current;
      if (!editorRef.current) return false;
      const saved = await fieldJournal.update(j => {
        const draft = editorRef.current;
        return draft ? { ...j, draft: { ...draft, title: draft.title.trim() || 'Min anteckning', date: draft.date || localDate() } } : j;
      });
      setJournal(saved);
      if (close) setEditor(null);
      return true;
    };
    const unregister = registerFieldDraftFlusher(flush);
    const hidden = () => { if (document.visibilityState === 'hidden') void flush().catch(() => undefined); };
    document.addEventListener('visibilitychange', hidden);
    return () => { unregister(); document.removeEventListener('visibilitychange', hidden); void flush().catch(() => undefined); };
  }, []);
  const edit = (patch: Partial<FieldEntry>) => { if (editorRef.current) setEditor({ ...editorRef.current, ...patch }); };
  const run = async (action: () => Promise<void>) => {
    if (busyRef.current) return;
    busyRef.current = true;
    clearTimeout(draftTimer.current); setBusy(true); setNotice('');
    const operation = action();
    operationRef.current = operation;
    try { await operation; } catch (error) { toast.error(describeError(error)); } finally { operationRef.current = null; busyRef.current = false; setBusy(false); }
  };
  const save = () => run(async () => {
    if (!editor) return;
    const result = fieldEntrySchema.safeParse({ ...editor, updatedAt: new Date().toISOString() });
    if (!result.success) throw new Error(result.error.issues[0].message);
    if (editor.date > localDate()) throw new Error('Anteckningens datum kan inte ligga i framtiden. Använd påminnelsen för nästa steg.');
    const previous = journal.entries.find(e => e.id === editor.id);
    if (editor.reminderAt && editor.reminderAt !== previous?.reminderAt && Date.parse(editor.reminderAt) <= Date.now()) throw new Error('Påminnelsen behöver ligga i framtiden.');
    const saved = await fieldJournal.update(j => ({ ...j, entries: [result.data, ...j.entries.filter(e => e.id !== editor.id)], draft: null }));
    setJournal(saved); setEditor(null);
    toast.success('Sparat i din fältdagbok');
    try {
      const enabled = await syncFieldNotifications(saved, !!result.data.reminderAt && !result.data.done);
      if (result.data.reminderAt && !result.data.done && !enabled) setNotice(isNativeApp() ? 'Anteckningen är sparad. Tillåt notiser i telefonens inställningar för att få påminnelsen.' : 'Anteckningen är sparad. Telefonpåminnelser fungerar i mobilappen.');
    } catch { setNotice('Anteckningen är sparad, men telefonpåminnelsen kunde inte aktiveras. Öppna anteckningen och spara igen.'); }
  });
  const photo = (source: 'camera' | 'gallery') => run(async () => {
    if (!editor || editor.photos.length >= 5) return;
    await fieldJournal.update(j => ({ ...j, draft: { ...editor, title: editor.title.trim() || 'Min anteckning', date: editor.date || localDate() } }));
    const path = await captureFieldPhoto(source);
    if (path) {
      const next = { ...editor, photos: [...editor.photos, path], title: editor.title.trim() || 'Min anteckning', date: editor.date || localDate() };
      const saved = await fieldJournal.update(j => ({ ...j, draft: next }));
      setJournal(saved); setEditor(next);
    }
  });
  const changeEntry = (entry: FieldEntry, patch: Partial<FieldEntry>) => run(async () => {
    const saved = await fieldJournal.update(j => ({ ...j, entries: j.entries.map(e => e.id === entry.id ? { ...e, ...patch, updatedAt: new Date().toISOString() } : e) }));
    setJournal(saved);
    try { await syncFieldNotifications(saved); } catch { setNotice('Ändringen är sparad. Telefonens påminnelser kunde inte uppdateras.'); }
  });
  const closeEditor = () => run(async () => {
    if (editor) setJournal(await fieldJournal.update(j => ({ ...j, draft: { ...editor, title: editor.title.trim() || 'Min anteckning', date: editor.date || localDate() } })));
    setEditor(null);
  });
  const entries = journal.entries.filter(e => (filter === 'trash' ? e.deleted : !e.deleted) &&
    (filter !== 'reminders' || (e.reminderAt && !e.done)) &&
    (['all', 'reminders', 'trash'].includes(filter) || e.kind === filter) &&
    `${e.title} ${e.note} ${e.place}`.toLocaleLowerCase('sv').includes(query.toLocaleLowerCase('sv')))
    .sort((a, b) => b.date.localeCompare(a.date) || b.updatedAt.localeCompare(a.updatedAt));
  const active = journal.entries.filter(e => !e.deleted);
  const upcoming = active.filter(e => e.reminderAt && !e.done);

  return <main id="main-content" className="field-journal min-h-screen bg-background pb-12">
    <header className="px-5 py-4 flex items-center justify-between border-b border-border/50 bg-card">
      <Link to="/faltdagbok" className="flex items-center gap-2 font-serif text-lg"><Sprout className="h-6 w-6 text-primary" /> Odlingsdagboken</Link>
      <Link to="/app/odlingar" className="text-sm font-medium text-primary flex items-center gap-1">Mitt konto <ChevronRight className="h-4 w-4" /></Link>
    </header>
    <div className="max-w-4xl mx-auto px-5 pt-6 space-y-6">
      <div className="relative overflow-hidden rounded-[1.75rem] min-h-52 bg-[#234b36] text-white p-6 sm:p-8">
        <img src={hero} alt="" className="absolute inset-0 w-full h-full object-cover opacity-35" />
        <div className="absolute inset-0 bg-gradient-to-r from-[#183d2b]/95 to-[#183d2b]/25" />
        <div className="relative max-w-md space-y-3"><p className="text-xs uppercase tracking-[0.18em] text-white/75">Nära det som växer</p><h1 className="font-serif text-4xl text-white">Din fältdagbok.</h1><p className="text-sm text-white/85 leading-relaxed">Ett nytt blad, den första tomaten, en lärdom till nästa år. Fånga det här, precis när det händer.</p><Button className="bg-white text-[#234b36] hover:bg-white/90 rounded-full gap-2 mt-2" onClick={() => setEditor(journal.draft || newFieldEntry(journal.entries))} disabled={!loaded || loadError || busy}><Plus className="h-4 w-4" />{journal.draft ? 'Fortsätt ditt utkast' : 'Ny anteckning'}</Button></div>
      </div>
      <div className="flex items-center gap-2 text-xs text-muted-foreground"><WifiOff className="h-4 w-4 text-primary" /><p>Sparas i den här {isNativeApp() ? 'telefonen' : 'webbläsaren'}. Fungerar offline. {online ? '' : 'Du är offline just nu.'}</p></div>
      <div className="grid grid-cols-3 gap-3">{[{ value: active.length, label: 'Ögonblick', icon: BookOpen }, { value: new Set(active.map(e => e.place).filter(Boolean)).size, label: 'Odlingsplatser', icon: Leaf }, { value: upcoming.length, label: 'Att följa upp', icon: Bell }].map(stat => <div key={stat.label} className="bg-card border border-border/70 rounded-2xl p-4"><stat.icon className="h-4 w-4 text-primary mb-2" /><p className="font-serif text-2xl">{stat.value}</p><p className="text-xs text-muted-foreground mt-1">{stat.label}</p></div>)}</div>
      {notice && <p role="status" className="p-4 rounded-xl bg-amber-50 text-amber-950 text-sm border border-amber-200">{notice}</p>}
      {loadError ? <div role="alert" className="p-5 border border-destructive/40 rounded-xl"><p>Dagboken kunde inte läsas. Inget har skrivits över.</p><Button variant="outline" onClick={() => void load()} className="mt-3">Försök igen</Button></div> : <>
        <div className="flex items-center justify-between"><h2 className="font-serif text-2xl">Små steg, stor odling</h2><Button variant="ghost" size="icon" aria-label="Exportera dagboken med bilder" disabled={!loaded || busy || !journal.entries.length && !journal.draft} onClick={() => run(() => exportFieldJournal(journal))}><Download className="h-5 w-5" /></Button></div>
        <div className="relative"><Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" /><Input aria-label="Sök i fältdagboken" placeholder="Sök växt, plats eller lärdom…" value={query} onChange={e => setQuery(e.target.value)} className="pl-10 bg-card" /></div>
        <div className="flex gap-2 overflow-x-auto pb-2" aria-label="Filtrera dagboken">{Object.entries({ all: 'Allt', reminders: 'Påminnelser', ...kinds, trash: 'Papperskorg' }).map(([value, label]) => <button key={value} onClick={() => setFilter(value)} aria-pressed={filter === value} className={`rounded-full px-4 min-h-11 whitespace-nowrap text-xs font-medium border ${filter === value ? 'bg-primary text-primary-foreground border-primary' : 'bg-card border-border'}`}>{label}</button>)}</div>
        {!loaded ? <p role="status">Läser din dagbok…</p> : entries.length === 0 ? <div className="text-center py-10 px-5 rounded-3xl bg-primary/5 border border-primary/10"><Sprout className="h-9 w-9 text-primary mx-auto mb-3" /><h3 className="font-serif text-xl">{query || filter !== 'all' ? 'Inga anteckningar här ännu' : 'Varje odling börjar med något litet'}</h3><p className="text-sm text-muted-foreground mt-2">{query || filter !== 'all' ? 'Prova ett annat filter eller sökord.' : 'Skriv vad du odlar, välj en plats och lägg till ditt första foto.'}</p></div> : <div className="grid gap-4 sm:grid-cols-2">{entries.map(entry => <article key={entry.id} className="overflow-hidden rounded-2xl border border-border/70 bg-card">
          <button className="w-full text-left" onClick={() => { if (journal.draft && journal.draft.id !== entry.id) toast.info('Du har ett öppet utkast. Spara det först så att inget går förlorat.'); setEditor(journal.draft || entry); }} disabled={entry.deleted || busy} aria-label={`Öppna ${entry.title}`}>
            {entry.photos[0] && <Photo path={entry.photos[0]} className="w-full h-44 object-cover bg-muted" />}
            <div className="p-5 space-y-2"><div className="flex justify-between text-xs text-muted-foreground gap-2"><span>{kinds[entry.kind]}</span><time dateTime={entry.date}>{new Date(`${entry.date}T12:00:00`).toLocaleDateString('sv-SE', { day: 'numeric', month: 'long' })}</time></div><h3 className="font-serif text-xl">{entry.title}</h3>{entry.place && <p className="text-xs text-primary flex gap-1 items-center"><Leaf className="h-3 w-3" />{entry.place}</p>}{entry.note && <p className="text-sm leading-relaxed text-muted-foreground whitespace-pre-wrap line-clamp-3">{entry.note}</p>}{entry.reminderAt && <p className="text-xs flex gap-1 items-center text-primary"><Bell className="h-3 w-3" />{entry.done ? 'Uppföljningen är klar' : new Date(entry.reminderAt).toLocaleString('sv-SE', { dateStyle: 'short', timeStyle: 'short' })}</p>}</div>
          </button>
          <div className="flex px-4 pb-3 justify-between">{entry.deleted ? <Button variant="ghost" size="sm" disabled={busy} onClick={() => changeEntry(entry, { deleted: false })}>Återställ</Button> : <>{entry.reminderAt ? <Button size="sm" variant="ghost" disabled={busy} onClick={() => changeEntry(entry, { done: !entry.done })}><Check className="h-4 w-4 mr-1" />{entry.done ? 'Öppna igen' : 'Markera klar'}</Button> : <span />}<Button variant="ghost" size="icon" disabled={busy} aria-label={`Flytta ${entry.title} till papperskorgen`} onClick={() => changeEntry(entry, { deleted: true })}><Trash2 className="h-4 w-4" /></Button></>}</div>
        </article>)}</div>}
      </>}
      <div className="rounded-2xl p-5 bg-primary/5 border border-primary/10"><p className="font-medium text-sm">Hela din odling, samlad</p><p className="text-sm text-muted-foreground mt-1">På ditt konto finns odlingar, sådder, skördar, växtbibliotek och Gro. Fältdagboken är separat och stannar på den här enheten. Exportera en kopia innan du byter telefon eller avinstallerar.</p><Link to="/app/odlingar" className="text-sm text-primary font-medium inline-flex items-center gap-1 mt-3 min-h-11">Öppna mina odlingar <ChevronRight className="h-4 w-4" /></Link></div>
      <div className="flex flex-wrap gap-2"><input ref={importRef} type="file" accept="application/json,.json" className="hidden" aria-label="Återställ säkerhetskopia" onChange={e => { const file = e.target.files?.[0]; e.target.value = ''; if (file) void run(async () => { const saved = await importFieldJournal(file); setJournal(saved); toast.success('Säkerhetskopian har lästs in. Befintliga anteckningar har bevarats.'); try { await syncFieldNotifications(saved); } catch { setNotice('Kopian är sparad. Påminnelserna kunde inte aktiveras.'); } }); }} /><Button variant="outline" size="sm" disabled={busy || !loaded || loadError} onClick={() => importRef.current?.click()}>Läs in säkerhetskopia</Button><Button variant="ghost" size="sm" disabled={busy || !loaded || loadError} onClick={() => { setClearText(''); setClearOpen(true); }}>Radera lokal dagbok</Button></div>
      <footer className="flex gap-5 text-xs text-muted-foreground"><Link to="/terms">Integritet & villkor</Link><Link to="/radera-konto">Radera konto</Link><a href="mailto:info@auroramedia.se">Hjälp</a></footer>
    </div>
    <Dialog open={clearOpen} onOpenChange={value => { if (!busy) setClearOpen(value); }}><DialogContent><DialogHeader><DialogTitle>Radera den lokala dagboken?</DialogTitle></DialogHeader><p className="text-sm">Alla lokala anteckningar, foton, utkast och telefonpåminnelser tas bort permanent. Kontots odlingsdata påverkas inte. Exportera först om du vill behålla en kopia.</p><Label htmlFor="clear-field-journal">Skriv RADERA för att bekräfta</Label><Input id="clear-field-journal" value={clearText} onChange={e => setClearText(e.target.value)} disabled={busy} /><Button variant="destructive" disabled={busy || clearText !== 'RADERA'} onClick={() => void run(async () => { await clearFieldJournal(); setJournal(emptyJournal()); setEditor(null); setClearOpen(false); toast.success('Den lokala dagboken har raderats.'); })}>Radera lokal dagbok</Button></DialogContent></Dialog>
    <Dialog open={!!editor} onOpenChange={open => { if (!open && !busy) void closeEditor(); }}><DialogContent className="flex max-w-lg max-h-[90dvh] flex-col overflow-hidden"><DialogHeader className="shrink-0"><DialogTitle className="font-serif text-2xl">Ett ögonblick i odlingen</DialogTitle></DialogHeader>{editor && <form onSubmit={e => { e.preventDefault(); void save(); }} className="flex min-h-0 flex-col gap-4">
      <div className="min-h-0 overflow-y-auto overscroll-contain px-1 -mx-1">
      <fieldset disabled={busy} className="min-w-0 space-y-4">
        <div className="space-y-1.5"><Label htmlFor="field-title">Vad vill du minnas?</Label><Input id="field-title" required maxLength={100} value={editor.title} onChange={e => edit({ title: e.target.value })} /></div>
        <div className="grid grid-cols-2 gap-3"><div className="space-y-1.5"><Label htmlFor="field-date">Datum</Label><Input id="field-date" type="date" required max={localDate()} value={editor.date} onChange={e => edit({ date: e.target.value })} /></div><div className="space-y-1.5"><Label htmlFor="field-kind">Händelse</Label><select id="field-kind" className="w-full h-10 rounded-md border border-input bg-background px-2 text-sm" value={editor.kind} onChange={e => edit({ kind: e.target.value as FieldEntry['kind'] })}>{Object.entries(kinds).map(([key, label]) => <option key={key} value={key}>{label}</option>)}</select></div></div>
        <div className="space-y-1.5"><Label htmlFor="field-place">Växt eller odlingsplats</Label><Input id="field-place" maxLength={100} placeholder="Till exempel tomaterna i växthuset" value={editor.place} onChange={e => edit({ place: e.target.value })} list="field-places" /><datalist id="field-places">{[...new Set(active.map(e => e.place).filter(Boolean))].map(place => <option key={place} value={place} />)}</datalist></div>
        <div className="space-y-1.5"><Label htmlFor="field-note">Dina anteckningar</Label><Textarea id="field-note" maxLength={5000} rows={5} placeholder="Vad har hänt? Vad fungerade? Vad vill du prova nästa gång?" value={editor.note} onChange={e => edit({ note: e.target.value })} /></div>
        <div className="flex gap-2"><Button type="button" variant="outline" className="gap-2 flex-1" disabled={editor.photos.length >= 5} onClick={() => void photo('camera')}><Camera className="h-4 w-4" />Ta foto</Button><Button type="button" variant="outline" className="gap-2 flex-1" disabled={editor.photos.length >= 5} onClick={() => void photo('gallery')}><ImagePlus className="h-4 w-4" />Välj bild</Button></div>
        {editor.photos.length > 0 && <div className="grid grid-cols-3 gap-2">{editor.photos.map(path => <div className="relative" key={path}><Photo path={path} className="aspect-square w-full object-cover rounded-xl" /><button type="button" className="absolute top-1 right-1 bg-card rounded-full p-2" aria-label="Ta bort bild från anteckningen" onClick={() => edit({ photos: editor.photos.filter(p => p !== path) })}><Trash2 className="h-4 w-4" /></button></div>)}</div>}
        <div className="rounded-xl bg-primary/5 p-4 space-y-2"><Label htmlFor="field-reminder" className="flex items-center gap-2"><Bell className="h-4 w-4" />Påminn mig att följa upp</Label><Input id="field-reminder" type="datetime-local" value={dateTimeValue(editor.reminderAt)} onChange={e => edit({ reminderAt: e.target.value ? (Number.isNaN(new Date(e.target.value).getTime()) ? null : new Date(e.target.value).toISOString()) : null, done: false })} /><p className="text-xs text-muted-foreground">Valfritt. Telefonen kan visa påminnelsen ungefär vid vald tid, även utan internet. Rubriken kan synas på låsskärmen.</p>{editor.reminderAt && <Button type="button" size="sm" variant="ghost" onClick={() => edit({ reminderAt: null })}>Ta bort påminnelsen</Button>}</div>
      </fieldset>
      </div>
      <div className="shrink-0 space-y-3 border-t border-border/60 pt-3">
      <p className="text-xs text-muted-foreground">Bilder och anteckningar sparas på enheten. De skickas inte till AI eller till ditt konto.</p>
      <Button type="submit" className="w-full h-12 rounded-xl" disabled={busy}>{busy ? 'Sparar…' : 'Spara i dagboken'}</Button>
      </div>
    </form>}</DialogContent></Dialog>
  </main>;
}
