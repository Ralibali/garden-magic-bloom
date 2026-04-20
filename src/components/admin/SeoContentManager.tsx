import React, { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Sparkles, Loader2, CheckCircle2, FileEdit, Eye, ExternalLink, RefreshCw, Trash2 } from "lucide-react";
import { useQuery, useQueryClient, useMutation } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { PLANT_SEEDS, MONTH_SEEDS, ZONE_SEEDS, slugifySv } from "@/lib/seoSeeds";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter,
} from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

type SeoType = "plant" | "month" | "zone";

const TABLE_BY_TYPE: Record<SeoType, "seo_plants" | "seo_months" | "seo_zones"> = {
  plant: "seo_plants",
  month: "seo_months",
  zone: "seo_zones",
};

const PUBLIC_PATH_BY_TYPE: Record<SeoType, string> = {
  plant: "/vaxter",
  month: "/manad",
  zone: "/zoner",
};

async function generateOne(payload: { type: SeoType; name?: string; monthNumber?: number; zoneNumber?: number }) {
  const { data, error } = await supabase.functions.invoke("generate-seo-content", { body: payload });
  if (error) throw new Error(error.message || "Anrop misslyckades");
  if ((data as any)?.error) throw new Error((data as any).error);
  return data;
}

export default function SeoContentManager() {
  const [pinging, setPinging] = useState(false);
  const repingAll = async () => {
    setPinging(true);
    try {
      const tables = ["seo_plants", "seo_months", "seo_zones"] as const;
      const prefixByTable: Record<string, string> = {
        seo_plants: "/vaxter/", seo_months: "/manad/", seo_zones: "/zoner/",
      };
      const paths: string[] = [];
      for (const t of tables) {
        const { data } = await supabase.from(t).select("slug").eq("published", true);
        (data || []).forEach((r: any) => paths.push(prefixByTable[t] + r.slug));
      }
      if (!paths.length) { toast.info("Inga publicerade sidor att pinga."); return; }
      const { error } = await supabase.functions.invoke("indexnow-ping", { body: { paths } });
      if (error) throw error;
      toast.success(`Pingade Bing/Yandex för ${paths.length} sidor`);
    } catch (e: any) {
      toast.error(e.message || "Ping misslyckades");
    } finally {
      setPinging(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="font-serif text-xl text-foreground">SEO-innehåll</h2>
          <p className="text-xs text-muted-foreground">Generera, granska och publicera programmatiska sidor.</p>
        </div>
        <Button variant="outline" size="sm" onClick={repingAll} disabled={pinging} className="rounded-xl gap-2 shrink-0">
          {pinging ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RefreshCw className="h-3.5 w-3.5" />}
          Pinga sökmotorer
        </Button>
      </div>
      <Tabs defaultValue="plants" className="space-y-4">
        <TabsList>
          <TabsTrigger value="plants">Växter ({PLANT_SEEDS.length})</TabsTrigger>
          <TabsTrigger value="months">Månader ({MONTH_SEEDS.length})</TabsTrigger>
          <TabsTrigger value="zones">Zoner ({ZONE_SEEDS.length})</TabsTrigger>
        </TabsList>
        <TabsContent value="plants"><PlantsPanel /></TabsContent>
        <TabsContent value="months"><MonthsPanel /></TabsContent>
        <TabsContent value="zones"><ZonesPanel /></TabsContent>
      </Tabs>
    </div>
  );
}

// ---------- Generic batch runner ----------

function useBatchRunner(type: SeoType) {
  const [running, setRunning] = useState(false);
  const [progress, setProgress] = useState({ done: 0, total: 0, current: "" });
  const queryClient = useQueryClient();

  const run = async (items: { label: string; payload: any }[]) => {
    setRunning(true);
    setProgress({ done: 0, total: items.length, current: "" });
    let ok = 0;
    let fail = 0;
    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      setProgress({ done: i, total: items.length, current: item.label });
      try {
        await generateOne(item.payload);
        ok++;
      } catch (e: any) {
        fail++;
        toast.error(`${item.label}: ${e.message}`);
        if (e.message?.includes("krediter")) break; // stop on credit exhaustion
      }
      // Small delay to avoid rate limits
      await new Promise((r) => setTimeout(r, 800));
    }
    setRunning(false);
    setProgress({ done: items.length, total: items.length, current: "" });
    queryClient.invalidateQueries({ queryKey: [`admin-${TABLE_BY_TYPE[type]}`] });
    toast.success(`Klart: ${ok} lyckade, ${fail} misslyckade`);
  };

  return { running, progress, run };
}

// ---------- Plants ----------

function PlantsPanel() {
  const queryClient = useQueryClient();
  const { data: rows, isLoading } = useQuery({
    queryKey: ["admin-seo_plants"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("seo_plants")
        .select("id, slug, name, published, updated_at, description_short")
        .order("name");
      if (error) throw error;
      return data;
    },
  });

  const existingSlugs = new Set((rows || []).map((r) => r.slug));
  const { running, progress, run } = useBatchRunner("plant");

  const generateMissing = () => {
    const missing = PLANT_SEEDS.filter((p) => !existingSlugs.has(slugifySv(p.name)));
    if (!missing.length) {
      toast.info("Alla växter är redan genererade.");
      return;
    }
    run(missing.map((p) => ({ label: p.name, payload: { type: "plant", name: p.name } })));
  };

  const generateOneMutation = useMutation({
    mutationFn: (name: string) => generateOne({ type: "plant", name }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-seo_plants"] });
      toast.success("Genererad!");
    },
    onError: (e: any) => toast.error(e.message),
  });

  return (
    <div className="space-y-4">
      <BatchControls
        running={running}
        progress={progress}
        existingCount={rows?.length || 0}
        totalCount={PLANT_SEEDS.length}
        onGenerateMissing={generateMissing}
        label="växter"
      />

      {isLoading ? (
        <Skeleton className="h-64" />
      ) : (
        <div className="space-y-4">
          {[1, 2, 3].map((batch) => {
            const items = PLANT_SEEDS.filter((p) => p.batch === batch);
            return (
              <div key={batch} className="space-y-2">
                <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                  Omgång {batch} ({items.length} st)
                </h3>
                <div className="grid gap-2 sm:grid-cols-2">
                  {items.map((p) => {
                    const slug = slugifySv(p.name);
                    const existing = (rows || []).find((r) => r.slug === slug);
                    return (
                      <SeoRow
                        key={p.name}
                        type="plant"
                        title={p.name}
                        slug={slug}
                        existing={existing}
                        onGenerate={() => generateOneMutation.mutate(p.name)}
                        isGenerating={generateOneMutation.isPending && generateOneMutation.variables === p.name}
                      />
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ---------- Months ----------

function MonthsPanel() {
  const queryClient = useQueryClient();
  const { data: rows, isLoading } = useQuery({
    queryKey: ["admin-seo_months"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("seo_months")
        .select("id, slug, month_number, month_name, published, updated_at")
        .order("month_number");
      if (error) throw error;
      return data;
    },
  });

  const { running, progress, run } = useBatchRunner("month");
  const existingSlugs = new Set((rows || []).map((r) => r.slug));

  const generateMissing = () => {
    const missing = MONTH_SEEDS.filter((m) => !existingSlugs.has(m.name));
    if (!missing.length) return toast.info("Alla månader är redan genererade.");
    run(missing.map((m) => ({ label: m.name, payload: { type: "month", monthNumber: m.number } })));
  };

  const generateOneMutation = useMutation({
    mutationFn: (monthNumber: number) => generateOne({ type: "month", monthNumber }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-seo_months"] });
      toast.success("Genererad!");
    },
    onError: (e: any) => toast.error(e.message),
  });

  return (
    <div className="space-y-4">
      <BatchControls
        running={running}
        progress={progress}
        existingCount={rows?.length || 0}
        totalCount={MONTH_SEEDS.length}
        onGenerateMissing={generateMissing}
        label="månader"
      />
      {isLoading ? (
        <Skeleton className="h-64" />
      ) : (
        <div className="grid gap-2 sm:grid-cols-2">
          {MONTH_SEEDS.map((m) => {
            const existing = (rows || []).find((r) => r.slug === m.name);
            return (
              <SeoRow
                key={m.name}
                type="month"
                title={m.name}
                slug={m.name}
                existing={existing}
                onGenerate={() => generateOneMutation.mutate(m.number)}
                isGenerating={generateOneMutation.isPending && generateOneMutation.variables === m.number}
              />
            );
          })}
        </div>
      )}
    </div>
  );
}

// ---------- Zones ----------

function ZonesPanel() {
  const queryClient = useQueryClient();
  const { data: rows, isLoading } = useQuery({
    queryKey: ["admin-seo_zones"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("seo_zones")
        .select("id, slug, zone_number, title, published, updated_at")
        .order("zone_number");
      if (error) throw error;
      return data;
    },
  });

  const { running, progress, run } = useBatchRunner("zone");
  const existingSlugs = new Set((rows || []).map((r) => r.slug));

  const generateMissing = () => {
    const missing = ZONE_SEEDS.filter((z) => !existingSlugs.has(z.slug));
    if (!missing.length) return toast.info("Alla zoner är redan genererade.");
    run(missing.map((z) => ({ label: `Zon ${z.number}`, payload: { type: "zone", zoneNumber: z.number } })));
  };

  const generateOneMutation = useMutation({
    mutationFn: (zoneNumber: number) => generateOne({ type: "zone", zoneNumber }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-seo_zones"] });
      toast.success("Genererad!");
    },
    onError: (e: any) => toast.error(e.message),
  });

  return (
    <div className="space-y-4">
      <BatchControls
        running={running}
        progress={progress}
        existingCount={rows?.length || 0}
        totalCount={ZONE_SEEDS.length}
        onGenerateMissing={generateMissing}
        label="zoner"
      />
      {isLoading ? (
        <Skeleton className="h-64" />
      ) : (
        <div className="grid gap-2 sm:grid-cols-2">
          {ZONE_SEEDS.map((z) => {
            const existing = (rows || []).find((r) => r.slug === z.slug);
            return (
              <SeoRow
                key={z.slug}
                type="zone"
                title={`Zon ${z.number}`}
                slug={z.slug}
                existing={existing}
                onGenerate={() => generateOneMutation.mutate(z.number)}
                isGenerating={generateOneMutation.isPending && generateOneMutation.variables === z.number}
              />
            );
          })}
        </div>
      )}
    </div>
  );
}

// ---------- Shared row ----------

function BatchControls({
  running, progress, existingCount, totalCount, onGenerateMissing, label,
}: {
  running: boolean;
  progress: { done: number; total: number; current: string };
  existingCount: number;
  totalCount: number;
  onGenerateMissing: () => void;
  label: string;
}) {
  return (
    <Card className="border-primary/20 bg-primary/5">
      <CardContent className="p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <p className="text-sm font-medium text-foreground">
            {existingCount} av {totalCount} {label} genererade
          </p>
          {running && (
            <p className="text-xs text-muted-foreground mt-1">
              Genererar {progress.done + 1}/{progress.total}: {progress.current}…
            </p>
          )}
        </div>
        <Button onClick={onGenerateMissing} disabled={running} className="gap-2 rounded-xl">
          {running ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
          {running ? "Kör batch…" : "Generera saknade"}
        </Button>
      </CardContent>
    </Card>
  );
}

function SeoRow({
  type, title, slug, existing, onGenerate, isGenerating,
}: {
  type: SeoType;
  title: string;
  slug: string;
  existing?: { id: string; published: boolean; updated_at: string };
  onGenerate: () => void;
  isGenerating: boolean;
}) {
  const queryClient = useQueryClient();
  const tableName = TABLE_BY_TYPE[type];

  const togglePublish = useMutation({
    mutationFn: async () => {
      if (!existing) return;
      const { error } = await supabase
        .from(tableName)
        .update({ published: !existing.published })
        .eq("id", existing.id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`admin-${tableName}`] });
      toast.success(existing?.published ? "Avpublicerad" : "Publicerad!");
    },
    onError: (e: any) => toast.error(e.message),
  });

  const deleteRow = useMutation({
    mutationFn: async () => {
      if (!existing) return;
      const { error } = await supabase.from(tableName).delete().eq("id", existing.id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`admin-${tableName}`] });
      toast.success("Raderad");
    },
    onError: (e: any) => toast.error(e.message),
  });

  return (
    <Card className="border-border/50">
      <CardContent className="p-3 flex items-center gap-2">
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-foreground capitalize truncate">{title}</p>
          <div className="flex items-center gap-1.5 mt-0.5">
            {existing ? (
              existing.published ? (
                <Badge variant="secondary" className="text-[9px] bg-green-500/10 text-green-600 border-green-500/20">
                  <CheckCircle2 className="h-2.5 w-2.5 mr-0.5" /> Publicerad
                </Badge>
              ) : (
                <Badge variant="secondary" className="text-[9px]">Utkast</Badge>
              )
            ) : (
              <Badge variant="outline" className="text-[9px] text-muted-foreground">Saknas</Badge>
            )}
            {existing && (
              <span className="text-[10px] text-muted-foreground">
                {new Date(existing.updated_at).toLocaleDateString("sv-SE")}
              </span>
            )}
          </div>
        </div>

        <div className="flex gap-1 shrink-0">
          {existing && (
            <ReviewDialog type={type} id={existing.id} title={title} />
          )}
          <Button
            variant="outline"
            size="sm"
            className="h-7 text-[10px] rounded-lg gap-1"
            onClick={onGenerate}
            disabled={isGenerating}
          >
            {isGenerating ? <Loader2 className="h-3 w-3 animate-spin" /> : existing ? <RefreshCw className="h-3 w-3" /> : <Sparkles className="h-3 w-3" />}
            {existing ? "Generera om" : "Generera"}
          </Button>
          {existing && (
            <>
              <Button
                variant={existing.published ? "outline" : "default"}
                size="sm"
                className="h-7 text-[10px] rounded-lg"
                onClick={() => togglePublish.mutate()}
                disabled={togglePublish.isPending}
              >
                {existing.published ? "Avpublicera" : "Publicera"}
              </Button>
              <a
                href={`${PUBLIC_PATH_BY_TYPE[type]}/${slug}`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center justify-center h-7 w-7 rounded-lg border border-border hover:bg-muted"
                title="Öppna sidan"
              >
                <ExternalLink className="h-3 w-3" />
              </a>
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive/50 hover:text-destructive">
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent className="rounded-2xl">
                  <AlertDialogHeader>
                    <AlertDialogTitle>Radera {title}?</AlertDialogTitle>
                    <AlertDialogDescription>
                      Det här tar bort sidan permanent. Du kan generera om den igen senare.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel className="rounded-xl">Avbryt</AlertDialogCancel>
                    <AlertDialogAction
                      className="bg-destructive text-destructive-foreground hover:bg-destructive/90 rounded-xl"
                      onClick={() => deleteRow.mutate()}
                    >
                      Radera
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

// ---------- Review / edit dialog ----------

function ReviewDialog({ type, id, title }: { type: SeoType; id: string; title: string }) {
  const tableName = TABLE_BY_TYPE[type];
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState<any>(null);

  const { data, isLoading } = useQuery({
    queryKey: [`admin-${tableName}-detail`, id],
    queryFn: async () => {
      const { data, error } = await supabase.from(tableName).select("*").eq("id", id).maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: open,
  });

  React.useEffect(() => {
    if (data) setDraft(data);
  }, [data]);

  const saveMutation = useMutation({
    mutationFn: async () => {
      if (!draft) return;
      const { id: _, created_at, updated_at, ...payload } = draft;
      const { error } = await supabase.from(tableName).update(payload).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`admin-${tableName}`] });
      queryClient.invalidateQueries({ queryKey: [`admin-${tableName}-detail`, id] });
      toast.success("Sparat");
      setOpen(false);
    },
    onError: (e: any) => toast.error(e.message),
  });

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="icon" className="h-7 w-7" title="Granska & redigera">
          <FileEdit className="h-3 w-3" />
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto rounded-2xl">
        <DialogHeader>
          <DialogTitle className="font-serif capitalize">Granska: {title}</DialogTitle>
        </DialogHeader>

        {isLoading || !draft ? (
          <Skeleton className="h-96" />
        ) : (
          <div className="space-y-4">
            {/* Common fields */}
            {"description_short" in draft && (
              <Field label="Meta description (150–160 tecken)">
                <Textarea
                  value={draft.description_short || ""}
                  onChange={(e) => setDraft({ ...draft, description_short: e.target.value })}
                  rows={2}
                />
                <p className="text-[10px] text-muted-foreground mt-1">{(draft.description_short || "").length} tecken</p>
              </Field>
            )}
            {"intro" in draft && (
              <Field label="Intro">
                <Textarea
                  value={draft.intro || ""}
                  onChange={(e) => setDraft({ ...draft, intro: e.target.value })}
                  rows={4}
                />
              </Field>
            )}
            {"description" in draft && type === "zone" && (
              <Field label="Beskrivning">
                <Textarea
                  value={draft.description || ""}
                  onChange={(e) => setDraft({ ...draft, description: e.target.value })}
                  rows={6}
                />
              </Field>
            )}
            {"description_long" in draft && (
              <Field label="Lång beskrivning">
                <Textarea
                  value={draft.description_long || ""}
                  onChange={(e) => setDraft({ ...draft, description_long: e.target.value })}
                  rows={6}
                />
              </Field>
            )}
            {"content_html" in draft && (
              <Field label="Brödtext (HTML)">
                <Textarea
                  value={draft.content_html || ""}
                  onChange={(e) => setDraft({ ...draft, content_html: e.target.value })}
                  rows={12}
                  className="font-mono text-xs"
                />
              </Field>
            )}
            {"faq" in draft && Array.isArray(draft.faq) && (
              <Field label={`FAQ (${draft.faq.length} st)`}>
                <div className="space-y-2">
                  {draft.faq.map((f: any, i: number) => (
                    <div key={i} className="space-y-1 p-2 rounded-lg bg-muted/30">
                      <Input
                        value={f.question}
                        onChange={(e) => {
                          const newFaq = [...draft.faq];
                          newFaq[i] = { ...f, question: e.target.value };
                          setDraft({ ...draft, faq: newFaq });
                        }}
                        className="text-xs font-medium"
                      />
                      <Textarea
                        value={f.answer}
                        onChange={(e) => {
                          const newFaq = [...draft.faq];
                          newFaq[i] = { ...f, answer: e.target.value };
                          setDraft({ ...draft, faq: newFaq });
                        }}
                        rows={2}
                        className="text-xs"
                      />
                    </div>
                  ))}
                </div>
              </Field>
            )}

            {/* Preview link */}
            <a
              href={`${PUBLIC_PATH_BY_TYPE[type]}/${draft.slug}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 text-xs text-primary hover:underline"
            >
              <Eye className="h-3 w-3" /> Förhandsgranska sida
            </a>
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)} className="rounded-xl">Avbryt</Button>
          <Button onClick={() => saveMutation.mutate()} disabled={saveMutation.isPending} className="rounded-xl">
            {saveMutation.isPending && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
            Spara ändringar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <label className="text-xs font-medium text-foreground">{label}</label>
      {children}
    </div>
  );
}
