export type PushProvider = "apns" | "fcm";
export type PushKind = "frost" | "daily" | "test";
export const uuid = (value: unknown): value is string =>
  typeof value === "string" &&
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    value,
  );
export function validDeviceSecret(value: unknown): value is string {
  return typeof value === "string" && /^[a-f0-9]{64}$/.test(value);
}
export function validPushToken(
  provider: PushProvider,
  value: unknown,
): value is string {
  return (
    typeof value === "string" &&
    (provider === "apns"
      ? /^[a-f0-9]{64,512}$/i.test(value)
      : /^[A-Za-z0-9_:.-]{32,4096}$/.test(value))
  );
}
export function nativePushMessage(kind: PushKind) {
  const body =
    kind === "frost"
      ? "Frostrisk kan beröra din odling. Öppna appen för råd."
      : kind === "daily"
        ? "Det finns odlingsuppgifter att följa upp idag."
        : "Din testnotis från Odlingsdagboken.";
  return { title: "Odlingsdagboken", body, url: "/app" };
}
export function pushResult(
  provider: PushProvider,
  status: number,
  body: unknown,
) {
  const value = body as {
    reason?: string;
    error?: { details?: { errorCode?: string }[] };
  } | null;
  const invalidToken =
    provider === "apns"
      ? status === 410 || (status === 400 && value?.reason === "BadDeviceToken")
      : value?.error?.details?.some((e) => e.errorCode === "UNREGISTERED") ===
        true;
  return {
    accepted: status >= 200 && status < 300,
    retryable: status === 429 || status >= 500,
    invalidToken,
    code: String(status),
  };
}
