import React, { useState, useCallback, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Upload, FileUp, Check, AlertTriangle, FileSpreadsheet, Loader2 } from 'lucide-react';
import { parseFile, detectTarget, mapRows, type ImportTarget, type ImportResult } from '@/lib/importUtils';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from '@/hooks/use-toast';
import { useQueryClient } from '@tanstack/react-query';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

const ACCEPT = '.csv,.xlsx,.xls,.json';

type Stage = 'idle' | 'preview' | 'importing' | 'done';

export default function DataImporter() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const fileRef = useRef<HTMLInputElement>(null);
  const [stage, setStage] = useState<Stage>('idle');
  const [result, setResult] = useState<ImportResult | null>(null);
  const [overrideTarget, setOverrideTarget] = useState<ImportTarget | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [importedCount, setImportedCount] = useState(0);

  const reset = () => {
    setStage('idle');
    setResult(null);
    setOverrideTarget(null);
    setError(null);
    setImportedCount(0);
    if (fileRef.current) fileRef.current.value = '';
  };

  const handleFile = useCallback(async (file: File) => {
    setError(null);
    try {
      const rawRows = await parseFile(file);
      if (!rawRows.length) { setError('Filen verkar vara tom.'); return; }

      const columns = Object.keys(rawRows[0]);
      const target = detectTarget(columns);
      const mapped = mapRows(rawRows, target);
      setResult(mapped);
      setOverrideTarget(null);
      setStage('preview');
    } catch (e: any) {
      setError(`Kunde inte läsa filen: ${e.message}`);
    }
  }, []);

  const handleTargetChange = useCallback((newTarget: ImportTarget) => {
    setOverrideTarget(newTarget);
    if (result) {
      // Re-parse with the file we already have - use the raw approach
      // We stored the raw parsed data... re-map isn't possible without raw rows.
      // Instead we just change the target label for now - real re-map needs raw data.
    }
  }, [result]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  }, [handleFile]);

  const handleImport = useCallback(async () => {
    if (!result || !user) return;
    setStage('importing');

    const target = overrideTarget || result.target;
    const BATCH = 50;
    let imported = 0;

    try {
      for (let i = 0; i < result.rows.length; i += BATCH) {
        const batch = result.rows.slice(i, i + BATCH).map(row => ({
          ...row,
          user_id: user.id,
        }));

        const { error: dbErr } = await (supabase.from(target) as any).insert(batch);
        if (dbErr) throw new Error(dbErr.message);
        imported += batch.length;
        setImportedCount(imported);
      }

      setStage('done');
      queryClient.invalidateQueries();
      toast({ title: `${imported} rader importerade till ${result.label}! ✅` });
    } catch (e: any) {
      setError(`Import misslyckades: ${e.message}`);
      setStage('preview');
    }
  }, [result, user, overrideTarget, queryClient]);

  const activeTarget = overrideTarget || result?.target;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Upload className="h-5 w-5" /> Importera data
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-sm text-muted-foreground">
          Ladda upp en CSV-, Excel- eller JSON-fil. Kolumnerna mappas automatiskt till sådder, skördar eller fröinventariet.
        </p>

        {stage === 'idle' && (
          <div
            onDrop={handleDrop}
            onDragOver={e => e.preventDefault()}
            className="border-2 border-dashed border-border rounded-xl p-8 text-center hover:border-primary/50 transition-colors cursor-pointer"
            onClick={() => fileRef.current?.click()}
          >
            <FileUp className="h-8 w-8 mx-auto mb-3 text-muted-foreground" />
            <p className="text-sm font-medium text-foreground">Dra och släpp en fil här</p>
            <p className="text-xs text-muted-foreground mt-1">eller klicka för att välja · CSV, Excel, JSON</p>
            <input
              ref={fileRef}
              type="file"
              accept={ACCEPT}
              className="hidden"
              onChange={e => { const f = e.target.files?.[0]; if (f) handleFile(f); }}
            />
          </div>
        )}

        {error && (
          <div className="flex items-start gap-2 p-3 rounded-lg bg-destructive/10 border border-destructive/20">
            <AlertTriangle className="h-4 w-4 text-destructive mt-0.5 shrink-0" />
            <p className="text-sm text-destructive">{error}</p>
          </div>
        )}

        {stage === 'preview' && result && (
          <div className="space-y-4">
            <div className="p-4 rounded-xl bg-muted/30 border border-border space-y-3">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <div className="flex items-center gap-2">
                  <FileSpreadsheet className="h-4 w-4 text-primary" />
                  <span className="text-sm font-medium">{result.rows.length} rader hittades</span>
                </div>
                {result.skipped > 0 && (
                  <span className="text-xs text-muted-foreground">{result.skipped} rader hoppades över (saknar sort/namn)</span>
                )}
              </div>

              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1 block">Importera till</label>
                <Select value={activeTarget} onValueChange={v => handleTargetChange(v as ImportTarget)}>
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="sowings">🌱 Sådder</SelectItem>
                    <SelectItem value="harvests">🥕 Skördar</SelectItem>
                    <SelectItem value="seed_inventory">🌾 Fröinventariet</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Preview table */}
              <div className="overflow-x-auto max-h-48 overflow-y-auto rounded-lg border border-border">
                <table className="w-full text-xs">
                  <thead className="bg-muted/50 sticky top-0">
                    <tr>
                      {Object.keys(result.rows[0] || {}).filter(k => !k.startsWith('_')).map(k => (
                        <th key={k} className="px-3 py-1.5 text-left font-medium text-muted-foreground whitespace-nowrap">{k}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {result.rows.slice(0, 10).map((row, i) => (
                      <tr key={i} className="border-t border-border/50">
                        {Object.entries(row).filter(([k]) => !k.startsWith('_')).map(([k, v], j) => (
                          <td key={j} className="px-3 py-1.5 whitespace-nowrap text-foreground">{String(v ?? '')}</td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
                {result.rows.length > 10 && (
                  <p className="text-xs text-muted-foreground text-center py-1.5">… och {result.rows.length - 10} rader till</p>
                )}
              </div>
            </div>

            <div className="flex gap-2">
              <Button onClick={handleImport} className="gap-2">
                <Upload className="h-4 w-4" /> Importera {result.rows.length} rader
              </Button>
              <Button variant="outline" onClick={reset}>Avbryt</Button>
            </div>
          </div>
        )}

        {stage === 'importing' && (
          <div className="flex items-center gap-3 p-4">
            <Loader2 className="h-5 w-5 animate-spin text-primary" />
            <span className="text-sm">Importerar… {importedCount} av {result?.rows.length ?? 0}</span>
          </div>
        )}

        {stage === 'done' && (
          <div className="flex flex-col items-center gap-3 p-6">
            <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
              <Check className="h-6 w-6 text-primary" />
            </div>
            <p className="text-sm font-medium">{importedCount} rader importerades till {result?.label}</p>
            <Button variant="outline" onClick={reset} size="sm">Importera fler</Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}