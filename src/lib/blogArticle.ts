/**
 * Deterministisk parsing av rubriker + slug-generering för TOC,
 * samt relaterad-sortering. Extraheras för testbarhet.
 */

export interface TocHeading {
  level: 2 | 3;
  text: string;
  id: string;
}

const SWEDISH_MAP: Record<string, string> = { å: 'a', ä: 'a', ö: 'o' };

export function slugify(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/[åäö]/g, (c) => SWEDISH_MAP[c] || c)
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 60);
}

/**
 * Extraherar H2/H3 från HTML-sträng utan att modifiera originalet.
 * Returnerar TOC-poster med unika, deterministiska id:n.
 */
export function extractHeadings(html: string): TocHeading[] {
  if (!html) return [];
  const regex = /<h([23])(?:\s+[^>]*)?>([\s\S]*?)<\/h\1>/gi;
  const seen = new Map<string, number>();
  const headings: TocHeading[] = [];
  let match: RegExpExecArray | null;
  while ((match = regex.exec(html)) !== null) {
    const level = Number(match[1]) as 2 | 3;
    const text = match[2].replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim();
    if (!text) continue;
    let baseId = slugify(text);
    if (!baseId) baseId = `avsnitt-${headings.length + 1}`;
    const count = seen.get(baseId) || 0;
    const id = count === 0 ? baseId : `${baseId}-${count + 1}`;
    seen.set(baseId, count + 1);
    headings.push({ level, text, id });
  }
  return headings;
}

/**
 * Injicerar id="…" på H2/H3 så att TOC-länkarna landar rätt.
 * Bevarar all annan HTML orörd.
 */
export function injectHeadingIds(html: string, headings: TocHeading[]): string {
  if (!html || headings.length === 0) return html;
  let i = 0;
  return html.replace(/<h([23])((?:\s+[^>]*)?)>/gi, (full, lvl, attrs) => {
    const heading = headings[i];
    i += 1;
    if (!heading || String(heading.level) !== String(lvl)) return full;
    if (/\sid=/.test(attrs)) return full;
    return `<h${lvl}${attrs} id="${heading.id}">`;
  });
}

export interface RelatedPost {
  id: string;
  slug: string;
  title: string;
  category?: string | null;
  tags?: string[] | null;
  published_at?: string | null;
  excerpt?: string | null;
  cover_image_url?: string | null;
}

/**
 * Sorterar relaterade artiklar efter gemensam kategori/tags och
 * exkluderar aktuell artikel. Nyare artiklar prioriteras vid samma poäng.
 */
export function sortRelatedPosts(
  posts: RelatedPost[],
  current: { slug: string; category?: string | null; tags?: string[] | null },
  limit = 3,
): RelatedPost[] {
  const currentTags = new Set(current.tags || []);
  const scored = posts
    .filter((p) => p.slug !== current.slug)
    .map((p) => {
      let score = 0;
      if (current.category && p.category === current.category) score += 2;
      for (const tag of p.tags || []) if (currentTags.has(tag)) score += 1;
      return { post: p, score };
    })
    .sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score;
      const ta = a.post.published_at ? new Date(a.post.published_at).getTime() : 0;
      const tb = b.post.published_at ? new Date(b.post.published_at).getTime() : 0;
      return tb - ta;
    });
  return scored.slice(0, limit).map((s) => s.post);
}

/**
 * Ämnesanpassad CTA baserat på kategori/tags. Deterministisk match — ingen AI.
 */
export interface ContextualCta {
  title: string;
  description: string;
  buttonLabel: string;
  href: string;
}

export function pickContextualCta(post: {
  category?: string | null;
  tags?: string[] | null;
}): ContextualCta {
  const tags = new Set((post.tags || []).map((t) => t.toLowerCase()));
  const cat = (post.category || '').toLowerCase();
  const has = (needle: string) => tags.has(needle) || cat.includes(needle);

  if (has('krukvaxter') || has('krukväxter') || has('inomhus')) {
    return {
      title: 'Håll koll på dina krukväxter',
      description: 'Följ vattenrytm, jordfukt och hälsa för varje planta med Växtpuls.',
      buttonLabel: 'Prova Växtpuls gratis',
      href: '/login?mode=register',
    };
  }
  if (has('sadd') || has('sådd') || has('nyborjare') || has('såkalender') || has('sakalender')) {
    return {
      title: 'Logga din sådd — år efter år',
      description: 'Så-datum, gronings-% och skörd i samma dagbok. Se när det är dags att så.',
      buttonLabel: 'Kom igång med sådden',
      href: '/login?mode=register',
    };
  }
  if (has('skord') || has('skörd') || has('harvest')) {
    return {
      title: 'Väg och spara varje skörd',
      description: 'Se vad som gav mest per bädd och år, i kilo och kronor.',
      buttonLabel: 'Börja logga skörd',
      href: '/login?mode=register',
    };
  }
  if (has('vaxtfoljd') || has('växtföljd') || has('rotation') || has('kompanjon') || has('samplantering')) {
    return {
      title: 'Planera nästa års växtföljd',
      description: 'Färgkodad växtföljdsplan hjälper dig undvika samma familj två år i rad.',
      buttonLabel: 'Öppna växtföljden',
      href: '/login?mode=register',
    };
  }
  if (has('pallkrage') || has('bädd') || has('bad')) {
    return {
      title: 'Ge varje bädd sin egen historik',
      description: 'Anteckningar, foton och skörd per pallkrage och bädd.',
      buttonLabel: 'Skapa din första bädd',
      href: '/login?mode=register',
    };
  }
  if (has('skadedjur') || has('pest') || has('sjukdom')) {
    return {
      title: 'Loggför skadedjur och åtgärder',
      description: 'Håll koll på vad som kom, när, och vad som faktiskt hjälpte.',
      buttonLabel: 'Prova Odlingsdagboken',
      href: '/login?mode=register',
    };
  }
  return {
    title: 'Skapa din egen odlingsdagbok',
    description: 'Sådder, skördar, foton och anteckningar — allt på samma ställe.',
    buttonLabel: 'Skapa gratis konto',
    href: '/login?mode=register',
  };
}
