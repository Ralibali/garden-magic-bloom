import { useState } from 'react';
import { Sprout } from 'lucide-react';

export default function PlantProfileImage({ src, name }: { src: string | null; name: string }) {
  const [failedSource, setFailedSource] = useState<string | null>(null);

  if (!src || src === failedSource) {
    return (
      <div className="flex h-full w-full flex-col items-center justify-center gap-3 bg-primary/5 text-primary">
        <Sprout className="h-12 w-12" aria-hidden="true" />
        <p className="text-sm text-muted-foreground">Bild saknas för {name}</p>
      </div>
    );
  }

  return <img src={src} alt={name} className="h-full w-full object-cover" loading="eager" onError={() => setFailedSource(src)} />;
}
