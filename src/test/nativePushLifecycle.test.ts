import { beforeEach, describe, expect, it, vi } from "vitest";
import { waitFor } from "@testing-library/react";
const mock = vi.hoisted(() => ({
  value: null as string | null,
  user: "user-a" as string | null,
  permission: "granted",
  offline: false,
  storageFailure: false,
  infoHook: null as null | (() => void),
  handlers: {} as Record<string, (value: any) => void>,
  requests: [] as any[],
  registerGate: null as null | (() => Promise<void>),
}));
vi.mock("@capacitor/app", () => ({
  App: {
    getInfo: async () => {
      mock.infoHook?.();
      return { id: "com.odlingsdagboken.app" };
    },
  },
}));
vi.mock("@capacitor/core", () => ({
  Capacitor: { getPlatform: () => "ios", isNativePlatform: () => true },
}));
vi.mock("@capacitor/preferences", () => ({
  Preferences: {
    get: async () => ({ value: mock.value }),
    set: async ({ value }: { value: string }) => {
      if (mock.storageFailure) throw new Error("storage failed");
      mock.value = value;
    },
  },
}));
vi.mock("@capacitor/push-notifications", () => ({
  PushNotifications: {
    addListener: async (name: string, fn: (value: any) => void) => {
      mock.handlers[name] = fn;
      return { remove: async () => {} };
    },
    checkPermissions: async () => ({ receive: mock.permission }),
    requestPermissions: async () => ({ receive: mock.permission }),
    register: async () => {
      mock.handlers.registration({ value: "c".repeat(64) });
    },
    unregister: async () => {},
    removeAllDeliveredNotifications: async () => {},
    createChannel: async () => {},
  },
}));
vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    auth: {
      getSession: async () => ({
        data: {
          session: mock.user
            ? { user: { id: mock.user }, access_token: "test-token" }
            : null,
        },
      }),
    },
  },
}));
vi.mock("@/lib/native", () => ({ isNativeApp: () => true }));
beforeEach(() => {
  vi.resetModules();
  mock.value = null;
  mock.user = "user-a";
  mock.permission = "granted";
  mock.offline = false;
  mock.handlers = {};
  mock.requests = [];
  mock.registerGate = null;
  mock.storageFailure = false;
  mock.infoHook = null;
  vi.stubEnv("VITE_NATIVE_APNS_ENVIRONMENT", "sandbox");
  vi.stubGlobal(
    "fetch",
    vi.fn(async (_url, options) => {
      const body = JSON.parse(options.body);
      mock.requests.push(body);
      if (mock.offline) throw new Error("offline");
      if (body.action === "register" && mock.registerGate)
        await mock.registerGate();
      return new Response(
        JSON.stringify({ available: true, registered: true, disabled: true }),
        { status: 200 },
      );
    }),
  );
});
describe("native notification ownership lifecycle", () => {
  it("does not register when permission is denied", async () => {
    mock.permission = "denied";
    const api = await import("@/lib/nativePush");
    await expect(api.enableNativePush()).rejects.toThrow(/Tillåt notiser/);
    expect(mock.requests.some((r) => r.action === "register")).toBe(false);
    expect(JSON.parse(mock.value!).enabled).toBe(false);
  });
  it("serializes a pending registration before logout and ignores late token callbacks", async () => {
    let finish!: () => void;
    mock.registerGate = () =>
      new Promise<void>((resolve) => {
        finish = resolve;
      });
    const api = await import("@/lib/nativePush");
    const enabling = api.enableNativePush();
    await waitFor(() =>
      expect(mock.requests.some((r) => r.action === "register")).toBe(true),
    );
    const disabling = api.disableNativePush();
    finish();
    await enabling;
    await disabling;
    expect(mock.requests.map((r) => r.action)).toEqual([
      "register",
      "unregister",
    ]);
    expect(JSON.parse(mock.value!).enabled).toBe(false);
    mock.handlers.registration({ value: "d".repeat(64) });
    await api.nativePushStatus();
    expect(mock.requests.filter((r) => r.action === "register")).toHaveLength(
      1,
    );
  });
  it("keeps offline revocation across restart and uses a new binding for the next account", async () => {
    let api = await import("@/lib/nativePush");
    await api.enableNativePush();
    const first = JSON.parse(mock.value!);
    mock.offline = true;
    await expect(api.disableNativePush()).resolves.toBeUndefined();
    expect(JSON.parse(mock.value!).enabled).toBe(false);
    expect(JSON.parse(mock.value!).pending).toEqual([first.generation]);
    vi.resetModules();
    mock.offline = false;
    mock.user = null;
    api = await import("@/lib/nativePush");
    await api.refreshNativePush();
    expect(JSON.parse(mock.value!).pending).toEqual([]);
    mock.user = "user-b";
    await api.enableNativePush();
    const second = JSON.parse(mock.value!);
    expect(second.id).toBe(first.id);
    expect(second.secret).toBe(first.secret);
    expect(second.userId).toBe("user-b");
    expect(second.generation).not.toBe(first.generation);
    expect(mock.requests.filter((r) => r.action === "register")).toHaveLength(
      2,
    );
  });
  it("rejects an account switch between token lookup and the authenticated request", async () => {
    mock.infoHook = () => {
      mock.user = "user-b";
    };
    const api = await import("@/lib/nativePush");
    await expect(api.enableNativePush()).rejects.toThrow(
      /Inloggningen ändrades/,
    );
    expect(mock.requests.some((r) => r.action === "register")).toBe(false);
    expect(JSON.parse(mock.value!).enabled).toBe(false);
  });
  it("does not hide a failure to persist revocation before logout", async () => {
    const api = await import("@/lib/nativePush");
    await api.enableNativePush();
    mock.storageFailure = true;
    await expect(api.disableNativePush()).rejects.toThrow("storage failed");
    expect(JSON.parse(mock.value!).enabled).toBe(true);
  });
});
