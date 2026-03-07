import { useEffect } from 'react';

const BASE = 'https://odlingsdagboken.se';

interface SeoOptions {
  title: string;
  description: string;
  path: string;
  ogType?: string;
  ogImage?: string;
  ogImageAlt?: string;
  noindex?: boolean;
  jsonLd?: Record<string, any> | Record<string, any>[];
  articleMeta?: {
    publishedTime?: string;
    modifiedTime?: string;
    author?: string;
    section?: string;
    tags?: string[];
  };
}

/**
 * Sets document title, meta description, canonical URL, OG tags, Twitter cards,
 * hreflang, article meta and optional JSON-LD. Cleans up on unmount.
 */
export function useSeo({ title, description, path, ogType = 'website', ogImage, ogImageAlt, noindex, jsonLd, articleMeta }: SeoOptions) {
  useEffect(() => {
    const createdElements: HTMLElement[] = [];

    const setMeta = (attr: string, key: string, content: string) => {
      let el = document.querySelector(`meta[${attr}="${key}"]`) as HTMLMetaElement;
      if (!el) {
        el = document.createElement('meta');
        el.setAttribute(attr, key);
        document.head.appendChild(el);
        createdElements.push(el);
      }
      el.setAttribute('content', content);
    };

    const addLink = (rel: string, href: string, attrs?: Record<string, string>) => {
      const el = document.createElement('link');
      el.rel = rel;
      el.href = href;
      if (attrs) Object.entries(attrs).forEach(([k, v]) => el.setAttribute(k, v));
      document.head.appendChild(el);
      createdElements.push(el);
    };

    // Title
    document.title = title;

    // Meta description
    setMeta('name', 'description', description);

    // Robots
    setMeta('name', 'robots', noindex ? 'noindex, nofollow' : 'index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1');

    // Canonical
    let canonical = document.querySelector('link[rel="canonical"]') as HTMLLinkElement;
    if (canonical) canonical.remove();
    addLink('canonical', `${BASE}${path}`);

    // Hreflang
    addLink('alternate', `${BASE}${path}`, { hreflang: 'sv' });
    addLink('alternate', `${BASE}${path}`, { hreflang: 'x-default' });

    // OG tags
    const fullUrl = `${BASE}${path}`;
    setMeta('property', 'og:title', title);
    setMeta('property', 'og:description', description);
    setMeta('property', 'og:url', fullUrl);
    setMeta('property', 'og:type', ogType);
    setMeta('property', 'og:site_name', 'Odlingsdagboken');
    setMeta('property', 'og:locale', 'sv_SE');
    if (ogImage) {
      const imgUrl = ogImage.startsWith('http') ? ogImage : `${BASE}${ogImage}`;
      setMeta('property', 'og:image', imgUrl);
      setMeta('property', 'og:image:alt', ogImageAlt || title);
    }

    // Twitter Card
    setMeta('name', 'twitter:card', 'summary_large_image');
    setMeta('name', 'twitter:title', title);
    setMeta('name', 'twitter:description', description);
    if (ogImage) {
      const imgUrl = ogImage.startsWith('http') ? ogImage : `${BASE}${ogImage}`;
      setMeta('name', 'twitter:image', imgUrl);
      setMeta('name', 'twitter:image:alt', ogImageAlt || title);
    }

    // Article-specific meta
    if (articleMeta) {
      if (articleMeta.publishedTime) setMeta('property', 'article:published_time', articleMeta.publishedTime);
      if (articleMeta.modifiedTime) setMeta('property', 'article:modified_time', articleMeta.modifiedTime);
      if (articleMeta.author) setMeta('property', 'article:author', articleMeta.author);
      if (articleMeta.section) setMeta('property', 'article:section', articleMeta.section);
      if (articleMeta.tags) {
        articleMeta.tags.forEach(tag => {
          const el = document.createElement('meta');
          el.setAttribute('property', 'article:tag');
          el.setAttribute('content', tag);
          document.head.appendChild(el);
          createdElements.push(el);
        });
      }
    }

    // AI citation meta
    setMeta('name', 'citation_title', title);
    setMeta('name', 'citation_author', 'Odlingsdagboken');
    setMeta('name', 'citation_language', 'sv');

    // JSON-LD
    if (jsonLd) {
      let script = document.getElementById('json-ld-page') as HTMLScriptElement;
      if (!script) {
        script = document.createElement('script');
        script.id = 'json-ld-page';
        script.type = 'application/ld+json';
        document.head.appendChild(script);
        createdElements.push(script);
      }
      const data = Array.isArray(jsonLd)
        ? { '@context': 'https://schema.org', '@graph': jsonLd }
        : { '@context': 'https://schema.org', ...jsonLd };
      script.textContent = JSON.stringify(data);
    }

    return () => {
      document.title = 'Odlingsdagboken – Din digitala odlingsdagbok';
      createdElements.forEach(el => el.remove());
    };
  }, [title, description, path, ogType, ogImage, ogImageAlt, noindex, jsonLd, articleMeta]);
}
