import { supabase } from "@/integrations/supabase/client";
import { getCropTiming } from "@/data/sowingMatrix";
export interface Seed {
  id: string;
  variety: string;
  brand?: string | null;
  notes?: string | null;
}
export interface SeedPlan {
  id: string;
  seed_id: string | null;
  variety: string;
  brand: string | null;
  zone: number | null;
  place: string;
  growing_method: "outdoor" | "greenhouse" | "balcony";
  light: "sun" | "partial" | "shade";
  sow_type: "indoor" | "direct";
  sow_date: string;
  transplant_date: string | null;
  notes: string;
}
// New RPCs are kept typed here until generated Supabase types catch up.
const rpc = supabase.rpc as unknown as (
  name: string,
  args: Record<string, unknown>,
) => Promise<{ data: unknown; error: { message: string } | null }>;
export async function seedRpc<T>(
  name: string,
  args: Record<string, unknown>,
): Promise<T> {
  const { data, error } = await rpc(name, args);
  if (error) throw new Error(error.message);
  return data as T;
}
export async function getSeedPlans(): Promise<SeedPlan[]> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Logga in");
  // Generated client schema predates the additive migration.
  const { data, error } = await supabase
    .from("seed_sowing_plans" as never)
    .select("*")
    .eq("user_id", user.id)
    .order("sow_date");
  if (error) throw new Error(error.message);
  return data as unknown as SeedPlan[];
}
export function isoWeekDate(year: number, week: number) {
  const jan4 = new Date(Date.UTC(year, 0, 4));
  jan4.setUTCDate(
    jan4.getUTCDate() - ((jan4.getUTCDay() + 6) % 7) + (week - 1) * 7,
  );
  return jan4.toISOString().slice(0, 10);
}
export function planSuggestion(
  crop: string,
  zone: number,
  year: number,
  type: string,
  method: string,
) {
  if (!Number.isInteger(year) || year < 2020 || year > 2100) return null;
  const timing = getCropTiming(crop, zone);
  if (!timing || !Number.isInteger(zone) || zone < 1 || zone > 8) return null;
  // Calendar data describes outdoor conditions. Never invent earlier greenhouse dates.
  if (method === "greenhouse")
    return {
      sow: "",
      transplant: "",
      note: "Växthusets temperatur styr sådden. Ange datum efter fröpåsen och dina förhållanden.",
    };
  const start = type === "indoor" ? timing.preStart : timing.directSowStart;
  return {
    sow: start == null ? "" : isoWeekDate(year, start),
    transplant:
      type === "indoor" && timing.plantOutStart != null
        ? isoWeekDate(year, timing.plantOutStart)
        : "",
    note:
      timing.note ||
      "Ungefärliga kalenderdatum. Kontrollera fröpåsen, jordtemperaturen och lokal frostrisk.",
  };
}
export async function prepareSeedPhoto(file: File): Promise<string> {
  if (
    !["image/jpeg", "image/png", "image/webp"].includes(file.type) ||
    file.size > 12_000_000
  )
    throw new Error("Välj JPEG, PNG eller WebP, högst 12 MB.");
  const bitmap = await createImageBitmap(file);
  try {
    const ratio = Math.min(1, 1600 / Math.max(bitmap.width, bitmap.height));
    const canvas = document.createElement("canvas");
    canvas.width = Math.round(bitmap.width * ratio);
    canvas.height = Math.round(bitmap.height * ratio);
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("Bilden kunde inte öppnas");
    ctx.fillStyle = "#fff";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    const image = canvas.toDataURL("image/jpeg", 0.85);
    if (image.length > 3_000_000)
      throw new Error("Bilden är för stor. Välj ett mindre foto.");
    return image;
  } finally {
    bitmap.close();
  }
}
