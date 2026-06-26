import { Link } from 'react-router-dom';
import { ArrowLeft, Sprout } from 'lucide-react';
import PublicLayout from '@/components/PublicLayout';
import { Seo } from '@/hooks/useSeo';
import { Button } from '@/components/ui/button';

interface PublicNotFoundProps {
  path: string;
  title?: string;
  description?: string;
  backTo?: string;
  backLabel?: string;
}

export default function PublicNotFound({
  path,
  title = 'Sidan hittades inte',
  description = 'Innehållet du letade efter finns inte eller är inte längre publicerat.',
  backTo = '/',
  backLabel = 'Tillbaka till startsidan',
}: PublicNotFoundProps) {
  return (
    <PublicLayout>
      <Seo
        title={`${title} | Odlingsdagboken`}
        description={description}
        path={path}
        noindex
      />
      <main className="mx-auto flex min-h-[60vh] max-w-xl flex-col items-center justify-center px-4 py-16 text-center">
        <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10 text-primary">
          <Sprout className="h-8 w-8" />
        </div>
        <h1 className="mt-6 font-serif text-3xl text-foreground">{title}</h1>
        <p className="mt-3 max-w-md text-muted-foreground">{description}</p>
        <Button asChild variant="outline" className="mt-7 gap-2">
          <Link to={backTo}>
            <ArrowLeft className="h-4 w-4" /> {backLabel}
          </Link>
        </Button>
      </main>
    </PublicLayout>
  );
}
