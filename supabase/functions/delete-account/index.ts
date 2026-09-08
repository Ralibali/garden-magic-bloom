import Stripe from "https://esm.sh/stripe@18.5.0";
import { deleteAccountPhotos, isGardenSubscription } from "../_shared/accountDeletion.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const ALLOWED_ORIGINS = ["https://odlingsdagboken.com", "https://www.odlingsdagboken.com", "https://garden-magic-bloom.lovable.app", "capacitor://localhost", "https://localhost"];

function getCorsHeaders(req: Request) {
  const origin = req.headers.get("origin") || "";
  const allowedOrigin = ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[0];
  return {
    "Access-Control-Allow-Origin": allowedOrigin,
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Vary": "Origin",
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
  };
}

Deno.serve(async (req) => {
  const corsHeaders = getCorsHeaders(req);

  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  if (req.method !== "POST") return new Response("Method not allowed", { status: 405, headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUser = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: { user }, error: userError } = await supabaseUser.auth.getUser();
    if (userError || !user) {
      return new Response(JSON.stringify({ error: "Invalid session" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const userId = user.id;

    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Stop future charges only for this product and the verified account owner.
    // Keep Stripe invoices/receipts for the merchant's statutory retention.
    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
    if (!stripeKey) throw new Error("Subscription service unavailable");
    if (user.email && user.email_confirmed_at) {
      const stripe = new Stripe(stripeKey, { apiVersion: "2025-08-27.basil" });
      for await (const customer of stripe.customers.list({ email: user.email, limit: 100 })) {
        for await (const subscription of stripe.subscriptions.list({ customer: customer.id, status: "all", limit: 100 })) {
          if (!["canceled", "incomplete_expired"].includes(subscription.status) && isGardenSubscription(subscription, userId)) {
            await stripe.subscriptions.cancel(subscription.id, { prorate: false, invoice_now: false });
          }
        }
      }
    }
    // Storage ownership prevents auth deletion. Fail visibly before removing DB
    // rows if an object cannot be deleted; retry is safe for already removed files.
    await deleteAccountPhotos(supabaseAdmin.storage.from("plant-photos"), userId);

    const tables = [
      "plant_care_events",
      "blog_comments",
      "analytics_events",
      "watering_log",
      "plant_logs",
      "plant_photos",
      "pest_logs",
      "harvests",
      "sowings",
      "seed_inventory",
      "season_summaries",
      "transactions",
      "my_plants",
      "beds",
      "feedback",
      "reminder_settings",
      "user_roles",
      "profiles",
    ];

    for (const table of tables) {
      const { error } = await supabaseAdmin.from(table).delete().eq("user_id", userId);
      if (error) {
        throw new Error(`Could not delete account data: ${table}`);
      }
    }

    const { error: referralError } = await supabaseAdmin.from("referrals").delete().or(`referrer_user_id.eq.${userId},referred_user_id.eq.${userId}`);
    if (referralError) throw referralError;
    const { error: leadError } = await supabaseAdmin.from("public_leads").delete().eq("converted_user_id", userId);
    if (leadError) throw leadError;

    const { error: deleteError } = await supabaseAdmin.auth.admin.deleteUser(userId);
    if (deleteError) {
      console.error("Error deleting auth user:", deleteError);
      return new Response(JSON.stringify({ error: "Failed to delete auth user" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("Delete account error:", err);
    return new Response(JSON.stringify({ error: "Internal error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
