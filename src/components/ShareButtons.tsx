import { Facebook, Twitter, MessageCircle, Link2, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useState } from 'react';

interface ShareButtonsProps {
  url: string;
  title: string;
}

export default function ShareButtons({ url, title }: ShareButtonsProps) {
  const [copied, setCopied] = useState(false);
  const encoded = encodeURIComponent(url);
  const encodedTitle = encodeURIComponent(title);

  const copy = async () => {
    await navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="flex items-center gap-2 flex-wrap">
      <span className="text-xs text-muted-foreground mr-1">Dela:</span>
      <Button size="sm" variant="outline" className="rounded-lg h-8 w-8 p-0" asChild>
        <a href={`https://www.facebook.com/sharer/sharer.php?u=${encoded}`} target="_blank" rel="noopener noreferrer" aria-label="Dela på Facebook">
          <Facebook className="h-3.5 w-3.5" />
        </a>
      </Button>
      <Button size="sm" variant="outline" className="rounded-lg h-8 w-8 p-0" asChild>
        <a href={`https://twitter.com/intent/tweet?url=${encoded}&text=${encodedTitle}`} target="_blank" rel="noopener noreferrer" aria-label="Dela på X">
          <Twitter className="h-3.5 w-3.5" />
        </a>
      </Button>
      <Button size="sm" variant="outline" className="rounded-lg h-8 w-8 p-0" asChild>
        <a href={`https://wa.me/?text=${encodedTitle}%20${encoded}`} target="_blank" rel="noopener noreferrer" aria-label="Dela på WhatsApp">
          <MessageCircle className="h-3.5 w-3.5" />
        </a>
      </Button>
      <Button size="sm" variant="outline" className="rounded-lg h-8 gap-1.5 text-xs" onClick={copy}>
        {copied ? <Check className="h-3.5 w-3.5" /> : <Link2 className="h-3.5 w-3.5" />}
        {copied ? 'Kopierat!' : 'Kopiera'}
      </Button>
    </div>
  );
}
