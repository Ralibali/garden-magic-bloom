import { supabase } from '@/integrations/supabase/client';
import { format, subDays, startOfMonth, endOfMonth, startOfYear, endOfYear } from 'date-fns';

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
}) {
  const userId = await getUserId();
  const { data, error } = await supabase.from('sowings').insert({ ...record, user_id: userId }).select().single();
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

// ==================== TRANSACTIONS ====================

export async function getTransactions() {
  const { data, error } = await supabase.from('transactions').select('*').order('date', { ascending: false });
  if (error) throw new Error(error.message);
  return data;
}

export async function createTransaction(record: any) {
  const userId = await getUserId();
  const { data, error } = await supabase.from('transactions').insert({ ...record, user_id: userId }).select().single();
  if (error) throw new Error(error.message);
  return data;
}

export async function deleteTransaction(id: string) {
  const { error } = await supabase.from('transactions').delete().eq('id', id);
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

// ==================== STATISTICS ====================

export async function getSummaryStats() {
  const currentYear = new Date().getFullYear();
  const yearStart = `${currentYear}-01-01`;
  const yearEnd = `${currentYear}-12-31`;

  const [bedsRes, sowingsRes, harvestsRes, txnsRes] = await Promise.all([
    supabase.from('beds').select('id'),
    supabase.from('sowings').select('id, sow_date').gte('sow_date', yearStart).lte('sow_date', yearEnd),
    supabase.from('harvests').select('weight_grams, harvest_date').gte('harvest_date', yearStart).lte('harvest_date', yearEnd),
    supabase.from('transactions').select('amount, type'),
  ]);

  const beds = (bedsRes.data || []).length;
  const sowings = (sowingsRes.data || []).length;
  const totalHarvestGrams = (harvestsRes.data || []).reduce((s, r) => s + (r.weight_grams || 0), 0);
  const income = (txnsRes.data || []).filter(t => t.type === 'income').reduce((s, r) => s + r.amount, 0);
  const expense = (txnsRes.data || []).filter(t => t.type === 'expense').reduce((s, r) => s + r.amount, 0);

  return {
    active_beds: beds,
    sowings_this_year: sowings,
    harvest_kg: totalHarvestGrams / 1000,
    total_income: income,
    total_expense: expense,
    profit: income - expense,
  };
}

// ==================== WEATHER ====================

export async function getWeather() {
  const res = await fetch('https://api.open-meteo.com/v1/forecast?latitude=59.33&longitude=18.07&current=temperature_2m,weathercode&timezone=Europe/Stockholm');
  if (!res.ok) throw new Error('Weather fetch failed');
  return res.json();
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
  const [beds, sowings, harvests, transactions] = await Promise.all([
    getBeds(),
    getSowings(),
    getHarvests(),
    getTransactions(),
  ]);
  return { beds, sowings, harvests, transactions };
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
  getTransactions,
  createTransaction,
  deleteTransaction,
  submitFeedback,
  getReminderSettings,
  updateReminderSettings,
  getSummaryStats,
  getWeather,
  getDailyTip,
  getPremiumStatus,
  createCheckoutSession,
  openCustomerPortal,
  getProfile,
  updateProfile,
  exportUserData,
};
