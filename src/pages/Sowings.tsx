import React, { useState, useEffect, useRef } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, Sprout, Search, Crown } from 'lucide-react';
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

  return (
    <div className="space-y-6">
      <FadeIn><div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3"><div><h1 className="text-2xl font-bold flex items-center gap-2"><Sprout className="h-6 w-6" /> Sålogg</h1><p className="text-muted-foreground text-sm">Alla dina sådder den här säsongen</p></div><div className="flex flex-wrap items-center gap-2"><FreeLimitBadge current={sowingsRaw?.length || 0} limit={FREE_SOWING_LIMIT} label="sådder" /><div className="relative"><Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" /><Input placeholder="Sök sort eller märke…" value={search} onChange={(event) => setSearch(event.target.value)} className="pl-9 w-full sm:w-56 h-9 text-sm" /></div><Dialog open={open} onOpenChange={(nextOpen) => { if (nextOpen && !isPremium && (sowingsRaw?.length || 0) >= FREE_SOWING_LIMIT) { toast({ title: 'Gratisgränsen är nådd', description: 'Plus ger obegränsad sålogg.', variant: 'destructive' }); return; } setOpen(nextOpen); }}><DialogTrigger asChild><Button className="gap-2"><Plus className="h-4 w-4" /> Ny sådd</Button></DialogTrigger><DialogContent><DialogHeader><DialogTitle>Lägg till sådd</DialogTitle></DialogHeader><div className="space-y-4"><Input placeholder="Sort, till exempel Tomat – Sungold" value={variety} onChange={(event) => setVariety(event.target.value)} /><div className="relative" ref={brandRef}><Input placeholder="Frömärke eller leverantör" value={seedBrand} onChange={(event) => { setSeedBrand(event.target.value); setShowBrandSuggestions(true); }} onFocus={() => setShowBrandSuggestions(true)} />{showBrandSuggestions && filteredBrands.length > 0 && <div className="absolute z-50 top-full left-0 right-0 mt-1 bg-popover border border-border rounded-lg shadow-lg max-h-40 overflow-y-auto">{filteredBrands.map((brand) => <button key={brand} type="button" className="w-full text-left px-3 py-2 text-sm hover:bg-accent" onClick={() => { setSeedBrand(brand); setShowBrandSuggestions(false); }}>{brand}</button>)}</div>}</div><Select value={bedId} onValueChange={setBedId}><SelectTrigger><SelectValue placeholder="Välj bädd (valfritt)" /></SelectTrigger><SelectContent>{(beds || []).map((bed) => <SelectItem key={bed.id} value={bed.id}>{bed.name}</SelectItem>)}</SelectContent></Select><Input type="date" value={sowDate} onChange={(event) => setSowDate(event.target.value)} /><Select value={type} onValueChange={setType}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="direct">Direktsådd</SelectItem><SelectItem value="indoor">Förodling</SelectItem></SelectContent></Select><Textarea placeholder="Anteckningar (valfritt)" value={notes} onChange={(event) => setNotes(event.target.value)} /><Button onClick={() => createMutation.mutate()} disabled={!variety.trim() || createMutation.isPending} className="w-full">{createMutation.isPending ? 'Sparar…' : 'Spara'}</Button></div></DialogContent></Dialog></div></div></FadeIn>

      {isLoading ? <div className="space-y-3">{[1, 2, 3].map((item) => <Skeleton key={item} className="h-16" />)}</div> : !sowings?.length ? <Card><CardContent className="py-12 text-center text-muted-foreground">Inga sådder ännu den här säsongen. Dags att komma igång! 🌱</CardContent></Card> : <StaggerContainer className="space-y-3">{sowings.map((sowing: any) => <StaggerItem key={sowing.id}><Card className="hover:shadow-md hover:-translate-y-0.5 transition-all"><CardContent className="py-3 flex items-center justify-between gap-3"><div className="min-w-0"><p className="font-medium truncate">{sowing.variety}</p><p className="text-sm text-muted-foreground truncate">{sowing.sow_date} · {sowing.beds?.name || 'Ingen bädd'}{sowing.seed_brand && <span> · {sowing.seed_brand}</span>}</p></div><div className="flex items-center gap-2 shrink-0"><Badge variant="secondary">{STATUS_LABELS[sowing.status] || sowing.status}</Badge><ConfirmDeleteButton itemName={`sådden ${sowing.variety}`} description="Sådden tas bort från historiken. Kopplade skördar kan påverkas beroende på databasrelationerna." disabled={deleteMutation.isPending} onConfirm={() => deleteMutation.mutate(sowing.id)} /></div></CardContent></Card></StaggerItem>)}</StaggerContainer>}
    </div>
  );
};

export default Sowings;
