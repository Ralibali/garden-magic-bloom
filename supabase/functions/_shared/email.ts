const SITE_NAME = 'Odlingsdagboken'
const ROOT_DOMAIN = 'odlingsdagboken.com'
const SENDER_DOMAIN = 'notify.odlingsdagboken.com'
const FROM_EMAIL = `no-reply@${SENDER_DOMAIN}`

type SupabaseAdminClient = any

export interface EnqueueTransactionalInput {
  to: string
  subject: string
  html: string
  label: string
  messageId: string
}

export interface BaseLayoutInput {
  title: string
  bodyHtml: string
  unsubUrl?: string
  preheader?: string
}

export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase()
}

function escapeHtml(value: string): string {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;')
}

export function unsubscribeUrl(token: string): string {
  return `https://${ROOT_DOMAIN}/functions/v1/email-unsubscribe?token=${encodeURIComponent(token)}`
}

export async function getOrCreateUnsubToken(
  admin: SupabaseAdminClient,
  email: string
): Promise<string> {
  const normalizedEmail = normalizeEmail(email)

  const { data: existing, error: existingError } = await admin
    .from('email_unsubscribe_tokens')
    .select('token')
    .eq('email', normalizedEmail)
    .maybeSingle()

  if (existing?.token) return existing.token
  if (existingError) {
    console.error('Failed to read unsubscribe token', { email: normalizedEmail, error: existingError })
  }

  const token = crypto.randomUUID()
  const { data: inserted, error: insertError } = await admin
    .from('email_unsubscribe_tokens')
    .upsert(
      { email: normalizedEmail, token },
      { onConflict: 'email', ignoreDuplicates: true }
    )
    .select('token')
    .maybeSingle()

  if (inserted?.token) return inserted.token

  // Race-safe fallback: another invocation may have created the row between
  // the first SELECT and the INSERT ... ON CONFLICT DO NOTHING above.
  const { data: afterConflict, error: afterConflictError } = await admin
    .from('email_unsubscribe_tokens')
    .select('token')
    .eq('email', normalizedEmail)
    .maybeSingle()

  if (afterConflict?.token) return afterConflict.token

  throw new Error(
    `Could not create unsubscribe token: ${
      insertError?.message || afterConflictError?.message || 'unknown error'
    }`
  )
}

export async function isSuppressed(
  admin: SupabaseAdminClient,
  email: string
): Promise<boolean> {
  const normalizedEmail = normalizeEmail(email)

  const { data, error } = await admin
    .from('suppressed_emails')
    .select('email')
    .eq('email', normalizedEmail)
    .maybeSingle()

  if (error) {
    console.error('Failed to check suppressed email', { email: normalizedEmail, error })
    return false
  }

  return Boolean(data?.email)
}

export async function enqueueTransactional(
  admin: SupabaseAdminClient,
  input: EnqueueTransactionalInput
): Promise<{ enqueued: boolean; suppressed: boolean }> {
  const to = normalizeEmail(input.to)

  if (await isSuppressed(admin, to)) {
    await admin.from('email_send_log').insert({
      message_id: input.messageId,
      template_name: input.label,
      recipient_email: to,
      status: 'suppressed',
      metadata: { reason: 'suppressed_before_enqueue' },
    })

    return { enqueued: false, suppressed: true }
  }

  const pending = {
    message_id: input.messageId,
    template_name: input.label,
    recipient_email: to,
    status: 'pending',
  }

  const { error: pendingError } = await admin.from('email_send_log').insert(pending)
  if (pendingError) {
    throw new Error(`Failed to log pending email: ${pendingError.message}`)
  }

  const { error: enqueueError } = await admin.rpc('enqueue_email', {
    queue_name: 'transactional_emails',
    payload: {
      message_id: input.messageId,
      idempotency_key: input.messageId,
      to,
      from: `${SITE_NAME} <${FROM_EMAIL}>`,
      sender_domain: SENDER_DOMAIN,
      subject: input.subject,
      html: input.html,
      purpose: 'transactional',
      label: input.label,
      queued_at: new Date().toISOString(),
    },
  })

  if (enqueueError) {
    await admin.from('email_send_log').insert({
      message_id: input.messageId,
      template_name: input.label,
      recipient_email: to,
      status: 'failed',
      error_message: 'Failed to enqueue transactional email',
    })
    throw new Error(`Failed to enqueue transactional email: ${enqueueError.message}`)
  }

  return { enqueued: true, suppressed: false }
}

export function baseLayout({ title, bodyHtml, unsubUrl, preheader }: BaseLayoutInput): string {
  const safeTitle = escapeHtml(title)
  const safePreheader = preheader ? escapeHtml(preheader) : ''
  const footerUnsubscribe = unsubUrl
    ? `<p style="margin: 12px 0 0; font-size: 12px; line-height: 1.5; color: #6b7280;"><a href="${escapeHtml(
        unsubUrl
      )}" style="color: #3E7C4C; text-decoration: underline;">Avregistrera dig</a> från dessa mejl.</p>`
    : ''

  return `<!doctype html>
<html lang="sv">
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${safeTitle}</title>
  </head>
  <body style="margin:0; padding:0; background:#f4f7f2; font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif; color:#1f2937;">
    ${
      safePreheader
        ? `<div style="display:none; max-height:0; overflow:hidden; opacity:0; color:transparent;">${safePreheader}</div>`
        : ''
    }
    <div style="width:100%; padding:24px 12px; box-sizing:border-box;">
      <main style="max-width:600px; margin:0 auto; background:#ffffff; border-radius:20px; overflow:hidden; box-shadow:0 12px 34px rgba(31,41,55,0.08);">
        <header style="padding:28px 28px 18px; border-bottom:1px solid #e5eadf;">
          <div style="font-size:18px; font-weight:700; color:#3E7C4C;">Odlingsdagboken 🌱</div>
          <h1 style="margin:18px 0 0; font-size:26px; line-height:1.2; color:#16351f;">${safeTitle}</h1>
        </header>
        <section style="padding:26px 28px; font-size:16px; line-height:1.65;">
          ${bodyHtml}
        </section>
        <footer style="padding:20px 28px 26px; background:#f8faf5; border-top:1px solid #e5eadf;">
          <p style="margin:0; font-size:12px; line-height:1.5; color:#6b7280;">Odlingsdagboken drivs av Aurora Media AB.</p>
          ${footerUnsubscribe}
        </footer>
      </main>
    </div>
  </body>
</html>`
}
