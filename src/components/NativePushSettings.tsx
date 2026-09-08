import { useEffect, useRef, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import {
  disableNativePush,
  enableNativePush,
  nativePushStatus,
  testNativePush,
} from "@/lib/nativePush";
import { Button } from "./ui/button";
import { Switch } from "./ui/switch";
export default function NativePushSettings() {
  const { user } = useAuth();
  const [status, setStatus] =
    useState<Awaited<ReturnType<typeof nativePushStatus>>>();
  const lock = useRef(false);
  const [busy, setBusy] = useState(false),
    [notice, setNotice] = useState("");
  useEffect(() => {
    let active = true;
    const refresh = () =>
      void nativePushStatus()
        .then((value) => {
          if (active) setStatus(value);
        })
        .catch(() => {
          if (active)
            setNotice(
              "Anslut till internet för att kontrollera telefonens notiser.",
            );
        });
    refresh();
    window.addEventListener("native-push-change", refresh);
    return () => {
      active = false;
      window.removeEventListener("native-push-change", refresh);
    };
  }, [user?.id]);
  const run = async (work: () => Promise<void>) => {
    if (lock.current) return;
    lock.current = true;
    setBusy(true);
    setNotice("");
    try {
      await work();
      setStatus(await nativePushStatus());
    } catch (error) {
      setNotice(
        error instanceof Error
          ? error.message
          : "Notisinställningen kunde inte sparas.",
      );
    } finally {
      lock.current = false;
      setBusy(false);
    }
  };
  return (
    <div className="space-y-3 rounded-xl border p-4">
      <div className="flex items-center justify-between gap-4">
        <div>
          <p className="text-sm font-medium">Push till den här telefonen</p>
          <p className="text-xs text-muted-foreground">
            Frost och odlingsuppgifter från ditt konto. Apple eller Google
            förmedlar notiserna. Ett tekniskt enhets-ID kopplas till ditt konto.
          </p>
        </div>
        <Switch
          aria-label="Aktivera push på telefonen"
          checked={status?.enabled || false}
          disabled={busy || !status || (!status.available && !status.enabled)}
          onCheckedChange={(enabled) =>
            void run(async () => {
              await (enabled ? enableNativePush() : disableNativePush());
              setNotice(
                enabled
                  ? "Push är aktiverat på den här telefonen."
                  : "Push är avstängt.",
              );
            })
          }
        />
      </div>
      {status && !status.available && (
        <p className="text-xs text-muted-foreground">
          Push kan inte aktiveras just nu. Kontrollera internetanslutningen och
          försök igen senare. Fältdagbokens lokala påminnelser fungerar separat.
        </p>
      )}
      {status?.pending && (
        <p className="text-xs text-amber-800">
          Avregistrering väntar på anslutning. Redan skickade notiser kan
          fortfarande komma fram.
        </p>
      )}
      <Button
        size="sm"
        variant="outline"
        disabled={busy || !status?.enabled}
        onClick={() =>
          void run(async () => {
            const result = await testNativePush();
            setNotice(
              result.accepted > 0
                ? "Testnotisen har accepterats av Apple eller Google. Kontrollera telefonens notiser."
                : result.retrying > 0
                  ? "Notisen väntar på ett nytt leveransförsök."
                  : "Testet är redan köat eller kunde inte skickas. Försök igen om en minut.",
            );
          })
        }
      >
        Skicka en testnotis
      </Button>
      {notice && (
        <p role="status" className="text-sm">
          {notice}
        </p>
      )}
    </div>
  );
}
