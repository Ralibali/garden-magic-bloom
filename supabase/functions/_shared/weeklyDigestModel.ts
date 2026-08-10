import { getSowingWeekTiming, normalizeZone, sowingWeeks } from './sowingWeeks.ts'

export interface DigestProfile {
  user_id: string
  display_name?: string | null
  climate_zone?: number | string | null
}

export interface DigestSowing {
  variety: string
  status?: string | null
  sow_date?: string | null
  transplant_date?: string | null
  type?: string | null
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

export interface DigestModelInput {
  profile: DigestProfile
  sowings: DigestSowing[]
  harvests: DigestHarvest[]
  reminders?: DigestReminder[]
  photoCountLastWeek?: number
  forecastMinTemp?: number | null
  currentDate?: Date
  currentWeek?: number
}

export interface DigestModel {
  hasContent: boolean
  subject: string
  year: number
  week: number
  zone: number
  firstName: string
  sowNow: string[]
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

export function buildDigestModel(input: DigestModelInput): DigestModel {
  const now = input.currentDate ?? new Date()
  const iso = input.currentWeek
    ? { year: now.getFullYear(), week: input.currentWeek }
    : getIsoWeek(now)
  const zone = normalizeZone(input.profile.climate_zone)
  const crops = Object.keys(sowingWeeks)

  const sowNow = crops
    .filter((crop) => {
      const timing = getSowingWeekTiming(crop, zone)
      return inRange(iso.week, timing?.pre, 1) || inRange(iso.week, timing?.direct, 1)
    })
    .slice(0, 5)

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
  const reminders = (input.reminders ?? []).slice(0, 7)
  const photoCountLastWeek = input.photoCountLastWeek ?? 0
  const forecastMinTemp = input.forecastMinTemp ?? null
  const frostWarning = typeof forecastMinTemp === 'number' && forecastMinTemp < 3

  const hasContent = Boolean(
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
    soonHarvest,
    activeSowings: active,
    harvestKg,
    reminders,
    photoCountLastWeek,
    frostWarning,
    forecastMinTemp,
  }
}
