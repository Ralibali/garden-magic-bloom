import { App } from "@capacitor/app";
import { Capacitor } from "@capacitor/core";
import { Preferences } from "@capacitor/preferences";
import { PushNotifications } from "@capacitor/push-notifications";
import { supabase } from "@/integrations/supabase/client";
import { isNativeApp } from "./native";
interface Device {
  id: string;
  secret: string;
  generation: string;
  userId: string | null;
  enabled: boolean;
  pending: string[];
}
const key = "od-native-push-v1";
let queue: Promise<unknown> = Promise.resolve();
const serial = <T>(work: () => Promise<T>): Promise<T> => {
  const next = queue.then(work, work);
  queue = next.catch(() => undefined);
  return next;
};
const changed = () => window.dispatchEvent(new Event("native-push-change"));
async function read(): Promise<Device> {
  const { value } = await Preferences.get({ key });
  if (value) return JSON.parse(value);
  const bytes = crypto.getRandomValues(new Uint8Array(32));
  const device: Device = {
    id: crypto.randomUUID(),
    secret: [...bytes].map((b) => b.toString(16).padStart(2, "0")).join(""),
    generation: crypto.randomUUID(),
    userId: null,
    enabled: false,
    pending: [],
  };
  await write(device);
  return device;
}
async function write(device: Device) {
  await Preferences.set({ key, value: JSON.stringify(device) });
  changed();
}
async function request(
  action: string,
  body: Record<string, unknown> = {},
  expectedUserId?: string,
) {
  const {
    data: { session },
  } = await supabase.auth.getSession();
  if (expectedUserId && session?.user.id !== expectedUserId)
    throw new Error("Inloggningen ändrades. Aktivera notiser igen.");
  // AbortSignal.timeout is unavailable on the oldest supported iOS WebViews.
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 15000);
  try {
    const response = await fetch(
      `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/native-push`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
          ...(session
            ? { Authorization: `Bearer ${session.access_token}` }
            : {}),
        },
        body: JSON.stringify({ action, ...body }),
        signal: controller.signal,
      },
    );
    const result = await response.json().catch(() => ({}));
    if (!response.ok)
      throw new Error(
        result.error || "Notistjänsten kunde inte nås. Försök igen.",
      );
    return result;
  } finally {
    clearTimeout(timer);
  }
}
const deviceBody = (device: Device) => ({
  id: device.id,
  secret: device.secret,
  generation: device.generation,
});
async function flushPending(device: Device) {
  for (const generation of [...device.pending]) {
    await request("unregister", { ...deviceBody(device), generation });
    device.pending = device.pending.filter((g) => g !== generation);
    await write(device);
  }
}
async function unregister(device: Device) {
  if (device.enabled || device.userId) {
    device.pending = [...new Set([...device.pending, device.generation])];
    device.enabled = false;
    device.userId = null;
    await write(device);
  }
  // Local revocation is separate from durable server cleanup and may fail offline.
  await PushNotifications.unregister().catch(() => undefined);
  await PushNotifications.removeAllDeliveredNotifications().catch(
    () => undefined,
  );
  // The durable revocation must succeed; network cleanup can resume next launch.
  // A push-service outage must not prevent signing out of the account.
  await flushPending(device).catch(() => changed());
}
let listeners: Promise<void> | undefined;
let waiting:
  | { resolve: (token: string) => void; reject: (error: Error) => void }
  | undefined;
async function ensureListeners() {
  if (!listeners)
    listeners = (async () => {
      await PushNotifications.addListener("registration", ({ value }) => {
        if (waiting) waiting.resolve(value);
        else
          void serial(async () => {
            const device = await read();
            if (device.enabled && device.userId)
              await registerToken(device, value);
          }).catch(() => changed());
      });
      await PushNotifications.addListener("registrationError", () =>
        waiting?.reject(
          new Error("Telefonens pushregistrering misslyckades. Försök igen."),
        ),
      );
    })();
  return listeners;
}
async function registerToken(device: Device, token: string) {
  const {
    data: { session },
  } = await supabase.auth.getSession();
  if (!device.enabled || session?.user.id !== device.userId)
    throw new Error("Inloggningen ändrades. Aktivera notiser igen.");
  const { id: appId } = await App.getInfo();
  const provider = Capacitor.getPlatform() === "ios" ? "apns" : "fcm";
  const environment =
    provider === "fcm"
      ? "production"
      : import.meta.env.VITE_NATIVE_APNS_ENVIRONMENT;
  if (environment !== "sandbox" && environment !== "production")
    throw new Error(
      "Appens pushmiljö saknas. Uppdatera appen och försök igen.",
    );
  await request(
    "register",
    { ...deviceBody(device), appId, provider, token, environment },
    device.userId!,
  );
}
async function register(device: Device) {
  await ensureListeners();
  if (Capacitor.getPlatform() === "android")
    await PushNotifications.createChannel({
      id: "garden_updates",
      name: "Din odling",
      description: "Frost och odlingsuppgifter",
      importance: 4,
      visibility: 0,
    });
  const token = await new Promise<string>((resolve, reject) => {
    const timer = setTimeout(() => {
      waiting = undefined;
      reject(
        new Error("Telefonen svarade inte på pushregistreringen. Försök igen."),
      );
    }, 20000);
    waiting = {
      resolve: (value) => {
        clearTimeout(timer);
        waiting = undefined;
        resolve(value);
      },
      reject: (error) => {
        clearTimeout(timer);
        waiting = undefined;
        reject(error);
      },
    };
    void PushNotifications.register().catch((error) => waiting?.reject(error));
  });
  await registerToken(device, token);
}
export const nativePushStatus = () =>
  serial(async () => {
    const device = await read();
    const permission = (await PushNotifications.checkPermissions()).receive;
    const {
      data: { session },
    } = await supabase.auth.getSession();
    const { id: appId } = await App.getInfo();
    let available = false;
    try {
      available =
        (
          await request("config", {
            appId,
            provider: Capacitor.getPlatform() === "ios" ? "apns" : "fcm",
          })
        ).available === true;
    } catch {
      /* Show configuration/connection state without requesting permission. */
    }
    return {
      enabled:
        device.enabled &&
        device.userId === session?.user.id &&
        permission === "granted",
      available,
      permission,
      pending: device.pending.length > 0,
    };
  });
export const enableNativePush = () =>
  serial(async () => {
    const device = await read();
    await flushPending(device);
    const {
      data: { session },
    } = await supabase.auth.getSession();
    if (!session) throw new Error("Logga in först.");
    let permission = (await PushNotifications.checkPermissions()).receive;
    if (permission !== "granted")
      permission = (await PushNotifications.requestPermissions()).receive;
    if (permission !== "granted")
      throw new Error(
        "Tillåt notiser i telefonens inställningar för att aktivera push.",
      );
    device.userId = session.user.id;
    device.generation = crypto.randomUUID();
    device.enabled = true;
    // Persist the capability and consent before a registration can reach the server.
    await write(device);
    try {
      await register(device);
    } catch (error) {
      await unregister(device).catch(() => undefined);
      throw error;
    }
    changed();
  });
export const disableNativePush = () =>
  serial(async () => {
    if (isNativeApp()) await unregister(await read());
  });
export const refreshNativePush = (userId?: string) =>
  serial(async () => {
    if (!isNativeApp()) return;
    const device = await read();
    if (device.userId && device.userId !== userId) {
      await unregister(device);
      return;
    }
    await flushPending(device);
    if (device.enabled && device.userId === userId) {
      if ((await PushNotifications.checkPermissions()).receive !== "granted") {
        await unregister(device);
        return;
      }
      await register(device);
    }
  });
export const testNativePush = () =>
  serial(async () => {
    const device = await read();
    if (!device.enabled || !device.userId)
      throw new Error("Aktivera notiser först.");
    return request("test", deviceBody(device), device.userId);
  });
