export type PhotoGroMode = 'quick_review' | 'growth_log' | 'harvest_check';

export interface PhotoGroContext {
  mode: PhotoGroMode;
  takenAt: string;
  caption?: string | null;
  bedName?: string | null;
}

export const photoGroModes: Array<{ value: PhotoGroMode; label: string; description: string }> = [
  { value: 'quick_review', label: 'Snabb koll', description: 'Vad syns och vad är nästa rimliga steg?' },
  { value: 'growth_log', label: 'Tillväxtlogg', description: 'Beskriv utvecklingen så att den går att jämföra senare.' },
  { value: 'harvest_check', label: 'Skördekoll', description: 'Bedöm mognad och skördefönster.' },
];

export function buildPhotoGroPrompt(context: PhotoGroContext): string {
  const bedContext = context.bedName ? ` Bilden är kopplad till bädden ${context.bedName}.` : '';
  const captionContext = context.caption ? ` Min bildtext är: ${context.caption}.` : '';
  const base = `Titta på det här odlingsfotot från ${context.takenAt}.${bedContext}${captionContext}`;

  if (context.mode === 'growth_log') {
    return `${base} Beskriv vad du faktiskt ser, vad som verkar ha förändrats, hur säker du är och vad jag bör dokumentera nästa gång jag tar foto.`;
  }

  if (context.mode === 'harvest_check') {
    return `${base} Bedöm om grödan verkar redo att skördas, vilka tecken du ser, hur säker du är och vilka konkreta nästa steg jag bör ta.`;
  }

  return `${base} Beskriv först vad du faktiskt ser, ange hur säker du är och ge konkreta nästa steg för odlingen.`;
}
