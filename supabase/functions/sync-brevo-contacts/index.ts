import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const BREVO_API_KEY = Deno.env.get("BREVO_API_KEY");
  if (!BREVO_API_KEY) {
    return new Response(JSON.stringify({ error: "BREVO_API_KEY is not configured" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  try {
    // Fetch all profiles with email
    const { data: profiles, error } = await supabase
      .from("profiles")
      .select("user_id, email, display_name, subscription_status, premium_expires_at, climate_zone, created_at, updated_at");

    if (error) throw new Error(`DB error: ${error.message}`);
    if (!profiles || profiles.length === 0) {
      return new Response(JSON.stringify({ synced: 0, message: "No profiles found" }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    let synced = 0;
    let errors = 0;

    for (const profile of profiles) {
      if (!profile.email) continue;

      const now = new Date();
      const lastActivity = profile.updated_at ? new Date(profile.updated_at) : null;
      const daysSinceActivity = lastActivity
        ? Math.floor((now.getTime() - lastActivity.getTime()) / 86400000)
        : null;

      const premiumExpires = profile.premium_expires_at ? new Date(profile.premium_expires_at) : null;
      const daysUntilExpiry = premiumExpires
        ? Math.ceil((premiumExpires.getTime() - now.getTime()) / 86400000)
        : null;

      const isPremium = profile.subscription_status === "premium" &&
        premiumExpires && premiumExpires > now;

      // Upsert contact in Brevo
      const brevoPayload = {
        email: profile.email,
        attributes: {
          FIRSTNAME: profile.display_name?.split(" ")[0] || "",
          LASTNAME: profile.display_name?.split(" ").slice(1).join(" ") || "",
          SUBSCRIPTION_STATUS: profile.subscription_status || "free",
          IS_PREMIUM: isPremium ? true : false,
          DAYS_SINCE_ACTIVITY: daysSinceActivity ?? -1,
          DAYS_UNTIL_TRIAL_EXPIRY: daysUntilExpiry ?? -1,
          CLIMATE_ZONE: profile.climate_zone ?? 3,
          SIGNUP_DATE: profile.created_at?.split("T")[0] || "",
          LAST_ACTIVITY: profile.updated_at?.split("T")[0] || "",
        },
        updateEnabled: true,
      };

      const res = await fetch("https://api.brevo.com/v3/contacts", {
        method: "POST",
        headers: {
          "api-key": BREVO_API_KEY,
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify(brevoPayload),
      });

      if (res.ok || res.status === 204) {
        synced++;
      } else {
        const errBody = await res.text();
        // duplicate_parameter means contact exists and was updated
        if (errBody.includes("duplicate_parameter")) {
          synced++;
        } else {
          console.error(`Brevo error for ${profile.email}: ${res.status} ${errBody}`);
          errors++;
        }
      }
    }

    return new Response(
      JSON.stringify({ synced, errors, total: profiles.length }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("Sync error:", err);
    return new Response(
      JSON.stringify({ error: err instanceof Error ? err.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
