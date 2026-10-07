import { type RainHistory, wateringAdvice } from "@/lib/wateringAdvice";
export default function WateringAdvice(
  { rain, temperature }: { rain?: RainHistory; temperature?: number },
) {
  const advice = wateringAdvice(rain, temperature);
  return (
    <section className="rounded-2xl border border-sky-200 bg-sky-50/60 p-4 dark:border-sky-900 dark:bg-sky-950/20">
      <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
        Vattning utomhus
      </p>
      <h2 className="mt-1 font-semibold">{advice.title}</h2>
      <p className="mt-2 text-sm">{advice.detail}</p>
      <p className="mt-2 text-xs text-muted-foreground">
        Regn når inte alltid krukor och växthus. Bedöm dem separat. Källa:
        Open-Meteos vädermodell.
      </p>
    </section>
  );
}
