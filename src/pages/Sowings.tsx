import React, { useState, useEffect, useRef } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, Sprout, Search, Crown, Sparkles, CalendarDays } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { toast } from '@/hooks/use-toast';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { format } from 'date-fns';
import { useLocation, useNavigate } from 'react-router-dom';
import { StaggerContainer, StaggerItem, FadeIn } from '@/components/animations';
import { FreeLimitBadge } from '@/components/PremiumGate';
import { useAuth } from '@/hooks/useAuth';
import ConfirmDeleteButton from '@/components/ConfirmDeleteButton';
import AppEmptyState from '@/components/AppEmptyState';
import { recordProductActivity } from '@/lib/analytics';

const FREE_SOWING_LIMIT = 10;
const SEED_BRAND_SUGGESTIONS = ['Impecta', 'Nelson Garden', 'Runåbergs fröer', 'Lindbloms frö', 'Pelargonia', 'Blomsterlandet', 'Egna frön', 'Annat'];
const STATUS_LABELS: Record<string, string> = { sown: 'Sådd', indoor: 'Förodlad', transplanted: 'Utplanterad', harvesting: 'Skörd', done: 'Avslutad' };

const Sowings = () => {
  const { user } = useAuth();
  const isPremium = user?.subscription_status === 'premium';
  const queryClient = useQueryClient();
  const location = useLocation();
  const navigate = useNavigate();
  const prefill = (location.state as any)?.prefill;
  const [open, setOpen] = useState(!!prefill);
  const [variety, setVariety] = useState(prefill?.variety || '');
  const [bedId, setBedId] = useState('');
  const [sowDate, setSowDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [type, setType] = useState('direct');
  const [notes, setNotes] = useState('');
  const [seedBrand, setSeedBrand] = useState('');
  const [search, setSearch] = useState('');
  const [showBrandSuggestions, setShowBrandSuggestions] = useState(false);
  const brandRef = useRef<HTMLDivElement>(null);

  useEffect(() => { if (prefill) window.history.replaceState({}, document.title); }, [prefill]);
  useEffect(() => { const handler = (event: MouseEvent) => { if (brandRef.current && !brandRef.current.contains(event.target as Node)) setShowBrandSuggestions(false); }; document.addEventListener('mousedown', handler); return () => document.removeEventListener('mousedown', handler); }, []);

  const { data: sowingsRaw, isLoading } = useQuery({ queryKey: ['sowings'], queryFn: api.getSowings });
  const { data: beds } = useQuery({ queryKey: ['beds'], queryFn: api.getBeds });
  const sowings = sowingsRaw?.filter((sowing: any) => { const query = search.trim().toLowerCase(); return !query || sowing.variety?.toLowerCase().includes(query) || sowing.seed_brand?.toLowerCase().includes(query); });
  const filteredBrands = SEED_BRAND_SUGGESTIONS.filter((brand) => !seedBrand || brand.toLowerCase().includes(seedBrand.toLowerCase()));

  const createMutation = useMutation({
    mutationFn: () => {
      if (!isPremium && (sowingsRaw?.length ?? 0) >= FREE_SOWING_LIMIT) throw new Error('SOWING_LIMIT');
      return api.createSowing({ variety: variety.trim(), bed_id: bedId || undefined, sow_date: sowDate, type, notes: notes.trim() || undefined, seed_brand: seedBrand.trim() || undefined });
    },
    onSuccess: (sowing) => {
      const wasFirst = (sowingsRaw?.length ?? 0) === 0;
      queryClient.invalidateQueries({ queryKey: ['sowings'] });
      queryClient.invalidateQueries({ queryKey: ['summary-stats'] });
      setOpen(false); setVariety(''); setBedId(''); setNotes(''); setSeedBrand('');
      void recordProductActivity(wasFirst ? 'first_sowing_created' : 'sowing_created', { sowing_id: sowing.id, type });
      toast({ title: 'Sådd registrerad! 🌱' });
    },
    onError: (error: any) => {
      const limitReached = error?.message === 'SOWING_LIMIT' || String(error?.message || '').includes('FREE_SOWING_LIMIT');
      toast({ title: limitReached ? 'Du har nått gratisgränsen' : 'Kunde inte spara sådden', description: limitReached ? 'Gratisversionen innehåller tio sådder. Plus ger obegränsad sålogg.' : error?.message || 'Försök igen.', variant: 'destructive', action: limitReached ? <Button size="sm" variant="outline" onClick={() => navigate('/app/premium')}><Crown className="h-3 w-3 mr-1" /> Visa Plus</Button> : undefined });
      if (limitReached) setOpen(false);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: api.deleteSowing,
    onSuccess: (_, id) => { queryClient.invalidateQueries({ queryKey: ['sowings'] }); queryClient.invalidateQueries({ queryKey: ['summary-stats'] }); void recordProductActivity('sowing_deleted', { sowing_id: id }); toast({ title: 'Sådd borttagen' }); },
    onError: (error: any) => toast({ title: 'Kunde inte ta bort sådden', description: error?.message, variant: 'destructive' }),
  });

  const openCreate = () => {
    if (!isPremium && (sowingsRaw?.length || 0) >= FREE_SOWING_LIMIT) {
      toast({ title: 'Gratisgränsen är nådd', description: 'Plus ger obegränsad sålogg.', variant: 'destructive' });
      return;
    }
    setOpen(true);
  };

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <FadeIn>
        <section className="premium-panel relative overflow-hidden p-5 sm:p-6">
          <div className="absolute right-0 top-0 h-32 w-32 rounded-full bg-primary/8 blur-3xl" />
          <div className="relative flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div><span className="section-kicker mb-3"><Sparkles className="h-3.5 w-3.5" /> Din odlingshistorik</span><h1 className="page-title">Sålogg</h1><p className="mt-2 max-w-2xl text-sm text-muted-foreground">Spara sort, datum, plats och frömärke så att varje säsong blir lättare att förstå.</p></div>
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center"><FreeLimitBadge current={sowingsRaw?.length || 0} limit={FREE_SOWING_LIMIT} label="sådder" /><div className="relative"><Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" /><Input placeholder="Sök sort eller märke…" value={search} onChange={(event) => setSearch(event.target.value)} className="pl-10 w-full sm:w-60" /></div><Button className="gap-2" onClick={openCreate}><Plus className="h-4 w-4" /> Ny sådd</Button></div>
          </div>
        </section>
      </FadeIn>

      <Dialog open={open} onOpenChange={setOpen}><DialogContent><DialogHeader><DialogTitle>Lägg till sådd</DialogTitle></DialogHeader><div className="space-y-4"><Input placeholder="Sort, till exempel Tomat – Sungold" value={variety} onChange={(event) => setVariety(event.target.value)} /><div className="relative" ref={brandRef}><Input placeholder="Frömärke eller leverantör" value={seedBrand} onChange={(event) => { setSeedBrand(event.target.value); setShowBrandSuggestions(true); }} onFocus={() => setShowBrandSuggestions(true)} />{showBrandSuggestions && filteredBrands.length > 0 && <div className="absolute z-50 top-full left-0 right-0 mt-2 rounded-2xl border border-border/70 bg-popover/98 p-1.5 shadow-xl">{filteredBrands.map((brand) => <button key={brand} type="button" className="w-full rounded-xl px-3 py-2.5 text-left text-sm hover:bg-primary/8" onClick={() => { setSeedBrand(brand); setShowBrandSuggestions(false); }}>{brand}</button>)}</div>}</div><Select value={bedId} onValueChange={setBedId}><SelectTrigger><SelectValue placeholder="Välj bädd (valfritt)" /></SelectTrigger><SelectContent>{(beds || []).map((bed) => <SelectItem key={bed.id} value={bed.id}>{bed.name}</SelectItem>)}</SelectContent></Select><Input type="date" value={sowDate} onChange={(event) => setSowDate(event.target.value)} /><Select value={type} onValueChange={setType}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="direct">Direktsådd</SelectItem><SelectItem value="indoor">Förodling</SelectItem></SelectContent></Select><Textarea placeholder="Anteckningar (valfritt)" value={notes} onChange={(event) => setNotes(event.target.value)} /><Button onClick={() => createMutation.mutate()} disabled={!variety.trim() || createMutation.isPending} className="w-full">{createMutation.isPending ? 'Sparar…' : 'Spara sådd'}</Button></div></DialogContent></Dialog>

      {isLoading ? (
        <div className="space-y-3">{[1, 2, 3].map((item) => <Skeleton key={item} className="h-20 rounded-[1.35rem]" />)}</div>
      ) : !sowings?.length ? (
        <AppEmptyState icon={Sprout} title={search ? 'Ingen sådd matchar sökningen' : 'Logga din första sådd'} description={search ? 'Prova ett annat sortnamn eller frömärke.' : 'När första sådden finns kan Odlingsdagboken börja bygga din tidslinje, statistik och personliga säsongshistorik.'} actionLabel={search ? 'Rensa sökningen' : 'Lägg till första sådden'} onAction={() => search ? setSearch('') : openCreate()} secondaryLabel={!search ? 'Se såkalendern' : undefined} onSecondary={!search ? () => navigate('/app/calendar') : undefined} />
      ) : (
        <StaggerContainer className="grid gap-3">
          {sowings.map((sowing: any) => <StaggerItem key={sowing.id}><Card className="group hover:-translate-y-0.5 hover:border-primary/20 hover:shadow-[var(--card-shadow-hover)]"><CardContent className="p-4 sm:p-5 flex items-center justify-between gap-4"><div className="flex min-w-0 items-center gap-3"><div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-primary/9 text-primary"><Sprout className="h-5 w-5" /></div><div className="min-w-0"><p className="font-semibold truncate">{sowing.variety}</p><p className="mt-1 text-xs text-muted-foreground truncate"><CalendarDays className="mr-1 inline h-3.5 w-3.5" />{sowing.sow_date} · {sowing.beds?.name || 'Ingen bädd'}{sowing.seed_brand && <span> · {sowing.seed_brand}</span>}</p></div></div><div className="flex items-center gap-2 shrink-0"><Badge variant="secondary">{STATUS_LABELS[sowing.status] || sowing.status}</Badge><ConfirmDeleteButton itemName={`sådden ${sowing.variety}`} description="Sådden tas bort från historiken. Kopplade skördar kan påverkas beroende på databasrelationerna." disabled={deleteMutation.isPending} onConfirm={() => deleteMutation.mutate(sowing.id)} /></div></CardContent></Card></StaggerItem>)}
        </StaggerContainer>
      )}
    </div>
  );
};

export default Sowings;
