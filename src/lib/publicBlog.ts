import { createClient } from '@supabase/supabase-js';
import type { Database } from '@/integrations/supabase/types';

// Published content must not wait for a visitor's expired login to refresh.
// This client has no saved session and uses the existing anonymous RLS policies.
const publicContent = createClient<Database>(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
  { auth: {
    storageKey: 'od-public-content',
    persistSession: false,
    autoRefreshToken: false,
    detectSessionInUrl: false,
  } },
);

async function withPublicTimeout<T>(read: (signal: AbortSignal) => PromiseLike<T>): Promise<T> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 12_000);
  try { return await read(controller.signal); }
  finally { clearTimeout(timer); }
}

export async function loadPublicBlogPost(slug: string) {
  const { data, error } = await withPublicTimeout(signal =>
    publicContent.from('blog_posts').select('*')
      .eq('slug', slug).eq('is_published', true).abortSignal(signal).single());
  if (error) throw error;
  return { ...data, author_name: 'Odlingsdagboken' };
}

export async function loadPublicBlogPosts() {
  const { data, error } = await withPublicTimeout(signal =>
    publicContent.from('blog_posts')
      .select('id, title, slug, excerpt, cover_image_url, category, tags, published_at, content')
      .eq('is_published', true).order('published_at', { ascending: false }).abortSignal(signal));
  if (error) throw error;
  return data;
}

export async function loadPublicBlogGlossary(ids: string[]) {
  if (ids.length === 0) return [];
  const { data, error } = await withPublicTimeout(signal =>
    publicContent.from('link_glossary').select('keyword, url, rel')
      .eq('is_active', true).in('id', ids).abortSignal(signal));
  if (error) throw error;
  return data;
}
