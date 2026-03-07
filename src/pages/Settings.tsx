import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Settings as SettingsIcon, Download, FileSpreadsheet, FileText } from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { toast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
import { downloadCSV, downloadPDF } from '@/lib/exportUtils';

const SettingsPage = () => {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const [displayName, setDisplayName] = useState('');
  const [climateZone, setClimateZone] = useState('3');

  const { data: profile } = useQuery({ queryKey: ['profile'], queryFn: api.getProfile });

  useEffect(() => {
    if (profile) {
      setDisplayName(profile.display_name || '');
      setClimateZone(String((profile as any).climate_zone || 3));
    }
  }, [profile]);

  const updateMutation = useMutation({
    mutationFn: () => api.updateProfile({ display_name: displayName, climate_zone: parseInt(climateZone) }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['profile'] });
      toast({ title: 'Inställningar sparade! ✅' });
    },
  });

  const [exporting, setExporting] = useState(false);

  const handleExportCSV = async () => {
    setExporting(true);
    try {
      const { beds, sowings, harvests } = await api.exportUserData();
      
      // Export beds
      if (beds.length) downloadCSV(beds.map((b: any) => ({ Namn: b.name, Beskrivning: b.description || '', Säsongsanteckningar: b.season_notes || '', Skapad: b.created_at?.split('T')[0] })), 'baddar');
      
      // Export sowings
      if (sowings.length) downloadCSV(sowings.map((s: any) => ({ Sort: s.variety, Frömärke: s.seed_brand || '', Typ: s.type, Sådatum: s.sow_date, Status: s.status, Bädd: s.beds?.name || '', Anteckningar: s.notes || '' })), 'sadder');
      
      // Export harvests
      if (harvests.length) downloadCSV(harvests.map((h: any) => ({ Sort: h.variety, Datum: h.harvest_date, 'Vikt (g)': h.weight_grams, Bädd: h.beds?.name || '', Anteckningar: h.notes || '' })), 'skordar');
      
      toast({ title: 'Data exporterad som CSV! 📊' });
    } catch (e: any) {
      toast({ title: 'Exportfel', description: e.message, variant: 'destructive' });
    }
    setExporting(false);
  };

  const handleExportPDF = async () => {
    setExporting(true);
    try {
      const { beds, sowings, harvests } = await api.exportUserData();
      
      const allRows = [
        ...sowings.map((s: any) => ['Sådd', s.variety, s.sow_date, s.beds?.name || '–', s.seed_brand || '–', s.status]),
        ...harvests.map((h: any) => ['Skörd', h.variety, h.harvest_date, h.beds?.name || '–', `${h.weight_grams}g`, '–']),
      ];
      
      downloadPDF(
        'Odlingsdagboken – Export',
        ['Typ', 'Sort', 'Datum', 'Bädd', 'Detalj', 'Status'],
        allRows,
        'odlingsdata'
      );
      
      toast({ title: 'PDF öppnad för utskrift! 🖨️' });
    } catch (e: any) {
      toast({ title: 'Exportfel', description: e.message, variant: 'destructive' });
    }
    setExporting(false);
  };

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold flex items-center gap-2"><SettingsIcon className="h-6 w-6" /> Inställningar</h1>
      <Card>
        <CardHeader><CardTitle>Profil</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div><label className="text-sm font-medium">Namn</label><Input value={displayName} onChange={e => setDisplayName(e.target.value)} /></div>
          <div><label className="text-sm font-medium">E-post</label><Input value={user?.email || ''} disabled /></div>
          <div>
            <label className="text-sm font-medium">Klimatzon</label>
            <Select value={climateZone} onValueChange={setClimateZone}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>{[1,2,3,4,5,6,7,8].map(z => <SelectItem key={z} value={String(z)}>Zon {z}</SelectItem>)}</SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground mt-1">Zon 1–3 = Syd, Zon 4–5 = Mitt, Zon 6–8 = Nord</p>
          </div>
          <div><label className="text-sm font-medium">Abonnemang</label><p className="text-sm text-muted-foreground">{profile?.subscription_status === 'premium' ? 'Plus' : 'Gratis'}</p></div>
          <Button onClick={() => updateMutation.mutate()} disabled={updateMutation.isPending}>{updateMutation.isPending ? 'Sparar...' : 'Spara inställningar'}</Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="flex items-center gap-2"><Download className="h-5 w-5" /> Exportera data</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          <p className="text-sm text-muted-foreground">Ladda ner all din odlingsdata – bäddar, sådder och skördar – för att spara offline.</p>
          <div className="flex flex-wrap gap-3">
            <Button variant="outline" onClick={handleExportCSV} disabled={exporting}>
              <FileSpreadsheet className="h-4 w-4 mr-2" /> Exportera CSV
            </Button>
            <Button variant="outline" onClick={handleExportPDF} disabled={exporting}>
              <FileText className="h-4 w-4 mr-2" /> Exportera PDF
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default SettingsPage;
