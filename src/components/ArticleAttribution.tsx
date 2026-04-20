import { Link } from 'react-router-dom';
import { ShieldCheck, Calendar } from 'lucide-react';

interface Props {
  updatedAt?: string | null;
  publishedAt?: string | null;
  reviewer?: string;
}

/**
 * E-E-A-T-signal: shows authorship, review status and last-updated date.
 * Renders semantic <address> + <time datetime> for AI/Google extraction.
 * Place near the bottom of long-form content (above CTA).
 */
export function ArticleAttribution({ updatedAt, publishedAt, reviewer = 'Christoffer Hansson' }: Props) {
  const fmt = (iso?: string | null) => {
    if (!iso) return null;
    const d = new Date(iso);
    if (isNaN(d.getTime())) return null;
    return {
      iso: d.toISOString().split('T')[0],
      label: d.toLocaleDateString('sv-SE', { year: 'numeric', month: 'long', day: 'numeric' }),
    };
  };
  const updated = fmt(updatedAt);
  const published = fmt(publishedAt);

  return (
    <aside className="border border-border/50 rounded-2xl p-5 bg-muted/20 mb-10 not-prose">
      <div className="flex items-start gap-3">
        <ShieldCheck className="h-5 w-5 text-primary shrink-0 mt-0.5" />
        <div className="space-y-2 text-sm">
          <p className="font-medium text-foreground">
            Skriven och granskad av Odlingsdagbokens redaktion
          </p>
          <address className="not-italic text-muted-foreground leading-relaxed">
            Faktagranskad av <strong className="text-foreground font-medium">{reviewer}</strong>, grundare av Odlingsdagboken.
            Läs mer om oss på <Link to="/om-oss" className="text-primary underline underline-offset-2">om oss-sidan</Link>.
          </address>
          {(updated || published) && (
            <p className="flex items-center gap-1.5 text-xs text-muted-foreground pt-1">
              <Calendar className="h-3 w-3" />
              {published && (
                <>
                  Publicerad <time dateTime={published.iso}>{published.label}</time>
                </>
              )}
              {published && updated && updated.iso !== published.iso && <span>·</span>}
              {updated && (!published || updated.iso !== published.iso) && (
                <>
                  Senast uppdaterad <time dateTime={updated.iso}>{updated.label}</time>
                </>
              )}
            </p>
          )}
        </div>
      </div>
    </aside>
  );
}
