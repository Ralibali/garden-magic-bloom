import { supabase } from '@/integrations/supabase/client';

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
  const { error } = await supabase.from('beds').delete().eq('id', id);
  if (error) throw new Error(error.message);
}

// ==================== SOWINGS ====================

export async function getSowings() {
  const { data, error } = await supabase.from('sowings').select('*, beds(name)').order('sow_date', { ascending: false });
  if (error) throw new Error(error.message);
  return data;
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
}) {
  const userId = await getUserId();
  const { data, error } = await supabase.from('sowings').insert({ ...record, user_id: userId } as any).select().single();
  if (error) throw new Error(error.message);
  return data;
}

export async function updateSowing(id: string, record: any) {
  const { data, error } = await supabase.from('sowings').update(record).eq('id', id).select().single();
  if (error) throw new Error(error.message);
  return data;
}

export async function deleteSowing(id: string) {
  const { error } = await supabase.from('sowings').delete().eq('id', id);
  if (error) throw new Error(error.message);
}

// ==================== HARVESTS ====================

export async function getHarvests() {
  const { data, error } = await supabase.from('harvests').select('*, beds(name), sowings(variety)').order('harvest_date', { ascending: false });
  if (error) throw new Error(error.message);
  return data;
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
  return data;
}

export async function deleteHarvest(id: string) {
  const { error } = await supabase.from('harvests').delete().eq('id', id);
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

export async function updateReminderSettings(settings: any) {
  const userId = await getUserId();
  const { data, error } = await supabase.from('reminder_settings').update(settings).eq('user_id', userId).select().single();
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
  const { data: existing } = await supabase
    .from('season_summaries')
    .select('id')
    .eq('user_id', userId)
    .eq('bed_id', record.bed_id)
    .eq('year', record.year)
    .maybeSingle();

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

  const [bedsRes, sowingsRes, harvestsRes] = await Promise.all([
    supabase.from('beds').select('id'),
    supabase.from('sowings').select('id, sow_date').gte('sow_date', yearStart).lte('sow_date', yearEnd),
    supabase.from('harvests').select('weight_grams, harvest_date').gte('harvest_date', yearStart).lte('harvest_date', yearEnd),
  ]);

  const beds = (bedsRes.data || []).length;
  const sowings = (sowingsRes.data || []).length;
  const totalHarvestGrams = (harvestsRes.data || []).reduce((s, r) => s + (r.weight_grams || 0), 0);

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

export async function getRainHistory(climateZone?: number | null): Promise<{ dryDays: number; totalPrecipitation: number }> {
  const { lat, lon } = getCoordinatesForZone(climateZone ?? null);
  const end = new Date();
  const start = new Date();
  start.setDate(start.getDate() - 6);
  const fmt = (d: Date) => d.toISOString().split('T')[0];
  const res = await fetch(
    `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&daily=precipitation_sum&timezone=Europe/Stockholm&start_date=${fmt(start)}&end_date=${fmt(end)}`
  );
  if (!res.ok) throw new Error('Rain history fetch failed');
  const json = await res.json();
  const precip: number[] = json.daily?.precipitation_sum ?? [];
  // Count consecutive dry days from today backwards
  let dryDays = 0;
  for (let i = precip.length - 1; i >= 0; i--) {
    if (precip[i] < 1) dryDays++;
    else break;
  }
  const totalPrecipitation = precip.reduce((a, b) => a + b, 0);
  return { dryDays, totalPrecipitation };
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
  const { data, error } = await supabase.functions.invoke('create-checkout', {
    body: { priceId: priceId || 'default' },
  });
  if (error) throw new Error(error.message);
  return data;
}

export async function openCustomerPortal() {
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
