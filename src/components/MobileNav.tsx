import { Home, Sprout, LayoutGrid, Carrot, MoreHorizontal, BarChart3, Settings, Crown, Shield, CalendarDays, RefreshCw } from 'lucide-react';
import { NavLink } from '@/components/NavLink';
import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';

const primaryItems = [
  { title: 'Hem', url: '/app', icon: Home },
  { title: 'Bäddar', url: '/app/beds', icon: LayoutGrid },
  { title: 'Sålogg', url: '/app/sowings', icon: Sprout },
  { title: 'Skörd', url: '/app/harvests', icon: Carrot },
  { title: 'Mer', url: '#more', icon: MoreHorizontal },
];

const moreItems = [
  { title: 'Såkalender', url: '/app/calendar', icon: CalendarDays },
  { title: 'Växtföljd', url: '/app/rotation', icon: RefreshCw },
  { title: 'Statistik', url: '/app/statistics', icon: BarChart3 },
  { title: 'Premium', url: '/app/premium', icon: Crown },
  { title: 'Inställningar', url: '/app/settings', icon: Settings },
];

export function MobileNav() {
  const [showMore, setShowMore] = useState(false);
  const { user } = useAuth();
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    if (!user?.id) return;
    supabase.rpc('has_role', { _user_id: user.id, _role: 'admin' }).then(({ data }) => setIsAdmin(!!data));
  }, [user?.id]);

  const allMoreItems = isAdmin ? [...moreItems, { title: 'Admin', url: '/app/admin', icon: Shield }] : moreItems;

  return (
    <>
      {showMore && (
        <div className="fixed inset-0 z-40 md:hidden" onClick={() => setShowMore(false)}>
          <div className="absolute inset-0 bg-foreground/15 backdrop-blur-sm" />
          <div className="absolute bottom-16 left-2 right-2 bg-card border border-border/60 rounded-2xl p-3 pb-2 shadow-xl animate-fade-in-scale" onClick={(e) => e.stopPropagation()}>
            <div className="grid grid-cols-4 gap-1">
              {allMoreItems.map((item) => (
                <NavLink key={item.url} to={item.url} className="flex flex-col items-center gap-1.5 py-2.5 px-1 rounded-xl text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-all" activeClassName="text-primary bg-primary/8" onClick={() => setShowMore(false)}>
                  <item.icon className="h-5 w-5" />
                  <span className="text-[9px] font-medium truncate">{item.title}</span>
                </NavLink>
              ))}
            </div>
          </div>
        </div>
      )}

      <nav className="fixed bottom-0 left-0 right-0 z-50 md:hidden bg-card/90 backdrop-blur-xl border-t border-border/50 pb-[env(safe-area-inset-bottom)]">
        <div className="flex items-center justify-around h-16 px-1">
          {primaryItems.map((item) => (
            item.url === '#more' ? (
              <button key="more" onClick={() => setShowMore(!showMore)} className={`flex flex-col items-center gap-0.5 py-2 px-3 rounded-xl transition-all min-w-0 ${showMore ? 'text-primary bg-primary/8' : 'text-muted-foreground hover:text-foreground'}`}>
                <item.icon className="h-5 w-5" />
                <span className="text-[10px] font-medium truncate">{item.title}</span>
              </button>
            ) : (
              <NavLink key={item.url} to={item.url} end={item.url === '/app'} className="flex flex-col items-center gap-0.5 py-2 px-3 rounded-xl text-muted-foreground hover:text-foreground transition-all min-w-0" activeClassName="text-primary" onClick={() => setShowMore(false)}>
                <item.icon className="h-5 w-5" />
                <span className="text-[10px] font-medium truncate">{item.title}</span>
              </NavLink>
            )
          ))}
        </div>
      </nav>
    </>
  );
}
