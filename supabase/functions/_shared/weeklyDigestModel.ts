import { getSowingWeekTiming, normalizeZone, sowingWeeks } from './sowingWeeks.ts'
import { calendarLib } from './calendarLib.ts'
import { cropSlug, SATIDER_PATH } from './satiderRoutes.ts'

export interface DigestProfile {
  user_id: string
  display_name?: string | null
  climate_zone?: number | string | null
}

export interface DigestSowing {
  id?: string
  crop_key?: string | null
  variety: string
  status?: string | null
  sow_date?: string | null
  transplant_date?: string | null
  type?: string | null
  plant_kind?: string | null

}

export interface DigestHarvest {
  variety?: string | null
  harvest_date?: string | null
  weight_grams?: number | null
}

export interface DigestReminder {
  title: string
  due_date: string
}

/** En rad ur reminder_settings.settings.reminders – användarens egna påminnelser. */
export interface DigestReminderItem {
  id?: string
  title?: string | null
  date?: string | null
  done?: boolean | null
}

/** Något kalendern själv räknat fram för veckan: utplantering, omgångssådd, skördestart. */
export interface DigestHighlight {
  kind: string
  title: string
  date: string
  warning?: string
}

export interface DigestCropLink {
  name: string
  url: string
  /** Sista veckan i såfönstret. */
  closing: boolean
}

export interface DigestModelInput {
  profile: DigestProfile
  sowings: DigestSowing[]
  harvests: DigestHarvest[]
  reminders?: DigestReminder[]
  /** Användarens egna påminnelser (reminder_settings). */
  reminderItems?: DigestReminderItem[]
  photoCountLastWeek?: number
  forecastMinTemp?: number | null
  currentDate?: Date
  currentWeek?: number
  /** Dagens datum i Sverige (YYYY-MM-DD). Räknas från currentDate om det saknas. */
  today?: string
}

export interface DigestModel {
  hasContent: boolean
  subject: string
  year: number
  week: number
  zone: number
  firstName: string
  sowNow: string[]
  /** Samma grödor som sowNow, med länk till såtidssidan och flagga för sista veckan. */
  sowNowLinks: DigestCropLink[]
  /** Kalenderns egna förslag för de kommande sju dagarna. */
  calendarHighlights: DigestHighlight[]
  /** Öppna påminnelser vars datum redan passerat. */
  overdueReminders: number
  soonHarvest: string[]
  activeSowings: DigestSowing[]
  harvestKg: number
  reminders: DigestReminder[]
  photoCountLastWeek: number
  frostWarning: boolean
  forecastMinTemp: number | null
}

const subjects = [
  'Din odlingsvecka är redo 🌱',
  'Det här händer i din odling i veckan',
  'Veckans odlingsläge från Odlingsdagboken',
  'Dags att kolla sådd, skörd och frost',
]

// Appens faktiska sådd-statusar: sown | indoor | transplanted | harvesting | flowering | overwintering | done
const inactiveStatuses = new Set(['done'])

/** Matchar en fritextsort mot grödmatrisen. Ingen match → undefined (gissa aldrig). */
function findCropForVariety(variety: string | null | undefined): string | undefined {
  const value = String(variety ?? '').toLowerCase()
  if (!value) return undefined
  return Object.keys(sowingWeeks).find((crop) => value.includes(crop.toLowerCase()))
}


export function getIsoWeek(date: Date): { year: number; week: number } {
  const target = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()))
  const dayNumber = target.getUTCDay() || 7
  target.setUTCDate(target.getUTCDate() + 4 - dayNumber)
  const yearStart = new Date(Date.UTC(target.getUTCFullYear(), 0, 1))
  const week = Math.ceil((((target.getTime() - yearStart.getTime()) / 86400000) + 1) / 7)
  return { year: target.getUTCFullYear(), week }
}

function inRange(week: number, range: readonly [number, number] | null | undefined, lookahead = 0): boolean {
  if (!range) return false
  const [start, end] = range
  return start <= week + lookahead && end >= week
}

function firstName(displayName: string | null | undefined): string {
  return String(displayName ?? '').trim().split(/\s+/)[0] || 'odlare'
}

function activeSowings(sowings: DigestSowing[]): DigestSowing[] {
  return sowings
    .filter((sowing) => !inactiveStatuses.has(String(sowing.status ?? '').trim().toLowerCase()))
    .slice(0, 5)
}

function harvestKgForYear(harvests: DigestHarvest[], year: number): number {
  const grams = harvests.reduce((sum, harvest) => {
    if (!harvest.harvest_date?.startsWith(String(year))) return sum
    return sum + Number(harvest.weight_grams ?? 0)
  }, 0)
  return Math.round((grams / 1000) * 10) / 10
}

/** Appens statusar på svenska – mejlet ska aldrig visa "indoor". */
export const STATUS_LABEL_SV: Record<string, string> = {
  sown: 'sådd',
  indoor: 'förodlas',
  transplanted: 'utplanterad',
  harvesting: 'ger skörd',
  flowering: 'blommar',
  overwintering: 'övervintras',
  done: 'avslutad',
}

export const SITE_URL = 'https://odlingsdagboken.com'

export function stockholmDateKey(date: Date): string {
  const parts = new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Stockholm', year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(date)
  const values = Object.fromEntries(parts.map((part) => [part.type, part.value]))
  return `${values.year}-${values.month}-${values.day}`
}

function upcomingReminders(items: DigestReminderItem[], today: string, end: string) {
  const open = items.filter((item) => item && !item.done && item.title && /^\d{4}-\d{2}-\d{2}$/.test(String(item.date ?? '')))
  return {
    upcoming: open
      .filter((item) => item.date! >= today && item.date! <= end)
      .sort((a, b) => a.date!.localeCompare(b.date!))
      .map((item) => ({ title: String(item.title), due_date: item.date! })),
    // Bara det senaste kvartalet – riktigt gamla rader är glömda, inte försenade.
    overdue: open.filter((item) => item.date! < today && item.date! >= calendarLib.addDays(today, -90)).length,
  }
}

function calendarHighlights(sowings: DigestSowing[], zone: number, today: string): DigestHighlight[] {
  const events = calendarLib.buildCalendarEvents({
    zone,
    from: today,
    to: calendarLib.addDays(today, 6),
    today,
    sowings: sowings.map((sowing, i) => ({ ...sowing, id: sowing.id ?? `digest-${i}` })),
  })
  return calendarLib.upcomingCalendarHighlights(events, today, 7)
    .filter((event) => !event.id.startsWith('forecast-frost:'))
    .slice(0, 5)
    .map((event) => ({ kind: event.kind, title: event.title, date: event.date, ...(event.warning ? { warning: event.warning } : {}) }))
}

export function buildDigestModel(input: DigestModelInput): DigestModel {
  const now = input.currentDate ?? new Date()
  const iso = input.currentWeek
    ? { year: now.getFullYear(), week: input.currentWeek }
    : getIsoWeek(now)
  const zone = normalizeZone(input.profile.climate_zone)
  const crops = Object.keys(sowingWeeks)
  const today = input.today ?? stockholmDateKey(now)

  const sowNow = crops
    .filter((crop) => {
      const timing = getSowingWeekTiming(crop, zone)
      return inRange(iso.week, timing?.pre, 1) || inRange(iso.week, timing?.direct, 1)
    })
    .slice(0, 5)

  const guide = calendarLib.getWeekGuide(zone, iso.week)
  const closing = new Set([...guide.forodla, ...guide.direktsa].filter((crop) => crop.closesNow).map((crop) => crop.name))
  const sowNowLinks = sowNow.map((name) => ({ name, url: `${SITE_URL}${SATIDER_PATH}/${cropSlug(name)}`, closing: closing.has(name) }))

  const soonHarvest = Array.from(new Set(
    input.sowings
      .filter((sowing) => (sowing.plant_kind ?? 'edible') === 'edible')
      .filter((sowing) => !inactiveStatuses.has(String(sowing.status ?? '').trim().toLowerCase()))
      .map((sowing) => findCropForVariety(sowing.variety))
      .filter((crop): crop is string => Boolean(crop))
      .filter((crop) => inRange(iso.week, getSowingWeekTiming(crop, zone)?.harvest, 3)),
  )).slice(0, 5)


  const active = activeSowings(input.sowings)
  const harvestKg = harvestKgForYear(input.harvests, iso.year)
  const own = upcomingReminders(input.reminderItems ?? [], today, calendarLib.addDays(today, 6))
  const seen = new Set<string>()
  const reminders = [...own.upcoming, ...(input.reminders ?? [])]
    .filter((reminder) => {
      const key = `${reminder.title.toLowerCase()}|${reminder.due_date}`
      if (seen.has(key)) return false
      seen.add(key)
      return true
    })
    .sort((a, b) => a.due_date.localeCompare(b.due_date))
    .slice(0, 7)
  const highlights = calendarHighlights(input.sowings, zone, today)
  const photoCountLastWeek = input.photoCountLastWeek ?? 0
  const forecastMinTemp = input.forecastMinTemp ?? null
  const frostWarning = typeof forecastMinTemp === 'number' && forecastMinTemp < 3

  const hasContent = Boolean(
    highlights.length ||
    own.overdue ||
    sowNow.length ||
    soonHarvest.length ||
    active.length ||
    harvestKg > 0 ||
    reminders.length ||
    photoCountLastWeek > 0 ||
    frostWarning
  )

  return {
    hasContent,
    subject: subjects[iso.week % subjects.length],
    year: iso.year,
    week: iso.week,
    zone,
    firstName: firstName(input.profile.display_name),
    sowNow,
    sowNowLinks,
    calendarHighlights: highlights,
    overdueReminders: own.overdue,
    soonHarvest,
    activeSowings: active,
    harvestKg,
    reminders,
    photoCountLastWeek,
    frostWarning,
    forecastMinTemp,
  }
}
