import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ExternalLink, Sparkles, ShoppingBag, Crown } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface AffiliateProduct {
  id: string;
  name: string;
  description: string;
  price: string;
  image: string;
  affiliateUrl: string;
  category: 'frön' | 'jord' | 'verktyg' | 'växthus' | 'böcker';
  reason: string;
  badge?: string;
}

const productCatalog: AffiliateProduct[] = [
  {
    id: 'fro-tomat',
    name: 'Nelson Garden Tomatfrön Mix',
    description: 'Blandning av 5 populära tomatsorten anpassade för svenskt klimat.',
    price: '49 kr',
    image: '🍅',
    affiliateUrl: '#',
    category: 'frön',
    reason: 'Populärast bland odlare',
    badge: 'Bästsäljare',
  },
  {
    id: 'fro-sallat',
    name: 'Runåbergs Fröer Sallatsmix',
    description: 'Ekologiska sallatsfrön – så i omgångar för skörd hela säsongen.',
    price: '39 kr',
    image: '🥬',
    affiliateUrl: '#',
    category: 'frön',
    reason: 'Perfekt för nybörjare',
  },
  {
    id: 'jord-plantjord',
    name: 'Hasselfors Plantjord Eko',
    description: 'Torvfri ekologisk plantjord för förodling och omplantning.',
    price: '89 kr / 40L',
    image: '🌍',
    affiliateUrl: '#',
    category: 'jord',
    reason: 'Torvfritt alternativ',
  },
  {
    id: 'godsel-honsgo',
    name: 'Granngården Hönsgödsel',
    description: 'Naturligt gödselmedel. Perfekt för grönsaksland och pallkragar.',
    price: '79 kr / 10 kg',
    image: '🌿',
    affiliateUrl: '#',
    category: 'jord',
    reason: 'Bra allroundgödsel',
    badge: 'Eko',
  },
  {
    id: 'verktyg-sapa',
    name: 'Fiskars Planteringsspade',
    description: 'Ergonomisk planteringsspade i rostfritt stål.',
    price: '149 kr',
    image: '🛠️',
    affiliateUrl: '#',
    category: 'verktyg',
    reason: 'Håller i många säsonger',
  },
  {
    id: 'vaxthus-mini',
    name: 'Nelson Garden Miniväxthus',
    description: 'Kompakt miniväxthus för förodling på fönsterbrädan.',
    price: '199 kr',
    image: '🏠',
    affiliateUrl: '#',
    category: 'växthus',
    reason: 'Rekommenderat för säsongen',
    badge: 'Favorit',
  },
  {
    id: 'bok-odla',
    name: 'Odla! av Sara Bäckmo',
    description: 'Sveriges mest populära odlingsbok. Steg för steg genom hela säsongen.',
    price: '229 kr',
    image: '📖',
    affiliateUrl: '#',
    category: 'böcker',
    reason: 'Bästsäljare bland odlare',
  },
  {
    id: 'bok-pallkrage',
    name: 'Pallkrageodling av Helena Sjögren',
    description: 'Allt om odling i pallkragar – perfekt för dig med liten trädgård.',
    price: '189 kr',
    image: '📗',
    affiliateUrl: '#',
    category: 'böcker',
    reason: 'Perfekt för pallkragar',
  },
];

function getSmartRecommendations(): AffiliateProduct[] {
  const month = new Date().getMonth();
  const picks: AffiliateProduct[] = [];

  if (month >= 0 && month <= 2) {
    // Winter/early spring: seeds + indoor growing
    picks.push(productCatalog.find(p => p.id === 'fro-tomat')!);
    picks.push(productCatalog.find(p => p.id === 'vaxthus-mini')!);
    picks.push(productCatalog.find(p => p.id === 'jord-plantjord')!);
  } else if (month >= 3 && month <= 5) {
    // Spring: soil, seeds, tools
    picks.push(productCatalog.find(p => p.id === 'jord-plantjord')!);
    picks.push(productCatalog.find(p => p.id === 'godsel-honsgo')!);
    picks.push(productCatalog.find(p => p.id === 'fro-sallat')!);
  } else if (month >= 6 && month <= 8) {
    // Summer: tools, fertilizer
    picks.push(productCatalog.find(p => p.id === 'godsel-honsgo')!);
    picks.push(productCatalog.find(p => p.id === 'verktyg-sapa')!);
    picks.push(productCatalog.find(p => p.id === 'bok-odla')!);
  } else {
    // Autumn: books, planning
    picks.push(productCatalog.find(p => p.id === 'bok-odla')!);
    picks.push(productCatalog.find(p => p.id === 'bok-pallkrage')!);
    picks.push(productCatalog.find(p => p.id === 'fro-tomat')!);
  }

  return picks.filter(Boolean).slice(0, 6);
}

export function AffiliateWidget({ maxItems = 2 }: { maxItems?: number }) {
  const picks = getSmartRecommendations();

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-1.5">
        <ShoppingBag className="h-3.5 w-3.5 text-accent" />
        <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Rekommenderat för dig</span>
      </div>
      {picks.slice(0, maxItems).map((product) => (
        <a key={product.id} href={product.affiliateUrl} target="_blank" rel="noopener noreferrer" className="flex items-center gap-3 p-2.5 rounded-lg bg-secondary/50 hover:bg-secondary/80 transition-colors group">
          <span className="text-xl shrink-0">{product.image}</span>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-medium text-foreground truncate">{product.name}</p>
            <p className="text-[10px] text-muted-foreground">{product.price}</p>
          </div>
          <ExternalLink className="h-3 w-3 text-muted-foreground group-hover:text-primary transition-colors shrink-0" />
        </a>
      ))}
    </div>
  );
}

export function PremiumUpsellBanner({ variant = 'compact' }: { variant?: 'compact' | 'full' }) {
  const navigate = useNavigate();

  if (variant === 'compact') {
    return (
      <button onClick={() => navigate('/app/premium')} className="w-full flex items-center gap-3 p-3 rounded-xl bg-gradient-to-r from-primary/10 via-accent/10 to-warning/10 border border-primary/20 hover:border-primary/40 transition-all group">
        <div className="w-8 h-8 rounded-lg bg-warning/15 flex items-center justify-center shrink-0">
          <Crown className="h-4 w-4 text-warning" />
        </div>
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
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-warning/20 to-primary/20 flex items-center justify-center shrink-0">
            <Crown className="h-6 w-6 text-warning" />
          </div>
          <div className="flex-1">
            <h3 className="font-serif text-lg text-foreground mb-1">Din odling förtjänar mer</h3>
            <p className="text-xs text-muted-foreground mb-3">
              Med Plus får du obegränsade bäddar, smarta påminnelser per klimatzon, full växtföljdshistorik och CSV-export.
            </p>
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
  const picks = getSmartRecommendations();

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <ShoppingBag className="h-5 w-5 text-accent" />
        <h2 className="font-serif text-lg text-foreground">Utvalt för din odling</h2>
      </div>
      <p className="text-xs text-muted-foreground -mt-2">
        Produkter baserade på säsong och dina behov. Vi kan få ersättning vid köp.
      </p>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {picks.map((product) => (
          <a key={product.id} href={product.affiliateUrl} target="_blank" rel="noopener noreferrer" className="block">
            <Card className="h-full border-border hover:border-primary/30 hover:shadow-md transition-all group">
              <CardContent className="p-4">
                <div className="flex items-start gap-3">
                  <span className="text-2xl mt-0.5">{product.image}</span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="text-sm font-medium text-foreground truncate">{product.name}</h3>
                      {product.badge && (
                        <span className="text-[9px] bg-primary/10 text-primary px-1.5 py-0.5 rounded font-medium shrink-0">{product.badge}</span>
                      )}
                    </div>
                    <p className="text-[11px] text-muted-foreground line-clamp-2 mb-2">{product.description}</p>
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-semibold text-foreground">{product.price}</span>
                      <span className="text-[10px] text-accent font-medium flex items-center gap-1">
                        {product.reason}
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
        * Affiliatelänkar – vi kan få en liten ersättning vid köp, utan extra kostnad för dig.
      </p>
    </div>
  );
}
