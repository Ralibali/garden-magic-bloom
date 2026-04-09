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

    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");

    // If Stripe is not configured, fall back to database profile status
    if (!stripeKey) {
      const { data: profile } = await supabaseClient
        .from('profiles')
        .select('subscription_status, premium_expires_at')
        .eq('user_id', user.id)
        .single();

      const isPremium = profile?.subscription_status === 'premium' &&
        (!profile?.premium_expires_at || new Date(profile.premium_expires_at) > new Date());

      return new Response(JSON.stringify({
        subscribed: isPremium,
        subscription_end: profile?.premium_expires_at,
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const stripe = new Stripe(stripeKey, { apiVersion: "2025-08-27.basil" });
    const customers = await stripe.customers.list({ email: user.email, limit: 1 });

    if (customers.data.length === 0) {
      // No Stripe customer – check if premium was granted manually via DB
      const { data: profile } = await supabaseClient
        .from('profiles')
        .select('subscription_status, premium_expires_at')
        .eq('user_id', user.id)
        .single();

      const manualPremium = profile?.subscription_status === 'premium' &&
        (!profile?.premium_expires_at || new Date(profile.premium_expires_at) > new Date());

      if (manualPremium) {
        return new Response(JSON.stringify({
          subscribed: true,
          subscription_end: profile?.premium_expires_at,
        }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      await supabaseClient.from('profiles').update({ subscription_status: 'free' }).eq('user_id', user.id);
      return new Response(JSON.stringify({ subscribed: false }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const customerId = customers.data[0].id;
    const subscriptions = await stripe.subscriptions.list({
      customer: customerId,
      status: "active",
      limit: 1,
    });

    const hasActiveSub = subscriptions.data.length > 0;
    let subscriptionEnd = null;
    let productId = null;

    if (hasActiveSub) {
      const subscription = subscriptions.data[0];
      try {
        const endTimestamp = subscription.current_period_end;
        if (endTimestamp && typeof endTimestamp === 'number') {
          subscriptionEnd = new Date(endTimestamp * 1000).toISOString();
        }
      } catch {
        // Skip if date parsing fails
      }
      productId = subscription.items.data[0].price.product;
      await supabaseClient.from('profiles').update({ subscription_status: 'premium' }).eq('user_id', user.id);
    } else {
      // No active Stripe sub – check manual premium before downgrading
      const { data: profile } = await supabaseClient
        .from('profiles')
        .select('subscription_status, premium_expires_at')
        .eq('user_id', user.id)
        .single();

      const manualPremium = profile?.subscription_status === 'premium' &&
        (!profile?.premium_expires_at || new Date(profile.premium_expires_at) > new Date());

      if (!manualPremium) {
        await supabaseClient.from('profiles').update({ subscription_status: 'free' }).eq('user_id', user.id);
      }
    }

    return new Response(JSON.stringify({
      subscribed: hasActiveSub,
      product_id: productId,
      subscription_end: subscriptionEnd,
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
