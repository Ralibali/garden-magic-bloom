import { useMemo, useRef, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { sowingMatrix } from "@/data/sowingMatrix";
import {
  getSeedPlans,
  planSuggestion,
  seedRpc,
  type Seed,
} from "@/lib/seedPlans";
import { localDateKey } from "@/lib/gardenToday";
import { toast } from "@/hooks/use-toast";
import { api } from "@/lib/api";
const selectClass =
  "flex h-10 w-full rounded-md border border-input bg-background px-3 text-sm";
export function SeedPlanForm({
  seed,
  onClose,
}: {
  seed: Seed;
  onClose: () => void;
}) {
  const cache = useQueryClient();
  const [id] = useState(() => crypto.randomUUID());
  const { data: profile } = useQuery({
    queryKey: ["profile"],
    queryFn: api.getProfile,
  });
  const [zone, setZone] = useState(""),
    [crop, setCrop] = useState(""),
    [year, setYear] = useState(new Date().getFullYear());
  const [place, setPlace] = useState(""),
    [method, setMethod] = useState("outdoor"),
    [light, setLight] = useState("sun"),
    [type, setType] = useState("indoor");
  const [sow, setSow] = useState(""),
    [transplant, setTransplant] = useState(""),
    [notes, setNotes] = useState(seed.notes || "");
  const [reviewed, setReviewed] = useState(false),
    [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  const lock = useRef(false);
  const suggestion = useMemo(
    () => planSuggestion(crop, Number(zone), year, type, method),
    [crop, zone, year, type, method],
  );
  const adjust = (fn: () => void) => {
    fn();
    setReviewed(false);
  };
  const save = async () => {
    if (lock.current || !reviewed) return;
    lock.current = true;
    setBusy(true);
    setError("");
    try {
      await seedRpc("create_seed_sowing_plan", {
        p_id: id,
        p_seed: seed.id,
        p_plan: {
          reviewed,
          zone: zone || null,
          place,
          growing_method: method,
          light,
          sow_type: type,
          sow_date: sow,
          transplant_date: transplant || null,
          notes,
        },
      });
      await Promise.all([
        cache.invalidateQueries({ queryKey: ["seed-plans"] }),
        cache.invalidateQueries({ queryKey: ["reminder-settings"] }),
      ]);
      toast({ title: "Såplan och påminnelser sparade" });
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Kunde inte spara");
    } finally {
      setBusy(false);
      lock.current = false;
    }
  };
  return (
    <Dialog
      open
      onOpenChange={(next) => {
        if (!next && !busy) onClose();
      }}
    >
      <DialogContent aria-describedby={undefined} className="max-h-[90dvh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Planera sådd: {seed.variety}</DialogTitle>
        </DialogHeader>
        <p className="text-sm text-muted-foreground">
          Spara en plan och påminnelser. Registrera själva sådden när du har
          sått.
        </p>
        <fieldset disabled={busy} className="space-y-3">
          <label className="block text-sm">
            Odlingsplats *
            <Input
              placeholder="Till exempel pallkrage vid söderväggen"
              maxLength={200}
              value={place}
              onChange={(e) => adjust(() => setPlace(e.target.value))}
            />
          </label>
          <div className="grid grid-cols-2 gap-3">
            <label className="text-sm">
              Miljö
              <select
                className={selectClass}
                value={method}
                onChange={(e) => adjust(() => setMethod(e.target.value))}
              >
                <option value="outdoor">Friland / pallkrage</option>
                <option value="balcony">Balkong / kruka ute</option>
                <option value="greenhouse">Växthus</option>
              </select>
            </label>
            <label className="text-sm">
              Ljus
              <select
                className={selectClass}
                value={light}
                onChange={(e) => adjust(() => setLight(e.target.value))}
              >
                <option value="sun">Sol</option>
                <option value="partial">Halvskugga</option>
                <option value="shade">Skugga</option>
              </select>
            </label>
          </div>
          {light === "shade" && (
            <p className="text-sm">
              Kontrollera sortens ljuskrav på påsen. Kalendern bedömer inte om
              skugga räcker.
            </p>
          )}
          <label className="block text-sm">
            Gröda för kalenderförslag
            <select
              className={selectClass}
              value={crop}
              onChange={(e) => adjust(() => setCrop(e.target.value))}
            >
              <option value="">Välj gröda eller ange datum själv</option>
              {sowingMatrix.map((c) => (
                <option key={c.name}>{c.name}</option>
              ))}
            </select>
          </label>
          <div className="grid grid-cols-2 gap-3">
            <label className="text-sm">
              Svensk odlingszon
              <select
                className={selectClass}
                value={zone}
                onChange={(e) => adjust(() => setZone(e.target.value))}
              >
                <option value="">Okänd – egna datum</option>
                {[1, 2, 3, 4, 5, 6, 7, 8].map((z) => (
                  <option key={z}>{z}</option>
                ))}
              </select>
            </label>
            <label className="text-sm">
              Planeringsår
              <Input
                type="number"
                min={new Date().getFullYear()}
                max={new Date().getFullYear() + 2}
                value={year}
                onChange={(e) => adjust(() => setYear(Number(e.target.value)))}
              />
            </label>
          </div>
          {profile?.climate_zone && !zone && (
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={() =>
                adjust(() => setZone(String(profile.climate_zone)))
              }
            >
              Använd zon {profile.climate_zone} från min profil
            </Button>
          )}
          <label className="block text-sm">
            Såsätt
            <select
              className={selectClass}
              value={type}
              onChange={(e) => adjust(() => setType(e.target.value))}
            >
              <option value="indoor">Förodling inomhus</option>
              <option value="direct">Direktsådd på plats</option>
            </select>
          </label>
          {suggestion && (
            <div className="rounded-lg bg-muted p-3 text-sm">
              <p>{suggestion.note}</p>
              {suggestion.sow ? (
                <>
                  <p className="my-2">
                    Kalenderförslag: så {suggestion.sow}
                    {suggestion.transplant
                      ? `, plantera ut ${suggestion.transplant}`
                      : ""}
                    .
                  </p>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={() =>
                      adjust(() => {
                        setSow(suggestion.sow);
                        setTransplant(suggestion.transplant);
                      })
                    }
                  >
                    Använd förslaget
                  </Button>
                </>
              ) : (
                <p className="mt-2">
                  Inget sådatum föreslås för detta val. Ange egna granskade
                  datum.
                </p>
              )}
            </div>
          )}
          <label className="block text-sm">
            Planerad sådd *
            <Input
              type="date"
              min={localDateKey()}
              value={sow}
              onChange={(e) => adjust(() => setSow(e.target.value))}
            />
          </label>
          <label className="block text-sm">
            Utplantering, valfritt
            <Input
              type="date"
              min={sow || localDateKey()}
              value={transplant}
              onChange={(e) => adjust(() => setTransplant(e.target.value))}
            />
          </label>
          <label className="block text-sm">
            Anvisningar och egna anpassningar
            <Textarea
              rows={4}
              maxLength={5000}
              value={notes}
              onChange={(e) => adjust(() => setNotes(e.target.value))}
            />
          </label>
          <p className="text-xs text-muted-foreground">
            Påminnelser visas i appens arbetslista. Webbläsaraviseringar kan
            aktiveras där och visas när appen öppnas.
          </p>
          <label className="flex items-start gap-2 text-sm">
            <input
              type="checkbox"
              checked={reviewed}
              onChange={(e) => setReviewed(e.target.checked)}
            />
            Jag har kontrollerat datumen mot fröpåsen och förhållandena på
            platsen.
          </label>
          <Button
            className="w-full"
            disabled={
              !reviewed ||
              !place.trim() ||
              !sow ||
              sow < localDateKey() ||
              (!!transplant && transplant < sow)
            }
            onClick={() => void save()}
          >
            {busy ? "Sparar…" : "Spara plan och påminnelser"}
          </Button>
        </fieldset>
        {error && (
          <p role="alert" className="text-sm text-destructive">
            {error}
          </p>
        )}
      </DialogContent>
    </Dialog>
  );
}
export function SeedPlans() {
  const navigate = useNavigate();
  const {
    data: plans,
    isLoading,
    error,
    refetch,
  } = useQuery({ queryKey: ["seed-plans"], queryFn: getSeedPlans });
  if (isLoading) return <p className="text-sm">Hämtar såplaner…</p>;
  if (error)
    return (
      <div role="alert">
        Såplanerna kunde inte hämtas.{" "}
        <Button variant="outline" onClick={() => void refetch()}>
          Försök igen
        </Button>
      </div>
    );
  if (!plans?.length) return null;
  return (
    <section className="space-y-3">
      <h2 className="text-xl font-semibold">Dina såplaner</h2>
      <p className="text-sm text-muted-foreground">
        Sparade planer visar dina ursprungliga datum. Flytta eller avsluta
        uppgifter i Påminnelser. När du har sått registrerar du sådden som
        vanligt.
      </p>
      <div className="grid gap-3 sm:grid-cols-2">
        {plans.map((plan) => (
          <article key={plan.id} className="rounded-xl border p-4 space-y-2">
            <h3 className="font-semibold">{plan.variety}</h3>
            <p className="text-sm">
              {plan.place} · {plan.zone ? `Zon ${plan.zone}` : "Zon ej angiven"}
            </p>
            <p className="text-sm">
              Planerad sådd: {plan.sow_date}
              {plan.transplant_date &&
                ` · Utplantering: ${plan.transplant_date}`}
            </p>
            {plan.notes && (
              <p className="text-sm text-muted-foreground whitespace-pre-wrap line-clamp-3">
                {plan.notes}
              </p>
            )}
            <div className="flex flex-wrap gap-2">
              <Button
                size="sm"
                variant="outline"
                onClick={() => navigate("/app/reminders")}
              >
                Påminnelser
              </Button>
              <Button
                size="sm"
                disabled={!plan.seed_id}
                onClick={() =>
                  navigate("/app/sowings", {
                    state: {
                      prefill: {
                        variety: plan.variety,
                        brand: plan.brand || "",
                        seed_inventory_id: plan.seed_id,
                        sow_date: localDateKey(),
                        type: plan.sow_type,
                        notes: `Från såplan (${plan.sow_date}), ${plan.place}.\n${plan.notes}`,
                      },
                    },
                  })
                }
              >
                Registrera genomförd sådd
              </Button>
            </div>
            {!plan.seed_id && (
              <p className="text-xs">
                Fröet har tagits bort ur förrådet. Planen finns kvar som
                historik.
              </p>
            )}
          </article>
        ))}
      </div>
    </section>
  );
}
