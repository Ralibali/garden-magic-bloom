import { useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { prepareSeedPhoto, seedRpc } from "@/lib/seedPlans";
import { sowingPayloadFromVariety } from "@/lib/cropIdentity";
import type { cleanSeedExtraction } from "../../../supabase/functions/_shared/seedPhoto";
import { toast } from "@/hooks/use-toast";
type Fields = ReturnType<typeof cleanSeedExtraction>;
const empty = {
  variety: "",
  brand: "",
  quantity: "",
  expiry_date: "",
  notes: "",
};
export default function SeedPhotoImport() {
  const cache = useQueryClient();
  const [open, setOpen] = useState(false),
    [busy, setBusy] = useState(false),
    [image, setImage] = useState(""),
    [id, setId] = useState("");
  const [fields, setFields] = useState<Fields | null>(null),
    [form, setForm] = useState(empty),
    [reviewed, setReviewed] = useState(false),
    [error, setError] = useState("");
  const lock = useRef(false);
  const update = (key: keyof typeof empty, value: string) => {
    setForm((old) => ({ ...old, [key]: value }));
    setReviewed(false);
  };
  const choose = async (file?: File) => {
    if (!file || lock.current) return;
    lock.current = true;
    setBusy(true);
    setError("");
    try {
      const photo = await prepareSeedPhoto(file);
      setImage(photo);
      setId(crypto.randomUUID());
      setFields(null);
      setForm(empty);
      setReviewed(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Bilden kunde inte öppnas");
    } finally {
      setBusy(false);
      lock.current = false;
    }
  };
  const read = async () => {
    if (lock.current) return;
    lock.current = true;
    setBusy(true);
    setError("");
    try {
      const { data, error: invokeError } = await supabase.functions.invoke(
        "analyze-seed-photo",
        { body: { id, image } },
      );
      if (invokeError || data?.error) {
        let message = data?.error;
        if (!message && invokeError?.context instanceof Response) {
          const body = await invokeError.context.json().catch(() => null);
          message = body?.error;
        }
        throw new Error(
          message ||
            "Avläsningen misslyckades. Försök igen eller lägg till fröet manuellt.",
        );
      }
      if (!data?.fields || data.id !== id)
        throw new Error("Avläsningen kunde inte tolkas");
      const extracted = data.fields as Fields;
      setFields(extracted);
      setForm({
        variety: extracted.variety || "",
        brand: extracted.brand || "",
        quantity: extracted.quantity || "",
        expiry_date: "",
        notes: [
          extracted.expiry_text &&
            `Bäst före enligt påsen: ${extracted.expiry_text}`,
          extracted.instructions,
        ]
          .filter(Boolean)
          .join("\n\n"),
      });
      setReviewed(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Avläsningen misslyckades");
    } finally {
      setBusy(false);
      lock.current = false;
    }
  };
  const save = async () => {
    if (lock.current || !reviewed || !fields) return;
    lock.current = true;
    setBusy(true);
    setError("");
    try {
      const identity = sowingPayloadFromVariety(form.variety.trim());
      await seedRpc("save_reviewed_seed", {
        p_import: id,
        p_reviewed: reviewed,
        p_fields: { ...form, crop_key: identity.crop_key },
      });
      await cache.invalidateQueries({ queryKey: ["seed-inventory"] });
      setOpen(false);
      setImage("");
      setFields(null);
      setForm(empty);
      setReviewed(false);
      toast({
        title: "Det granskade fröet är sparat",
        description:
          "Välj Planera sådd på frökortet för datum och påminnelser.",
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Kunde inte spara");
    } finally {
      setBusy(false);
      lock.current = false;
    }
  };
  return (
    <>
      <Button variant="outline" onClick={() => setOpen(true)}>
        Läs av fröpåse
      </Button>
      <Dialog
        open={open}
        onOpenChange={(next) => {
          if (!busy) setOpen(next);
        }}
      >
        <DialogContent aria-describedby={undefined} className="max-h-[90dvh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Från fröpåse till fröförråd</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            Fotografera texten tydligt. När du väljer Läs av skickas bilden till
            vår AI-tjänst. Fotot sparas inte i förrådet; de avlästa uppgifterna
            sparas för granskning.
          </p>
          <label className="space-y-1 text-sm">
            Välj foto
            <Input
              type="file"
              accept="image/jpeg,image/png,image/webp"
              capture="environment"
              disabled={busy}
              onChange={(e) => {
                void choose(e.target.files?.[0]);
                e.target.value = "";
              }}
            />
          </label>
          {image && (
            <img
              src={image}
              alt="Din fröpåse för granskning"
              className="max-h-60 w-full rounded-lg object-contain bg-muted"
            />
          )}
          {image && !fields && (
            <Button disabled={busy} onClick={() => void read()}>
              {busy ? "Läser av…" : "Läs av"}
            </Button>
          )}
          {fields && (
            <div className="space-y-3">
              <p className="text-sm">
                Granska mot fotot. Tomma fält betyder att uppgiften inte kunde
                läsas säkert.
              </p>
              {fields.warning && (
                <p className="text-sm text-amber-700">{fields.warning}</p>
              )}
              <label className="block text-sm">
                Sort *
                <Input
                  maxLength={200}
                  value={form.variety}
                  onChange={(e) => update("variety", e.target.value)}
                  disabled={busy}
                />
              </label>
              <label className="block text-sm">
                Märke
                <Input
                  maxLength={200}
                  value={form.brand}
                  onChange={(e) => update("brand", e.target.value)}
                  disabled={busy}
                />
              </label>
              <label className="block text-sm">
                Mängd
                <Input
                  maxLength={200}
                  value={form.quantity}
                  onChange={(e) => update("quantity", e.target.value)}
                  disabled={busy}
                />
              </label>
              <label className="block text-sm">
                Bäst före – exakt datum, om känt
                <Input
                  type="date"
                  value={form.expiry_date}
                  onChange={(e) => update("expiry_date", e.target.value)}
                  disabled={busy}
                />
              </label>
              <p className="text-xs text-muted-foreground">
                Om påsen bara anger månad eller år: behåll det i anteckningarna
                och lämna datum tomt.
              </p>
              <label className="block text-sm">
                Anteckningar och anvisningar
                <Textarea
                  rows={5}
                  maxLength={5000}
                  value={form.notes}
                  onChange={(e) => update("notes", e.target.value)}
                  disabled={busy}
                />
              </label>
              <label className="flex items-start gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={reviewed}
                  disabled={busy}
                  onChange={(e) => setReviewed(e.target.checked)}
                />
                Jag har jämfört uppgifterna med fröpåsen och rättat det som
                behövs.
              </label>
              <Button
                className="w-full"
                disabled={busy || !reviewed || !form.variety.trim()}
                onClick={() => void save()}
              >
                {busy ? "Sparar…" : "Spara granskat frö"}
              </Button>
            </div>
          )}
          {error && (
            <p role="alert" className="text-sm text-destructive">
              {error}
            </p>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
