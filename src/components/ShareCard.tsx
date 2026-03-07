import React, { useRef, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Share2, Copy, Check } from 'lucide-react';

interface ShareCardProps {
  totalHarvestKg: number;
  sowingsCount: number;
  bedsCount: number;
  userName?: string;
}

function drawShareCard(canvas: HTMLCanvasElement, props: ShareCardProps) {
  const ctx = canvas.getContext('2d');
  if (!ctx) return;
  const w = 600, h = 800;
  canvas.width = w;
  canvas.height = h;

  const gradient = ctx.createLinearGradient(0, 0, 0, h);
  gradient.addColorStop(0, '#f0f7ed');
  gradient.addColorStop(1, '#f5f0e8');
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, w, h);

  ctx.fillStyle = '#3d7a4a';
  ctx.fillRect(0, 0, w, 8);

  ctx.fillStyle = '#2d3a2e';
  ctx.font = 'bold 28px system-ui';
  ctx.textAlign = 'center';
  ctx.fillText('🌱 Odlingsdagboken', w / 2, 80);

  ctx.fillStyle = '#2d3a2e';
  ctx.font = 'bold 120px system-ui';
  ctx.fillText(`${props.totalHarvestKg.toFixed(1)}`, w / 2, 280);

  ctx.fillStyle = '#5a7a58';
  ctx.font = '32px system-ui';
  ctx.fillText('kg skördat i år 🥕', w / 2, 340);

  const statsY = 440;
  const stats = [
    { label: '🌱 Sådder', value: `${props.sowingsCount}` },
    { label: '📋 Bäddar', value: `${props.bedsCount}` },
  ];
  const colW = w / 3;
  stats.forEach((s, i) => {
    const x = colW * (i + 1);
    ctx.fillStyle = '#2d3a2e';
    ctx.font = 'bold 44px system-ui';
    ctx.fillText(s.value, x, statsY);
    ctx.fillStyle = '#5a7a58';
    ctx.font = '18px system-ui';
    ctx.fillText(s.label, x, statsY + 35);
  });

  if (props.userName) {
    ctx.fillStyle = '#5a7a58';
    ctx.font = '24px system-ui';
    ctx.fillText(`${props.userName}s odling`, w / 2, 570);
  }

  ctx.fillStyle = '#3d7a4a';
  ctx.font = 'bold 28px system-ui';
  ctx.fillText('Logga din odling gratis!', w / 2, 660);
  ctx.fillStyle = '#8b9a88';
  ctx.font = '20px system-ui';
  ctx.fillText('odlingsdagboken.se', w / 2, 700);

  ctx.fillStyle = '#3d7a4a';
  ctx.fillRect(0, h - 8, w, 8);
}

export default function ShareCard({ totalHarvestKg, sowingsCount, bedsCount, userName }: ShareCardProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [generated, setGenerated] = React.useState(false);
  const [copied, setCopied] = React.useState(false);

  const generateCard = useCallback(() => {
    if (!canvasRef.current) return;
    drawShareCard(canvasRef.current, { totalHarvestKg, sowingsCount, bedsCount, userName });
    setGenerated(true);
  }, [totalHarvestKg, sowingsCount, bedsCount, userName]);

  React.useEffect(() => { generateCard(); }, [generateCard]);

  const handleShare = async () => {
    if (!canvasRef.current) return;
    const blob = await new Promise<Blob | null>(r => canvasRef.current!.toBlob(r, 'image/png'));
    if (!blob) return;
    const file = new File([blob], 'min-odling.png', { type: 'image/png' });
    if (navigator.share && navigator.canShare({ files: [file] })) {
      await navigator.share({ title: 'Min odling 🌱', text: `Jag har skördat ${totalHarvestKg.toFixed(1)} kg i år! 🥕`, files: [file] });
    } else {
      await navigator.clipboard.writeText(`Jag har skördat ${totalHarvestKg.toFixed(1)} kg i år! 🥕🌱\nodlingsdagboken.se`);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div className="space-y-3">
      <canvas ref={canvasRef} className="w-full rounded-xl shadow-lg border border-border" style={{ maxWidth: 400 }} />
      <div className="flex gap-2">
        <Button onClick={handleShare} className="flex-1 gap-2"><Share2 className="h-4 w-4" /> Dela</Button>
        <Button variant="outline" onClick={() => { navigator.clipboard.writeText(`Skördat ${totalHarvestKg.toFixed(1)} kg! odlingsdagboken.se`); setCopied(true); setTimeout(() => setCopied(false), 2000); }} className="gap-2">
          {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
          {copied ? 'Kopierat!' : 'Kopiera'}
        </Button>
      </div>
    </div>
  );
}
