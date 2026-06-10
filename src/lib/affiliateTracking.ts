import { supabase } from '@/integrations/supabase/client';

export async function logAffiliateClick(productId: string, placement: string) {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    await supabase.from('click_events').insert({
      event_name: 'affiliate_click',
      path: `${placement}/${productId}`,
      user_id: user?.id ?? null,
    } as any);
  } catch {
    // silent
  }
}
