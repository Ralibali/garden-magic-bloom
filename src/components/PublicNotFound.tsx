import { Link, useNavigate } from 'react-router-dom';
import { useState } from 'react';
import { Input } from '@/components/ui/input';
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
  const [query, setQuery] = useState('');
  const navigate = useNavigate();
  return (
    <PublicLayout>
      <Seo
        title={`${title} | Odlingsdagboken`}
        description={description}
        path={path}
        noindex
      />
      <section className="mx-auto flex min-h-[60vh] max-w-xl flex-col items-center justify-center px-4 py-16 text-center">
        <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10 text-primary">
          <Sprout className="h-8 w-8" />
        </div>
        <h1 className="mt-6 font-serif text-3xl text-foreground">{title}</h1>
        <p className="mt-3 max-w-md text-muted-foreground">{description}</p>
        <form role="search" aria-label="Sök växtguide" className="my-6 flex w-full gap-2" onSubmit={event => { event.preventDefault(); navigate(`/vaxter?q=${encodeURIComponent(query.trim())}`) }}><Input aria-label="Sök växt" placeholder="Sök efter en växt" value={query} onChange={e => setQuery(e.target.value)} /><Button type="submit">Sök</Button></form>
        <nav aria-label="Hitta vidare" className="flex flex-wrap gap-4 justify-center">{[['Växter', '/vaxter'], ['Såkalender', '/sakalender'], ['Odlingskalender', '/odlingskalender'], ['Blogg', '/blogg']].map(([label, to]) => <Link className="text-primary underline min-h-11" key={to} to={to}>{label}</Link>)}</nav>
        <Button asChild variant="outline" className="mt-7 gap-2">
          <Link to={backTo}>
            <ArrowLeft className="h-4 w-4" /> {backLabel}
          </Link>
        </Button>
      </section>
    </PublicLayout>
  );
}
