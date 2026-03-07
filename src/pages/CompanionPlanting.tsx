import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Search, ThumbsUp, ThumbsDown, Leaf } from 'lucide-react';
import { COMPANION_DATA } from '@/lib/weatherTips';

const CompanionPlanting = () => {
  const [search, setSearch] = useState('');
  const plants = Object.keys(COMPANION_DATA);
  const q = search.toLowerCase();
  const filtered = plants.filter(p => p.toLowerCase().includes(q));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Samplantering</h1>
        <p className="text-muted-foreground text-sm">Vilka växter trivs ihop – och vilka bör hållas isär?</p>
      </div>

      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input placeholder="Sök växt..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9" />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {filtered.map(plant => {
          const info = COMPANION_DATA[plant];
          return (
            <Card key={plant}>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-semibold flex items-center gap-2">
                  <Leaf className="h-4 w-4 text-primary" />
                  {plant}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {info.good.length > 0 && (
                  <div>
                    <p className="text-xs font-medium text-muted-foreground flex items-center gap-1 mb-1.5">
                      <ThumbsUp className="h-3 w-3 text-green-600" /> Bra grannar
                    </p>
                    <div className="flex flex-wrap gap-1">
                      {info.good.map(g => (
                        <Badge key={g} variant="secondary" className="text-[10px] bg-green-50 text-green-700 dark:bg-green-950 dark:text-green-300 border-0">
                          {g}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}
                {info.bad.length > 0 && (
                  <div>
                    <p className="text-xs font-medium text-muted-foreground flex items-center gap-1 mb-1.5">
                      <ThumbsDown className="h-3 w-3 text-red-500" /> Undvik
                    </p>
                    <div className="flex flex-wrap gap-1">
                      {info.bad.map(b => (
                        <Badge key={b} variant="secondary" className="text-[10px] bg-red-50 text-red-700 dark:bg-red-950 dark:text-red-300 border-0">
                          {b}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
};

export default CompanionPlanting;
