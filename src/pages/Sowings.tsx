import React, { useState, useEffect, useRef } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, Trash2, Sprout, Search } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { toast } from '@/hooks/use-toast';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { format } from 'date-fns';
import { useLocation } from 'react-router-dom';
import { StaggerContainer, StaggerItem, FadeIn } from '@/components/animations';
import { FreeLimitBadge } from '@/components/PremiumGate';
import { useAuth } from '@/hooks/useAuth';

const FREE_SOWING_LIMIT = 10;

const SEED_BRAND_SUGGESTIONS = ['Impecta', 'Nelson Garden', 'Runåbergs fröer', 'Lindbloms frö', 'Pelargonia', 'Blomsterlandet', 'Egna frön', 'Annat'];

const STATUS_LABELS: Record<string, string> = {
  sown: 'Sådd',
  indoor: 'Förodlad',
  transplanted: 'Utplanterad',
  harvesting: 'Skörd',
  done: 'Avslutad',
};

const Sowings = () => {
  const queryClient = useQueryClient();
  const location = useLocation();
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

  // Clear prefill state
  useEffect(() => {
    if (prefill) window.history.replaceState({}, document.title);
  }, [prefill]);

  // Close brand suggestions on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (brandRef.current && !brandRef.current.contains(e.target as Node)) setShowBrandSuggestions(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const filteredBrands = SEED_BRAND_SUGGESTIONS.filter(b => !seedBrand || b.toLowerCase().includes(seedBrand.toLowerCase()));

  const { data: sowingsRaw, isLoading } = useQuery({ queryKey: ['sowings'], queryFn: api.getSowings });
  const { data: beds } = useQuery({ queryKey: ['beds'], queryFn: api.getBeds });

  const sowings = sowingsRaw?.filter((s: any) => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return s.variety?.toLowerCase().includes(q) || s.seed_brand?.toLowerCase().includes(q);
  });

  const createMutation = useMutation({
    mutationFn: () => api.createSowing({ variety, bed_id: bedId || undefined, sow_date: sowDate, type, notes: notes || undefined, seed_brand: seedBrand || undefined }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sowings'] });
      queryClient.invalidateQueries({ queryKey: ['summary-stats'] });
      setOpen(false);
      setVariety('');
      setBedId('');
      setNotes('');
      setSeedBrand('');
      toast({ title: 'Sådning registrerad! 🌱' });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: api.deleteSowing,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sowings'] });
      toast({ title: 'Sådning borttagen' });
    },
  });

  return (
    <div className="space-y-6">
      <FadeIn>
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2"><Sprout className="h-6 w-6" /> Sålogg</h1>
            <p className="text-muted-foreground">Alla dina sådder den här säsongen</p>
          </div>
        <div className="flex items-center gap-2">
          <div className="relative">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input placeholder="Sök sort eller märke…" value={search} onChange={e => setSearch(e.target.value)} className="pl-9 w-44 sm:w-56 h-9 text-sm" />
          </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button className="gap-2"><Plus className="h-4 w-4" /> Ny sådning</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Lägg till sådning</DialogTitle></DialogHeader>
            <div className="space-y-4">
              <Input placeholder="Sort (t.ex. Tomat – Sungold)" value={variety} onChange={e => setVariety(e.target.value)} />
              <div className="relative" ref={brandRef}>
                <Input
                  placeholder="Frömärke/leverantör (t.ex. Impecta, Nelson Garden)"
                  value={seedBrand}
                  onChange={e => { setSeedBrand(e.target.value); setShowBrandSuggestions(true); }}
                  onFocus={() => setShowBrandSuggestions(true)}
                />
                {showBrandSuggestions && filteredBrands.length > 0 && (
                  <div className="absolute z-50 top-full left-0 right-0 mt-1 bg-popover border border-border rounded-lg shadow-lg max-h-40 overflow-y-auto">
                    {filteredBrands.map(b => (
                      <button key={b} type="button" className="w-full text-left px-3 py-2 text-sm hover:bg-accent transition-colors" onClick={() => { setSeedBrand(b); setShowBrandSuggestions(false); }}>
                        {b}
                      </button>
                    ))}
                  </div>
                )}
              </div>
              <Select value={bedId} onValueChange={setBedId}>
                <SelectTrigger><SelectValue placeholder="Välj bädd (valfritt)" /></SelectTrigger>
                <SelectContent>
                  {(beds || []).map(b => <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>)}
                </SelectContent>
              </Select>
              <Input type="date" value={sowDate} onChange={e => setSowDate(e.target.value)} />
              <Select value={type} onValueChange={setType}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="direct">Direktsådd</SelectItem>
                  <SelectItem value="indoor">Förodling</SelectItem>
                </SelectContent>
              </Select>
              <Textarea placeholder="Anteckningar (valfritt)" value={notes} onChange={e => setNotes(e.target.value)} />
              <Button onClick={() => createMutation.mutate()} disabled={!variety.trim() || createMutation.isPending} className="w-full">
                {createMutation.isPending ? 'Sparar...' : 'Spara'}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
        </div>
        </div>
      </FadeIn>

      {isLoading ? (
        <div className="space-y-3">{[1, 2, 3].map(i => <Skeleton key={i} className="h-16" />)}</div>
      ) : !sowings?.length ? (
        <Card><CardContent className="py-12 text-center text-muted-foreground">
          Inga sådder ännu den här säsongen. Dags att komma igång! 🌱
        </CardContent></Card>
      ) : (
        <StaggerContainer className="space-y-3">
          {sowings.map((s: any) => (
            <StaggerItem key={s.id}>
              <Card className="hover:shadow-md hover:-translate-y-0.5 transition-all duration-200">
                <CardContent className="py-3 flex items-center justify-between">
                  <div>
                    <p className="font-medium">{s.variety}</p>
                    <p className="text-sm text-muted-foreground">
                      {s.sow_date} · {(s as any).beds?.name || 'Ingen bädd'}
                      {s.seed_brand && <span> · {s.seed_brand}</span>}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="secondary">{STATUS_LABELS[s.status] || s.status}</Badge>
                    <Button variant="ghost" size="icon" onClick={() => deleteMutation.mutate(s.id)}>
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </StaggerItem>
          ))}
        </StaggerContainer>
      )}
    </div>
  );
};

export default Sowings;
