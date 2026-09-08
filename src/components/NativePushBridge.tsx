import { useEffect } from "react";
import { App } from "@capacitor/app";
import { PushNotifications } from "@capacitor/push-notifications";
import type { PluginListenerHandle } from "@capacitor/core";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { isNativeApp, nativePathAllowed } from "@/lib/native";
import { refreshNativePush } from "@/lib/nativePush";
import { flushFieldDraft } from "@/lib/fieldDraftLifecycle";
import { toast } from "sonner";
export default function NativePushBridge() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  useEffect(() => {
    if (!isNativeApp() || loading) return;
    let disposed = false;
    const handles: PluginListenerHandle[] = [];
    const add = (promise: Promise<PluginListenerHandle>) =>
      void promise
        .then((handle) => {
          if (disposed) void handle.remove();
          else handles.push(handle);
        })
        .catch(() => undefined);
    const refresh = () =>
      void refreshNativePush(user?.id).catch(() =>
        window.dispatchEvent(new Event("native-push-change")),
      );
    refresh();
    window.addEventListener("online", refresh);
    add(
      App.addListener("appStateChange", ({ isActive }) => {
        if (isActive) refresh();
      }),
    );
    add(
      PushNotifications.addListener(
        "pushNotificationActionPerformed",
        async (event) => {
          try {
            await flushFieldDraft();
          } catch {
            toast.error(
              "Utkastet kunde inte sparas. Stanna kvar och försök igen.",
            );
            return;
          }
          const url = event.notification.data?.url;
          navigate(
            typeof url === "string" && nativePathAllowed(url) ? url : "/app",
          );
        },
      ),
    );
    return () => {
      disposed = true;
      window.removeEventListener("online", refresh);
      handles.forEach((h) => void h.remove());
    };
  }, [user?.id, loading, navigate]);
  return null;
}
