import { readAll } from '@/lib/diaryApi';
import { assertWebPurchase } from '@/lib/native';
import { supabase } from '@/integrations/supabase/client';
import { resolveGardenLocation } from '@/lib/gardenWeather';
import { track } from '@/lib/plausible';

// Helper to get current user id
async function getUserId(): Promise<string> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');
  return user.id;
}

// ==================== BEDS ====================

export async function getBeds() {
  const { data, error } = await supabase.from('beds').select('*').order('created_at', { ascending: false });
  if (error) throw new Error(error.message);
  return data;
}

export async function createBed(bedData: { name: string; description?: string }) {
  const userId = await getUserId();
  const { data, error } = await supabase.from('beds').insert({ ...bedData, user_id: userId }).select().single();
  if (error) throw new Error(error.message);
  return data;
}

export async function updateBed(id: string, bedData: any) {
  const { data, error } = await supabase.from('beds').update(bedData).eq('id', id).select().single();
  if (error) throw new Error(error.message);
  return data;
}

export async function deleteBed(id: string) {
  const { error } = await supabase.from('beds').delete().eq('id', id).select('id').single();
  if (error) throw new Error(error.message);
}

// ==================== SOWINGS ====================

export async function getSowings() {
  return readAll((from,to)=>supabase.from('sowings').select('*, beds(name)').order('sow_date',{ascending:false}).order('id').range(from,to));
}

export async function createSowing(record: {
  variety: string;
  bed_id?: string;
  sow_date: string;
  type: string;
  transplant_date?: string;
  status?: string;
  notes?: string;
  seed_brand?: string;
  plant_kind?: string;
  crop_key?: string;
  variety_name?: string | null;
  seed_inventory_id?: string;
}) {
  const userId = await getUserId();
  const { data, error } = await supabase.from('sowings').insert({ ...record, user_id: userId } as any).select().single();
  if (error) throw new Error(error.message);
  if (data) track('Sowing Created', {});
  return data;
}

export async function updateSowing(id: string, record: any) {
  const { data, error } = await supabase.from('sowings').update(record).eq('id', id).select().single();
  if (error) throw new Error(error.message);
  return data;
}

export async function deleteSowing(id: string) {
  const { error } = await supabase.from('sowings').delete().eq('id', id).select('id').single();
  if (error) throw new Error(error.message);
}

// ==================== HARVESTS ====================

export async function getHarvests() {
  return readAll((from,to)=>supabase.from('harvests').select('*, beds(name), sowings(variety)').order('harvest_date',{ascending:false}).order('id').range(from,to));
}

export async function createHarvest(record: {
  variety: string;
  bed_id?: string;
  sowing_id?: string;
  harvest_date: string;
  weight_grams: number;
  notes?: string;
}) {
  const userId = await getUserId();
  const { data, error } = await supabase.from('harvests').insert({ ...record, user_id: userId }).select().single();
  if (error) throw new Error(error.message);
  if (data) track('Harvest Created', {});
  return data;
}

export async function updateHarvest(id: string, record: {
  variety?: string;
  bed_id?: string | null;
  sowing_id?: string | null;
  harvest_date?: string;
  weight_grams?: number;
  notes?: string | null;
}) {
  const { data, error } = await supabase.from('harvests').update(record).eq('id', id).select().single();
  if (error) throw new Error(error.message);
  return data;
}

export async function deleteHarvest(id: string) {
  const { error } = await supabase.from('harvests').delete().eq('id', id).select('id').single();
  if (error) throw new Error(error.message);
}

// ==================== FEEDBACK ====================

export async function submitFeedback(feedbackData: any) {
  const userId = await getUserId();
  const { data, error } = await supabase.from('feedback').insert({ ...feedbackData, user_id: userId }).select().single();
  if (error) throw new Error(error.message);
  return data;
}

// ==================== REMINDER SETTINGS ====================

export async function getReminderSettings() {
  const userId = await getUserId();
  const { data, error } = await supabase.from('reminder_settings').select('*').eq('user_id', userId).single();
  if (error && error.code === 'PGRST116') {
    const { data: newData, error: insertError } = await supabase
      .from('reminder_settings')
      .insert({ user_id: userId })
      .select()
      .single();
    if (insertError) throw new Error(insertError.message);
    return newData;
  }
  if (error) throw new Error(error.message);
  return data;
}

export async function updateReminderSettings(settings: any, expectedSettings?: unknown) {
  const userId = await getUserId();
  let query = supabase.from('reminder_settings').update(settings).eq('user_id', userId);
  if (expectedSettings !== undefined) query = query.eq('settings', JSON.stringify(expectedSettings));
  const { data, error } = await query.select().maybeSingle();
  if (!error && !data) throw new Error('Påminnelserna har ändrats. Ladda om och försök igen.');
  if (error) throw new Error(error.message);
  return data;
}

// ==================== SEASON SUMMARIES ====================

export async function getSeasonSummaries(year?: number) {
  const userId = await getUserId();
  let query = supabase.from('season_summaries').select('*, beds(name)').eq('user_id', userId);
  if (year) query = query.eq('year', year);
  const { data, error } = await query.order('created_at', { ascending: false });
  if (error) throw new Error(error.message);
  return data;
}

export async function upsertSeasonSummary(record: {
  bed_id: string;
  year: number;
  went_well?: string;
  didnt_work?: string;
  grow_again?: string;
  learnings?: string;
}) {
  const userId = await getUserId();
  // Try update first, then insert
  const { data: existing, error: lookupError } = await supabase
    .from('season_summaries')
    .select('id')
    .eq('user_id', userId)
    .eq('bed_id', record.bed_id)
    .eq('year', record.year)
    .maybeSingle();

  if (lookupError) throw new Error(lookupError.message);
  if (existing) {
    const { data, error } = await supabase
      .from('season_summaries')
      .update({ went_well: record.went_well, didnt_work: record.didnt_work, grow_again: record.grow_again, learnings: record.learnings })
      .eq('id', existing.id)
      .select()
      .single();
    if (error) throw new Error(error.message);
    return data;
  } else {
    const { data, error } = await supabase
      .from('season_summaries')
      .insert({ ...record, user_id: userId })
      .select()
      .single();
    if (error) throw new Error(error.message);
    return data;
  }
}

// ==================== STATISTICS ====================

export async function getSummaryStats() {
  const currentYear = new Date().getFullYear();
  const yearStart = `${currentYear}-01-01`;
  const yearEnd = `${currentYear}-12-31`;

  const [bedRows, sowingRows, harvestRows] = await Promise.all([
    readAll((from,to)=>supabase.from('beds').select('id').order('id').range(from,to)),
    readAll((from,to)=>supabase.from('sowings').select('id').gte('sow_date',yearStart).lte('sow_date',yearEnd).order('id').range(from,to)),
    readAll((from,to)=>supabase.from('harvests').select('weight_grams').gte('harvest_date',yearStart).lte('harvest_date',yearEnd).order('id').range(from,to)),
  ]);
  const beds=bedRows.length,sowings=sowingRows.length;
  const totalHarvestGrams=harvestRows.reduce((sum,row)=>sum+(row.weight_grams||0),0);

  return {
    active_beds: beds,
    sowings_this_year: sowings,
    harvest_kg: totalHarvestGrams / 1000,
  };
}

// ==================== WEATHER ====================

// Map climate zone to representative coordinates
function getCoordinatesForZone(zone: number | null): { lat: number; lon: number } {
  switch (zone) {
    case 1: return { lat: 55.60, lon: 13.00 }; // Malmö
    case 2: return { lat: 57.71, lon: 11.97 }; // Göteborg
    case 3: return { lat: 59.33, lon: 18.07 }; // Stockholm
    case 4: return { lat: 60.67, lon: 15.63 }; // Falun
    case 5: return { lat: 62.39, lon: 17.31 }; // Sundsvall
    case 6: return { lat: 63.83, lon: 20.26 }; // Umeå
    case 7: return { lat: 65.58, lon: 17.54 }; // Vilhelmina
    case 8: return { lat: 67.86, lon: 20.22 }; // Kiruna
    default: return { lat: 59.33, lon: 18.07 }; // Default Stockholm
  }
}

export async function getWeather(climateZone?: number | null) {
  const { lat, lon } = getCoordinatesForZone(climateZone ?? null);
  const res = await fetch(`https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,weathercode&timezone=Europe/Stockholm`);
  if (!res.ok) throw new Error('Weather fetch failed');
  return res.json();
}

export async function getRainHistory(
  climateZone?: number | null,
  location?: { lat?: number | null; lon?: number | null } | null,
): Promise<import('./wateringAdvice').RainHistory> {
  const resolved = resolveGardenLocation(climateZone, location);
  const params = new URLSearchParams({ latitude: String(resolved.lat), longitude: String(resolved.lon), daily: 'precipitation_sum', timezone: 'Europe/Stockholm', past_days: '7', forecast_days: '1' });
  const res = await fetch(`https://api.open-meteo.com/v1/forecast?${params}`, { signal: AbortSignal.timeout(12000) });
  if (!res.ok) throw new Error('Nederbörden kunde inte hämtas');
  const json = await res.json();
  const today = new Intl.DateTimeFormat('sv-SE', { timeZone: 'Europe/Stockholm' }).format(new Date());
  const times: string[] = json.daily?.time ?? [];
  const precip = times.map((date, i) => ({ date, value: json.daily?.precipitation_sum?.[i] })).filter(p => p.date < today).slice(-7);
  if (precip.length !== 7 || precip.some(p => typeof p.value !== 'number' || !Number.isFinite(p.value) || p.value < 0)) throw new Error('Nederbördsunderlaget är ofullständigt');
  let dryDays = 0;
  for (let i = precip.length - 1; i >= 0 && precip[i].value < 1; i--) dryDays++;
  return { dryDays, totalPrecipitation: precip.reduce((sum,p) => sum+p.value,0), lastThreeDays: precip.slice(-3).reduce((sum,p) => sum+p.value,0), location_source: resolved.location_source };
}

// ==================== AI ====================

export async function getDailyTip() {
  const { data, error } = await supabase.functions.invoke('get-daily-tip');
  if (error) throw new Error(error.message);
  return data;
}

// ==================== PREMIUM ====================

export async function getPremiumStatus() {
  const { data, error } = await supabase.functions.invoke('check-subscription');
  if (error) throw new Error(error.message);
  return { is_premium: data?.subscribed ?? false, status: data?.subscribed ? 'premium' : 'free', subscription_end: data?.subscription_end };
}

export async function createCheckoutSession(priceId?: string) {
  assertWebPurchase();
  const { data, error } = await supabase.functions.invoke('create-checkout', {
    body: { priceId: priceId || 'default' },
  });
  if (error) throw new Error(error.message);
  return data;
}

export async function openCustomerPortal() {
  assertWebPurchase();
  const { data, error } = await supabase.functions.invoke('customer-portal');
  if (error) throw new Error(error.message);
  return data;
}

// ==================== PROFILE ====================

export async function getProfile() {
  const userId = await getUserId();
  const { data, error } = await supabase.from('profiles').select('*').eq('user_id', userId).single();
  if (error) throw new Error(error.message);
  return data;
}

export async function updateProfile(profileData: any) {
  const userId = await getUserId();
  const { data, error } = await supabase.from('profiles').update(profileData).eq('user_id', userId).select().single();
  if (error) throw new Error(error.message);
  return data;
}

// ==================== EXPORT ====================

export async function exportUserData() {
  const [beds, sowings, harvests] = await Promise.all([
    getBeds(),
    getSowings(),
    getHarvests(),
  ]);
  return { beds, sowings, harvests };
}

// ==================== NAMESPACE EXPORT ====================

export const api = {
  getBeds,
  createBed,
  updateBed,
  deleteBed,
  getSowings,
  createSowing,
  updateSowing,
  deleteSowing,
  getHarvests,
  createHarvest,
  updateHarvest,
  deleteHarvest,
  submitFeedback,
  getReminderSettings,
  updateReminderSettings,
  getSeasonSummaries,
  upsertSeasonSummary,
  getSummaryStats,
  getWeather,
  getRainHistory,
  getDailyTip,
  getPremiumStatus,
  createCheckoutSession,
  openCustomerPortal,
  getProfile,
  updateProfile,
  exportUserData,
};
