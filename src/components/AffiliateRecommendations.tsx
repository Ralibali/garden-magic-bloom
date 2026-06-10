import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ExternalLink, Sparkles, ShoppingBag, Crown } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { logAffiliateClick } from '@/lib/affiliateTracking';

type Product = {
  id: string;
  name: string;
  description: string | null;
  price_label: string | null;
  image_url: string | null;
  affiliate_url: string;
  category: string;
  partner: string | null;
};

function useProducts() {
  return useQuery({
    queryKey: ['affiliate-products-active'],
    queryFn: async () => {
      const { data } = await supabase
        .from('affiliate_products')
        .select('id, name, description, price_label, image_url, affiliate_url, category, partner')
        .eq('active', true)
        .order('sort_order', { ascending: true });
      return (data || []) as Product[];
    },
    staleTime: 5 * 60 * 1000,
  });
}

const ProductImage = ({ p }: { p: Product }) => (
  p.image_url
    ? <img src={p.image_url} alt="" className="w-10 h-10 rounded object-cover shrink-0" />
    : <span className="text-2xl shrink-0">🛒</span>
);

export function AffiliateWidget({ maxItems = 2 }: { maxItems?: number }) {
  const { data: products } = useProducts();
  if (!products || products.length === 0) return null;
  const picks = products.slice(0, maxItems);
  return (
    <div className="space-y-2">
      <div className="flex items-center gap-1.5">
        <ShoppingBag className="h-3.5 w-3.5 text-accent" />
        <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Rekommenderat för dig</span>
      </div>
      {picks.map(p => (
        <a key={p.id} href={p.affiliate_url} target="_blank" rel="noopener noreferrer sponsored"
           onClick={() => logAffiliateClick(p.id, 'widget')}
           className="flex items-center gap-3 p-2.5 rounded-lg bg-secondary/50 hover:bg-secondary/80 transition-colors group">
          <ProductImage p={p} />
          <div className="flex-1 min-w-0">
            <p className="text-xs font-medium text-foreground truncate">{p.name}</p>
            {p.price_label && <p className="text-[10px] text-muted-foreground">{p.price_label}</p>}
          </div>
          <ExternalLink className="h-3 w-3 text-muted-foreground group-hover:text-primary transition-colors shrink-0" />
        </a>
      ))}
      <p className="text-[9px] text-muted-foreground">Annonslänkar – vi kan få provision</p>
    </div>
  );
}

export function PremiumUpsellBanner({ variant = 'compact' }: { variant?: 'compact' | 'full' }) {
  const navigate = useNavigate();
  if (variant === 'compact') {
    return (
      <button onClick={() => navigate('/app/premium')} className="w-full flex items-center gap-3 p-3 rounded-xl bg-gradient-to-r from-primary/10 via-accent/10 to-warning/10 border border-primary/20 hover:border-primary/40 transition-all group">
        <div className="w-8 h-8 rounded-lg bg-warning/15 flex items-center justify-center shrink-0"><Crown className="h-4 w-4 text-warning" /></div>
        <div className="flex-1 text-left">
          <p className="text-xs font-semibold text-foreground">Lås upp hela potentialen</p>
          <p className="text-[10px] text-muted-foreground">Plus för bara 99 kr/år</p>
        </div>
        <Sparkles className="h-4 w-4 text-warning group-hover:scale-110 transition-transform shrink-0" />
      </button>
    );
  }
  return (
    <Card className="overflow-hidden border-primary/30 shadow-md bg-gradient-to-br from-card via-card to-primary/5">
      <CardContent className="p-5">
        <div className="flex items-start gap-4">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-warning/20 to-primary/20 flex items-center justify-center shrink-0"><Crown className="h-6 w-6 text-warning" /></div>
          <div className="flex-1">
            <h3 className="font-serif text-lg text-foreground mb-1">Din odling förtjänar mer</h3>
            <p className="text-xs text-muted-foreground mb-3">Med Plus får du obegränsade bäddar, smarta påminnelser per klimatzon, full växtföljdshistorik och CSV-export.</p>
            <div className="flex items-center gap-2 mb-3">
              <span className="text-xs bg-success/10 text-success px-2 py-0.5 rounded-full font-medium">✓ 14 dagar gratis</span>
              <span className="text-xs text-muted-foreground">sedan 99 kr/år</span>
            </div>
            <Button onClick={() => navigate('/app/premium')} size="sm" className="gap-1.5 active:scale-95 transition-transform shadow-[0_2px_8px_0_hsl(var(--primary)/0.2)]">
              <Crown className="h-3.5 w-3.5" /> Prova Plus gratis
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export default function AffiliateRecommendations() {
  const { data: products, isLoading } = useProducts();

  if (isLoading) return null;
  if (!products || products.length === 0) return null;

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <ShoppingBag className="h-5 w-5 text-accent" />
        <h2 className="font-serif text-lg text-foreground">Utvalt för din odling</h2>
      </div>
      <p className="text-xs text-muted-foreground -mt-2">Produkter från våra partners. Vi kan få ersättning vid köp.</p>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {products.map(p => (
          <a key={p.id} href={p.affiliate_url} target="_blank" rel="noopener noreferrer sponsored"
             onClick={() => logAffiliateClick(p.id, 'recommendations')}
             className="block">
            <Card className="h-full border-border hover:border-primary/30 hover:shadow-md transition-all group">
              <CardContent className="p-4">
                <div className="flex items-start gap-3">
                  {p.image_url
                    ? <img src={p.image_url} alt="" className="w-12 h-12 rounded-lg object-cover mt-0.5" />
                    : <span className="text-2xl mt-0.5">🛒</span>}
                  <div className="flex-1 min-w-0">
                    <h3 className="text-sm font-medium text-foreground truncate">{p.name}</h3>
                    {p.description && <p className="text-[11px] text-muted-foreground line-clamp-2 mt-0.5 mb-2">{p.description}</p>}
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-semibold text-foreground">{p.price_label || ''}</span>
                      <span className="text-[10px] text-accent font-medium flex items-center gap-1">
                        {p.partner || 'Till butik'}
                        <ExternalLink className="h-2.5 w-2.5 group-hover:translate-x-0.5 transition-transform" />
                      </span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </a>
        ))}
      </div>

      <p className="text-[10px] text-muted-foreground text-center pt-2">
        Annonslänkar – vi kan få provision vid köp, utan extra kostnad för dig.
      </p>
    </div>
  );
}
