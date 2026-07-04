import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import {
  baseLayout,
  enqueueTransactional,
  getOrCreateUnsubToken,
  normalizeEmail,
  unsubscribeUrl,
} from '../_shared/email.ts'
import { buildDigestModel, getIsoWeek, type DigestReminder } from '../_shared/weeklyDigestModel.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-cron-secret',
}

const appUrl = 'https://odlingsdagboken.com/app'

interface ProfileRow {
  user_id: string
  email: string | null
  display_name: string | null
  climate_zone: number | null
  location_lat: number | null
  location_lon: number | null
  weekly_email_enabled: boolean | null
}

interface SowingRow {
  variety: string
  status: string | null
  sow_date: string | null
  transplant_date: string | null
  type: string | null
}

interface HarvestRow {
  variety: string | null
  harvest_date: string | null
  weight_grams: number | null
}

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
}

function escapeHtml(value: unknown): string {
  return String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;')
}

function zoneCoordinates(zone: number | null): { lat: number; lon: number } {
  switch (zone) {
    case 1: return { lat: 55.60, lon: 13.00 }
    case 2: return { lat: 57.71, lon: 11.97 }
    case 3: return { lat: 59.33, lon: 18.07 }
    case 4: return { lat: 60.67, lon: 15.63 }
    case 5: return { lat: 62.39, lon: 17.31 }
    case 6: return { lat: 63.83, lon: 20.26 }
    case 7: return { lat: 65.58, lon: 17.54 }
    case 8: return { lat: 67.86, lon: 20.22 }
    default: return { lat: 59.33, lon: 18.07 }
  }
}

async function forecastMinTemp(profile: ProfileRow): Promise<number | null> {
  const coords = profile.location_lat && profile.location_lon
    ? { lat: profile.location_lat, lon: profile.location_lon }
    : zoneCoordinates(profile.climate_zone)

  try {
    const response = await fetch(
      `https://api.open-meteo.com/v1/forecast?latitude=${coords.lat}&longitude=${coords.lon}&daily=temperature_2m_min&timezone=Europe%2FStockholm&forecast_days=7`
    )
    if (!response.ok) return null
    const body = await response.json()
    const temps = Array.isArray(body?.daily?.temperature_2m_min) ? body.daily.temperature_2m_min : []
    const valid = temps.map(Number).filter(Number.isFinite)
    return valid.length ? Math.min(...valid) : null
  } catch (error) {
    console.error('Failed to fetch weekly digest forecast', { user_id: profile.user_id, error })
    return null
  }
}

function todayDate(): string {
  return new Date().toISOString().slice(0, 10)
}

function plusDaysDate(days: number): string {
  const date = new Date()
  date.setDate(date.getDate() + days)
  return date.toISOString().slice(0, 10)
}

function yearBounds(year: number): { start: string; end: string } {
  return { start: `${year}-01-01`, end: `${year}-12-31` }
}

function remindersFromSowings(sowings: SowingRow[]): DigestReminder[] {
  const today = todayDate()
  const end = plusDaysDate(7)
  return sowings
    .filter((sowing) => sowing.transplant_date && sowing.transplant_date >= today && sowing.transplant_date <= end)
    .map((sowing) => ({
      title: `Plantera ut ${sowing.variety}`,
      due_date: sowing.transplant_date!,
    }))
    .slice(0, 7)
}

function list(items: string[]): string {
  if (!items.length) return ''
  return `<ul style="padding-left:20px; margin:10px 0 0;">${items.map((item) => `<li>${escapeHtml(item)}</li>`).join('')}</ul>`
}

function renderDigestHtml(model: ReturnType<typeof buildDigestModel>): string {
  const parts: string[] = [
    `<p style="margin:0 0 12px;">Hej ${escapeHtml(model.firstName)}!</p>`,
    `<p style="margin:0 0 18px;">Här är din odlingsvecka för zon ${model.zone}. Små steg nu gör säsongen enklare att följa upp senare.</p>`,
  ]

  if (model.frostWarning) {
    parts.push(`<div style="border:1px solid #f59e0b; background:#fffbeb; border-radius:14px; padding:14px; margin:14px 0;"><strong>Frostrisk:</strong> prognosen visar ner mot ${escapeHtml(String(model.forecastMinTemp))} °C kommande veckan. Skydda känsliga plantor eller vänta med utplantering.</div>`)
  }

  if (model.sowNow.length) {
    parts.push(`<h2 style="font-size:18px; margin:22px 0 6px; color:#16351f;">Att så nu</h2>${list(model.sowNow)}`)
  }

  if (model.soonHarvest.length) {
    parts.push(`<h2 style="font-size:18px; margin:22px 0 6px; color:#16351f;">Snart skörd</h2>${list(model.soonHarvest)}`)
  }

  if (model.activeSowings.length) {
    parts.push(`<h2 style="font-size:18px; margin:22px 0 6px; color:#16351f;">Aktiva sådder</h2>${list(model.activeSowings.map((sowing) => `${sowing.variety}${sowing.status ? ` – ${sowing.status}` : ''}`))}`)
  }

  if (model.reminders.length) {
    parts.push(`<h2 style="font-size:18px; margin:22px 0 6px; color:#16351f;">Kommande 7 dagar</h2>${list(model.reminders.map((reminder) => `${reminder.title} (${reminder.due_date})`))}`)
  }

  if (model.harvestKg > 0 || model.photoCountLastWeek > 0) {
    parts.push(`<h2 style="font-size:18px; margin:22px 0 6px; color:#16351f;">Din säsong hittills</h2><ul style="padding-left:20px; margin:10px 0 0;">${model.harvestKg > 0 ? `<li>${model.harvestKg} kg registrerad skörd i år</li>` : ''}${model.photoCountLastWeek > 0 ? `<li>${model.photoCountLastWeek} nya bilder senaste veckan</li>` : ''}</ul>`)
  }

  parts.push(`<p style="margin:26px 0 8px;"><a href="${appUrl}" style="display:inline-block; background:#3E7C4C; color:#ffffff; text-decoration:none; padding:13px 18px; border-radius:999px; font-weight:700;">Öppna Odlingsdagboken</a></p>`)

  return parts.join('\n')
}

async function alreadyHandled(admin: ReturnType<typeof createClient>, messageId: string): Promise<boolean> {
  const { data, error } = await admin
    .from('email_send_log')
    .select('id')
    .eq('message_id', messageId)
    .limit(1)
    .maybeSingle()

  if (error) {
    console.error('Failed to check weekly digest idempotency', { messageId, error })
    return false
  }

  return Boolean(data?.id)
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders })

  const expectedSecret = Deno.env.get('CRON_SECRET')
  const secret = req.headers.get('x-cron-secret')
  if (!expectedSecret || secret !== expectedSecret) return json({ error: 'unauthorized' }, 401)

  const url = new URL(req.url)
  const offset = Math.max(0, Number.parseInt(url.searchParams.get('offset') ?? '0', 10) || 0)
  const limit = 50
  const now = new Date()
  const iso = getIsoWeek(now)
  const { start: yearStart, end: yearEnd } = yearBounds(iso.year)
  const weekStart = new Date(now)
  weekStart.setDate(now.getDate() - 7)

  const admin = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  )

  const { data: profiles, error: profileError } = await admin
    .from('profiles')
    .select('user_id, email, display_name, climate_zone, location_lat, location_lon, weekly_email_enabled')
    .eq('weekly_email_enabled', true)
    .not('email', 'is', null)
    .order('created_at', { ascending: true })
    .range(offset, offset + limit - 1)

  if (profileError) return json({ error: profileError.message }, 500)

  let queued = 0
  let skippedNoContent = 0
  let skippedDuplicate = 0
  let failed = 0

  for (const profile of (profiles ?? []) as ProfileRow[]) {
    const email = profile.email ? normalizeEmail(profile.email) : ''
    if (!email) continue

    const messageId = `weekly-digest-${profile.user_id}-${iso.year}-W${String(iso.week).padStart(2, '0')}`
    if (await alreadyHandled(admin, messageId)) {
      skippedDuplicate++
      continue
    }

    const [sowingsRes, harvestsRes, photosRes, minTemp] = await Promise.all([
      admin
        .from('sowings')
        .select('variety, status, sow_date, transplant_date, type')
        .eq('user_id', profile.user_id)
        .order('sow_date', { ascending: false })
        .limit(30),
      admin
        .from('harvests')
        .select('variety, harvest_date, weight_grams')
        .eq('user_id', profile.user_id)
        .gte('harvest_date', yearStart)
        .lte('harvest_date', yearEnd),
      admin
        .from('plant_photos')
        .select('id')
        .eq('user_id', profile.user_id)
        .gte('created_at', weekStart.toISOString()),
      forecastMinTemp(profile),
    ])

    if (sowingsRes.error || harvestsRes.error || photosRes.error) {
      failed++
      console.error('Failed to fetch weekly digest data', {
        user_id: profile.user_id,
        sowings: sowingsRes.error,
        harvests: harvestsRes.error,
        photos: photosRes.error,
      })
      continue
    }

    const sowings = (sowingsRes.data ?? []) as SowingRow[]
    const model = buildDigestModel({
      profile,
      sowings,
      harvests: (harvestsRes.data ?? []) as HarvestRow[],
      reminders: remindersFromSowings(sowings),
      photoCountLastWeek: (photosRes.data ?? []).length,
      forecastMinTemp: minTemp,
      currentDate: now,
      currentWeek: iso.week,
    })

    if (!model.hasContent) {
      skippedNoContent++
      continue
    }

    try {
      const token = await getOrCreateUnsubToken(admin, email)
      const html = baseLayout({
        title: 'Din odlingsvecka',
        preheader: 'Sådd, skörd, påminnelser och frostläge för veckan.',
        unsubUrl: unsubscribeUrl(token),
        bodyHtml: renderDigestHtml(model),
      })

      const result = await enqueueTransactional(admin, {
        to: email,
        subject: model.subject,
        html,
        label: 'weekly-digest',
        messageId,
      })

      if (result.enqueued) queued++
    } catch (error) {
      failed++
      console.error('Failed to enqueue weekly digest', { user_id: profile.user_id, email, error })
    }
  }

  return json({ queued, skipped_no_content: skippedNoContent, skipped_duplicate: skippedDuplicate, failed, offset, next_offset: offset + limit, count: profiles?.length ?? 0 })
})
