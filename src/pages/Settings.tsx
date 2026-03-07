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
    </div>
  );
};

export default SettingsPage;
