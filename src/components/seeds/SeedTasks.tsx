import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { localDateKey } from "@/lib/gardenToday";
import { type InventorySeed, seedTasks } from "@/lib/seedTasks";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { toast } from "@/hooks/use-toast";
export default function SeedTasks(
  { seeds, onPlan }: {
    seeds: InventorySeed[];
    onPlan: (seed: InventorySeed) => void;
  },
) {
  const profile = useQuery({ queryKey: ["profile"], queryFn: api.getProfile });
  const cache = useQueryClient();
  const tasks = seedTasks(seeds, profile.data?.climate_zone);
  const remind = useMutation({
    mutationFn: async (task: typeof tasks[number]) => {
      const current = await api.getReminderSettings();
      const settings = (current.settings ?? {}) as Record<string, any>;
      const reminders = settings.reminders ?? [];
      if (!reminders.some((r: any) => r.id === task.id)) {
        await api.updateReminderSettings({
          settings: {
            ...settings,
            reminders: [...reminders, {
              id: task.id,
              title: task.title,
              type: task.type,
              date: localDateKey(),
              done: false,
              source: "seed_inventory",
              created_at: new Date().toISOString(),
            }],
          },
        }, settings);
      }
    },
    onSuccess: async () => {
      await cache.invalidateQueries({ queryKey: ["reminder-settings"] });
      toast({ title: "Uppgiften finns i Påminnelser" });
    },
    onError: () =>
      toast({ title: "Kunde inte spara påminnelsen", variant: "destructive" }),
  });
  return (
    <section className="rounded-2xl border bg-primary/5 p-5 space-y-3">
      <h2 className="text-xl font-serif">Att göra i fröförrådet</h2>
      {!profile.data?.climate_zone && (
        <p className="text-sm">
          Ange din odlingszon i{" "}
          <Link className="underline" to="/app/settings">inställningarna</Link>
          {" "}
          för såtips som passar dig.
        </p>
      )}
      {tasks.length === 0
        ? (
          <p className="text-sm text-muted-foreground">
            Inga aktuella såperioder eller bäst före-varningar för dina frön
            just nu.
          </p>
        )
        : tasks.map((task) => (
          <article
            key={task.id}
            className="rounded-xl bg-background p-3 space-y-2"
          >
            <h3 className="font-semibold">{task.title}</h3>
            <p className="text-sm text-muted-foreground">{task.detail}</p>
            <div className="flex flex-wrap gap-2">
              <Button
                size="sm"
                variant="outline"
                disabled={remind.isPending}
                onClick={() => remind.mutate(task)}
              >
                Lägg i Påminnelser
              </Button>
              {task.type === "sowing" && (
                <Button
                  size="sm"
                  onClick={() => onPlan(task.seed)}
                >
                  Planera sådd
                </Button>
              )}
            </div>
          </article>
        ))}
      <p className="text-xs text-muted-foreground">
        Förslagen bygger på dina sparade frön. Äldre frön blir inte automatiskt
        obrukbara.
      </p>
    </section>
  );
}
