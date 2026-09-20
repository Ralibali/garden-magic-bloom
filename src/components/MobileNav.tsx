import { isNativeApp } from '@/lib/native';
import { Home, Sprout, LayoutGrid, Flower2, MoreHorizontal, BarChart3, Settings, Crown, Shield, CalendarDays, RefreshCw, Package, Clock, Heart, Bug, Camera, Carrot, BookOpen, Sparkles, Bell } from 'lucide-react';
import { NavLink } from '@/components/NavLink';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from '@/components/ui/sheet';
import { useEffect, useMemo, useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { useGardenProfile } from '@/hooks/useGardenProfile';

const kitchenPrimary = [
  { title: 'Hem', url: '/app', icon: Home },
  { title: 'Odlingar', url: '/app/odlingar', icon: Sprout },
  { title: 'Dagbok', url: '/app/timeline', icon: BookOpen, featured: true },
  { title: 'Skörd', url: '/app/harvests', icon: Carrot },
  { title: 'Mer', url: '#more', icon: MoreHorizontal },
];

const plantPrimary = [
  { title: 'Hem', url: '/app', icon: Home },
  { title: 'Odlingar', url: '/app/odlingar', icon: Sprout },
  { title: 'Dagbok', url: '/app/timeline', icon: BookOpen, featured: true },
  { title: 'Bilder', url: '/app/photos', icon: Camera },
  { title: 'Mer', url: '#more', icon: MoreHorizontal },
];

const moreItems = [
  { title: 'Fältdagbok', url: '/faltdagbok', icon: BookOpen },
  { title: 'Fråga Gro', url: '/app/gro', icon: Sparkles },
  { title: 'Platser', url: '/app/beds', icon: LayoutGrid },
  { title: 'Sålogg', url: '/app/sowings', icon: Sprout },
  { title: 'Skörd', url: '/app/harvests', icon: Carrot },
  { title: 'Växter', url: '/app/my-plants', icon: Flower2 },
  { title: 'Påminnelser', url: '/app/reminders', icon: Bell },
  { title: 'Såkalender', url: '/app/calendar', icon: CalendarDays },
  { title: 'Växtbibliotek', url: '/app/plants', icon: BookOpen },
  { title: 'Växtföljd', url: '/app/rotation', icon: RefreshCw },
  { title: 'Samplantering', url: '/app/companion', icon: Heart },
  { title: 'Fröförråd', url: '/app/seeds', icon: Package },
  { title: 'Fotodagbok', url: '/app/photos', icon: Camera },
  { title: 'Skadedjur', url: '/app/pests', icon: Bug },
  { title: 'Statistik', url: '/app/statistics', icon: BarChart3 },
  { title: 'Plus', url: '/app/premium', icon: Crown },
  { title: 'Inställningar', url: '/app/settings', icon: Settings },
];

export function MobileNav() {
  const [showMore, setShowMore] = useState(false);
  const { user } = useAuth();
  const [isAdmin, setIsAdmin] = useState(false);
  const { categories, isVisible } = useGardenProfile();

  useEffect(() => {
    if (!user?.id) return;
    supabase.rpc('has_role', { _user_id: user.id, _role: 'admin' }).then(({ data }) => setIsAdmin(!!data));
  }, [user?.id]);

  const usesGardenLogs = categories.length === 0 || categories.some(category => category !== 'krukvaxter');
  const primaryItems = usesGardenLogs ? kitchenPrimary : plantPrimary;
  const primaryUrls = useMemo(() => new Set(primaryItems.map(item => item.url)), [primaryItems]);
  const visibleMore = moreItems.filter(item => !primaryUrls.has(item.url) && isVisible(item.url) && (!isNativeApp() || item.url !== '/app/premium'));
  const allMore = isAdmin ? [...visibleMore, { title: 'Admin', url: '/app/admin', icon: Shield }] : visibleMore;

  return (
    <>
      <Sheet open={showMore} onOpenChange={setShowMore}>
        <SheetContent side="bottom" className="max-h-[85dvh] overflow-y-auto rounded-t-3xl pb-[max(1.5rem,env(safe-area-inset-bottom))]">
          <SheetHeader className="mb-5 text-left"><SheetTitle>Mer i odlingsdagboken</SheetTitle><SheetDescription>Planera, följ upp och anpassa din odling.</SheetDescription></SheetHeader>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">{allMore.map(item => <NavLink key={item.url} to={item.url} className="flex min-h-12 items-center gap-3 rounded-xl bg-muted/40 px-3 py-3 text-sm" activeClassName="bg-primary/10 text-primary" onClick={() => setShowMore(false)}><item.icon className="h-5 w-5 shrink-0 text-primary" /><span>{item.title}</span></NavLink>)}</div>
        </SheetContent>
      </Sheet>
      <nav aria-label="Huvudmeny" className="fixed inset-x-0 bottom-0 z-30 border-t border-border bg-card/95 px-2 pb-[env(safe-area-inset-bottom)] backdrop-blur-lg md:hidden">
        <div className="mx-auto flex min-h-[72px] max-w-lg items-center justify-around">
          {primaryItems.map(item => item.url === '#more'
            ? <button key="more" onClick={() => setShowMore(true)} aria-expanded={showMore} className="flex min-h-12 min-w-14 flex-col items-center justify-center gap-1 rounded-xl px-2 py-2 text-xs font-medium text-muted-foreground"><item.icon className="h-5 w-5" /><span>{item.title}</span></button>
            : <NavLink key={item.url} to={item.url} end={item.url === '/app'} className="flex min-h-12 min-w-14 flex-col items-center justify-center gap-1 rounded-xl px-2 py-2 text-xs font-medium text-muted-foreground" activeClassName="bg-primary/8 text-primary" onClick={() => setShowMore(false)}><item.icon className="h-5 w-5" /><span>{item.title}</span></NavLink>)}
        </div>
      </nav>
    </>
  );
}
