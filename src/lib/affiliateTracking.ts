import { supabase } from '@/integrations/supabase/client';

export async function logAffiliateClick(productId: string, placement: string) {
  try {
    await supabase.from('click_events').insert({
      event_name: 'affiliate_click',
      path: `${placement}/${productId}`,
      metadata: { product_id: productId, placement },
    } as any);
  } catch {
    // silent
  }
}
