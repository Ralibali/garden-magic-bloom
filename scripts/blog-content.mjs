import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import ReactMarkdown from 'react-markdown';
import createDOMPurify from 'dompurify';
import { JSDOM } from 'jsdom';

const window = new JSDOM('').window;
const purifier = createDOMPurify(window);

/** Render the stored article in the initial response, including its final section. */
export function renderBlogContent(content) {
  if (typeof content !== 'string' || !content.trim()) return '';
  const html = content.trimStart().startsWith('<')
    ? content
    : renderToStaticMarkup(createElement(ReactMarkdown, null, content));
  const clean = purifier.sanitize(html, {
    ALLOWED_TAGS: ['p', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'ul', 'ol', 'li', 'strong', 'em', 'b', 'i', 'a', 'blockquote', 'table', 'thead', 'tbody', 'tr', 'th', 'td', 'figure', 'img', 'figcaption', 'br', 'hr', 'pre', 'code', 'details', 'summary'],
    ALLOWED_ATTR: ['href', 'src', 'alt', 'title', 'rel', 'id', 'colspan', 'rowspan', 'start'],
    ALLOW_DATA_ATTR: false,
    ALLOW_ARIA_ATTR: false,
  });
  // The page template owns the article H1.
  return clean.replace(/<(\/?)h1\b/g, '<$1h2');
}
