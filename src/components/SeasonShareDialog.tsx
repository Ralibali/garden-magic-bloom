import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { formatKg } from "@/lib/formatNumber";
import {
  buildSeasonSummary,
  type SeasonShareInput,
  shareSeasonText,
} from "@/lib/seasonShare";
import { toast } from "@/hooks/use-toast";

function drawSeasonImage(
  canvas: HTMLCanvasElement,
  season: SeasonShareInput,
) {
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Bilden kunde inte skapas");
  canvas.width = 1080;
  canvas.height = 1350;
  ctx.fillStyle = "#f4f0e4";
  ctx.fillRect(0, 0, 1080, 1350);
  ctx.fillStyle = "#244c3a";
  ctx.fillRect(0, 0, 1080, 830);
  for (let i = 0; i < 6; i++) {
    ctx.beginPath();
    ctx.fillStyle = i % 2 ? "#365e43" : "#315540";
    ctx.ellipse(
      940 + (i % 2) * 45,
      120 + i * 110,
      170,
      45,
      -0.65,
      0,
      Math.PI * 2,
    );
    ctx.fill();
  }
  ctx.textAlign = "left";
  ctx.fillStyle = "#c8d6b2";
  ctx.font = "24px system-ui";
  ctx.fillText("MIN ODLINGSSÄSONG", 85, 105);
  ctx.fillStyle = "#f4f0e4";
  ctx.font = "80px Georgia, serif";
  ctx.fillText(String(season.year), 85, 210);
  const weight = formatKg(season.totalGrams / 1000);
  let size = 150;
  ctx.font = `${size}px Georgia, serif`;
  while (ctx.measureText(weight).width > 870 && size > 55) {
    size -= 4;
    ctx.font = `${size}px Georgia, serif`;
  }
  ctx.fillText(weight, 85, 485);
  ctx.font = "34px system-ui";
  ctx.fillText("kilo skördeglädje", 90, 545);
  ctx.fillStyle = "#d8e0c8";
  ctx.font = "26px system-ui";
  ctx.fillText(
    `${season.harvestCount} skördetillfällen · ${season.sowingsCount} sådder`,
    90,
    645,
  );
  ctx.font = "22px system-ui";
  ctx.fillText(
    season.climateZone
      ? `Odlat i zon ${season.climateZone}`
      : "Min trädgård, min säsong",
    90,
    710,
  );
  const top =
    [...season.topCrops].filter((c) => c.grams > 0).sort((a, b) =>
      b.grams - a.grams
    )[0];
  ctx.fillStyle = "#60705b";
  ctx.font = "22px system-ui";
  ctx.fillText("STÖRST SKÖRD", 85, 910);
  ctx.fillStyle = "#244c3a";
  ctx.font = "44px Georgia, serif";
  const label = top?.variety || "Nästa skörd väntar";
  let text = label;
  while (ctx.measureText(text).width > 900 && text.length > 1) {
    text = text.slice(0, -2) + "…";
  }
  ctx.fillText(text, 85, 972);
  ctx.font = "24px system-ui";
  ctx.fillText(
    top ? `${formatKg(top.grams / 1000)} kg` : "En säsong att följa",
    85,
    1018,
  );
  ctx.font = "22px system-ui";
  ctx.fillStyle = "#60705b";
  ctx.fillText("SKÖRDENS UPPSKATTADE VÄRDE", 85, 1100);
  ctx.fillStyle = "#244c3a";
  ctx.font = "54px Georgia, serif";
  ctx.fillText(
    `${Math.round(season.valueSek ?? 0).toLocaleString("sv-SE")} kr`,
    85,
    1172,
  );
  ctx.font = "22px system-ui";
  ctx.fillText("Odlingsdagboken · odlingsdagboken.com", 85, 1280);
}
export default function SeasonShareDialog(
  { season }: { season: SeasonShareInput },
) {
  const [open, setOpen] = useState(false),
    [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  const canvas = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    if (open) {
      const frame = requestAnimationFrame(() => {
        try {
          if (canvas.current) drawSeasonImage(canvas.current, season);
        } catch {
          setError("Bilden kunde inte skapas. Du kan dela som text.");
        }
      });
      return () => cancelAnimationFrame(frame);
    }
  }, [open, season]);
  const exportImage = async (share: boolean) => {
    if (!canvas.current) return;
    setBusy(true);
    setError("");
    try {
      const blob = await new Promise<Blob>((resolve, reject) =>
        canvas.current!.toBlob(
          (b) => b ? resolve(b) : reject(new Error()),
          "image/png",
        )
      );
      const file = new File([blob], `min-odlingssasong-${season.year}.png`, {
        type: "image/png",
      });
      if (share && navigator.canShare?.({ files: [file] }) && navigator.share) {
        await navigator.share({
          files: [file],
          title: `Min odlingssäsong ${season.year}`,
        });
      } else {
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = file.name;
        a.click();
        setTimeout(() => URL.revokeObjectURL(url), 30000);
      }
    } catch (e) {
      if (!(e instanceof DOMException && e.name === "AbortError")) {
        setError(
          "Kunde inte dela bilden. Prova att spara den eller dela texten.",
        );
      }
    } finally {
      setBusy(false);
    }
  };
  return (
    <>
      <Button variant="outline" onClick={() => setOpen(true)}>
        Dela säsongen
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-h-[92dvh] overflow-y-auto sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Din säsong att dela</DialogTitle>
            <DialogDescription>
              Förhandsgranska bilden. Endast säsongens summering delas, inga
              privata anteckningar eller platsuppgifter.
            </DialogDescription>
          </DialogHeader>
          <canvas
            ref={canvas}
            role="img"
            aria-label={buildSeasonSummary(season)}
            className="mx-auto w-full max-w-[320px] rounded-xl"
          />
          <div className="grid grid-cols-2 gap-2">
            <Button disabled={busy} onClick={() => void exportImage(true)}>
              Dela bild
            </Button>
            <Button
              variant="outline"
              disabled={busy}
              onClick={() => void exportImage(false)}
            >
              Spara PNG
            </Button>
          </div>
          <Button
            variant="ghost"
            onClick={async () => {
              const result = await shareSeasonText(buildSeasonSummary(season));
              toast({
                title: result === "copied"
                  ? "Texten är kopierad"
                  : result === "failed"
                  ? "Kunde inte dela texten"
                  : "Delningsdialogen är klar",
              });
            }}
          >
            Dela som text
          </Button>
          {error && <p role="alert">{error}</p>}
        </DialogContent>
      </Dialog>
    </>
  );
}
