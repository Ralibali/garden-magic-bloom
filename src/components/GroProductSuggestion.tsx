import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { ExternalLink } from 'lucide-react';
import { logAffiliateClick } from '@/lib/affiliateTracking';

type Product = {
  id: string;
  name: string;
  description: string | null;
  price_label: string | null;
  image_url: string | null;
  affiliate_url: string;
  keywords: string[];
};

export default function GroProductSuggestion({ text }: { text: string }) {
  const { data: products } = useQuery({
    queryKey: ['affiliate-products-active'],
    queryFn: async () => {
      const { data } = await supabase
        .from('affiliate_products')
        .select('id, name, description, price_label, image_url, affiliate_url, keywords')
        .eq('active', true)
        .order('sort_order', { ascending: true });
      return (data || []) as Product[];
    },
    staleTime: 5 * 60 * 1000,
  });

  if (!products || products.length === 0 || !text) return null;
  const lower = text.toLowerCase();
  const matches: Product[] = [];
  for (const p of products) {
    if (p.keywords.some(k => k && lower.includes(k.toLowerCase()))) {
      matches.push(p);
      if (matches.length >= 2) break;
    }
  }
  if (matches.length === 0) return null;

  return (
    <div className="mt-3 pt-3 border-t border-border/40 space-y-2">
      <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">Sponsrade länkar</p>
      <div className="space-y-2">
        {matches.map(p => (
          <a
            key={p.id}
            href={p.affiliate_url}
            target="_blank"
            rel="noopener noreferrer sponsored"
            onClick={() => logAffiliateClick(p.id, 'gro-suggestion')}
            className="flex items-center gap-3 p-2.5 rounded-lg bg-background/60 border border-border/40 hover:border-primary/30 transition-colors group"
          >
            {p.image_url ? (
              <img src={p.image_url} alt="" className="w-10 h-10 rounded object-cover shrink-0" />
            ) : (
              <span className="text-2xl shrink-0">🛒</span>
            )}
            <div className="flex-1 min-w-0">
              <p className="text-xs font-medium text-foreground truncate">{p.name}</p>
              {p.price_label && <p className="text-[10px] text-muted-foreground">{p.price_label}</p>}
            </div>
            <ExternalLink className="h-3.5 w-3.5 text-muted-foreground group-hover:text-primary shrink-0" />
          </a>
        ))}
      </div>
    </div>
  );
}
