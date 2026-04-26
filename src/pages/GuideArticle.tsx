import React, { useMemo } from 'react';
import VisitorWelcomePopup from '@/components/VisitorWelcomePopup';
import { useParams, Link } from 'react-router-dom';
import DOMPurify from 'dompurify';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, Sprout, Loader2, BookOpen, CalendarDays } from 'lucide-react';
import ShareButtons from '@/components/ShareButtons';
import BlogComments from '@/components/BlogComments';
import { Seo } from '@/hooks/useSeo';
import InlineSignupCTA from '@/components/InlineSignupCTA';
import GroPreviewCTA from '@/components/GroPreviewCTA';

const categoryLabels: Record<string, string> = {
  guide: 'Guide',
  recension: 'Recension',
  tips: 'Tips & tricks',
  halsa: 'Hälsa',
  nyborjare: 'Nybörjare',
  tradgard: 'Trädgård & odling',
  hem: 'Hem & hållbarhet',
  friluftsliv: 'Friluftsliv & natur',
};

/** Detect if content is raw HTML (starts with a tag) or Markdown */
function isHtmlContent(content: string): boolean {
  const trimmed = content.trim();
  return trimmed.startsWith('<') || trimmed.startsWith('<!');
}

/** Simple markdown to HTML - handles common patterns */
function renderMarkdown(md: string): string {
  let html = md
    .replace(/^### (.+)$/gm, '<h3 class="text-lg font-serif text-foreground mt-6 mb-2">$1</h3>')
    .replace(/^## (.+)$/gm, '<h2 class="text-xl font-serif text-foreground mt-8 mb-3">$1</h2>')
    .replace(/^# (.+)$/gm, '<h1 class="text-2xl font-serif text-foreground mt-8 mb-3">$1</h1>')
    .replace(/\*\*(.+?)\*\*/g, '<strong class="font-semibold text-foreground">$1</strong>')
    .replace(/\*(.+?)\*/g, '<em>$1</em>')
    .replace(/\[(.+?)\]\((.+?)\)/g, (_, text, url) => {
      const isAffiliate = url.includes('adtraction') || url.includes('awin') || url.includes('tradedoubler') || url.includes('partner') || text.includes('→') || text.toLowerCase().includes('köp');
      if (isAffiliate) return `<a href="${url}" target="_blank" rel="noopener sponsored" class="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:opacity-90 transition-opacity no-underline">${text}</a>`;
      return `<a href="${url}" target="_blank" rel="noopener" class="text-primary underline underline-offset-2 hover:opacity-80">${text}</a>`;
    })
    .replace(/^[-*] (.+)$/gm, '<li class="ml-4 list-disc text-foreground/90">$1</li>')
    .replace(/^\d+\. (.+)$/gm, '<li class="ml-4 list-decimal text-foreground/90">$1</li>')
    .replace(/!\[(.+?)\]\((.+?)\)/g, '<img src="$2" alt="$1" class="rounded-xl my-4 w-full max-w-lg" loading="lazy" />')
    .replace(/^> (.+)$/gm, '<blockquote class="border-l-4 border-primary/30 pl-4 py-1 my-4 text-muted-foreground italic">$1</blockquote>')
    .replace(/^---$/gm, '<hr class="my-6 border-border/50" />')
    .replace(/\n\n/g, '</p><p class="text-foreground/85 leading-relaxed mb-4">')
    .replace(/\n/g, '<br />');

  return `<p class="text-foreground/85 leading-relaxed mb-4">${html}</p>`;
}

function renderContent(content: string, otherPosts?: { title: string; slug: string }[], glossary?: { keyword: string; url: string; rel: string }[]): string {
  let raw = isHtmlContent(content) ? content : renderMarkdown(content);

  if (glossary && glossary.length > 0) {
    const sorted = [...glossary].sort((a, b) => b.keyword.length - a.keyword.length);
    const linked = new Set<string>();
    for (const entry of sorted) {
      if (linked.has(entry.keyword.toLowerCase())) continue;
      const escaped = entry.keyword.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const regex = new RegExp(`(?<![<\\/a-zA-Z"=])\\b(${escaped})\\b(?![^<]*>)(?![^<]*<\\/a>)`, 'i');
      if (regex.test(raw)) {
        raw = raw.replace(regex, `<a href="${entry.url}" target="_blank" rel="${entry.rel}" class="text-primary underline underline-offset-2 hover:opacity-80 transition-opacity"  title="${entry.keyword}">$1</a>`);
        linked.add(entry.keyword.toLowerCase());
      }
    }
  }

  if (otherPosts && otherPosts.length > 0) {
    const linked = new Set<string>();
    const stopWords = new Set(['guide', 'allt', 'bästa', 'enkla', 'denna', 'dessa', 'tips', 'från', 'till', 'eller', 'sverige', 'hemma', 'första', 'andra', 'igång', 'behöver', 'säker']);
    const keywordMap: { keyword: string; slug: string; title: string }[] = [];
    for (const other of otherPosts) {
      const parts = other.title.split(/\s*[–—|]\s*/);
      if (parts[0]) keywordMap.push({ keyword: parts[0].trim(), slug: other.slug, title: other.title });
      keywordMap.push({ keyword: other.slug.replace(/-/g, ' '), slug: other.slug, title: other.title });
      const words = other.title.toLowerCase().split(/[\s–—,.:]+/).filter(w => w.length >= 5 && !stopWords.has(w));
      for (const word of words) keywordMap.push({ keyword: word, slug: other.slug, title: other.title });
    }
    keywordMap.sort((a, b) => b.keyword.length - a.keyword.length);
    for (const entry of keywordMap) {
      if (linked.size >= 5) break;
      if (linked.has(entry.slug)) continue;
      const escaped = entry.keyword.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const regex = new RegExp(`(?<![<\\/a-zA-Z"=])\\b(${escaped})\\b(?![^<]*>)(?![^<]*<\\/a>)(?![^<]*<\\/h[1-6]>)`, 'i');
      if (regex.test(raw)) {
        raw = raw.replace(regex, `<a href="/blogg/${entry.slug}" class="text-primary underline underline-offset-2 hover:opacity-80 transition-opacity" title="${entry.title.replace(/"/g, '&quot;')}">$1</a>`);
        linked.add(entry.slug);
      }
    }
  }

  return DOMPurify.sanitize(raw, {
    ADD_TAGS: ['iframe', 'video', 'source', 'picture', 'details', 'summary'],
    ADD_ATTR: ['allow', 'allowfullscreen', 'frameborder', 'scrolling', 'loading', 'target', 'rel', 'title'],
  });
}

export default function GuideArticle() {
  const { slug } = useParams<{ slug: string }>();

  const { data: post, isLoading, isError } = useQuery({
    queryKey: ['blog-post', slug],
    queryFn: async () => {
      const { data, error } = await supabase.from('blog_posts').select('*').eq('slug', slug).eq('is_published', true).single();
      if (error) throw error;
      const { data: profile } = await supabase.from('profiles').select('display_name').eq('user_id', data.author_id).single();
      return { ...data, author_name: profile?.display_name || 'Odlingsdagboken' };
    },
    enabled: !!slug,
  });

  const { data: allPosts = [] } = useQuery({
    queryKey: ['all-published-posts'],
    queryFn: async () => {
      const { data, error } = await supabase.from('blog_posts').select('id, title, slug, excerpt, cover_image_url, category, tags, published_at').eq('is_published', true).order('published_at', { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const postGlossaryIds: string[] = (post as any)?.glossary_ids || [];
  const { data: glossary = [] } = useQuery({
    queryKey: ['link-glossary', postGlossaryIds],
    queryFn: async () => {
      if (postGlossaryIds.length === 0) return [];
      const { data, error } = await supabase.from('link_glossary').select('keyword, url, rel').eq('is_active', true).in('id', postGlossaryIds);
      if (error) throw error;
      return data as { keyword: string; url: string; rel: string }[];
    },
    enabled: !!post,
  });

  const jsonLd = useMemo(() => {
    if (!post) return undefined;
    const BASE = 'https://odlingsdagboken.com';
    const fullUrl = `${BASE}/blogg/${post.slug}`;
    const imageUrl = post.cover_image_url ? (post.cover_image_url.startsWith('http') ? post.cover_image_url : `${BASE}${post.cover_image_url}`) : `${BASE}/blog-images/spring-garden.jpg`;
    const graph: any[] = [
      { '@type': 'Article', '@id': `${fullUrl}#article`, headline: post.title, description: post.meta_description || post.excerpt || '', image: { '@type': 'ImageObject', url: imageUrl }, datePublished: post.published_at, dateModified: post.updated_at || post.published_at, author: { '@type': 'Organization', name: 'Odlingsdagboken', url: BASE, '@id': `${BASE}/#organization` }, publisher: { '@type': 'Organization', name: 'Odlingsdagboken', url: BASE, '@id': `${BASE}/#organization`, logo: { '@type': 'ImageObject', url: `${BASE}/favicon.ico` } }, mainEntityOfPage: { '@type': 'WebPage', '@id': fullUrl }, isPartOf: { '@id': `${BASE}/#website` }, inLanguage: 'sv-SE', ...(post.tags?.length ? { keywords: post.tags.join(', ') } : {}), wordCount: post.content.replace(/<[^>]+>/g, '').split(/\s+/).length },
      { '@type': 'BreadcrumbList', itemListElement: [{ '@type': 'ListItem', position: 1, name: 'Hem', item: BASE }, { '@type': 'ListItem', position: 2, name: 'Blogg', item: `${BASE}/blogg` }, { '@type': 'ListItem', position: 3, name: post.title, item: fullUrl }] },
    ];
    return graph;
  }, [post]);

  const articleMeta = useMemo(() => post ? { publishedTime: post.published_at || undefined, modifiedTime: post.updated_at || post.published_at || undefined, author: 'Odlingsdagboken', section: post.category || undefined, tags: post.tags || undefined } : undefined, [post]);
  const seoImage = post?.cover_image_url || '/blog-images/spring-garden.jpg';

  if (isLoading) return <div className="min-h-screen flex items-center justify-center bg-background"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>;
  if (isError || !post) return <div className="min-h-screen bg-background flex flex-col items-center justify-center gap-4 px-4"><BookOpen className="h-10 w-10 text-muted-foreground/30" /><h1 className="font-serif text-xl text-foreground">Artikeln hittades inte</h1><Link to="/blogg"><Button variant="outline" className="rounded-xl"><ArrowLeft className="h-4 w-4 mr-1" /> Tillbaka till bloggen</Button></Link></div>;

  return (
    <div className="min-h-screen bg-background">
      <Seo title={post.meta_title || post.title + ' | Odlingsdagboken'} description={post.meta_description || post.excerpt || ''} path={`/blogg/${slug || ''}`} ogType="article" ogImage={seoImage} ogImageAlt={post.title} jsonLd={jsonLd} articleMeta={articleMeta} />
      <VisitorWelcomePopup />
      <header className="border-b border-border/50 bg-card/50 backdrop-blur-sm sticky top-0 z-30"><div className="max-w-4xl mx-auto px-4 py-3 flex items-center justify-between"><Link to="/blogg" className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"><ArrowLeft className="h-4 w-4" /> Blogg</Link><Link to="/login?mode=register"><Button size="sm" className="rounded-xl text-xs gap-1"><Sprout className="h-3 w-3" /> Spara råd</Button></Link></div></header>

      <article className="max-w-3xl mx-auto px-4 py-8 sm:py-12">
        <div className="flex items-center gap-2 flex-wrap mb-4">
          {post.category && <Badge variant="secondary" className="text-[10px]">{categoryLabels[post.category] || post.category}</Badge>}
          {post.published_at && <span className="text-xs text-muted-foreground flex items-center gap-1"><CalendarDays className="h-3 w-3" />{new Date(post.published_at).toLocaleDateString('sv-SE', { year: 'numeric', month: 'long', day: 'numeric' })}</span>}
          {post.author_name && <span className="text-xs text-muted-foreground">av <span className="font-medium text-foreground/80">{post.author_name}</span></span>}
        </div>
        <h1 className="text-2xl sm:text-3xl lg:text-4xl font-serif text-foreground leading-tight mb-4">{post.title}</h1>
        {post.excerpt && <p className="text-lg text-muted-foreground leading-relaxed mb-6">{post.excerpt}</p>}
        {post.cover_image_url && <img src={post.cover_image_url} alt={post.title} className="w-full rounded-2xl aspect-video object-cover mb-8" />}

        <InlineSignupCTA title="Vill du spara rådet i din egen odlingsplan?" description="Skapa ett gratis konto och få en plats där du kan logga sådder, skördar och anteckningar – så råden blir användbara i din egen trädgård." buttonLabel="Spara i min odling" />

        <div className="prose-custom" dangerouslySetInnerHTML={{ __html: renderContent(post.content, allPosts.filter(p => p.slug !== slug).map(p => ({ title: p.title, slug: p.slug })), glossary) }} />

        <GroPreviewCTA className="mt-10" />

        <div className="mt-8 pt-6 border-t border-border/50 space-y-4">
          <ShareButtons url={`https://odlingsdagboken.com/blogg/${post.slug}`} title={post.title} />
          {post.tags && post.tags.length > 0 && <div className="flex items-center gap-2 flex-wrap">{post.tags.map((tag: string) => <Link key={tag} to={`/blogg/tagg/${encodeURIComponent(tag)}`}><Badge variant="outline" className="text-[10px] hover:bg-primary/10 transition-colors cursor-pointer">#{tag}</Badge></Link>)}</div>}
        </div>

        <BlogComments postId={post.id} />

        <div className="mt-12 bg-gradient-to-br from-primary/5 via-card to-accent/5 rounded-2xl p-6 sm:p-8 border border-primary/15 text-center shadow-sm">
          <span className="text-3xl mb-3 block">🌱</span>
          <h3 className="font-serif text-lg text-foreground mb-2">Vill du komma ihåg vad som fungerar i din egen odling?</h3>
          <p className="text-sm text-muted-foreground max-w-md mx-auto mb-2">Skapa ett gratis konto i Odlingsdagboken och logga sådder, skördar och anteckningar år efter år.</p>
          <div className="flex flex-wrap items-center justify-center gap-3 text-[11px] text-muted-foreground mb-5"><span>✅ Gratis att börja</span><span>✅ 14 dagars Plus gratis</span><span>✅ Inget betalkort krävs</span></div>
          <Link to="/login?mode=register"><Button size="lg" className="rounded-xl gap-2 h-12 px-8 text-base shadow-lg"><Sprout className="h-4 w-4" /> Börja gratis</Button></Link>
        </div>

        {(() => {
          const otherPosts = allPosts.filter(p => p.slug !== slug);
          if (otherPosts.length === 0) return null;
          const postTags = new Set(post.tags || []);
          const scored = otherPosts.map(p => { let score = 0; if (p.category === post.category) score += 2; (p.tags || []).forEach(t => { if (postTags.has(t)) score += 1; }); return { ...p, score }; });
          scored.sort((a, b) => b.score - a.score || (new Date(b.published_at || 0).getTime() - new Date(a.published_at || 0).getTime()));
          const related = scored.slice(0, 3);
          return <div className="mt-14 pt-8 border-t border-border/50"><h2 className="font-serif text-xl text-foreground mb-5 flex items-center gap-2"><BookOpen className="h-5 w-5 text-primary" /> Fler artiklar</h2><div className="grid gap-4 sm:grid-cols-3">{related.map(r => <Link key={r.id} to={`/blogg/${r.slug}`} className="group"><div className="rounded-xl border border-border/50 overflow-hidden hover:shadow-md transition-all duration-300 h-full bg-card">{r.cover_image_url ? <div className="aspect-video overflow-hidden"><img src={r.cover_image_url} alt={r.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" loading="lazy" /></div> : <div className="aspect-video bg-gradient-to-br from-primary/8 to-accent/8 flex items-center justify-center"><BookOpen className="h-6 w-6 text-primary/30" /></div>}<div className="p-3 space-y-1"><h3 className="font-serif text-sm text-foreground leading-snug group-hover:text-primary transition-colors line-clamp-2">{r.title}</h3>{r.excerpt && <p className="text-xs text-muted-foreground line-clamp-2">{r.excerpt}</p>}</div></div></Link>)}</div></div>;
        })()}
      </article>

      <footer className="border-t border-border/50 mt-16 py-8 px-4"><div className="max-w-4xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-muted-foreground"><span>© {new Date().getFullYear()} Odlingsdagboken</span><div className="flex gap-4"><Link to="/" className="hover:text-foreground transition-colors">Startsidan</Link><Link to="/blogg" className="hover:text-foreground transition-colors">Blogg</Link><Link to="/terms" className="hover:text-foreground transition-colors">Villkor</Link></div></div></footer>
    </div>
  );
}
