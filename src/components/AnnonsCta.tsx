import { ExternalLink } from 'lucide-react';

type AnnonsCtaProps = {
  href: string;
  disclosure?: string;
  linkText: string;
  rel?: string;
  className?: string;
};

/** Visible sponsored CTA. Disclosure label stays "Annons". */
export default function AnnonsCta({
  href,
  disclosure = 'Annons',
  linkText,
  rel = 'sponsored noopener noreferrer',
  className = '',
}: AnnonsCtaProps) {
  return (
    <aside
      aria-label={disclosure}
      data-cta="annons"
      className={`my-10 rounded-2xl border border-border/60 bg-card/60 p-5 sm:p-6 ${className}`}
    >
      <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground mb-3">
        {disclosure}
      </p>
      <a
        href={href}
        target="_blank"
        rel={rel}
        className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground no-underline hover:opacity-90"
      >
        {linkText}
        <ExternalLink className="h-3.5 w-3.5" />
      </a>
    </aside>
  );
}
