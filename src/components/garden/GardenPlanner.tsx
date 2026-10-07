import { useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import ConfirmDeleteButton from "@/components/ConfirmDeleteButton";
import { api } from "@/lib/api";
import {
  addBedPlanting,
  getBedLayouts,
  getBedPlantings,
  removeBedPlanting,
  saveBedLayout,
} from "@/lib/gardenPlanningApi";
import {
  type BedLayout,
  clampLayout,
  rotationWarnings,
} from "@/lib/gardenPlanner";
import { analyzeUserSowings } from "@/lib/companionAnalysis";
import { sowingMatrix } from "@/data/sowingMatrix";
import { toast } from "@/hooks/use-toast";

type Bed = { id: string; name: string; user_id: string };
export default function GardenPlanner(
  { beds, onCreate }: { beds: Bed[]; onCreate: () => void },
) {
  const cache = useQueryClient();
  const navigate = useNavigate();
  const layouts = useQuery({
    queryKey: ["bed-layouts"],
    queryFn: getBedLayouts,
  });
  const plantings = useQuery({
    queryKey: ["bed-plantings"],
    queryFn: getBedPlantings,
  });
  const sowings = useQuery({ queryKey: ["sowings"], queryFn: api.getSowings });
  const [draft, setDraft] = useState<Record<string, BedLayout>>({});
  const [selected, setSelected] = useState("");
  const [year, setYear] = useState(new Date().getFullYear());
  const [variety, setVariety] = useState("");
  const map = useRef<HTMLDivElement>(null);
  const drag = useRef<
    { id: string; startX: number; startY: number; layout: BedLayout } | null
  >(null);
  const getLayout = (bed: Bed, index: number): BedLayout =>
    draft[bed.id] ?? layouts.data?.find((item) => item.bed_id === bed.id) ??
      {
        bed_id: bed.id,
        x: 4 + (index % 3) * 31,
        y: 5 + (Math.floor(index / 3) % 4) * 23,
        width: 24,
        height: 18,
        kind: "raised",
      };
  const selectedBed = beds.find((bed) => bed.id === selected);
  const selectedLayout = selectedBed
    ? getLayout(selectedBed, beds.indexOf(selectedBed))
    : null;
  const history = [
    ...(sowings.data ?? []).map((s) => ({
      bed_id: s.bed_id,
      variety: s.variety,
      year: Number(s.sow_date.slice(0, 4)),
    })),
    ...(plantings.data ?? []).map((p) => ({ ...p, planned: true })),
  ];
  const warnings = selected
    ? rotationWarnings(variety, selected, year, history)
    : [];
  const planted = (plantings.data ?? []).filter((p) =>
    p.year === year && p.bed_id === selected
  );
  const companions = analyzeUserSowings(planted);
  const save = useMutation({
    mutationFn: async (layout: BedLayout) => saveBedLayout(clampLayout(layout)),
    onSuccess: async (_, layout) => {
      await cache.invalidateQueries({ queryKey: ["bed-layouts"] });
      setDraft((old) => {
        const next = { ...old };
        delete next[layout.bed_id];
        return next;
      });
      toast({ title: "Placeringen är sparad" });
    },
    onError: () =>
      toast({
        title: "Placeringen sparades inte",
        description: "Dina ändringar finns kvar här. Försök spara igen.",
        variant: "destructive",
      }),
  });
  const add = useMutation({
    mutationFn: () =>
      addBedPlanting({
        id: crypto.randomUUID(),
        bed_id: selected,
        year,
        variety: variety.trim(),
        x: 10 + (planted.length % 3) * 30,
        y: 15 + (Math.floor(planted.length / 3) % 3) * 30,
      }),
    onSuccess: async () => {
      await cache.invalidateQueries({ queryKey: ["bed-plantings"] });
      setVariety("");
      toast({ title: "Grödan är tillagd i planen" });
    },
    onError: (e: Error) => toast({ title: e.message, variant: "destructive" }),
  });
  const remove = useMutation({
    mutationFn: removeBedPlanting,
    onSuccess: () => cache.invalidateQueries({ queryKey: ["bed-plantings"] }),
    onError: (e: Error) => toast({ title: e.message, variant: "destructive" }),
  });
  const change = (key: keyof BedLayout, value: number | string) =>
    selectedLayout &&
    setDraft((old) => ({
      ...old,
      [selected]: clampLayout({ ...selectedLayout, [key]: value }),
    }));
  const failed = layouts.isError || plantings.isError || sowings.isError;
  return (
    <section
      className="rounded-3xl border bg-card p-4 sm:p-6 space-y-4"
      aria-label="Trädgårdsplanerare"
    >
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="font-serif text-2xl">Rita din trädgård</h2>
          <p className="text-sm text-muted-foreground">
            Dra bäddarna på skissen. Välj en bädd för grödor och mått. Skissen
            är inte skalenlig.
          </p>
        </div>
        <label className="text-sm">
          Säsong<select
            className="ml-2 rounded-lg border bg-background p-2"
            value={year}
            onChange={(e) => setYear(Number(e.target.value))}
          >
            {[-2, -1, 0, 1, 2].map((offset) => (
              <option key={offset}>{new Date().getFullYear() + offset}</option>
            ))}
          </select>
        </label>
      </div>
      {failed
        ? (
          <div role="alert" className="rounded-xl border p-4">
            Kartan eller odlingshistoriken kunde inte hämtas.{" "}
            <Button
              variant="outline"
              onClick={() => {
                void layouts.refetch();
                void plantings.refetch();
                void sowings.refetch();
              }}
            >
              Försök igen
            </Button>
          </div>
        )
        : layouts.isPending || plantings.isPending
        ? <p>Hämtar din karta…</p>
        : (
          <>
            <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_290px]">
              <div
                ref={map}
                className="relative aspect-square w-full overflow-hidden rounded-2xl border bg-emerald-50 dark:bg-emerald-950/20"
                style={{
                  backgroundImage:
                    "linear-gradient(#82988120 1px, transparent 1px), linear-gradient(90deg, #82988120 1px, transparent 1px)",
                  backgroundSize: "5% 5%",
                }}
              >
                <span className="absolute right-3 top-2 text-xs text-muted-foreground pointer-events-none">
                  N ↑
                </span>
                {beds.map((bed, index) => {
                  const layout = getLayout(bed, index);
                  const crops = (plantings.data ?? []).filter((p) =>
                    p.bed_id === bed.id && p.year === year
                  );
                  return (
                    <button
                      key={bed.id}
                      type="button"
                      aria-label={`Flytta ${bed.name}`}
                      aria-pressed={selected === bed.id}
                      disabled={save.isPending}
                      className={`absolute touch-none rounded-lg border-2 p-1 text-left shadow-sm focus:ring-4 focus:ring-primary/40 ${
                        selected === bed.id
                          ? "border-primary bg-primary/20"
                          : "border-amber-800/40 bg-amber-100 dark:bg-amber-950"
                      }`}
                      style={{
                        left: `${layout.x}%`,
                        top: `${layout.y}%`,
                        width: `${layout.width}%`,
                        height: `${layout.height}%`,
                      }}
                      onPointerDown={(e) => {
                        if (e.button !== 0) return;
                        setSelected(bed.id);
                        drag.current = {
                          id: bed.id,
                          startX: e.clientX,
                          startY: e.clientY,
                          layout,
                        };
                        e.currentTarget.setPointerCapture(e.pointerId);
                      }}
                      onPointerMove={(e) => {
                        if (
                          drag.current?.id !== bed.id || !map.current
                        ) return;
                        const r = map.current.getBoundingClientRect();
                        const d = drag.current;
                        setDraft((old) => ({
                          ...old,
                          [bed.id]: clampLayout({
                            ...d.layout,
                            x: d.layout.x +
                              (e.clientX - d.startX) / r.width * 100,
                            y: d.layout.y +
                              (e.clientY - d.startY) / r.height * 100,
                          }),
                        }));
                      }}
                      onPointerUp={() => {
                        drag.current = null;
                      }}
                      onPointerCancel={() => {
                        drag.current = null;
                      }}
                      onKeyDown={(e) => {
                        const delta: Record<string, [number, number]> = {
                          ArrowLeft: [-1, 0],
                          ArrowRight: [1, 0],
                          ArrowUp: [0, -1],
                          ArrowDown: [0, 1],
                        };
                        if (!delta[e.key]) return;
                        e.preventDefault();
                        setSelected(bed.id);
                        setDraft((old) => ({
                          ...old,
                          [bed.id]: clampLayout({
                            ...layout,
                            x: layout.x + delta[e.key][0],
                            y: layout.y + delta[e.key][1],
                          }),
                        }));
                      }}
                    >
                      <span className="block truncate text-xs font-semibold">
                        {bed.name}
                      </span>
                      <span className="block truncate text-[10px]">
                        {layout.kind === "raised"
                          ? "Pallkrage"
                          : layout.kind === "greenhouse"
                          ? "Växthus"
                          : "Bädd"}
                      </span>
                      <span className="block overflow-hidden text-[10px] leading-tight">
                        {crops.map((c) => c.variety).join(" · ")}
                      </span>
                    </button>
                  );
                })}
                {!beds.length && (
                  <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 p-5 text-center">
                    <p>Lägg till din första bädd eller pallkrage.</p>
                    <Button onClick={onCreate}>Lägg till odlingsplats</Button>
                  </div>
                )}
              </div>
              <div className="space-y-4">
                <label className="block text-sm font-medium">
                  Välj bädd<select
                    className="mt-1 w-full rounded-lg border bg-background p-2"
                    value={selected}
                    onChange={(e) => setSelected(e.target.value)}
                  >
                    <option value="">Välj en plats på kartan</option>
                    {beds.map((b) => (
                      <option key={b.id} value={b.id}>{b.name}</option>
                    ))}
                  </select>
                </label>
                {selectedLayout && (
                  <>
                    <label className="block text-sm">
                      Typ<select
                        className="ml-2 rounded-lg border bg-background p-2"
                        value={selectedLayout.kind}
                        onChange={(e) => change("kind", e.target.value)}
                      >
                        <option value="raised">Pallkrage</option>
                        <option value="bed">Bädd / friland</option>
                        <option value="greenhouse">Växthus</option>
                      </select>
                    </label>
                    <div className="grid grid-cols-2 gap-2">
                      {(["x", "y", "width", "height"] as const).map((
                        key,
                        index,
                      ) => (
                        <label key={key} className="text-xs">
                          {[
                            "Vänster (%)",
                            "Uppifrån (%)",
                            "Bredd (%)",
                            "Höjd (%)",
                          ][index]}
                          <Input
                            type="number"
                            min={key === "x" || key === "y" ? 0 : 8}
                            max={100}
                            value={Math.round(selectedLayout[key])}
                            onChange={(e) =>
                              change(key, Number(e.target.value))}
                          />
                        </label>
                      ))}
                    </div>
                    <Button
                      className="w-full"
                      disabled={save.isPending}
                      onClick={() => save.mutate(selectedLayout)}
                    >
                      {save.isPending ? "Sparar…" : "Spara placering"}
                    </Button>
                    {draft[selected] && (
                      <p className="text-xs text-amber-800">
                        Placeringen har osparade ändringar.
                      </p>
                    )}
                    <form
                      className="border-t pt-4 space-y-2"
                      onSubmit={(e) => {
                        e.preventDefault();
                        if (variety.trim()) add.mutate();
                      }}
                    >
                      <label className="text-sm">
                        Gröda eller sort<Input
                          list="planner-crops"
                          maxLength={120}
                          value={variety}
                          onChange={(e) => setVariety(e.target.value)}
                          placeholder="Till exempel Morot – Nantes"
                        />
                      </label>
                      <datalist id="planner-crops">
                        {sowingMatrix.map((c) => (
                          <option key={c.name} value={c.name} />
                        ))}
                      </datalist>
                      {warnings.map((w) => (
                        <p
                          role="status"
                          key={w}
                          className="text-sm text-amber-800 dark:text-amber-200"
                        >
                          {w}
                        </p>
                      ))}
                      <Button
                        type="submit"
                        disabled={!variety.trim() || add.isPending}
                      >
                        Placera i bädden
                      </Button>
                      <p className="text-xs text-muted-foreground">
                        Detta är en plan. Logga sådden när du har sått.
                      </p>
                    </form>
                  </>
                )}
                <Button variant="outline" onClick={onCreate}>
                  Ny bädd eller pallkrage
                </Button>
              </div>
            </div>
            {selectedBed && (
              <div className="space-y-3">
                <h3 className="font-semibold">{selectedBed.name} · {year}</h3>
                {planted.length === 0
                  ? (
                    <p className="text-sm text-muted-foreground">
                      Inga planerade grödor i bädden ännu.
                    </p>
                  )
                  : (
                    <div className="flex flex-wrap gap-3">
                      {planted.map((p) => (
                        <div
                          key={p.id}
                          className="rounded-xl border p-3 space-y-2"
                        >
                          <p className="font-medium">{p.variety}</p>
                          {rotationWarnings(p.variety, p.bed_id, year, history)
                            .map((w) => (
                              <p
                                key={w}
                                className="max-w-xs text-xs text-amber-800 dark:text-amber-200"
                              >
                                {w}
                              </p>
                            ))}
                          <div className="flex items-center gap-2">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() =>
                                navigate("/app/sowings", {
                                  state: {
                                    prefill: {
                                      variety: p.variety,
                                      bed_id: p.bed_id,
                                    },
                                  },
                                })}
                            >
                              Logga sådd
                            </Button>
                            <ConfirmDeleteButton
                              itemName={p.variety}
                              description="Grödan tas bort ur planen. Loggade sådder påverkas inte."
                              onConfirm={() => remove.mutate(p.id)}
                              disabled={remove.isPending}
                            />
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                {companions.bad.map((p) => (
                  <p key={`${p.plantA}-${p.plantB}`} className="text-sm">
                    {p.plantA} och {p.plantB}{" "}
                    hålls ofta isär enligt odlartradition.
                  </p>
                ))}
                {companions.good.map((p) => (
                  <p key={`${p.plantA}-${p.plantB}`} className="text-sm">
                    {p.plantA} och {p.plantB}{" "}
                    räknas som bra grannar enligt odlartradition.
                  </p>
                ))}
                <p className="text-xs text-muted-foreground">
                  Samplanteringstabellen bygger på odlartradition, inte säker
                  skadedjursbekämpning.
                </p>
              </div>
            )}
          </>
        )}
      <div className="flex gap-4 text-sm">
        <Link className="text-primary underline" to="/app/rotation">
          Se växtföljden
        </Link>
        <Link className="text-primary underline" to="/app/companion">
          Se samplantering
        </Link>
      </div>
    </section>
  );
}
