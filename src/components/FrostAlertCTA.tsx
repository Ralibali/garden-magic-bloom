import { useEffect, useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Bell, X } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { usePushNotifications } from '@/hooks/usePushNotifications';

const DISMISS_KEY = 'frost-alert-cta-dismissed';

export default function FrostAlertCTA() {
  const { supported, permission, subscribe } = usePushNotifications();
  const navigate = useNavigate();
  const [dismissed, setDismissed] = useState(true);

  useEffect(() => {
    setDismissed(localStorage.getItem(DISMISS_KEY) === '1');
  }, []);

  if (!supported || permission !== 'default' || dismissed) return null;

  const dismiss = () => { localStorage.setItem(DISMISS_KEY, '1'); setDismissed(true); };

  const activate = async () => {
    try { await subscribe(); dismiss(); }
    catch { navigate('/app/settings'); }
  };

  return (
    <Card className="border-blue-300/30 bg-gradient-to-r from-blue-50/60 to-cyan-50/40 dark:from-blue-950/30 dark:to-cyan-950/20">
      <CardContent className="p-3 flex items-center justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-9 h-9 rounded-xl bg-blue-100/70 dark:bg-blue-900/40 flex items-center justify-center shrink-0">
            <Bell className="h-4 w-4 text-blue-700 dark:text-blue-300" />
          </div>
          <div className="min-w-0">
            <p className="text-sm font-medium text-foreground truncate">🔔 Få frostvarningar för din trädgård</p>
            <p className="text-xs text-muted-foreground">Aktivera notiser så plingar vi kvällen innan kalla nätter.</p>
          </div>
        </div>
        <div className="flex items-center gap-1 shrink-0">
          <Button size="sm" onClick={activate}>Aktivera</Button>
          <button onClick={dismiss} className="p-1.5 text-muted-foreground hover:text-foreground" aria-label="Dölj">
            <X className="h-4 w-4" />
          </button>
        </div>
      </CardContent>
    </Card>
  );
}
