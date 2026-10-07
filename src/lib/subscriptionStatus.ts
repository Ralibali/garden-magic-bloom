export { profileAccess } from '../../supabase/functions/_shared/subscriptionAccess';
export type { AccessType, AccessSummary } from '../../supabase/functions/_shared/subscriptionAccess';
import type { AccessType } from '../../supabase/functions/_shared/subscriptionAccess';

type Account = { is_premium?: boolean; access_type?: AccessType; trial_end?: string | null; subscription_end?: string | null };
export function subscriptionLabel(account: Account | null | undefined) {
  if (account?.access_type === 'bundle') return 'Odling + Höns Plus';
  if (account?.access_type === 'trial' || account?.access_type === 'stripe_trial') return 'Plus – provperiod';
  if (account?.access_type === 'stripe') return 'Plus-medlem';
  return account?.is_premium ? 'Plus – tillgång' : 'Gratis konto';
}
export function subscriptionDescription(account: Account | null | undefined) {
  const date = account?.trial_end || account?.subscription_end;
  const until = date ? new Date(date).toLocaleDateString('sv-SE') : '';
  if (account?.access_type === 'trial') return `Du provar Plus gratis${until ? ` till ${until}` : ''}. Därefter fortsätter kontot gratis. Ingen automatisk betalning.`;
  if (account?.access_type === 'bundle') return `Du har Plus i båda apparna${until ? ` till ${until}` : ''}. Hantera betalningen under Odling + Höns.`;
  if (account?.access_type === 'stripe_trial') return `Din provperiod${until ? ` slutar ${until}` : ' är aktiv'}. Se betalningsdatum och avsluta i abonnemangshanteringen.`;
  if (account?.access_type === 'stripe') return 'Se betalningar, förnyelsedatum och avsluta i abonnemangshanteringen.';
  if (account?.access_type === 'granted') return `Du har Plus-tillgång${until ? ` till ${until}` : ''} utan ett aktivt betalabonnemang.`;
  if (account?.is_premium) return 'Plus är tillgängligt. Abonnemangets betalstatus kunde inte bekräftas just nu.';
  return 'Du använder gratisversionen av Odlingsdagboken.';
}
