import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export type PublishedSeoSlugs = {
  plants: { slug: string; name: string | null }[];
  zones: { slug: string; zone_number: number | null }[];
};

/**
 * Vilka växt- och zonsidor som är publicerade, så att programmatiska sidor
 * bara länkar till sidor som finns. Delas i cachen mellan sidor.
 */
export function usePublishedSeoSlugs() {
  return useQuery({
    queryKey: ['published-seo-slugs'],
    staleTime: 60 * 60 * 1000,
    queryFn: async (): Promise<PublishedSeoSlugs> => {
      const [plants, zones] = await Promise.all([
        supabase.from('seo_plants').select('slug, name').eq('published', true),
        supabase.from('seo_zones').select('slug, zone_number').eq('published', true),
      ]);
      if (plants.error) throw plants.error;
      if (zones.error) throw zones.error;
      return { plants: plants.data ?? [], zones: zones.data ?? [] };
    },
  });
}
