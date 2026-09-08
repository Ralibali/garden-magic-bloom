import type { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";
import {
  nativePushMessage,
  pushResult,
  type PushKind,
  type PushProvider,
} from "./nativePushContract.ts";
type Env = (key: string) => string | undefined;
const env: Env = (key) => Deno.env.get(key);
const encoder = new TextEncoder();
const base64url = (bytes: Uint8Array) =>
  btoa(String.fromCharCode(...bytes))
    .replace(/=/g, "")
    .replace(/\+/g, "-")
    .replace(/\//g, "_");
const encode = (value: unknown) =>
  base64url(encoder.encode(JSON.stringify(value)));
const pemBytes = (pem: string) =>
  Uint8Array.from(
    atob(pem.replace(/-----[^-]+-----/g, "").replace(/\s/g, "")),
    (c) => c.charCodeAt(0),
  );
export const secretHash = async (secret: string) =>
  [
    ...new Uint8Array(
      await crypto.subtle.digest("SHA-256", encoder.encode(secret)),
    ),
  ]
    .map((n) => n.toString(16).padStart(2, "0"))
    .join("");
export function nativePushConfigured(provider: PushProvider, get: Env = env) {
  return (
    !!get("NATIVE_PUSH_APP_ID") &&
    (provider === "apns"
      ? ["APNS_PRIVATE_KEY", "APNS_KEY_ID", "APNS_TEAM_ID"].every(
          (k) => !!get(k),
        )
      : !!get("FCM_SERVICE_ACCOUNT"))
  );
}
async function signedJwt(
  header: object,
  claims: object,
  pem: string,
  ec: boolean,
) {
  const algorithm = ec
    ? { name: "ECDSA", namedCurve: "P-256" }
    : { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" };
  const key = await crypto.subtle.importKey(
    "pkcs8",
    pemBytes(pem),
    algorithm,
    false,
    ["sign"],
  );
  const content = `${encode(header)}.${encode(claims)}`;
  const signature = await crypto.subtle.sign(
    ec ? { name: "ECDSA", hash: "SHA-256" } : "RSASSA-PKCS1-v1_5",
    key,
    encoder.encode(content),
  );
  return `${content}.${base64url(new Uint8Array(signature))}`;
}
let apple: { token: string; until: number } | undefined;
let google: { token: string; until: number; project: string } | undefined;
async function appleToken() {
  if (apple && apple.until > Date.now()) return apple.token;
  const token = await signedJwt(
    { alg: "ES256", kid: env("APNS_KEY_ID") },
    { iss: env("APNS_TEAM_ID"), iat: Math.floor(Date.now() / 1000) },
    env("APNS_PRIVATE_KEY")!,
    true,
  );
  apple = { token, until: Date.now() + 25 * 60000 };
  return token;
}
async function googleToken() {
  if (google && google.until > Date.now()) return google;
  const account = JSON.parse(env("FCM_SERVICE_ACCOUNT")!);
  if (
    !account.client_email ||
    !account.private_key ||
    !/^[a-z0-9-]+$/.test(account.project_id)
  )
    throw new Error("FCM configuration unavailable");
  const now = Math.floor(Date.now() / 1000);
  const assertion = await signedJwt(
    { alg: "RS256", typ: "JWT" },
    {
      iss: account.client_email,
      scope: "https://www.googleapis.com/auth/firebase.messaging",
      aud: "https://oauth2.googleapis.com/token",
      iat: now,
      exp: now + 3600,
    },
    account.private_key,
    false,
  );
  const response = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
      assertion,
    }),
    signal: AbortSignal.timeout(9000),
  });
  const data = await response.json();
  if (!response.ok || !data.access_token)
    throw new Error("FCM authorization unavailable");
  google = {
    token: data.access_token,
    until: Date.now() + Math.min(3000, Number(data.expires_in) || 3000) * 1000,
    project: account.project_id,
  };
  return google;
}
interface Installation {
  id: string;
  user_id: string;
  generation: string;
  provider: PushProvider;
  environment: string;
  app_id: string;
  token: string;
  enabled: boolean;
}
async function send(
  installation: Installation,
  id: string,
  kind: PushKind,
  expiresAt: string,
) {
  const message = nativePushMessage(kind);
  const deadline = Math.min(
    Date.now() + 3600000,
    new Date(expiresAt).getTime(),
  );
  const remaining = () => Math.floor((deadline - Date.now()) / 1000);
  const expired = {
    accepted: false,
    retryable: false,
    invalidToken: false,
    code: "expired",
  };
  if (!Number.isFinite(deadline) || remaining() <= 0) return expired;
  if (
    installation.app_id !== env("NATIVE_PUSH_APP_ID") ||
    !nativePushConfigured(installation.provider)
  )
    return {
      accepted: false,
      retryable: true,
      invalidToken: false,
      code: "configuration",
    };
  let response: Response;
  if (installation.provider === "apns") {
    const host =
      installation.environment === "sandbox"
        ? "api.sandbox.push.apple.com"
        : "api.push.apple.com";
    const authorization = await appleToken();
    if (remaining() <= 0) return expired;
    response = await fetch(`https://${host}/3/device/${installation.token}`, {
      method: "POST",
      headers: {
        authorization: `bearer ${authorization}`,
        "Content-Type": "application/json",
        "apns-topic": installation.app_id,
        "apns-push-type": "alert",
        "apns-priority": "10",
        "apns-id": id,
        "apns-collapse-id": id,
        "apns-expiration": String(Math.floor(deadline / 1000)),
      },
      body: JSON.stringify({
        aps: {
          alert: { title: message.title, body: message.body },
          sound: "default",
        },
        url: message.url,
        eventId: id,
      }),
      signal: AbortSignal.timeout(9000),
    });
  } else {
    const auth = await googleToken();
    const ttl = remaining();
    if (ttl <= 0) return expired;
    response = await fetch(
      `https://fcm.googleapis.com/v1/projects/${auth.project}/messages:send`,
      {
        method: "POST",
        headers: {
          authorization: `Bearer ${auth.token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          message: {
            token: installation.token,
            notification: { title: message.title, body: message.body },
            data: { url: message.url, eventId: id },
            android: {
              priority: "high",
              ttl: `${ttl}s`,
              collapse_key: kind,
              notification: {
                channel_id: "garden_updates",
                tag: id,
                icon: "ic_notification",
              },
            },
          },
        }),
        signal: AbortSignal.timeout(9000),
      },
    );
  }
  return pushResult(
    installation.provider,
    response.status,
    await response.json().catch(() => null),
  );
}
export async function enqueueNativePush(
  admin: SupabaseClient,
  userId: string,
  event: string,
  kind: PushKind,
  installation?: string,
) {
  const { data, error } = await admin.rpc("enqueue_native_push", {
    p_user: userId,
    p_event_key: event,
    p_kind: kind,
    p_installation: installation || null,
  });
  if (error) throw error;
  return Number(data) || 0;
}
export async function nativeRecipientIds(admin: SupabaseClient) {
  const ids = new Set<string>();
  if (!env("NATIVE_PUSH_APP_ID")) return ids;
  for (let from = 0; ; from += 500) {
    const { data, error } = await admin
      .from("native_push_installations")
      .select("id,user_id")
      .eq("enabled", true)
      .order("id")
      .range(from, from + 499);
    if (error) throw error;
    for (const row of data || []) ids.add(row.user_id);
    if (!data || data.length < 500) break;
  }
  return ids;
}
export async function drainNativePush(
  admin: SupabaseClient,
  installationId?: string,
) {
  const result = { accepted: 0, failed: 0, retrying: 0 };
  const deadline = Date.now() + 40000;
  const worker = async () => {
    for (
      let count = 0;
      count < (installationId ? 8 : 25) && Date.now() < deadline;
      count++
    ) {
      const { data: jobs, error } = await admin.rpc("claim_native_push", {
        p_installation: installationId || null,
      });
      if (error) throw error;
      const job = jobs?.[0];
      if (!job) break;
      const { data: installation, error: readError } = await admin
        .from("native_push_installations")
        .select("*")
        .eq("id", job.installation_id)
        .eq("generation", job.generation)
        .eq("enabled", true)
        .maybeSingle();
      if (readError) throw readError;
      if (!installation) continue;
      if (job.kind !== "test" && !job.event_key.startsWith("manual:")) {
        const { data: profile, error: profileError } = await admin
          .from("profiles")
          .select("frost_alerts_enabled,daily_briefing_enabled")
          .eq("user_id", installation.user_id)
          .maybeSingle();
        if (profileError) throw profileError;
        const allowed =
          job.kind === "frost"
            ? profile?.frost_alerts_enabled
            : profile?.daily_briefing_enabled;
        if (allowed !== true) {
          const { error: cancelError } = await admin
            .from("native_push_deliveries")
            .update({ state: "failed", provider_code: "preference_disabled" })
            .eq("id", job.id)
            .eq("lease_id", job.lease_id);
          if (cancelError) throw cancelError;
          continue;
        }
      }
      let outcome;
      try {
        outcome = await send(installation, job.id, job.kind, job.expires_at);
      } catch {
        outcome = {
          accepted: false,
          retryable: true,
          invalidToken: false,
          code: "network_or_configuration",
        };
      }
      if (outcome.invalidToken) {
        const { data: current, error: currentError } = await admin
          .from("native_push_installations")
          .select("token")
          .eq("id", installation.id)
          .eq("generation", installation.generation)
          .eq("enabled", true)
          .maybeSingle();
        if (currentError) throw currentError;
        if (current && current.token !== installation.token)
          outcome = {
            accepted: false,
            retryable: true,
            invalidToken: false,
            code: "token_rotated",
          };
      }
      const retry = outcome.retryable && job.attempts < 3;
      const state = outcome.accepted ? "sent" : retry ? "pending" : "failed";
      const { data: completed, error: writeError } = await admin
        .from("native_push_deliveries")
        .update({
          state,
          provider_code: outcome.code,
          sent_at: outcome.accepted ? new Date().toISOString() : null,
          available_at: new Date(
            Date.now() + job.attempts * 5 * 60000,
          ).toISOString(),
        })
        .eq("id", job.id)
        .eq("lease_id", job.lease_id)
        .eq("generation", job.generation)
        .select("id");
      if (writeError) throw writeError;
      if (!completed?.length) continue;
      if (outcome.invalidToken) {
        const { error: disableError } = await admin
          .from("native_push_installations")
          .update({ enabled: false, updated_at: new Date().toISOString() })
          .eq("id", installation.id)
          .eq("generation", installation.generation)
          .eq("token", installation.token);
        if (disableError) throw disableError;
      }
      if (outcome.accepted) result.accepted++;
      else if (retry) result.retrying++;
      else result.failed++;
    }
  };
  // Four bounded consumers claim work atomically; never lease a large batch
  // that might expire before its provider request starts.
  const workers = await Promise.allSettled(
    Array.from({ length: installationId ? 1 : 4 }, worker),
  );
  const failedWorker = workers.find((result) => result.status === "rejected");
  if (failedWorker?.status === "rejected") throw failedWorker.reason;
  return result;
}

export async function allPushRows(
  admin: SupabaseClient,
  table: "profiles" | "push_subscriptions",
  columns: string,
  flag?: string,
) {
  const rows: Record<string, any>[] = [];
  for (let from = 0; ; from += 500) {
    let query = admin
      .from(table)
      .select(columns)
      .order(table === "profiles" ? "user_id" : "id")
      .range(from, from + 499);
    if (flag) query = query.eq(flag, true);
    const { data, error } = await query;
    if (error) throw error;
    rows.push(...((data || []) as unknown as Record<string, any>[]));
    if (!data || data.length < 500) break;
  }
  return rows;
}
