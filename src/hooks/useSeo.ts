import { useMemo } from 'react';
import { Helmet } from 'react-helmet-async';
import React from 'react';

const BASE = 'https://odlingsdagboken.com';

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
 * Returns a <Helmet> element that sets document title, meta description,
 * canonical URL, OG tags, Twitter cards, hreflang, article meta and optional JSON-LD.
 * Works with SSR/pre-rendering via react-helmet-async.
 */
export function useSeo({ title, description, path, ogType = 'website', ogImage, ogImageAlt, noindex, jsonLd, articleMeta }: SeoOptions) {
  const fullUrl = `${BASE}${path}`;
  const imgUrl = ogImage ? (ogImage.startsWith('http') ? ogImage : `${BASE}${ogImage}`) : undefined;

  const jsonLdString = useMemo(() => {
    if (!jsonLd) return undefined;
    const data = Array.isArray(jsonLd)
      ? { '@context': 'https://schema.org', '@graph': jsonLd }
      : { '@context': 'https://schema.org', ...jsonLd };
    return JSON.stringify(data);
  }, [jsonLd]);

  return React.createElement(Helmet, null,
    // Title
    React.createElement('title', null, title),

    // Meta description
    React.createElement('meta', { name: 'description', content: description }),

    // Robots
    React.createElement('meta', { name: 'robots', content: noindex ? 'noindex, nofollow' : 'index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1' }),

    // Canonical
    React.createElement('link', { rel: 'canonical', href: fullUrl }),

    // Hreflang
    React.createElement('link', { rel: 'alternate', href: fullUrl, hrefLang: 'sv' }),
    React.createElement('link', { rel: 'alternate', href: fullUrl, hrefLang: 'x-default' }),

    // OG tags
    React.createElement('meta', { property: 'og:title', content: title }),
    React.createElement('meta', { property: 'og:description', content: description }),
    React.createElement('meta', { property: 'og:url', content: fullUrl }),
    React.createElement('meta', { property: 'og:type', content: ogType }),
    React.createElement('meta', { property: 'og:site_name', content: 'Odlingsdagboken' }),
    React.createElement('meta', { property: 'og:locale', content: 'sv_SE' }),

    // OG image
    ...(imgUrl ? [
      React.createElement('meta', { property: 'og:image', content: imgUrl }),
      React.createElement('meta', { property: 'og:image:alt', content: ogImageAlt || title }),
    ] : []),

    // Twitter Card
    React.createElement('meta', { name: 'twitter:card', content: 'summary_large_image' }),
    React.createElement('meta', { name: 'twitter:title', content: title }),
    React.createElement('meta', { name: 'twitter:description', content: description }),
    ...(imgUrl ? [
      React.createElement('meta', { name: 'twitter:image', content: imgUrl }),
      React.createElement('meta', { name: 'twitter:image:alt', content: ogImageAlt || title }),
    ] : []),

    // Article meta
    ...(articleMeta?.publishedTime ? [React.createElement('meta', { property: 'article:published_time', content: articleMeta.publishedTime })] : []),
    ...(articleMeta?.modifiedTime ? [React.createElement('meta', { property: 'article:modified_time', content: articleMeta.modifiedTime })] : []),
    ...(articleMeta?.author ? [React.createElement('meta', { property: 'article:author', content: articleMeta.author })] : []),
    ...(articleMeta?.section ? [React.createElement('meta', { property: 'article:section', content: articleMeta.section })] : []),
    ...(articleMeta?.tags?.map(tag => React.createElement('meta', { key: tag, property: 'article:tag', content: tag })) || []),

    // AI citation meta
    React.createElement('meta', { name: 'citation_title', content: title }),
    React.createElement('meta', { name: 'citation_author', content: 'Odlingsdagboken' }),
    React.createElement('meta', { name: 'citation_language', content: 'sv' }),

    // JSON-LD
    ...(jsonLdString ? [React.createElement('script', { type: 'application/ld+json' }, jsonLdString)] : []),
  );
}
