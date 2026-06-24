// Расчёт свободных слотов для записи (с учётом часового пояса специалиста).
import { zonedToInstant } from './tz'

export const WEEKDAYS = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat']
export const WEEKDAY_LABELS = {
  mon: 'Пн', tue: 'Вт', wed: 'Ср', thu: 'Чт', fri: 'Пт', sat: 'Сб', sun: 'Вс',
}

export function timeToMin(t) {
  const [h, m] = String(t).split(':').map(Number)
  return h * 60 + m
}

export function minToTime(min) {
  const h = Math.floor(min / 60)
  const m = min % 60
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`
}

// 'YYYY-MM-DD' + минуты от полуночи -> локальный Date (fallback без зоны).
export function dateAtMinutes(dateStr, min = 0) {
  const [y, mo, d] = dateStr.split('-').map(Number)
  return new Date(y, mo - 1, d, 0, min, 0, 0)
}

export function weekdayKey(dateStr) {
  const [y, mo, d] = dateStr.split('-').map(Number)
  return WEEKDAYS[new Date(y, mo - 1, d).getDay()]
}

export function dayOfMonth(dateStr) {
  return Number(dateStr.split('-')[2])
}

export function addDays(dateStr, n) {
  const [y, mo, d] = dateStr.split('-').map(Number)
  const dt = new Date(y, mo - 1, d + n, 12, 0, 0)
  return `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, '0')}-${String(dt.getDate()).padStart(2, '0')}`
}

// Понедельник недели, содержащей dateStr.
export function mondayOf(dateStr) {
  const [y, mo, d] = dateStr.split('-').map(Number)
  const dow = (new Date(y, mo - 1, d, 12).getDay() + 6) % 7 // 0 = понедельник
  return addDays(dateStr, -dow)
}

export const DEFAULT_WORKING_HOURS = {
  mon: { enabled: true, start: '10:00', end: '19:00' },
  tue: { enabled: true, start: '10:00', end: '19:00' },
  wed: { enabled: true, start: '10:00', end: '19:00' },
  thu: { enabled: true, start: '10:00', end: '19:00' },
  fri: { enabled: true, start: '10:00', end: '19:00' },
  sat: { enabled: false, start: '10:00', end: '16:00' },
  sun: { enabled: false, start: '10:00', end: '16:00' },
}

/**
 * @param {object} p
 * @param {string} p.date        'YYYY-MM-DD' (календарная дата в зоне специалиста)
 * @param {object} p.workingDay  { enabled, start, end } | undefined
 * @param {number} p.slotStep    шаг сетки в минутах
 * @param {number} p.durationMin длительность услуги
 * @param {Array<{startMin:number,endMin:number}>} p.busy занятые интервалы (минуты от полуночи в зоне)
 * @param {Date}   [p.now]       текущее время для отсева прошлого
 * @param {string} [p.timeZone]  зона специалиста (IANA)
 * @returns {string[]} доступные времена начала ('HH:MM')
 */
export function computeFreeSlots({ date, workingDay, slotStep, durationMin, busy, now, timeZone }) {
  if (!workingDay || !workingDay.enabled) return []
  const dayStart = timeToMin(workingDay.start)
  const dayEnd = timeToMin(workingDay.end)
  const step = slotStep || 30
  const out = []

  for (let t = dayStart; t + durationMin <= dayEnd; t += step) {
    const overlap = busy.some((b) => t < b.endMin && b.startMin < t + durationMin)
    if (overlap) continue
    if (now) {
      const instant = timeZone ? zonedToInstant(date, t, timeZone) : dateAtMinutes(date, t)
      if (instant <= now) continue
    }
    out.push(minToTime(t))
  }
  return out
}
