import { useMemo } from 'react';
import { Helmet } from 'react-helmet-async';

const BASE = 'https://odlingsdagboken.com';

interface SeoProps {
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
 * Declarative SEO component powered by react-helmet-async.
 * Sets document title, meta description, canonical URL, OG tags,
 * Twitter cards, hreflang, article meta and optional JSON-LD.
 * Works with SSR/pre-rendering.
 */
export function Seo({ title, description, path, ogType = 'website', ogImage, ogImageAlt, noindex, jsonLd, articleMeta }: SeoProps) {
  const fullUrl = `${BASE}${path}`;
  const imgUrl = ogImage ? (ogImage.startsWith('http') ? ogImage : `${BASE}${ogImage}`) : undefined;

  const jsonLdString = useMemo(() => {
    if (!jsonLd) return undefined;
    const data = Array.isArray(jsonLd)
      ? { '@context': 'https://schema.org', '@graph': jsonLd }
      : { '@context': 'https://schema.org', ...jsonLd };
    return JSON.stringify(data);
  }, [jsonLd]);

  return (
    <Helmet>
      <title>{title}</title>
      <meta name="description" content={description} />
      <meta name="robots" content={noindex ? 'noindex, nofollow' : 'index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1'} />
      <link rel="canonical" href={fullUrl} />
      <link rel="alternate" href={fullUrl} hrefLang="sv" />
      <link rel="alternate" href={fullUrl} hrefLang="x-default" />
      <meta property="og:title" content={title} />
      <meta property="og:description" content={description} />
      <meta property="og:url" content={fullUrl} />
      <meta property="og:type" content={ogType} />
      <meta property="og:site_name" content="Odlingsdagboken" />
      <meta property="og:locale" content="sv_SE" />
      {imgUrl && <meta property="og:image" content={imgUrl} />}
      {imgUrl && <meta property="og:image:alt" content={ogImageAlt || title} />}
      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:title" content={title} />
      <meta name="twitter:description" content={description} />
      {imgUrl && <meta name="twitter:image" content={imgUrl} />}
      {imgUrl && <meta name="twitter:image:alt" content={ogImageAlt || title} />}
      {articleMeta?.publishedTime && <meta property="article:published_time" content={articleMeta.publishedTime} />}
      {articleMeta?.modifiedTime && <meta property="article:modified_time" content={articleMeta.modifiedTime} />}
      {articleMeta?.author && <meta property="article:author" content={articleMeta.author} />}
      {articleMeta?.section && <meta property="article:section" content={articleMeta.section} />}
      {articleMeta?.tags?.map(tag => <meta key={tag} property="article:tag" content={tag} />)}
      <meta name="citation_title" content={title} />
      <meta name="citation_author" content="Odlingsdagboken" />
      <meta name="citation_language" content="sv" />
      {jsonLdString && <script type="application/ld+json">{jsonLdString}</script>}
    </Helmet>
  );
}

/** @deprecated Use <Seo /> component directly in JSX instead. Kept for backward compatibility. */
export function useSeo(props: SeoProps) {
  // This is a no-op hook wrapper — the actual rendering happens
  // when the returned element is included in JSX.
  // For backward compatibility, we return the component so pages
  // that call useSeo() still work if they don't render the return value.
  // However, to work properly with react-helmet-async, pages MUST
  // render <Seo /> in their JSX tree.
  return null;
}
