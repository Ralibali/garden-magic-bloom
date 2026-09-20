import { useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Flower2, Sprout } from 'lucide-react';
import type { Cultivation } from '@/lib/cultivations';
import { getDiaryPhotoUrl } from '@/lib/diaryApi';

/** Personal photos stay personal; a missing photo uses an honest, quiet placeholder. */
export default function CultivationImage({ item }: { item: Cultivation }) {
  const path = item.latestPhoto?.photo_url;
  const { data: url } = useQuery({ queryKey: ['diary-photo-url', path], queryFn: () => getDiaryPhotoUrl(path!), enabled: !!path, staleTime: 45 * 60_000, retry: 1 });
  const [failed, setFailed] = useState(false);
  useEffect(() => setFailed(false), [url]);
  const Icon = item.source === 'plant' ? Flower2 : Sprout;
  return <div className="garden-plant-image">
    {url && !failed ? <img src={url} onError={() => setFailed(true)} alt={item.latestPhoto?.caption || item.name} loading="lazy" className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.03] motion-reduce:transform-none" /> : <div className="flex flex-col items-center gap-3 text-primary/70"><Icon className="h-10 w-10" strokeWidth={1.25} /><span className="text-xs">{path ? 'Bilden kunde inte visas' : 'Väntar på sitt första foto'}</span></div>}
  </div>;
}
