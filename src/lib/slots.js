// Расчёт свободных слотов для записи.
// Допущение MVP: одна таймзона (локальная для браузера и специалиста, и клиента).

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

// 'YYYY-MM-DD' + минуты от полуночи -> локальный Date
export function dateAtMinutes(dateStr, min = 0) {
  const [y, mo, d] = dateStr.split('-').map(Number)
  return new Date(y, mo - 1, d, 0, min, 0, 0)
}

export function weekdayKey(dateStr) {
  const [y, mo, d] = dateStr.split('-').map(Number)
  return WEEKDAYS[new Date(y, mo - 1, d).getDay()]
}

export function todayStr() {
  const n = new Date()
  return `${n.getFullYear()}-${String(n.getMonth() + 1).padStart(2, '0')}-${String(n.getDate()).padStart(2, '0')}`
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
 * @param {string} p.date       'YYYY-MM-DD'
 * @param {object} p.workingDay { enabled, start, end } | undefined
 * @param {number} p.slotStep   шаг сетки в минутах
 * @param {number} p.durationMin длительность услуги
 * @param {Array<{startMin:number,endMin:number}>} p.busy занятые интервалы (минуты от полуночи)
 * @param {Date}   [p.now]      текущее время (для отсева прошлого)
 * @returns {string[]} список доступных времён начала ('HH:MM')
 */
export function computeFreeSlots({ date, workingDay, slotStep, durationMin, busy, now }) {
  if (!workingDay || !workingDay.enabled) return []
  const dayStart = timeToMin(workingDay.start)
  const dayEnd = timeToMin(workingDay.end)
  const step = slotStep || 30
  const out = []

  for (let t = dayStart; t + durationMin <= dayEnd; t += step) {
    const s = t
    const e = t + durationMin
    const overlap = busy.some((b) => s < b.endMin && b.startMin < e)
    if (overlap) continue
    if (now && dateAtMinutes(date, s) <= now) continue
    out.push(minToTime(s))
  }
  return out
}
