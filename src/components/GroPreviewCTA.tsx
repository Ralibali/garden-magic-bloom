import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { ArrowRight, Bot } from 'lucide-react';

interface GroPreviewCTAProps {
  className?: string;
}

export default function GroPreviewCTA({ className = '' }: GroPreviewCTAProps) {
  return (
    <aside className={`rounded-2xl border border-primary/20 bg-gradient-to-br from-primary/5 via-card to-accent/5 p-5 sm:p-6 shadow-sm ${className}`}>
      <div className="flex flex-col sm:flex-row gap-4 sm:items-start">
        <div className="w-11 h-11 rounded-2xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
          <Bot className="h-5 w-5" />
        </div>
        <div className="flex-1">
          <p className="text-xs uppercase tracking-[0.18em] text-primary font-semibold mb-2">Testa känslan av Gro</p>
          <h2 className="font-serif text-2xl text-foreground mb-3">Fråga: “Varför gulnar mina tomatblad?”</h2>
          <div className="rounded-xl bg-background/80 border border-border p-4 mb-4">
            <p className="text-sm text-muted-foreground leading-relaxed">
              <strong className="text-foreground">Gro svarar:</strong> Det kan bero på ojämn vattning, näringsbrist eller kalla nätter. Om bladen gulnar nedifrån och jorden är blöt är övervattning vanligt. Kontrollera fukten, värmen och om plantan nyligen planterats om.
            </p>
          </div>
          <Button asChild className="gap-2">
            <Link to="/login?mode=register&source=gro-preview">Fråga Gro om min odling <ArrowRight className="h-4 w-4" /></Link>
          </Button>
          <p className="text-[11px] text-muted-foreground mt-2">Gratis att börja · 14 dagars Plus gratis</p>
        </div>
      </div>
    </aside>
  );
}
