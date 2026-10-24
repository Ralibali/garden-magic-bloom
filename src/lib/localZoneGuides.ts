import guides from '@/content/zoneGuides.json';
import type { Database } from '@/integrations/supabase/types';

type Zone = Database['public']['Tables']['seo_zones']['Row'];
export const LOCAL_ZONE_GUIDES = guides;

export function getLocalZoneGuide(slug: string | undefined): Zone | null {
  const guide = guides.find(item => item.slug === slug);
  if (!guide) return null;
  return {
    id: `local:${guide.slug}`, slug: guide.slug, zone_number: guide.zone_number,
    title: guide.title, description: guide.description, published: true,
    created_at: guide.updated_at, updated_at: guide.updated_at,
    content_html: null, faq: null, first_frost_typical: null, last_frost_typical: null,
    frost_free_days_max: null, frost_free_days_min: null, winter_temp_min: null,
    generation_errors: null, generation_status: null, suitable_categories: null, typical_regions: [],
  };
}
