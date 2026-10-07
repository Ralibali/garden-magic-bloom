import { GARDEN_YEARLY_PRICE } from '../_shared/accountDeletion.ts';
import { readBundleAccess } from '../_shared/bundleEntitlement.ts';
import { profileAccess } from '../_shared/subscriptionAccess.ts';
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseClient = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    { auth: { persistSession: false } }
  );

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("No authorization header");

    const token = authHeader.replace("Bearer ", "");
    const { data: userData, error: userError } = await supabaseClient.auth.getUser(token);
    if (userError) throw new Error(`Auth error: ${userError.message}`);
    const user = userData.user;
    if (!user?.email) throw new Error("User not authenticated");

    const bundle=await readBundleAccess(supabaseClient,user.id);
    if(bundle.active) return new Response(JSON.stringify({subscribed:true,access_type:'bundle',premium_type:'bundle',subscription_end:bundle.until,can_manage_subscription:false,source:'bundle'}),{headers:{...corsHeaders,'Content-Type':'application/json'}});

    const { data: profile, error: profileError } = await supabaseClient
      .from('profiles').select('subscription_status, premium_expires_at, created_at')
      .eq('user_id', user.id).single();
    if (profileError) throw profileError;
    const fallback = profileAccess(profile);
    const respond = (body: object) => new Response(JSON.stringify(body), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
    const respondWithProfile = async (canManage = false) => {
      // Keep server-side limits in sync when a time-limited grant has expired.
      if (!fallback.subscribed && profile.subscription_status === 'premium') {
        const { error } = await supabaseClient.from('profiles')
          .update({ subscription_status: 'free' }).eq('user_id', user.id);
        if (error) throw error;
      }
      return respond({ ...fallback, can_manage_subscription: canManage });
    };
    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
    if (!stripeKey) return respond({ ...fallback, access_type: fallback.subscribed ? 'unknown' : 'free', can_manage_subscription: null });

    const stripe = new Stripe(stripeKey, { apiVersion: "2025-08-27.basil" });
    const customers = await stripe.customers.list({ email: user.email, limit: 1 });
    if (!customers.data.length) return await respondWithProfile();

    const customerId = customers.data[0].id;
    // A Checkout trial is manageable even before its first invoice is paid.
    const [active, trials] = await Promise.all([
      stripe.subscriptions.list({ customer: customerId, status: "active", limit: 100 }),
      stripe.subscriptions.list({ customer: customerId, status: "trialing", limit: 100 }),
    ]);
    const subscription = [...active.data,...trials.data].find(s=>s.items.data.some(item=>item.price.id===GARDEN_YEARLY_PRICE));
    if (!subscription) return await respondWithProfile(true);

    const trial = subscription.status === 'trialing';
    const end = trial ? subscription.trial_end : subscription.items.data[0]?.current_period_end;
    const { error: updateError } = await supabaseClient.from('profiles')
      .update({ subscription_status: 'premium' }).eq('user_id', user.id);
    if (updateError) throw updateError;
    return respond({
      subscribed: true,
      access_type: trial ? 'stripe_trial' : 'stripe',
      can_manage_subscription: true,
      product_id: subscription.items.data[0]?.price.product,
      subscription_end: end ? new Date(end * 1000).toISOString() : null,
      trial_end: trial && end ? new Date(end * 1000).toISOString() : null,
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
