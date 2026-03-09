import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Search, Loader2, TrendingUp, ExternalLink } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

interface KeywordResult {
  keyword: string;
  difficulty: 'Lätt' | 'Medel' | 'Svår';
  suggestions: string[];
  existingContent: string[];
}

export default function KeywordExplorer() {
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<KeywordResult | null>(null);

  const analyze = async () => {
    if (!query.trim()) return;
    setLoading(true);

    try {
      // Check existing blog content for this keyword
      const { data: posts } = await supabase
        .from('blog_posts')
        .select('title, slug')
        .eq('is_published', true)
        .ilike('title', `%${query}%`);

      // Generate suggestions based on the keyword
      const baseSuggestions = [
        `${query} för nybörjare`,
        `bästa ${query} tips`,
        `${query} guide`,
        `hur odlar man ${query}`,
        `${query} problem`,
        `${query} i pallkrage`,
        `${query} inomhus`,
        `${query} såtid`,
        `när skörda ${query}`,
        `${query} recept`,
      ];

      const difficulty: 'Lätt' | 'Medel' | 'Svår' =
        (posts?.length || 0) === 0 ? 'Lätt' :
        (posts?.length || 0) < 3 ? 'Medel' : 'Svår';

      setResult({
        keyword: query,
        difficulty,
        suggestions: baseSuggestions,
        existingContent: (posts || []).map(p => p.title),
      });
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex gap-2">
        <Input
          placeholder="Sök nyckelord, t.ex. 'tomat' eller 'pallkrage'"
          value={query}
          onChange={e => setQuery(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && analyze()}
          className="rounded-xl"
        />
        <Button onClick={analyze} disabled={loading} className="rounded-xl gap-1.5">
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
          Analysera
        </Button>
      </div>

      {result && (
        <div className="grid gap-4 md:grid-cols-2">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <TrendingUp className="h-4 w-4 text-primary" /> Nyckelord: "{result.keyword}"
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center gap-2">
                <span className="text-xs text-muted-foreground">Svårighetsgrad:</span>
                <Badge variant={result.difficulty === 'Lätt' ? 'default' : result.difficulty === 'Medel' ? 'secondary' : 'destructive'} className="text-xs">
                  {result.difficulty}
                </Badge>
              </div>
              {result.existingContent.length > 0 && (
                <div>
                  <p className="text-xs text-muted-foreground mb-1">Befintligt innehåll:</p>
                  <ul className="space-y-1">
                    {result.existingContent.map(t => (
                      <li key={t} className="text-sm text-foreground flex items-center gap-1">
                        <ExternalLink className="h-3 w-3 text-muted-foreground" /> {t}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Förslag på artikelämnen</CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="space-y-1.5">
                {result.suggestions.map(s => (
                  <li key={s} className="text-sm text-foreground/90 flex items-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-primary/50 shrink-0" />
                    {s}
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
