import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Bot } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { recordProductActivity } from '@/lib/analytics';

interface AskGroButtonProps {
  /** Färdig prompt som fylls i Gro-chatten */
  prompt: string;
  /** Var genvägen trycktes (för analys) */
  source: string;
  /** Valfri etikett — utan label visas bara ikonen */
  label?: string;
  className?: string;
}

/**
 * Genväg till AI-coachen Gro med förifylld, kontextuell fråga.
 * Chatten läser prompten via location.state (stöds sedan tidigare).
 */
const AskGroButton = ({ prompt, source, label, className }: AskGroButtonProps) => {
  const navigate = useNavigate();

  const handleClick = (event: React.MouseEvent) => {
    event.stopPropagation();
    void recordProductActivity('ask_gro_shortcut', { source });
    navigate('/app/gro', { state: { prompt, source } });
  };

  if (label) {
    return (
      <Button variant="ghost" size="sm" className={`h-8 gap-1.5 px-2.5 text-xs text-muted-foreground hover:text-primary ${className || ''}`} onClick={handleClick}>
        <Bot className="h-3.5 w-3.5" /> {label}
      </Button>
    );
  }

  return (
    <Button variant="ghost" size="icon" className={`h-8 w-8 text-muted-foreground hover:text-primary ${className || ''}`} onClick={handleClick} aria-label="Fråga Gro om detta" title="Fråga Gro om detta">
      <Bot className="h-4 w-4" />
    </Button>
  );
};

export default AskGroButton;
