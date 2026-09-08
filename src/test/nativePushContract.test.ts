import { describe, expect, it } from "vitest";
import {
  nativePushMessage,
  pushResult,
  uuid,
  validDeviceSecret,
  validPushToken,
} from "../../supabase/functions/_shared/nativePushContract";
describe("native push boundaries", () => {
  it("accepts only the correct token format for each provider", () => {
    expect(validPushToken("apns", "a".repeat(64))).toBe(true);
    expect(validPushToken("apns", "android:token_" + "a".repeat(64))).toBe(
      false,
    );
    expect(validPushToken("fcm", "android:token_" + "a".repeat(64))).toBe(true);
    expect(validPushToken("fcm", "https://evil.test/token")).toBe(false);
    expect(uuid(crypto.randomUUID())).toBe(true);
    expect(uuid("../other")).toBe(false);
    expect(validDeviceSecret("f".repeat(64))).toBe(true);
    expect(validDeviceSecret("short")).toBe(false);
  });
  it("does not mistake payload or provider failures for a retired device", () => {
    expect(
      pushResult("fcm", 400, {
        error: { details: [{ errorCode: "INVALID_ARGUMENT" }] },
      }).invalidToken,
    ).toBe(false);
    expect(
      pushResult("fcm", 404, {
        error: { details: [{ errorCode: "UNREGISTERED" }] },
      }).invalidToken,
    ).toBe(true);
    expect(
      pushResult("apns", 400, { reason: "BadDeviceToken" }).invalidToken,
    ).toBe(true);
    expect(
      pushResult("apns", 403, { reason: "ExpiredProviderToken" }).invalidToken,
    ).toBe(false);
    for (const status of [429, 500, 503])
      expect(pushResult("apns", status, {}).retryable).toBe(true);
    expect(pushResult("fcm", 200, {}).accepted).toBe(true);
  });
  it("uses generic lock-screen payloads and internal routes", () => {
    for (const kind of ["daily", "frost", "test"] as const) {
      const message = nativePushMessage(kind);
      expect(message.url).toBe("/app");
      expect(message.title).toBe("Odlingsdagboken");
      expect(Object.keys(message).sort()).toEqual(["body", "title", "url"]);
    }
  });
});
