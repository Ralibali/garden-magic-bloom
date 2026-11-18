import { afterEach, describe, expect, it, vi } from 'vitest';

// Exercise the real Supabase client with a mocked HTTP boundary. A saved,
// expired visitor session must never trigger auth refresh for public content.
afterEach(() => { vi.restoreAllMocks(); vi.unstubAllGlobals(); vi.unstubAllEnvs(); vi.resetModules(); });

describe('public blog reads', () => {
  it('loads an article and the list without reading the visitor session or profile', async () => {
    vi.stubEnv('VITE_SUPABASE_URL', 'https://public-content-test.supabase.co');
    vi.stubEnv('VITE_SUPABASE_PUBLISHABLE_KEY', 'public-test-key');
    const storageRead = vi.spyOn(Storage.prototype, 'getItem').mockReturnValue(JSON.stringify({
      access_token: 'expired-visitor-token', refresh_token: 'visitor-refresh-token', expires_at: 1,
    }));
    const article = { id: 'post', slug: 'test-post', title: 'En publicerad artikel', content: '<p>Hela texten</p>', is_published: true };
    const requests: { url: URL; authorization: string | null }[] = [];
    vi.stubGlobal('fetch', vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = new URL(String(input));
      const headers = new Headers(init?.headers);
      requests.push({ url, authorization: headers.get('Authorization') });
      return new Response(JSON.stringify(url.searchParams.has('slug') ? article : [article]), {
        status: 200, headers: { 'Content-Type': 'application/json' },
      });
    }));
    const { loadPublicBlogPost, loadPublicBlogPosts } = await import('@/lib/publicBlog');
    expect((await loadPublicBlogPost('test-post')).content).toBe(article.content);
    expect(await loadPublicBlogPosts()).toHaveLength(1);
    expect(storageRead.mock.calls.filter(([key]) => key !== 'supabase.gotrue-js.locks.debug')).toEqual([]);
    expect(requests).toHaveLength(2);
    for (const request of requests) {
      expect(request.url.pathname).toBe('/rest/v1/blog_posts');
      expect(request.url.searchParams.get('is_published')).toBe('eq.true');
      expect(request.authorization).toBe('Bearer public-test-key');
    }
  });

  it('surfaces failed public reads instead of pretending an empty list was loaded', async () => {
    vi.stubEnv('VITE_SUPABASE_URL', 'https://public-content-test.supabase.co');
    vi.stubEnv('VITE_SUPABASE_PUBLISHABLE_KEY', 'public-test-key');
    vi.stubGlobal('fetch', vi.fn(async () => new Response(JSON.stringify({ message: 'Unavailable' }), {
      status: 503, headers: { 'Content-Type': 'application/json' },
    })));
    const { loadPublicBlogPosts } = await import('@/lib/publicBlog');
    await expect(loadPublicBlogPosts()).rejects.toMatchObject({ message: 'Unavailable' });
  });
});
