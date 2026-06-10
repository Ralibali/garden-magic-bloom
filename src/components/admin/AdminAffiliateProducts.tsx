import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Trash2, Plus, X } from 'lucide-react';
import { toast } from '@/hooks/use-toast';

type Product = {
  id: string;
  name: string;
  description: string | null;
  price_label: string | null;
  image_url: string | null;
  affiliate_url: string;
  partner: string | null;
  category: string;
  keywords: string[];
  active: boolean;
  sort_order: number;
};

const CATEGORIES = ['frön','jord','verktyg','växthus','skadedjur','gödning','böcker','övrigt'];
const empty: Omit<Product, 'id'> = {
  name: '', description: '', price_label: '', image_url: '', affiliate_url: '',
  partner: '', category: 'övrigt', keywords: [], active: false, sort_order: 0,
};

function KeywordsInput({ value, onChange }: { value: string[]; onChange: (v: string[]) => void }) {
  const [input, setInput] = useState('');
  const add = () => {
    const v = input.trim();
    if (v && !value.includes(v)) onChange([...value, v]);
    setInput('');
  };
  return (
    <div>
      <div className="flex flex-wrap gap-1 mb-2">
        {value.map(k => (
          <span key={k} className="inline-flex items-center gap-1 bg-secondary text-secondary-foreground text-xs px-2 py-1 rounded-full">
            {k}<button onClick={() => onChange(value.filter(x => x !== k))} className="hover:text-destructive"><X className="h-3 w-3" /></button>
          </span>
        ))}
      </div>
      <div className="flex gap-2">
        <Input value={input} onChange={e => setInput(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); add(); } }} placeholder="Lägg till nyckelord (Enter)" />
        <Button type="button" variant="outline" onClick={add}>Lägg till</Button>
      </div>
    </div>
  );
}

function ProductForm({ initial, onSaved, onCancel }: { initial: Partial<Product>; onSaved: () => void; onCancel: () => void }) {
  const [p, setP] = useState<any>({ ...empty, ...initial });
  const save = async () => {
    if (!p.name || !p.affiliate_url) { toast({ title: 'Namn och länk krävs', variant: 'destructive' }); return; }
    const payload = {
      name: p.name, description: p.description || null, price_label: p.price_label || null,
      image_url: p.image_url || null, affiliate_url: p.affiliate_url, partner: p.partner || null,
      category: p.category, keywords: p.keywords || [], active: p.active, sort_order: p.sort_order || 0,
    };
    const { error } = p.id
      ? await supabase.from('affiliate_products').update(payload).eq('id', p.id)
      : await supabase.from('affiliate_products').insert(payload);
    if (error) { toast({ title: 'Fel', description: error.message, variant: 'destructive' }); return; }
    toast({ title: 'Sparat' });
    onSaved();
  };
  return (
    <Card>
      <CardHeader><CardTitle className="text-base">{p.id ? 'Redigera produkt' : 'Ny produkt'}</CardTitle></CardHeader>
      <CardContent className="space-y-3">
        <Input value={p.name} onChange={e => setP({ ...p, name: e.target.value })} placeholder="Namn *" />
        <Textarea value={p.description || ''} onChange={e => setP({ ...p, description: e.target.value })} placeholder="Beskrivning" />
        <div className="grid grid-cols-2 gap-3">
          <Input value={p.price_label || ''} onChange={e => setP({ ...p, price_label: e.target.value })} placeholder="Pris (t.ex. 49 kr)" />
          <Input value={p.partner || ''} onChange={e => setP({ ...p, partner: e.target.value })} placeholder="Partner (t.ex. Adtraction)" />
        </div>
        <Input value={p.affiliate_url} onChange={e => setP({ ...p, affiliate_url: e.target.value })} placeholder="Affiliate-URL *" />
        <Input value={p.image_url || ''} onChange={e => setP({ ...p, image_url: e.target.value })} placeholder="Bild-URL" />
        <div className="grid grid-cols-2 gap-3">
          <Select value={p.category} onValueChange={v => setP({ ...p, category: v })}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>{CATEGORIES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
          </Select>
          <Input type="number" value={p.sort_order} onChange={e => setP({ ...p, sort_order: parseInt(e.target.value || '0', 10) })} placeholder="Sortering" />
        </div>
        <div>
          <label className="text-xs text-muted-foreground">Nyckelord (matchar Gros svar)</label>
          <KeywordsInput value={p.keywords || []} onChange={v => setP({ ...p, keywords: v })} />
        </div>
        <div className="flex items-center gap-3">
          <Switch checked={p.active} onCheckedChange={v => setP({ ...p, active: v })} />
          <span className="text-sm">Aktiv (synlig i appen)</span>
        </div>
        <div className="flex gap-2 pt-2">
          <Button onClick={save}>Spara</Button>
          <Button variant="outline" onClick={onCancel}>Avbryt</Button>
        </div>
      </CardContent>
    </Card>
  );
}

export default function AdminAffiliateProducts() {
  const qc = useQueryClient();
  const [editing, setEditing] = useState<Partial<Product> | null>(null);
  const { data: products } = useQuery({
    queryKey: ['admin-affiliate-products'],
    queryFn: async () => {
      const { data } = await supabase.from('affiliate_products').select('*').order('sort_order', { ascending: true });
      return (data || []) as Product[];
    },
  });
  const del = useMutation({
    mutationFn: async (id: string) => { const { error } = await supabase.from('affiliate_products').delete().eq('id', id); if (error) throw error; },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['admin-affiliate-products'] }); toast({ title: 'Borttagen' }); },
  });
  const toggle = useMutation({
    mutationFn: async ({ id, active }: { id: string; active: boolean }) => {
      const { error } = await supabase.from('affiliate_products').update({ active }).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin-affiliate-products'] }),
  });
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">Affiliate-produkter</h2>
        <Button onClick={() => setEditing({})} className="gap-1.5"><Plus className="h-4 w-4" /> Ny produkt</Button>
      </div>
      {editing && (
        <ProductForm
          initial={editing}
          onSaved={() => { setEditing(null); qc.invalidateQueries({ queryKey: ['admin-affiliate-products'] }); qc.invalidateQueries({ queryKey: ['affiliate-products-active'] }); }}
          onCancel={() => setEditing(null)}
        />
      )}
      <Card>
        <CardContent className="p-0">
          <table className="w-full text-sm">
            <thead className="bg-muted/40 text-left text-xs">
              <tr>
                <th className="p-2">Namn</th><th className="p-2">Kategori</th><th className="p-2">Pris</th>
                <th className="p-2">Aktiv</th><th className="p-2"></th>
              </tr>
            </thead>
            <tbody>
              {products?.map(p => (
                <tr key={p.id} className="border-t border-border">
                  <td className="p-2 font-medium">{p.name}<div className="text-[10px] text-muted-foreground truncate max-w-xs">{p.affiliate_url}</div></td>
                  <td className="p-2">{p.category}</td>
                  <td className="p-2">{p.price_label || '–'}</td>
                  <td className="p-2"><Switch checked={p.active} onCheckedChange={(v) => toggle.mutate({ id: p.id, active: v })} /></td>
                  <td className="p-2 text-right">
                    <Button variant="ghost" size="sm" onClick={() => setEditing(p)}>Redigera</Button>
                    <Button variant="ghost" size="sm" onClick={() => { if (confirm('Ta bort?')) del.mutate(p.id); }}><Trash2 className="h-4 w-4" /></Button>
                  </td>
                </tr>
              ))}
              {!products?.length && <tr><td colSpan={5} className="p-6 text-center text-muted-foreground">Inga produkter</td></tr>}
            </tbody>
          </table>
        </CardContent>
      </Card>
    </div>
  );
}
