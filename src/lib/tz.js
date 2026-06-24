// Работа с часовыми поясами без внешних библиотек, на базе Intl.
// Идея: всё хранится в Firestore как абсолютный момент (Timestamp/UTC),
// а «стенные часы» (график, слоты) интерпретируются в зоне специалиста.

export function detectTz() {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC'
  } catch {
    return 'UTC'
  }
}

export function listTimeZones() {
  try {
    if (typeof Intl.supportedValuesOf === 'function') {
      return Intl.supportedValuesOf('timeZone')
    }
  } catch {
    /* fallthrough */
  }
  return [
    'UTC', 'Europe/Kaliningrad', 'Europe/Moscow', 'Europe/Samara',
    'Asia/Yekaterinburg', 'Asia/Omsk', 'Asia/Krasnoyarsk', 'Asia/Irkutsk',
    'Asia/Yakutsk', 'Asia/Vladivostok', 'Asia/Magadan', 'Asia/Kamchatka',
    'Europe/Kyiv', 'Europe/Minsk', 'Asia/Almaty', 'Asia/Tashkent', 'Asia/Tbilisi',
  ]
}

// Смещение зоны от UTC (в мс) в конкретный момент времени.
function tzOffsetMs(utcMs, timeZone) {
  const dtf = new Intl.DateTimeFormat('en-US', {
    timeZone, hour12: false,
    year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', second: '2-digit',
  })
  const m = {}
  for (const p of dtf.formatToParts(new Date(utcMs))) m[p.type] = p.value
  let hour = Number(m.hour)
  if (hour === 24) hour = 0
  const asIfUTC = Date.UTC(m.year, m.month - 1, m.day, hour, m.minute, m.second)
  return asIfUTC - utcMs
}

// 'YYYY-MM-DD' + минуты от полуночи (стенные часы в зоне) -> абсолютный Date.
export function zonedToInstant(dateStr, minutes, timeZone) {
  const [y, mo, d] = dateStr.split('-').map(Number)
  const guess = Date.UTC(y, mo - 1, d, Math.floor(minutes / 60), minutes % 60)
  // Два прохода — корректно у границ переходов на летнее/зимнее время.
  let offset = tzOffsetMs(guess, timeZone)
  offset = tzOffsetMs(guess - offset, timeZone)
  return new Date(guess - offset)
}

// Абсолютный Date -> { dateStr, minutes } в указанной зоне.
export function instantToTzParts(date, timeZone) {
  const dtf = new Intl.DateTimeFormat('en-CA', {
    timeZone, hour12: false,
    year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit',
  })
  const m = {}
  for (const p of dtf.formatToParts(date)) m[p.type] = p.value
  let hour = Number(m.hour)
  if (hour === 24) hour = 0
  return {
    dateStr: `${m.year}-${m.month}-${m.day}`,
    minutes: hour * 60 + Number(m.minute),
  }
}

export function tzToday(timeZone) {
  return instantToTzParts(new Date(), timeZone).dateStr
}

export function formatInTz(date, timeZone, opts) {
  return new Intl.DateTimeFormat('ru-RU', { timeZone, ...opts }).format(date)
}
