export interface PublicLeadForBrevo {
  source?: string | null
  plan?: Record<string, unknown> | null
  created_at?: string | null
  converted_user_id?: string | null
}

function dateOnly(value: string | null | undefined): string | null {
  return value ? value.split('T')[0] : null
}

function cropList(plan: Record<string, unknown> | null | undefined): string | null {
  const crops = Array.isArray(plan?.crops)
    ? plan?.crops
    : Array.isArray(plan?.recommendedCrops)
      ? plan?.recommendedCrops
      : null

  if (!crops) return null
  const value = crops
    .slice(0, 10)
    .map((crop) => String(crop).trim())
    .filter(Boolean)
    .join(', ')

  return value || null
}

export function buildBrevoLeadAttributes(lead: PublicLeadForBrevo) {
  const plan = lead.plan && typeof lead.plan === 'object' ? lead.plan : {}

  return {
    LEAD_SOURCE: lead.source ?? null,
    LEAD_ZONE: plan.zone ?? null,
    LEAD_PLAN_TYPE: plan.type ?? null,
    LEAD_CROPS: cropList(plan),
    LEAD_CREATED: dateOnly(lead.created_at),
    CONVERTED: Boolean(lead.converted_user_id),
  }
}
