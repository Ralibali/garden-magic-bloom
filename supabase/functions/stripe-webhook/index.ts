import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "npm:@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, stripe-signature, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const logStep = (step: string, details?: unknown) => {
  const d = details ? ` - ${JSON.stringify(details)}` : "";
  console.log(`[STRIPE-WEBHOOK] ${step}${d}`);
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
  const webhookSecret = Deno.env.get("STRIPE_WEBHOOK_SECRET");
  if (!stripeKey || !webhookSecret) {
    logStep("ERROR", { message: "Missing STRIPE_SECRET_KEY or STRIPE_WEBHOOK_SECRET" });
    return new Response(JSON.stringify({ error: "Server misconfigured" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const stripe = new Stripe(stripeKey, { apiVersion: "2025-08-27.basil" });

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    { auth: { persistSession: false } }
  );

  try {
    const body = await req.text();
    const signature = req.headers.get("stripe-signature");
    if (!signature) {
      logStep("ERROR", { message: "Missing stripe-signature header" });
      return new Response(JSON.stringify({ error: "Missing signature" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Verify webhook signature
    let event: Stripe.Event;
    try {
      event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
    } catch (err) {
      logStep("ERROR", { message: `Signature verification failed: ${err.message}` });
      return new Response(JSON.stringify({ error: "Invalid signature" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    logStep("Event received", { type: event.type, id: event.id });

    if (event.type === "invoice.paid") {
      const invoice = event.data.object as Stripe.Invoice;
      const customerEmail = invoice.customer_email;
      const subscriptionId = invoice.subscription;

      if (!customerEmail) {
        logStep("WARN", { message: "invoice.paid without customer_email, skipping" });
        return new Response(JSON.stringify({ received: true }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Get subscription end date
      let premiumExpiresAt: string | null = null;
      if (subscriptionId) {
        try {
          const sub = await stripe.subscriptions.retrieve(subscriptionId as string);
          if (sub.current_period_end) {
            premiumExpiresAt = new Date(sub.current_period_end * 1000).toISOString();
          }
        } catch (e) {
          logStep("WARN", { message: `Could not retrieve subscription: ${e.message}` });
        }
      }

      // Update profile to premium
      const { error } = await supabase
        .from("profiles")
        .update({
          subscription_status: "premium",
          ...(premiumExpiresAt ? { premium_expires_at: premiumExpiresAt } : {}),
          updated_at: new Date().toISOString(),
        })
        .eq("email", customerEmail);

      if (error) {
        logStep("ERROR", { message: `Failed to update profile: ${error.message}`, email: customerEmail });
      } else {
        logStep("SUCCESS", { action: "invoice.paid", email: customerEmail, premiumExpiresAt });
      }
    }

    if (event.type === "customer.subscription.deleted") {
      const subscription = event.data.object as Stripe.Subscription;
      const customerId = subscription.customer as string;

      // Look up customer email from Stripe
      let customerEmail: string | null = null;
      try {
        const customer = await stripe.customers.retrieve(customerId);
        if (!customer.deleted && customer.email) {
          customerEmail = customer.email;
        }
      } catch (e) {
        logStep("ERROR", { message: `Could not retrieve customer: ${e.message}` });
      }

      if (!customerEmail) {
        logStep("WARN", { message: "subscription.deleted without email, skipping", customerId });
        return new Response(JSON.stringify({ received: true }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Downgrade profile to free
      const { error } = await supabase
        .from("profiles")
        .update({
          subscription_status: "free",
          premium_expires_at: null,
          updated_at: new Date().toISOString(),
        })
        .eq("email", customerEmail);

      if (error) {
        logStep("ERROR", { message: `Failed to downgrade profile: ${error.message}`, email: customerEmail });
      } else {
        logStep("SUCCESS", { action: "subscription.deleted", email: customerEmail });
      }
    }

    return new Response(JSON.stringify({ received: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    logStep("ERROR", { message: error.message });
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
