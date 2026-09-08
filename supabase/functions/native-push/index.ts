import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import {
  uuid,
  validDeviceSecret,
  validPushToken,
  type PushProvider,
} from "../_shared/nativePushContract.ts";
import {
  drainNativePush,
  enqueueNativePush,
  nativePushConfigured,
  secretHash,
} from "../_shared/nativePushServer.ts";
const allowed = [
  "capacitor://localhost",
  "https://localhost",
  "https://odlingsdagboken.com",
];
Deno.serve(async (req) => {
  const origin = req.headers.get("origin") || "";
  const headers = {
    "Access-Control-Allow-Origin": allowed.includes(origin)
      ? origin
      : allowed[2],
    Vary: "Origin",
    "Access-Control-Allow-Headers":
      "authorization,apikey,content-type,x-client-info",
    "Access-Control-Allow-Methods": "POST,OPTIONS",
    "Content-Type": "application/json",
  };
  const respond = (value: unknown, status = 200) =>
    new Response(JSON.stringify(value), { status, headers });
  if (req.method === "OPTIONS") return respond(null);
  if (req.method !== "POST")
    return respond({ error: "Method not allowed" }, 405);
  try {
    const raw = await req.text();
    if (raw.length > 16000) return respond({ error: "Request too large" }, 413);
    const input = JSON.parse(raw);
    if (!["config", "register", "unregister", "test"].includes(input.action))
      return respond({ error: "Invalid action" }, 400);
    const auth = req.headers.get("authorization");
    const client = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: auth ? { Authorization: auth } : {} } },
    );
    const {
      data: { user },
    } = auth ? await client.auth.getUser() : { data: { user: null } };
    if (!user && input.action !== "unregister")
      return respond({ error: "Logga in för att aktivera notiser" }, 401);
    if (input.action === "config") {
      const provider: PushProvider = input.provider === "apns" ? "apns" : "fcm";
      return respond({
        available:
          input.appId === Deno.env.get("NATIVE_PUSH_APP_ID") &&
          nativePushConfigured(provider),
      });
    }
    if (
      !uuid(input.id) ||
      !uuid(input.generation) ||
      !validDeviceSecret(input.secret)
    )
      return respond({ error: "Invalid installation" }, 400);
    const hash = await secretHash(input.secret);
    const admin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );
    const { data: existing, error: lookupError } = await admin
      .from("native_push_installations")
      .select("id,user_id,device_secret_hash,generation,enabled")
      .eq("id", input.id)
      .maybeSingle();
    if (lookupError) throw lookupError;
    if (existing && existing.device_secret_hash !== hash)
      return respond({ error: "Invalid installation" }, 403);
    if (input.action === "unregister") {
      // Unknown devices need a logged-in caller to create a revocation tombstone.
      // An existing device proves possession of its private random capability.
      if (!existing && !user)
        return respond({ error: "Reconnect to finish deregistration" }, 409);
      const { error } = await admin.rpc("unregister_native_push", {
        p_id: input.id,
        p_secret_hash: hash,
        p_generation: input.generation,
      });
      if (error) throw error;
      return respond({ disabled: true });
    }
    if (input.action === "test") {
      if (
        !existing ||
        existing.user_id !== user!.id ||
        existing.generation !== input.generation ||
        !existing.enabled
      )
        return respond(
          { error: "Aktivera notiser på den här telefonen först" },
          409,
        );
      // At most one test per installation/minute, repeated taps are idempotent.
      await enqueueNativePush(
        admin,
        user!.id,
        `test:${Math.floor(Date.now() / 60000)}`,
        "test",
        input.id,
      );
      return respond(await drainNativePush(admin, input.id));
    }
    const provider = input.provider as PushProvider;
    if (
      !["apns", "fcm"].includes(provider) ||
      !validPushToken(provider, input.token) ||
      !["sandbox", "production"].includes(input.environment) ||
      (provider === "fcm" && input.environment !== "production")
    )
      return respond({ error: "Invalid token" }, 400);
    if (
      input.appId !== Deno.env.get("NATIVE_PUSH_APP_ID") ||
      !nativePushConfigured(provider)
    )
      return respond(
        { error: "Push är ännu inte konfigurerat för denna app" },
        503,
      );
    if (
      existing &&
      existing.user_id !== user!.id &&
      existing.generation === input.generation
    )
      return respond(
        { error: "A new account needs new notification consent" },
        409,
      );
    const { data, error } = await admin.rpc("register_native_push", {
      p_id: input.id,
      p_user: user!.id,
      p_secret_hash: hash,
      p_generation: input.generation,
      p_provider: provider,
      p_environment: input.environment,
      p_app_id: input.appId,
      p_token: input.token,
    });
    if (error) throw error;
    if (!data)
      return respond(
        { error: "Registreringen har avbrutits. Aktivera notiser igen." },
        409,
      );
    return respond({ registered: true });
  } catch {
    return respond(
      { error: "Notisinställningen kunde inte sparas. Försök igen." },
      503,
    );
  }
});
