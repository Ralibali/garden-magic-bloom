import React, { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Gift, Copy, Check, Share2 } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from '@/hooks/use-toast';

export default function ReferralCard() {
  const { user } = useAuth();
  const [copied, setCopied] = useState(false);

  const { data: profile } = useQuery({
    queryKey: ['my-referral-code', user?.id],
    queryFn: async () => {
      if (!user?.id) return null;
      const { data } = await supabase
        .from('profiles')
        .select('referral_code')
        .eq('user_id', user.id)
        .maybeSingle();
      return data;
    },
    enabled: !!user?.id,
  });

  const { data: referralCount = 0 } = useQuery({
    queryKey: ['referral-count', user?.id],
    queryFn: async () => {
      if (!user?.id) return 0;
      const { count } = await supabase
        .from('referrals')
        .select('*', { count: 'exact', head: true })
        .eq('referrer_user_id', user.id);
      return count ?? 0;
    },
    enabled: !!user?.id,
  });

  const code = profile?.referral_code || '';
  const shareUrl = `${window.location.origin}/login?mode=register&ref=${code}`;

  const handleCopy = () => {
    navigator.clipboard.writeText(code);
    setCopied(true);
    toast({ title: 'Kod kopierad! 📋' });
    setTimeout(() => setCopied(false), 2000);
  };

  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: 'Prova Odlingsdagboken!',
          text: `Använd min värvningskod ${code} och få 7 dagars gratis Plus! 🌱`,
          url: shareUrl,
        });
      } catch {
        handleCopy();
      }
    } else {
      handleCopy();
    }
  };

  if (!code) return null;

  return (
    <Card className="border-primary/15 bg-primary/3 shadow-sm">
      <CardContent className="p-4">
        <div className="flex items-center gap-2.5 mb-3">
          <div className="w-8 h-8 rounded-xl bg-primary/10 flex items-center justify-center">
            <Gift className="h-4 w-4 text-primary" />
          </div>
          <div>
            <h3 className="font-serif text-sm text-foreground">Tipsa en vän</h3>
            <p className="text-[10px] text-muted-foreground">Ni får båda 7 dagars Premium!</p>
          </div>
        </div>

        <div className="flex items-center gap-2 mb-3">
          <div className="flex-1 bg-background border border-border rounded-xl px-4 py-2.5 text-center">
            <span className="font-mono font-bold text-lg tracking-widest text-foreground">{code}</span>
          </div>
          <Button variant="outline" size="icon" className="h-10 w-10 rounded-xl shrink-0" onClick={handleCopy}>
            {copied ? <Check className="h-4 w-4 text-success" /> : <Copy className="h-4 w-4" />}
          </Button>
          <Button variant="outline" size="icon" className="h-10 w-10 rounded-xl shrink-0" onClick={handleShare}>
            <Share2 className="h-4 w-4" />
          </Button>
        </div>

        {referralCount > 0 && (
          <p className="text-[11px] text-muted-foreground text-center">
            🎉 Du har värvat <span className="font-semibold text-foreground">{referralCount}</span> vän{referralCount !== 1 ? 'ner' : ''}
          </p>
        )}
      </CardContent>
    </Card>
  );
}
