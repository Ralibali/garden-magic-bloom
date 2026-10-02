import { supabase } from '@/integrations/supabase/client';
import { isNativeApp } from '@/lib/native';

export async function logAffiliateClick(productId: string, placement: string) {
  if (isNativeApp()) return;
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
