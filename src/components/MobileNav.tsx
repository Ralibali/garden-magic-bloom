import { Home, Sprout, LayoutGrid, Flower2, MoreHorizontal, BarChart3, Settings, Crown, Shield, CalendarDays, RefreshCw, Package, Clock, Heart, Bug, Camera, Carrot, BookOpen, Sparkles, Bell } from 'lucide-react';
import { NavLink } from '@/components/NavLink';
import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { useGardenProfile } from '@/hooks/useGardenProfile';

const primaryItems = [
  { title: 'Hem', url: '/app', icon: Home },
  { title: 'Sålogg', url: '/app/sowings', icon: Sprout },
  { title: 'Gro', url: '/app/gro', icon: Sparkles },
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

  return <>
    {showMore && <div className="fixed inset-0 z-40 md:hidden" onClick={() => setShowMore(false)}><div className="absolute inset-0 bg-foreground/20 backdrop-blur-sm" /><div className="absolute bottom-16 left-2 right-2 bg-card border border-border/60 rounded-3xl p-3 shadow-2xl max-h-[70vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}><div className="grid grid-cols-4 gap-1">{allMore.map((item) => <NavLink key={item.url} to={item.url} className="flex flex-col items-center gap-1.5 py-3 px-1 rounded-xl text-muted-foreground hover:text-foreground hover:bg-muted/50" activeClassName="text-primary bg-primary/8" onClick={() => setShowMore(false)}><item.icon className="h-5 w-5" /><span className="text-[9px] font-medium truncate max-w-full">{item.title}</span></NavLink>)}</div></div></div>}
    <nav className="fixed bottom-0 left-0 right-0 z-50 md:hidden bg-card/92 backdrop-blur-xl border-t border-border/50 pb-[env(safe-area-inset-bottom)]"><div className="flex items-center justify-around h-16 px-1">{visiblePrimary.map((item) => item.url === '#more' ? <button key="more" onClick={() => setShowMore(!showMore)} className={`flex flex-col items-center gap-0.5 py-2 px-3 rounded-xl ${showMore ? 'text-primary bg-primary/8' : 'text-muted-foreground'}`}><item.icon className="h-5 w-5" /><span className="text-[10px] font-medium">{item.title}</span></button> : <NavLink key={item.url} to={item.url} end={item.url === '/app'} className="flex flex-col items-center gap-0.5 py-2 px-3 rounded-xl text-muted-foreground" activeClassName="text-primary" onClick={() => setShowMore(false)}><item.icon className="h-5 w-5" /><span className="text-[10px] font-medium">{item.title}</span></NavLink>)}</div></nav>
  </>;
}
