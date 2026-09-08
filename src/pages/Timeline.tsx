import { useEffect, useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { ArrowRight, BookOpen, Camera, Carrot, Check, ChevronDown, Flower2, Leaf, Loader2, MapPin, NotebookPen, Pencil, Plus, Search, Shovel, Sprout, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Skeleton } from '@/components/ui/skeleton';
import ConfirmDeleteButton from '@/components/ConfirmDeleteButton';
import { useAuth } from '@/hooks/useAuth';
import { toast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { localDateKey } from '@/lib/gardenToday';
import { DIARY_LABELS, filterDiary, validateDiaryNote, type DiaryEvent, type DiaryFilters, type DiaryKind } from '@/lib/diary';
import { deleteDiaryNote, getDiary, getDiaryPhotoUrl, saveDiaryNote } from '@/lib/diaryApi';
import gardenImage from '@/assets/hero-harvest-hands.jpg';

const MONTHS = ['Januari', 'Februari', 'Mars', 'April', 'Maj', 'Juni', 'Juli', 'Augusti', 'September', 'Oktober', 'November', 'December'];
const ICONS = { sowing: Sprout, transplant: Shovel, harvest: Carrot, photo: Camera, note: NotebookPen, care: Flower2, pest: Leaf, season: BookOpen };
const TONES: Record<DiaryKind, string> = {
  sowing: 'bg-primary/10 text-primary', transplant: 'bg-primary/10 text-primary',
  harvest: 'bg-accent/10 text-accent', photo: 'bg-sky-500/10 text-sky-700 dark:text-sky-300',
  note: 'bg-amber-500/10 text-amber-800 dark:text-amber-300', care: 'bg-primary/10 text-primary',
  pest: 'bg-accent/10 text-accent', season: 'bg-amber-500/10 text-amber-800 dark:text-amber-300',
};
const EMPTY: DiaryEvent[] = [];
const INITIAL_FILTERS: DiaryFilters = { query: '', year: 'all', month: 'all', kind: 'all', place: 'all' };

function DiaryPhoto({ event, onOpen }: { event: DiaryEvent; onOpen?: () => void }) {
  const { data: url, isError, refetch, isFetching } = useQuery({
    queryKey: ['diary-photo-url', event.imagePath], queryFn: () => getDiaryPhotoUrl(event.imagePath!),
    enabled: !!event.imagePath, staleTime: 45 * 60_000, retry: 1,
  });
  const [imageError, setImageError] = useState(false);
  useEffect(() => setImageError(false), [url]);
  const content = url && !imageError
    ? <img src={url} alt={event.title} loading="lazy" onError={() => setImageError(true)} className={cn('w-full', onOpen ? 'h-56 sm:h-72 object-cover transition-transform duration-500 group-hover:scale-[1.02]' : 'max-h-[70vh] object-contain')} />
    : <div className="flex h-48 items-center justify-center gap-2 bg-muted text-sm text-muted-foreground"><Camera className="h-5 w-5" />{isError || imageError ? 'Bilden kunde inte visas' : 'Hämtar bild…'}</div>;
  if (isError || imageError) return <div className="flex h-48 flex-col items-center justify-center gap-3 bg-muted text-sm text-muted-foreground"><Camera className="h-5 w-5" /><p>Bilden kunde inte visas</p><Button variant="outline" size="sm" disabled={isFetching} onClick={() => { setImageError(false); void refetch(); }}>Försök igen</Button></div>;
  return onOpen ? <button type="button" onClick={onOpen} className="group block w-full overflow-hidden text-left focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary" aria-label={`Visa foto: ${event.title}`}>{content}</button> : content;
}

function DiaryCard({ event, onEdit, onPhoto }: { event: DiaryEvent; onEdit: (event: DiaryEvent) => void; onPhoto: (event: DiaryEvent) => void }) {
  const Icon = ICONS[event.kind];
  const [expanded, setExpanded] = useState(false);
  const long = event.body.length > 260;
  return (
    <article className={cn('diary-entry overflow-hidden rounded-2xl border bg-card', event.kind === 'note' ? 'border-amber-600/20' : 'border-border/70')}>
      {event.imagePath && <DiaryPhoto event={event} onOpen={() => onPhoto(event)} />}
      <div className="p-4 sm:p-5">
        <div className="mb-3 flex flex-wrap items-center gap-2 text-sm">
          <span className={cn('inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 font-medium', TONES[event.kind])}><Icon className="h-3.5 w-3.5" aria-hidden />{DIARY_LABELS[event.kind]}</span>
          {event.place && <span className="inline-flex min-w-0 items-center gap-1 text-muted-foreground"><MapPin className="h-3.5 w-3.5 shrink-0" aria-hidden />{event.place}</span>}
          {event.kind === 'note' && <Button variant="ghost" size="sm" className="ml-auto gap-1.5" onClick={() => onEdit(event)} aria-label="Redigera anteckning"><Pencil className="h-3.5 w-3.5" />Redigera</Button>}
        </div>
        {event.kind !== 'note' && <h3 className="text-xl sm:text-2xl leading-snug break-words">{event.title}</h3>}
        {event.body && <p className={cn('whitespace-pre-wrap break-words text-base leading-relaxed', event.kind === 'note' ? 'text-foreground' : 'mt-2 text-muted-foreground', long && !expanded && 'line-clamp-4')}>{event.body}</p>}
        {long && <Button variant="link" className="h-auto px-0 pt-2 text-sm" onClick={() => setExpanded(value => !value)} aria-expanded={expanded}>{expanded ? 'Visa mindre' : 'Läs hela anteckningen'}<ChevronDown className={cn('ml-1 h-4 w-4', expanded && 'rotate-180')} /></Button>}
        {event.weightGrams != null && <p className="mt-3 flex items-baseline gap-1.5 text-accent"><span className="font-serif text-3xl">{(event.weightGrams / 1000).toLocaleString('sv-SE', { maximumFractionDigits: 3 })}</span><span className="text-sm">kg skördat</span></p>}
        {event.kind !== 'note' && <div className="mt-4 flex flex-wrap items-center justify-between gap-2 border-t border-border/60 pt-3 text-sm"><span className="text-muted-foreground">{event.subject}</span><Link to={event.href} className="inline-flex items-center gap-1.5 font-medium text-primary hover:underline">{event.kind === 'photo' ? 'Till fotodagboken' : 'Öppna loggen'}<ArrowRight className="h-3.5 w-3.5" /></Link></div>}
      </div>
    </article>
  );
}

export default function Timeline() {
  const { user } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const diary = useQuery({ queryKey: ['garden-diary', user?.id], queryFn: getDiary, enabled: !!user?.id, staleTime: 0 });
  const events = diary.data || EMPTY;
  const [filters, setFilters] = useState<DiaryFilters>(INITIAL_FILTERS);
  useEffect(() => {
    if (!location.state?.subjectId) return;
    setFilters({ ...INITIAL_FILTERS, subjectId: location.state.subjectId });
    navigate(location.pathname, { replace: true, state: null });
  }, [location.state, location.pathname, navigate]);
  const [limit, setLimit] = useState(30);
  const [editor, setEditor] = useState<{ id?: string; note: string; date: string } | null>(null);
  const [selectedPhoto, setSelectedPhoto] = useState<DiaryEvent | null>(null);
  const [formError, setFormError] = useState('');
  const [discardConfirm, setDiscardConfirm] = useState(false);
  const [originalDraft, setOriginalDraft] = useState({ note: '', date: '' });
  const updateFilter = (patch: Partial<DiaryFilters>) => { setFilters(value => ({ ...value, ...patch })); setLimit(30); };
  const clearFilters = () => { setFilters(INITIAL_FILTERS); setLimit(30); };
  const openEditor = (event?: DiaryEvent) => {
    const draft = { id: event?.sourceId, note: event?.body || '', date: event?.date || localDateKey() };
    setEditor(draft); setOriginalDraft(draft); setFormError(''); setDiscardConfirm(false);
  };
  const save = useMutation({
    mutationFn: saveDiaryNote,
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['garden-diary'] });
      setEditor(null); clearFilters(); toast({ title: 'Sparat i din dagbok', description: 'Du kan alltid komma tillbaka och redigera anteckningen.' });
    },
    onError: () => setFormError('Anteckningen kunde inte sparas. Din text finns kvar – försök igen.'),
  });
  const remove = useMutation({
    mutationFn: deleteDiaryNote,
    onSuccess: () => { void queryClient.invalidateQueries({ queryKey: ['garden-diary'] }); setEditor(null); toast({ title: 'Anteckningen är borttagen' }); },
    onError: () => setFormError('Anteckningen kunde inte tas bort. Försök igen.'),
  });
  const closeEditor = () => {
    if (save.isPending || remove.isPending) return;
    if (editor && (editor.note !== originalDraft.note || editor.date !== originalDraft.date)) { setDiscardConfirm(true); return; }
    setEditor(null);
  };
  const years = useMemo(() => [...new Set(events.map(event => event.date.slice(0, 4)))].sort().reverse(), [events]);
  const places = useMemo(() => [...new Map(events.filter(event => event.placeId).map(event => [event.placeId, event.place || 'Namnlös plats'])).entries()].sort((a, b) => a[1].localeCompare(b[1], 'sv')), [events]);
  const filtered = useMemo(() => filterDiary(events, filters), [events, filters]);
  const periodEvents = useMemo(() => events.filter(event => filters.year === 'all' || event.date.startsWith(filters.year)), [events, filters.year]);
  const grouped = useMemo(() => {
    const groups = new Map<string, DiaryEvent[]>();
    for (const event of filtered.slice(0, limit)) { const list = groups.get(event.date) || []; list.push(event); groups.set(event.date, list); }
    return [...groups.entries()];
  }, [filtered, limit]);
  const photos = periodEvents.filter(event => event.kind === 'photo').length;
  const harvest = periodEvents.reduce((sum, event) => sum + (event.weightGrams || 0), 0) / 1000;
  const activeFilters = filters.subjectId || filters.query || filters.year !== 'all' || filters.month !== 'all' || filters.kind !== 'all' || filters.place !== 'all';

  return (
    <div className="diary-page mx-auto max-w-6xl space-y-6">
      <section className="flex flex-wrap items-end justify-between gap-5">
        <div><p className="mb-2 flex items-center gap-2 text-sm font-medium text-primary"><BookOpen className="h-4 w-4" />DIN ODLING, GENOM ÅREN</p><h1 className="font-serif text-4xl sm:text-5xl">Min odlingsdagbok<span className="text-accent">.</span></h1><p className="mt-3 max-w-xl text-base leading-relaxed text-muted-foreground">Det första fröet. Dagens skörd. Allt du vill minnas.</p></div>
        <div className="flex flex-wrap gap-2"><Button variant="outline" asChild className="gap-2"><Link to="/app/photos" state={{ openUpload: true }}><Camera className="h-4 w-4" />Lägg till foto</Link></Button><Button onClick={() => openEditor()} className="gap-2"><Plus className="h-4 w-4" />Skriv i dagboken</Button></div>
      </section>
      <section className="grid grid-cols-3 divide-x divide-border rounded-2xl border border-border/70 bg-card p-4 sm:p-5" aria-label="Din odling i siffror">
        {[{ label: 'sparade ögonblick', value: periodEvents.length, Icon: BookOpen }, { label: 'foton i dagboken', value: photos, Icon: Camera }, { label: 'kilo skördat', value: harvest.toLocaleString('sv-SE', { maximumFractionDigits: 2 }), Icon: Carrot }].map(({ label, value, Icon }) => <div key={label} className="px-2 first:pl-0 sm:px-6"><Icon className="mb-2 h-4 w-4 text-primary" /><p className="font-serif text-2xl sm:text-3xl tabular-nums">{diary.isLoading || diary.isError ? '–' : value}</p><p className="mt-1 text-sm leading-snug text-muted-foreground">{label}</p></div>)}
      </section>
      <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_260px]">
        <div className="min-w-0 space-y-5">
          <section className="space-y-3 rounded-2xl border border-border/70 bg-card p-4" aria-label="Sök och filtrera dagboken">
            {filters.subjectId && <p className="text-sm text-primary">Visar historiken för {events.find(event => (event.subjectId === filters.subjectId || event.subjectIds?.includes(filters.subjectId!)))?.subject || 'vald odling'}. <button className="font-semibold underline" onClick={clearFilters}>Visa hela dagboken</button></p>}
            <div className="relative"><Search className="pointer-events-none absolute left-3 top-3 h-4 w-4 text-muted-foreground" /><Input aria-label="Sök i dagboken" placeholder="Sök tomater, lärdomar, en särskild plats…" value={filters.query} onChange={event => updateFilter({ query: event.target.value })} className="pl-9 text-base" /></div>
            <div className="grid grid-cols-2 gap-2">
              <Select value={filters.year} onValueChange={year => updateFilter({ year, month: 'all' })}><SelectTrigger aria-label="Välj år"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="all">Alla år</SelectItem>{years.map(year => <SelectItem key={year} value={year}>{year}</SelectItem>)}</SelectContent></Select>
              <Select value={filters.place} onValueChange={place => updateFilter({ place })}><SelectTrigger aria-label="Välj odlingsplats eller växt"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="all">Alla platser & växter</SelectItem>{places.map(([id, name]) => <SelectItem key={id} value={id}>{name}</SelectItem>)}</SelectContent></Select>
            </div>
            <div className="flex flex-wrap gap-2"><button type="button" className={cn('diary-filter', filters.kind === 'all' && 'is-active')} aria-pressed={filters.kind === 'all'} onClick={() => updateFilter({ kind: 'all' })}>Allt</button>{(Object.keys(DIARY_LABELS) as DiaryKind[]).map(kind => <button type="button" key={kind} className={cn('diary-filter', filters.kind === kind && 'is-active')} aria-pressed={filters.kind === kind} onClick={() => updateFilter({ kind })}>{DIARY_LABELS[kind]}</button>)}</div>
            {activeFilters && <div className="flex flex-wrap items-center justify-between gap-2 border-t border-border pt-3 text-sm"><span className="text-muted-foreground" role="status">{filtered.length} ögonblick{filters.month !== 'all' ? ` i ${MONTHS[Number(filters.month) - 1].toLowerCase()}` : ''}</span><button type="button" onClick={clearFilters} className="inline-flex items-center gap-1 text-primary hover:underline"><X className="h-3.5 w-3.5" />Rensa filter</button></div>}
          </section>
          {diary.isLoading ? <div aria-label="Laddar dagboken" aria-busy="true" className="space-y-4"><Skeleton className="h-32 rounded-2xl" /><Skeleton className="h-56 rounded-2xl" /><Skeleton className="h-32 rounded-2xl" /></div> : diary.isError ? <div role="alert" className="rounded-2xl border border-destructive/30 bg-card p-6"><h2 className="text-2xl">Dagboken kunde inte hämtas</h2><p className="mt-2 text-muted-foreground">Din historik finns kvar. Kontrollera anslutningen och försök igen.</p><Button className="mt-4" variant="outline" onClick={() => void diary.refetch()} disabled={diary.isFetching}>{diary.isFetching ? 'Hämtar…' : 'Försök igen'}</Button></div> : filtered.length === 0 ? <section className="rounded-2xl border border-dashed border-primary/30 bg-card px-6 py-12 text-center"><NotebookPen className="mx-auto mb-4 h-9 w-9 text-primary" /><h2 className="text-3xl">{events.length ? 'Inga ögonblick matchar' : 'Här börjar din odlingshistoria'}</h2><p className="mx-auto mt-3 max-w-md text-base leading-relaxed text-muted-foreground">{events.length ? 'Prova en annan sökning eller visa hela dagboken igen.' : 'Skriv några rader om din odling. När du sår, skördar och sparar foton växer dagboken vidare av sig själv.'}</p><Button className="mt-6 gap-2" onClick={() => events.length ? clearFilters() : openEditor()}>{events.length ? 'Visa hela dagboken' : 'Skriv din första anteckning'}<ArrowRight className="h-4 w-4" /></Button></section> : <div className="space-y-7">
            {grouped.map(([date, items], index) => {
              const newMonth = index === 0 || grouped[index - 1][0].slice(0, 7) !== date.slice(0, 7);
              const day = new Date(`${date}T12:00:00`);
              return <div key={date}>{newMonth && <h2 className="mb-5 flex items-center gap-4 font-serif text-2xl">{MONTHS[day.getMonth()]} <span className="text-muted-foreground">{day.getFullYear()}</span><span className="h-px flex-1 bg-border" /></h2>}<div className="grid grid-cols-[38px_minmax(0,1fr)] gap-3 sm:grid-cols-[48px_minmax(0,1fr)] sm:gap-4"><time dateTime={date} className="pt-2 text-center"><span className="block font-serif text-2xl">{day.getDate()}</span><span className="block text-xs uppercase text-muted-foreground">{day.toLocaleDateString('sv-SE', { weekday: 'short' })}</span></time><div className="space-y-3">{items.map(event => <DiaryCard key={event.id} event={event} onEdit={openEditor} onPhoto={setSelectedPhoto} />)}</div></div></div>;
            })}
            {filtered.length > limit ? <Button variant="outline" className="w-full" onClick={() => setLimit(value => value + 30)}>Visa fler ögonblick ({filtered.length - limit} kvar)<ChevronDown className="ml-2 h-4 w-4" /></Button> : <p className="py-4 text-center text-sm text-muted-foreground">{activeFilters ? 'Alla matchande ögonblick visas.' : 'Varje säsong börjar med ett litet frö.'}</p>}
          </div>}
        </div>
        <aside className="space-y-5 lg:sticky lg:top-24">
          <section className="overflow-hidden rounded-2xl bg-[#173e2b] text-white"><img src={gardenImage} alt="Nyskördade tomater, morötter och zucchini från köksträdgården" width="1024" height="1024" className="h-36 w-full object-cover object-center" /><div className="p-5"><p className="text-xs uppercase tracking-[0.16em] text-emerald-200">En stund i odlingen</p><h2 className="mt-2 text-2xl !text-white">Vad vill du minnas från idag?</h2><p className="mt-3 text-sm leading-relaxed text-white/80">Något som växer. Något som överraskade. En idé att prova nästa år.</p><button onClick={() => openEditor()} className="mt-5 inline-flex items-center gap-2 text-sm font-semibold text-emerald-200 hover:text-white">Skriv några rader<ArrowRight className="h-4 w-4" /></button></div></section>
          <section className="rounded-2xl border border-border/70 bg-card p-5"><h2 className="text-xl">Säsongens spår</h2><p className="mt-1 mb-4 text-sm text-muted-foreground">{filters.year === 'all' ? 'Alla år tillsammans' : filters.year} · välj en månad</p><div className="grid grid-cols-4 gap-2">{MONTHS.map((name, index) => { const key = String(index + 1).padStart(2, '0'); const count = periodEvents.filter(event => event.date.slice(5, 7) === key).length; return <button key={name} type="button" disabled={!count} aria-pressed={filters.month === key} onClick={() => updateFilter({ month: filters.month === key ? 'all' : key })} aria-label={`${name}, ${count} ögonblick`} className={cn('rounded-xl border px-1 py-2 text-sm transition-colors disabled:opacity-45', filters.month === key ? 'border-primary bg-primary text-primary-foreground' : count ? 'border-primary/20 bg-primary/8 text-primary hover:bg-primary/15' : 'border-border text-muted-foreground')}><span className="block text-xs">{name.slice(0, 3)}</span><span className="mt-1 block font-semibold tabular-nums">{count}</span></button>; })}</div></section>
          <div className="px-1"><p className="text-sm font-medium">Fortsätt i odlingen</p><div className="mt-2 grid grid-cols-2 gap-2"><Button variant="outline" asChild><Link to="/app/sowings"><Sprout className="mr-2 h-4 w-4" />Sådd</Link></Button><Button variant="outline" asChild><Link to="/app/harvests"><Carrot className="mr-2 h-4 w-4" />Skörd</Link></Button></div></div>
        </aside>
      </div>
      <Dialog open={!!editor} onOpenChange={open => { if (!open) closeEditor(); }}><DialogContent className="max-h-[90dvh] overflow-y-auto sm:max-w-xl"><DialogHeader><DialogTitle className="font-serif text-2xl">{editor?.id ? 'Dina sparade rader' : 'En ny sida i dagboken'}</DialogTitle><DialogDescription>Små detaljer idag kan bli nästa säsongs bästa lärdom.</DialogDescription></DialogHeader>{editor && <form className="space-y-4" onSubmit={event => { event.preventDefault(); const message = validateDiaryNote(editor.note, editor.date); setFormError(message); if (!message) save.mutate(editor); }}><div><Label htmlFor="diary-date">Datum</Label><Input id="diary-date" type="date" required min="1900-01-01" max={localDateKey()} value={editor.date} onChange={event => setEditor({ ...editor, date: event.target.value })} disabled={save.isPending || remove.isPending} className="mt-1.5" /></div><div><Label htmlFor="diary-note">Vad hände i odlingen?</Label><Textarea id="diary-note" autoFocus required maxLength={5000} rows={7} placeholder="Idag upptäckte jag…" value={editor.note} onChange={event => setEditor({ ...editor, note: event.target.value })} disabled={save.isPending || remove.isPending} className="mt-1.5 resize-y text-base leading-relaxed" /><p className="mt-1 text-right text-xs text-muted-foreground">{editor.note.length.toLocaleString('sv-SE')} / 5 000</p></div>{formError && <p role="alert" className="text-sm text-destructive">{formError}</p>}{discardConfirm && <div role="alert" className="rounded-xl border border-amber-500/40 p-3"><p className="text-sm">Du har osparade ändringar. Vill du kasta dem?</p><div className="mt-2 flex gap-2"><Button type="button" size="sm" variant="outline" onClick={() => setDiscardConfirm(false)}>Fortsätt skriva</Button><Button type="button" size="sm" variant="destructive" onClick={() => { setEditor(null); setDiscardConfirm(false); }}>Kasta ändringar</Button></div></div>}<div className="flex items-center justify-between gap-3"><div>{editor.id && <ConfirmDeleteButton itemName="anteckningen" onConfirm={() => remove.mutate(editor.id!)} disabled={save.isPending || remove.isPending} />}</div><Button type="submit" disabled={save.isPending || remove.isPending} className="gap-2">{save.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}{save.isPending ? 'Sparar…' : 'Spara i dagboken'}</Button></div></form>}</DialogContent></Dialog>
      <Dialog open={!!selectedPhoto} onOpenChange={open => { if (!open) setSelectedPhoto(null); }}><DialogContent className="max-h-[95dvh] overflow-y-auto sm:max-w-3xl"><DialogHeader><DialogTitle>{selectedPhoto?.title}</DialogTitle><DialogDescription>{selectedPhoto?.date} {selectedPhoto?.place && `· ${selectedPhoto.place}`}</DialogDescription></DialogHeader>{selectedPhoto && <DiaryPhoto key={selectedPhoto.id} event={selectedPhoto} />}</DialogContent></Dialog>
    </div>
  );
}
