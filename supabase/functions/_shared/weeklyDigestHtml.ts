// Veckomejlets innehåll. Ren funktion så att den går att testa från vitest;
// weekly-digest/index.ts lägger den i baseLayout och köar utskicket.
import { STATUS_LABEL_SV, SITE_URL, type DigestModel } from './weeklyDigestModel.ts'

const APP_URL = `${SITE_URL}/app`
const CALENDAR_URL = `${APP_URL}/calendar`
const WEEKDAYS = ['söndag', 'måndag', 'tisdag', 'onsdag', 'torsdag', 'fredag', 'lördag']
const MONTHS = ['jan', 'feb', 'mars', 'apr', 'maj', 'juni', 'juli', 'aug', 'sep', 'okt', 'nov', 'dec']

export function escapeHtml(value: unknown): string {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;')
}

/** "tisdag 13 okt" */
export function dayLabel(key: string): string {
  const [y, m, d] = key.split('-').map(Number)
  if (!y || !m || !d) return key
  return `${WEEKDAYS[new Date(Date.UTC(y, m - 1, d)).getUTCDay()]} ${d} ${MONTHS[m - 1]}`
}

const H2 = 'font-size:18px; margin:22px 0 6px; color:#16351f;'
const UL = 'padding-left:20px; margin:10px 0 0;'
const LINK = 'color:#2f6b3d;'

function list(items: string[]): string {
  return `<ul style="${UL}">${items.map((item) => `<li style="margin:0 0 6px;">${item}</li>`).join('')}</ul>`
}

function button(href: string, label: string, primary = true): string {
  const style = primary
    ? 'display:inline-block; background:#3E7C4C; color:#ffffff; text-decoration:none; padding:13px 18px; border-radius:999px; font-weight:700;'
    : 'display:inline-block; color:#2f6b3d; text-decoration:underline; padding:13px 6px; font-weight:600;'
  return `<a href="${href}" style="${style}">${escapeHtml(label)}</a>`
}

export function renderDigestHtml(model: DigestModel): string {
  const parts: string[] = [
    `<p style="margin:0 0 12px;">Hej ${escapeHtml(model.firstName)}!</p>`,
    `<p style="margin:0 0 18px;">Här är din odlingsvecka ${model.week} för zon ${model.zone}. Små steg nu gör säsongen enklare att följa upp senare.</p>`,
  ]

  if (model.frostWarning) {
    parts.push(`<div style="border:1px solid #f59e0b; background:#fffbeb; border-radius:14px; padding:14px; margin:14px 0;"><strong>Frostrisk:</strong> prognosen visar ner mot ${escapeHtml(String(model.forecastMinTemp))} °C kommande veckan. Skydda känsliga plantor eller vänta med utplantering.</div>`)
  }

  if (model.calendarHighlights.length) {
    parts.push(`<h2 style="${H2}">I din kalender den här veckan</h2>${list(model.calendarHighlights.map((item) => {
      const warning = item.warning ? `<br /><span style="color:#b45309; font-size:13px;">${escapeHtml(item.warning)}</span>` : ''
      return `<strong>${escapeHtml(item.title)}</strong> – ${escapeHtml(dayLabel(item.date))}${warning}`
    }))}<p style="margin:8px 0 0; font-size:13px; color:#55705d;">Räknat från dina egna såddatum. <a href="${CALENDAR_URL}" style="${LINK}">Se allt i kalendern</a></p>`)
  }

  if (model.reminders.length || model.overdueReminders) {
    const overdue = model.overdueReminders
      ? `<p style="margin:8px 0 0; color:#b91c1c;">${model.overdueReminders} ${model.overdueReminders === 1 ? 'påminnelse är försenad' : 'påminnelser är försenade'}. <a href="${APP_URL}/reminders" style="${LINK}">Bocka av eller flytta</a></p>`
      : ''
    const upcoming = model.reminders.length
      ? list(model.reminders.map((reminder) => `${escapeHtml(reminder.title)} – ${escapeHtml(dayLabel(reminder.due_date))}`))
      : ''
    parts.push(`<h2 style="${H2}">Dina påminnelser</h2>${upcoming}${overdue}`)
  }

  if (model.sowNowLinks.length) {
    parts.push(`<h2 style="${H2}">Att så nu i zon ${model.zone}</h2>${list(model.sowNowLinks.map((crop) => {
      const closing = crop.closing ? ' <strong style="color:#b91c1c;">– sista veckan</strong>' : ''
      return `<a href="${escapeHtml(crop.url)}" style="${LINK}">${escapeHtml(crop.name)}</a>${closing}`
    }))}`)
  }

  if (model.soonHarvest.length) {
    parts.push(`<h2 style="${H2}">Snart skörd</h2>${list(model.soonHarvest.map(escapeHtml))}`)
  }

  if (model.activeSowings.length) {
    parts.push(`<h2 style="${H2}">Aktiva sådder</h2>${list(model.activeSowings.map((sowing) => {
      const status = sowing.status ? STATUS_LABEL_SV[sowing.status] ?? sowing.status : ''
      return `${escapeHtml(sowing.variety)}${status ? ` – ${escapeHtml(status)}` : ''}`
    }))}`)
  }

  if (model.harvestKg > 0 || model.photoCountLastWeek > 0) {
    parts.push(`<h2 style="${H2}">Din säsong hittills</h2><ul style="${UL}">${model.harvestKg > 0 ? `<li>${model.harvestKg.toLocaleString('sv-SE')} kg registrerad skörd i år</li>` : ''}${model.photoCountLastWeek > 0 ? `<li>${model.photoCountLastWeek} nya bilder senaste veckan</li>` : ''}</ul>`)
  }

  parts.push(`<p style="margin:26px 0 8px;">${button(CALENDAR_URL, 'Öppna min odlingskalender')} ${button(`${APP_URL}/timeline`, 'Skriv i dagboken', false)}</p>`)
  return parts.join('\n')
}
