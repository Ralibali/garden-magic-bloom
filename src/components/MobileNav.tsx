import { Home, Sprout, LayoutGrid, Flower2, MoreHorizontal, BarChart3, Settings, Crown, Shield, CalendarDays, RefreshCw, Package, Clock, Heart, Bug, Camera, Carrot, BookOpen, Sparkles, Bell } from 'lucide-react';
import { NavLink } from '@/components/NavLink';
import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { useGardenProfile } from '@/hooks/useGardenProfile';

const primaryItems = [
  { title: 'Hem', url: '/app', icon: Home },
  { title: 'Sålogg', url: '/app/sowings', icon: Sprout },
  { title: 'Gro', url: '/app/gro', icon: Sparkles, featured: true },
  { title: 'Växter', url: '/app/my-plants', icon: Flower2 },
  { title: 'Mer', url: '#more', icon: MoreHorizontal },
];

const moreItems = [
  { title: 'Bäddar', url: '/app/beds', icon: LayoutGrid },
  { title: 'Skörd', url: '/app/harvests', icon: Carrot },
  { title: 'Påminnelser', url: '/app/reminders', icon: Bell },
  { title: 'Såkalender', url: '/app/calendar', icon: CalendarDays },
  { title: 'Växtbibliotek', url: '/app/plants', icon: BookOpen },
  { title: 'Växtföljd', url: '/app/rotation', icon: RefreshCw },
  { title: 'Samplantering', url: '/app/companion', icon: Heart },
  { title: 'Fröförråd', url: '/app/seeds', icon: Package },
  { title: 'Fotodagbok', url: '/app/photos', icon: Camera },
  { title: 'Tidslinje', url: '/app/timeline', icon: Clock },
  { title: 'Skadedjur', url: '/app/pests', icon: Bug },
  { title: 'Statistik', url: '/app/statistics', icon: BarChart3 },
  { title: 'Plus', url: '/app/premium', icon: Crown },
  { title: 'Inställningar', url: '/app/settings', icon: Settings },
];

export function MobileNav() {
  const [showMore, setShowMore] = useState(false);
  const { user } = useAuth();
  const [isAdmin, setIsAdmin] = useState(false);
  const { isVisible } = useGardenProfile();

  useEffect(() => {
    if (!user?.id) return;
    supabase.rpc('has_role', { _user_id: user.id, _role: 'admin' }).then(({ data }) => setIsAdmin(!!data));
  }, [user?.id]);

  const visiblePrimary = primaryItems.filter((item) => item.url === '#more' || isVisible(item.url));
  const visibleMore = moreItems.filter((item) => isVisible(item.url));
  const allMore = isAdmin ? [...visibleMore, { title: 'Admin', url: '/app/admin', icon: Shield }] : visibleMore;

  return (
    <>
      {showMore && (
        <div className="fixed inset-0 z-40 md:hidden" onClick={() => setShowMore(false)}>
          <div className="absolute inset-0 bg-foreground/28 backdrop-blur-md" />
          <div className="absolute bottom-[92px] left-3 right-3 max-h-[68vh] overflow-y-auto rounded-[1.75rem] border border-white/60 bg-card/96 p-3 shadow-2xl" onClick={(event) => event.stopPropagation()}>
            <div className="px-2 pt-1 pb-3"><p className="font-serif text-lg">Alla verktyg</p><p className="text-xs text-muted-foreground mt-0.5">Planera, följ upp och lär av din odling</p></div>
            <div className="grid grid-cols-4 gap-1.5">
              {allMore.map((item) => (
                <NavLink key={item.url} to={item.url} className="flex min-w-0 flex-col items-center gap-1.5 rounded-2xl px-1 py-3 text-muted-foreground transition-colors hover:bg-primary/7 hover:text-foreground" activeClassName="bg-primary/10 text-primary" onClick={() => setShowMore(false)}>
                  <div className="w-9 h-9 rounded-xl bg-muted/70 flex items-center justify-center"><item.icon className="h-[18px] w-[18px]" /></div>
                  <span className="max-w-full truncate text-[9px] font-semibold">{item.title}</span>
                </NavLink>
              ))}
            </div>
          </div>
        </div>
      )}

      <nav className="fixed bottom-3 left-3 right-3 z-50 md:hidden pb-[env(safe-area-inset-bottom)]">
        <div className="floating-dock h-[70px] rounded-[1.6rem] border border-white/65 bg-card/94 backdrop-blur-2xl px-1.5 flex items-center justify-around">
          {visiblePrimary.map((item) => {
            const featured = 'featured' in item && item.featured;
            if (item.url === '#more') {
              return <button key="more" onClick={() => setShowMore(!showMore)} className={`flex w-[58px] flex-col items-center gap-1 rounded-2xl py-2 text-[10px] font-semibold transition-colors ${showMore ? 'text-primary bg-primary/8' : 'text-muted-foreground'}`}><item.icon className="h-5 w-5" /><span>{item.title}</span></button>;
            }
            if (featured) {
              return <NavLink key={item.url} to={item.url} className="relative -mt-7 flex w-[62px] flex-col items-center gap-1 text-[10px] font-semibold text-muted-foreground" activeClassName="text-primary" onClick={() => setShowMore(false)}><span className="botanical-panel w-13 h-13 rounded-2xl flex items-center justify-center border-4 border-background shadow-xl"><item.icon className="h-5 w-5 text-white" /></span><span>{item.title}</span></NavLink>;
            }
            return <NavLink key={item.url} to={item.url} end={item.url === '/app'} className="flex w-[58px] flex-col items-center gap-1 rounded-2xl py-2 text-[10px] font-semibold text-muted-foreground transition-colors" activeClassName="text-primary bg-primary/7" onClick={() => setShowMore(false)}><item.icon className="h-5 w-5" /><span>{item.title}</span></NavLink>;
          })}
        </div>
      </nav>
    </>
  );
}
