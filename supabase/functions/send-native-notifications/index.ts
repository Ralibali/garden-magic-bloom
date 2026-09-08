import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { drainNativePush } from "../_shared/nativePushServer.ts";
Deno.serve(async (req) => {
  if (req.method !== "POST")
    return new Response("Method not allowed", { status: 405 });
  const secret = Deno.env.get("CRON_SECRET");
  if (!secret || req.headers.get("x-cron-secret") !== secret)
    return new Response("Unauthorized", { status: 401 });
  try {
    const admin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );
    return Response.json(await drainNativePush(admin));
  } catch {
    return Response.json(
      { error: "Delivery queue unavailable" },
      { status: 503 },
    );
  }
});
