import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

function htmlResponse(body: string): Response {
  return new Response(body, {
    status: 200,
    headers: {
      ...corsHeaders,
      'Content-Type': 'text/html; charset=utf-8',
    },
  })
}

function page({ title, text }: { title: string; text: string }): string {
  return `<!doctype html>
<html lang="sv">
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${title}</title>
  </head>
  <body style="margin:0; min-height:100vh; display:flex; align-items:center; justify-content:center; background:#f4f7f2; font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif; color:#16351f;">
    <main style="width:min(100% - 32px, 560px); background:#fff; border-radius:20px; padding:32px; box-shadow:0 12px 34px rgba(31,41,55,0.08);">
      <div style="font-size:18px; font-weight:700; color:#3E7C4C; margin-bottom:18px;">Odlingsdagboken 🌱</div>
      <h1 style="font-size:28px; line-height:1.2; margin:0 0 14px;">${title}</h1>
      <p style="font-size:16px; line-height:1.65; margin:0; color:#374151;">${text}</p>
    </main>
  </body>
</html>`
}

const neutralPage = page({
  title: 'Mejlinställningen är hanterad',
  text: 'Om länken var giltig har adressen avregistrerats. Du kan alltid ändra mejlinställningar under Inställningar i Odlingsdagboken.',
})

const successPage = page({
  title: 'Du är avregistrerad',
  text: 'Du kan slå på veckomejlet igen under Inställningar.',
})

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders })

  if (req.method !== 'GET') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }

  const url = new URL(req.url)
  const token = url.searchParams.get('token')?.trim()

  if (!token) {
    return htmlResponse(neutralPage)
  }

  const admin = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  )

  const { data: tokenRow, error: tokenError } = await admin
    .from('email_unsubscribe_tokens')
    .select('email')
    .eq('token', token)
    .maybeSingle()

  if (tokenError) {
    console.error('Failed to read unsubscribe token', { error: tokenError })
    return htmlResponse(neutralPage)
  }

  const email = tokenRow?.email?.trim().toLowerCase()
  if (!email) {
    return htmlResponse(neutralPage)
  }

  const { error: suppressError } = await admin
    .from('suppressed_emails')
    .upsert(
      {
        email,
        reason: 'unsubscribe',
        metadata: { source: 'email-unsubscribe' },
      },
      { onConflict: 'email', ignoreDuplicates: true }
    )

  if (suppressError) {
    console.error('Failed to suppress email', { email, error: suppressError })
  }

  const { error: tokenUpdateError } = await admin
    .from('email_unsubscribe_tokens')
    .update({ used_at: new Date().toISOString() })
    .eq('token', token)

  if (tokenUpdateError) {
    console.error('Failed to mark unsubscribe token as used', { email, error: tokenUpdateError })
  }

  const { error: profileUpdateError } = await admin
    .from('profiles')
    .update({ weekly_email_enabled: false, updated_at: new Date().toISOString() })
    .ilike('email', email)

  if (profileUpdateError) {
    console.error('Failed to disable weekly email on matching profiles', {
      email,
      error: profileUpdateError,
    })
  }

  return htmlResponse(successPage)
})
