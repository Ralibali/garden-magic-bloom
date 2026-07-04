import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import {
  baseLayout,
  enqueueTransactional,
  getOrCreateUnsubToken,
  normalizeEmail,
  unsubscribeUrl,
} from '../_shared/email.ts'
import { getSowingWeekTiming, normalizeZone, type WeekRange } from '../_shared/sowingWeeks.ts'

const allowedOrigins = new Set([
  'https://odlingsdagboken.com',
  'https://www.odlingsdagboken.com',
  'http://localhost:5173',
])

function corsHeaders(req: Request) {
  const origin = req.headers.get('origin')
  return {
    'Access-Control-Allow-Origin': origin && allowedOrigins.has(origin) ? origin : 'https://odlingsdagboken.com',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Vary': 'Origin',
  }
}

const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const allowedSources = new Set(['sakalender', 'odlingsplan', 'odlingsakuten'])
const registerUrl = 'https://odlingsdagboken.com/login?mode=register&source=lead-email&utm_source=email&utm_medium=lead&utm_campaign=day0'

type LeadSource = 'sakalender' | 'odlingsplan' | 'odlingsakuten'
type PlanPayload = Record<string, unknown>

function json(req: Request, body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders(req), 'Content-Type': 'application/json' },
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

function weekRange(range: WeekRange | null | undefined): string {
  if (!range) return '–'
  const [start, end] = range
  if (!Number.isFinite(start) || !Number.isFinite(end) || end < start) return '–'
  return start === end ? `v. ${start}` : `v. ${start}–${end}`
}

function getCropNames(plan: PlanPayload): string[] {
  const candidates = [plan.crops, plan.recommendedCrops]
  for (const candidate of candidates) {
    if (Array.isArray(candidate)) {
      return candidate
        .map((item) => String(item).trim())
        .filter(Boolean)
    }
  }
  return []
}

function ctaButton(label: string, href = registerUrl): string {
  return `<p style="margin:26px 0 8px;"><a href="${escapeHtml(href)}" style="display:inline-block; background:#3E7C4C; color:#ffffff; text-decoration:none; padding:13px 18px; border-radius:999px; font-weight:700;">${escapeHtml(label)}</a></p>`
}

function cropTable(crops: string[], zone: number): string {
  const visible = crops.slice(0, 8)
  const rows = visible.map((crop) => {
    const timing = getSowingWeekTiming(crop, zone)
    const sowLabel = timing?.pre ? weekRange(timing.pre) : timing?.direct ? `Direkt ${weekRange(timing.direct)}` : '–'
    return `<tr>
      <td style="padding:10px 8px; border-bottom:1px solid #e5eadf; font-weight:700; color:#16351f;">${escapeHtml(crop)}</td>
      <td style="padding:10px 8px; border-bottom:1px solid #e5eadf;">${escapeHtml(sowLabel)}</td>
      <td style="padding:10px 8px; border-bottom:1px solid #e5eadf;">${escapeHtml(weekRange(timing?.out))}</td>
      <td style="padding:10px 8px; border-bottom:1px solid #e5eadf;">${escapeHtml(weekRange(timing?.harvest))}</td>
    </tr>`
  }).join('')

  const more = crops.length > 8
    ? `<p style="margin:12px 0 0; color:#6b7280; font-size:14px;">+ ${crops.length - 8} till i din plan.</p>`
    : ''

  return `<table role="presentation" style="width:100%; border-collapse:collapse; margin:18px 0 0; font-size:14px;">
    <thead>
      <tr>
        <th align="left" style="padding:8px; border-bottom:2px solid #3E7C4C; color:#16351f;">Gröda</th>
        <th align="left" style="padding:8px; border-bottom:2px solid #3E7C4C; color:#16351f;">Förodla</th>
        <th align="left" style="padding:8px; border-bottom:2px solid #3E7C4C; color:#16351f;">Plantera ut</th>
        <th align="left" style="padding:8px; border-bottom:2px solid #3E7C4C; color:#16351f;">Skörd</th>
      </tr>
    </thead>
    <tbody>${rows}</tbody>
  </table>${more}`
}

function buildSakalenderEmail(plan: PlanPayload, zone: number) {
  const crops = getCropNames(plan)
  const bodyHtml = `
    <p style="margin:0 0 12px;">Hej!</p>
    <p style="margin:0 0 14px;">Här är kalendern du skapade på Odlingsdagboken — sparad så du hittar tillbaka.</p>
    ${cropTable(crops, zone)}
    ${ctaButton('Spara kalendern & få påminnelser')}
    <p style="margin:18px 0 0; color:#6b7280; font-size:14px;">P.S. Skapa kontot på samma enhet du använde verktyget, så plockas planen upp automatiskt.</p>
  `

  return {
    subject: `Din såkalender för zon ${zone} 🌱`,
    title: `Din såkalender för zon ${zone} 🌱`,
    preheader: 'Förodling, utplantering och skörd — vecka för vecka.',
    bodyHtml,
  }
}

function buildOdlingsplanEmail(plan: PlanPayload, zone: number) {
  const crops = getCropNames(plan)
  const tips = Array.isArray(plan.tips) ? plan.tips.map((tip) => String(tip).trim()).filter(Boolean).slice(0, 3) : []
  const tipsHtml = tips.length
    ? `<ul style="padding-left:20px; margin:16px 0;">${tips.map((tip) => `<li>${escapeHtml(tip)}</li>`).join('')}</ul>`
    : ''

  const bodyHtml = `
    <p style="margin:0 0 12px;">Hej!</p>
    <p style="margin:0 0 14px;">Här är odlingsplanen du skapade på Odlingsdagboken — sparad så du hittar tillbaka.</p>
    ${cropTable(crops, zone)}
    ${tipsHtml}
    ${ctaButton('Spara planen & få påminnelser')}
    <p style="margin:18px 0 0; color:#6b7280; font-size:14px;">P.S. Skapa kontot på samma enhet du använde verktyget, så plockas planen upp automatiskt.</p>
  `

  return {
    subject: `Din odlingsplan för zon ${zone} 🌱`,
    title: `Din odlingsplan är sparad 🌱`,
    preheader: 'Dina grödor, tips och nästa steg samlat på ett ställe.',
    bodyHtml,
  }
}

function buildOdlingsakutenEmail(plan: PlanPayload) {
  const cropLabel = String(plan.crop || 'planta')
  const crop = escapeHtml(cropLabel)
  const symptom = escapeHtml(plan.symptom || 'problemet')
  const advice = Array.isArray(plan.advice) ? plan.advice.slice(0, 3) : []
  const adviceHtml = advice.length
    ? advice.map((item: any) => `<article style="border:1px solid #e5eadf; border-radius:14px; padding:14px; margin:10px 0;"><h2 style="font-size:17px; margin:0 0 6px; color:#16351f;">${escapeHtml(item?.title)}</h2><p style="margin:0; color:#4b5563;">${escapeHtml(item?.text)}</p></article>`).join('')
    : `<p style="margin:12px 0;">Följ upp plantan om några dagar och anteckna vad du provade.</p>`

  const bodyHtml = `
    <p style="margin:0 0 12px;">Hej!</p>
    <p style="margin:0 0 14px;">Här är råden du fick för din ${crop} med symtomet “${symptom}”.</p>
    ${adviceHtml}
    ${ctaButton('Följ upp om det hjälpte — logga i Odlingsdagboken')}
    <p style="margin:18px 0 0; color:#6b7280; font-size:14px;">P.S. Spara problemet på samma enhet, så kan du fortsätta följa upp i appen.</p>
  `

  return {
    subject: `Råd för din ${cropLabel}`,
    title: `Råd för din ${crop}`,
    preheader: 'Spara råden och följ upp vad som faktiskt hjälpte.',
    bodyHtml,
  }
}

async function sha1Hex(input: string): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-1', new TextEncoder().encode(input))
  return Array.from(new Uint8Array(digest))
    .map((byte) => byte.toString(16).padStart(2, '0'))
    .join('')
}

function todayIsoDate(): string {
  return new Date().toISOString().slice(0, 10)
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders(req) })
  if (req.method !== 'POST') return json(req, { error: 'method_not_allowed' }, 405)

  let body: any
  try {
    body = await req.json()
  } catch {
    return json(req, { error: 'invalid_json' }, 400)
  }

  if (body?.website) {
    return json(req, { ok: true, skipped: 'honeypot' })
  }

  const email = normalizeEmail(String(body?.email ?? ''))
  const source = String(body?.source ?? '') as LeadSource
  const plan = (body?.plan && typeof body.plan === 'object') ? body.plan as PlanPayload : {}
  const planString = JSON.stringify(plan)

  if (!emailRegex.test(email)) return json(req, { error: 'invalid_email' }, 400)
  if (!allowedSources.has(source)) return json(req, { error: 'invalid_source' }, 400)
  if (planString.length > 8192) return json(req, { error: 'plan_too_large' }, 400)

  const admin = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  )

  const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()
  const { count, error: countError } = await admin
    .from('email_send_log')
    .select('id', { count: 'exact', head: true })
    .eq('recipient_email', email)
    .like('template_name', 'lead-plan-%')
    .gte('created_at', since)

  if (countError) {
    console.error('Failed to check lead email rate limit', { email, error: countError })
  }

  if ((count ?? 0) >= 2) {
    return json(req, { ok: true, skipped: 'rate_limited' })
  }

  const zone = normalizeZone((plan as any).zone)
  const emailModel = source === 'odlingsakuten'
    ? buildOdlingsakutenEmail(plan)
    : source === 'odlingsplan'
      ? buildOdlingsplanEmail(plan, zone)
      : buildSakalenderEmail(plan, zone)

  const token = await getOrCreateUnsubToken(admin, email)
  const html = baseLayout({
    title: emailModel.title,
    preheader: emailModel.preheader,
    unsubUrl: unsubscribeUrl(token),
    bodyHtml: emailModel.bodyHtml,
  })

  const emailHash = await sha1Hex(email)
  const messageId = `lead-plan-${emailHash}-${todayIsoDate()}`
  const result = await enqueueTransactional(admin, {
    to: email,
    subject: emailModel.subject,
    html,
    label: 'lead-plan-day0',
    messageId,
  })

  if (result.enqueued) {
    const { error: analyticsError } = await admin.from('analytics_events').insert({
      event_name: 'lead_day0_email_enqueued',
      email,
      source,
      page_path: `/${source}`,
      metadata: {
        plan_type: plan.type ?? source,
        crop_count: getCropNames(plan).length,
        message_id: messageId,
      },
      user_agent: req.headers.get('user-agent'),
    })
    if (analyticsError) console.error('Failed to insert lead email analytics event', { error: analyticsError })
  }

  return json(req, { ok: true, queued: result.enqueued, suppressed: result.suppressed })
})
