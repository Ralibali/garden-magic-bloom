import { readAll } from "@/lib/diaryApi";
import { supabase } from "@/integrations/supabase/client";
import type { BedLayout, BedPlanting } from "./gardenPlanner";
// New additive tables; generated schema is updated after deployment.
const db = supabase as any;
export async function getBedLayouts(): Promise<BedLayout[]> {
  const { data, error } = await db.from("bed_layouts").select("*");
  if (error) throw new Error("Kartan kunde inte hämtas. Försök igen.");
  return data;
}
export async function saveBedLayout(layout: BedLayout) {
  const { error } = await db.from("bed_layouts").upsert(layout, {
    onConflict: "bed_id",
  });
  if (error) throw new Error("Kartan kunde inte sparas. Försök igen.");
}
export async function getBedPlantings(): Promise<BedPlanting[]> {
  return readAll<BedPlanting>((from, to) =>
    db.from("bed_plantings").select("*, beds(name)").order("id").range(from, to)
  );
}
export async function addBedPlanting(
  plant: Omit<BedPlanting, "user_id" | "beds">,
) {
  const { error } = await db.from("bed_plantings").insert(plant);
  if (error) throw new Error("Grödan kunde inte sparas i planen.");
}
export async function removeBedPlanting(id: string) {
  const { error } = await db.from("bed_plantings").delete().eq("id", id);
  if (error) throw new Error("Grödan kunde inte tas bort ur planen.");
}
export async function moveBedPlanting(id: string, x: number, y: number) {
  const { error } = await db.from("bed_plantings").update({ x, y }).eq(
    "id",
    id,
  );
  if (error) throw new Error("Placeringen kunde inte sparas.");
}
