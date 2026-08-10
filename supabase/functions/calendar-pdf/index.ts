// Lead magnet: genererar en PDF med odlingskalendern för valfri klimatzon.
// Anropas publikt (verify_jwt = false) från /odlingskalender.
import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors'
import { sowingWeeks, normalizeZone, getSowingWeekTiming } from '../_shared/sowingWeeks.ts'
import { buildPdf, pdfPageSize, type TextOp } from '../_shared/simplePdf.ts'

const MONTHS = [
  'januari', 'februari', 'mars', 'april', 'maj', 'juni',
  'juli', 'augusti', 'september', 'oktober', 'november', 'december',
]

/** Ungefärlig månad för ett ISO-veckonummer (räcker för en översiktskalender). */
function weekToMonth(week: number): number {
  const date = new Date(Date.UTC(new Date().getUTCFullYear(), 0, 1 + (week - 1) * 7))
  return date.getUTCMonth() + 1
}

function monthsInRange(range: [number, number] | null): number[] {
  if (!range) return []
  const months = new Set<number>()
  for (let week = range[0]; week <= range[1]; week++) months.add(weekToMonth(week))
  return [...months]
}

interface MonthPlan {
  pre: string[]
  out: string[]
  direct: string[]
  harvest: string[]
}

function buildPlan(zone: number): MonthPlan[] {
  const plan: MonthPlan[] = MONTHS.map(() => ({ pre: [], out: [], direct: [], harvest: [] }))
  for (const cropName of Object.keys(sowingWeeks)) {
    const timing = getSowingWeekTiming(cropName, zone)
    if (!timing) continue
    const add = (key: keyof MonthPlan, range: [number, number] | null) => {
      for (const month of monthsInRange(range)) {
        const bucket = plan[month - 1][key]
        if (!bucket.includes(cropName)) bucket.push(cropName)
      }
    }
    add('pre', timing.pre)
    add('out', timing.out)
    add('direct', timing.direct)
    add('harvest', timing.harvest)
  }
  return plan
}

const MAX_WIDTH = pdfPageSize.width - 100

function wrap(text: string, size: number, maxWidth = MAX_WIDTH): string[] {
  const perChar = size * 0.5 // grov uppskattning för Helvetica
  const maxChars = Math.max(20, Math.floor(maxWidth / perChar))
  const words = text.split(' ')
  const lines: string[] = []
  let current = ''
  for (const word of words) {
    const candidate = current ? `${current} ${word}` : word
    if (candidate.length > maxChars) {
      if (current) lines.push(current)
      current = word
    } else {
      current = candidate
    }
  }
  if (current) lines.push(current)
  return lines
}

function renderPdf(zone: number, year: number): Uint8Array {
  const plan = buildPlan(zone)
  const pages: TextOp[][] = []
  let ops: TextOp[] = []
  let y = pdfPageSize.height - 70

  const newPage = () => {
    if (ops.length) pages.push(ops)
    ops = []
    y = pdfPageSize.height - 70
  }
  const line = (text: string, size: number, bold = false, gray = 0, gap = 6) => {
    if (y < 70) newPage()
    ops.push({ text, x: 50, y, size, bold, gray })
    y -= size + gap
  }

  line(`Odlingskalender ${year}`, 26, true)
  line(`Klimatzon ${zone} · Odlingsdagboken.com`, 12, false, 0.35, 16)
  for (const paragraph of wrap(
    'Kalendern visar ungefärliga månader för förodling, utplantering, direktsådd och skörd i din zon. Väder och läge påverkar alltid – anteckna vad som faktiskt fungerade hos dig.',
    11,
  )) {
    line(paragraph, 11, false, 0.35, 3)
  }
  y -= 12

  plan.forEach((month, index) => {
    if (y < 200) newPage()
    line(MONTHS[index].charAt(0).toUpperCase() + MONTHS[index].slice(1), 16, true, 0, 8)
    const sections: Array<[string, string[]]> = [
      ['Förodla inne', month.pre],
      ['Plantera ut', month.out],
      ['Direktsådd', month.direct],
      ['Skörda', month.harvest],
    ]
    let empty = true
    for (const [label, crops] of sections) {
      if (!crops.length) continue
      empty = false
      const rows = wrap(`${label}: ${crops.join(', ')}`, 10.5)
      rows.forEach((row, rowIndex) => line(row, 10.5, false, rowIndex === 0 ? 0.15 : 0.4, 2))
      y -= 2
    }
    if (empty) line('Vila, planera och gå igenom fröförrådet.', 10.5, false, 0.4, 2)
    y -= 10
  })

  newPage()
  return buildPdf(pages)
}

Deno.serve((req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  try {
    const url = new URL(req.url)
    const zone = normalizeZone(url.searchParams.get('zon') ?? url.searchParams.get('zone'))
    const year = new Date().getFullYear()
    const pdf = renderPdf(zone, year)

    return new Response(pdf, {
      status: 200,
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="odlingskalender-${year}-zon-${zone}.pdf"`,
        'Cache-Control': 'public, max-age=86400',
      },
    })
  } catch (error) {
    console.error('calendar-pdf error', error)
    return new Response(JSON.stringify({ error: 'Kunde inte skapa PDF' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
