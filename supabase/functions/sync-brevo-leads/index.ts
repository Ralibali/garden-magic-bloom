import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { buildBrevoLeadAttributes } from '../_shared/brevoLeadAttributes.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-cron-secret',
}

interface PublicLead {
  id: string
  email: string
  source: string | null
  plan: Record<string, unknown> | null
  created_at: string | null
  converted_user_id: string | null
  converted_at: string | null
  synced_to_brevo_at: string | null
}

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
}

function normalizeEmail(email: string | null | undefined): string | null {
  const normalized = String(email ?? '').trim().toLowerCase()
  return normalized.includes('@') ? normalized : null
}

async function upsertBrevoContact({
  apiKey,
  listId,
  lead,
}: {
  apiKey: string
  listId: number
  lead: PublicLead
}): Promise<{ ok: boolean; error?: string }> {
  const email = normalizeEmail(lead.email)
  if (!email) return { ok: false, error: 'invalid_email' }

  const payload = {
    email,
    updateEnabled: true,
    listIds: [listId],
    attributes: buildBrevoLeadAttributes(lead),
  }

  const response = await fetch('https://api.brevo.com/v3/contacts', {
    method: 'POST',
    headers: {
      'api-key': apiKey,
      'Content-Type': 'application/json',
      Accept: 'application/json',
    },
    body: JSON.stringify(payload),
  })

  if (response.ok || response.status === 204) return { ok: true }

  const body = await response.text()
  if (body.includes('duplicate_parameter')) return { ok: true }

  return { ok: false, error: `${response.status} ${body}`.slice(0, 1000) }
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders })

  const expectedSecret = Deno.env.get('CRON_SECRET')
  const secret = req.headers.get('x-cron-secret')
  if (!expectedSecret || secret !== expectedSecret) {
    return json({ error: 'unauthorized' }, 401)
  }

  const apiKey = Deno.env.get('BREVO_API_KEY')
  const listIdRaw = Deno.env.get('BREVO_LEADS_LIST_ID')
  const listId = Number(listIdRaw)

  if (!apiKey || !Number.isFinite(listId)) {
    return json({ error: 'missing_brevo_config' }, 500)
  }

  const admin = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  )

  let synced = 0
  let errors = 0

  const { data: unsyncedLeads, error: unsyncedError } = await admin
    .from('public_leads')
    .select('id, email, source, plan, created_at, converted_user_id, converted_at, synced_to_brevo_at')
    .is('synced_to_brevo_at', null)
    .order('created_at', { ascending: true })
    .limit(200)

  if (unsyncedError) return json({ error: unsyncedError.message }, 500)

  for (const lead of (unsyncedLeads ?? []) as PublicLead[]) {
    const result = await upsertBrevoContact({ apiKey, listId, lead })
    if (!result.ok) {
      errors++
      console.error('Brevo lead sync failed', { id: lead.id, email: lead.email, error: result.error })
      continue
    }

    const { error: updateError } = await admin
      .from('public_leads')
      .update({ synced_to_brevo_at: new Date().toISOString() })
      .eq('id', lead.id)

    if (updateError) {
      errors++
      console.error('Failed to mark lead as synced', { id: lead.id, error: updateError })
    } else {
      synced++
    }
  }

  const { data: convertedLeads, error: convertedError } = await admin
    .from('public_leads')
    .select('id, email, source, plan, created_at, converted_user_id, converted_at, synced_to_brevo_at')
    .not('converted_user_id', 'is', null)
    .not('synced_to_brevo_at', 'is', null)
    .filter('converted_at', 'gt', 'synced_to_brevo_at')
    .order('converted_at', { ascending: true })
    .limit(200)

  if (convertedError) {
    errors++
    console.error('Failed to fetch converted leads for Brevo update', { error: convertedError })
  } else {
    for (const lead of (convertedLeads ?? []) as PublicLead[]) {
      const result = await upsertBrevoContact({ apiKey, listId, lead })
      if (!result.ok) {
        errors++
        console.error('Brevo converted lead sync failed', { id: lead.id, email: lead.email, error: result.error })
        continue
      }

      const { error: updateError } = await admin
        .from('public_leads')
        .update({ synced_to_brevo_at: new Date().toISOString() })
        .eq('id', lead.id)

      if (updateError) {
        errors++
        console.error('Failed to mark converted lead as synced', { id: lead.id, error: updateError })
      } else {
        synced++
      }
    }
  }

  const { count: remaining, error: remainingError } = await admin
    .from('public_leads')
    .select('id', { count: 'exact', head: true })
    .is('synced_to_brevo_at', null)

  if (remainingError) {
    errors++
    console.error('Failed to count remaining unsynced leads', { error: remainingError })
  }

  return json({ synced, errors, remaining: remaining ?? null })
})
