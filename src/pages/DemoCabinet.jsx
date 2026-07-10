import { useMemo, useState } from 'react'
import Modal from '../components/Modal'
import { mondayOf, addDays, dayOfMonth, weekdayKey } from '../lib/slots'
import { zonedToInstant, instantToTzParts, tzToday, detectTz } from '../lib/tz'

// Демо-кабинет специалиста. Английский интерфейс, заполненные тестовые записи,
// ничего не сохраняется — отмена/навигация работают в памяти.

const TZ = detectTz()
const EN_DOW = { mon: 'Mon', tue: 'Tue', wed: 'Wed', thu: 'Thu', fri: 'Fri', sat: 'Sat', sun: 'Sun' }
const fmt = (d, opts) => new Intl.DateTimeFormat('en-GB', { timeZone: TZ, ...opts }).format(d)

// Собираем тестовые записи на текущей неделе (относительно сегодняшней даты).
function seedBookings() {
  const mon = mondayOf(tzToday(TZ))
  const at = (dayIdx, hhmm, data) => {
    const [h, m] = hhmm.split(':').map(Number)
    return { id: `${dayIdx}-${hhmm}`, startAt: zonedToInstant(addDays(mon, dayIdx), h * 60 + m, TZ), ...data }
  }
  return [
    at(0, '10:00', { serviceName: 'Gel manicure', durationMin: 90, price: 35, clientName: 'Emma Watson', clientPhone: '+44 7700 900111', comment: 'First visit, sensitive skin' }),
    at(0, '14:30', { serviceName: 'Brow shaping & tint', durationMin: 45, price: 20, clientName: 'Olivia Brown', clientPhone: '+44 7700 900222', comment: '' }),
    at(2, '11:00', { serviceName: 'Lash extensions', durationMin: 120, price: 60, clientName: 'Sophia Davis', clientPhone: '+44 7700 900333', comment: 'Wants a natural look' }),
    at(2, '16:00', { serviceName: 'Classic pedicure', durationMin: 60, price: 30, clientName: 'Ava Wilson', clientPhone: '+44 7700 900444', comment: '' }),
    at(4, '12:30', { serviceName: 'Gel manicure', durationMin: 90, price: 35, clientName: 'Mia Taylor', clientPhone: '+44 7700 900555', comment: 'Regular client' }),
  ]
}

export default function DemoCabinet() {
  const [bookings, setBookings] = useState(seedBookings)
  const [weekStart, setWeekStart] = useState(() => mondayOf(tzToday(TZ)))
  const [selected, setSelected] = useState(null)

  const today = tzToday(TZ)
  const weekDates = useMemo(
    () => Array.from({ length: 7 }, (_, i) => addDays(weekStart, i)), [weekStart])

  const byDay = useMemo(() => {
    const map = {}
    for (const b of bookings) {
      const { dateStr } = instantToTzParts(b.startAt, TZ)
      ;(map[dateStr] ||= []).push(b)
    }
    return map
  }, [bookings])

  const monthLabel = fmt(zonedToInstant(weekStart, 720, TZ), { month: 'long', year: 'numeric' })

  function cancel(b) {
    setBookings((list) => list.filter((x) => x.id !== b.id))
    setSelected(null)
  }

  return (
    <div className="app">
      <header className="topbar">
        <div className="brand">FashionPlanner</div>
        <nav className="nav">
          <a className="active">Calendar</a>
          <a>Services</a>
          <a>Settings</a>
        </nav>
        <div className="topbar-right">
          <span className="muted small">anna@studio.com</span>
        </div>
      </header>

      <main className="content">
        <div className="stack">
          <div className="demo-ribbon">Demo · sample data, nothing is saved</div>

          <div className="row between">
            <h1>Calendar</h1>
            <a className="btn ghost" href="#/demo/client">Open client page →</a>
          </div>

          <div className="card stack">
            <div className="row between">
              <div className="cal-nav">
                <button className="btn ghost small" onClick={() => setWeekStart(addDays(weekStart, -7))}>‹</button>
                <button className="btn ghost small" onClick={() => setWeekStart(mondayOf(today))}>Today</button>
                <button className="btn ghost small" onClick={() => setWeekStart(addDays(weekStart, 7))}>›</button>
              </div>
              <strong>{monthLabel}</strong>
            </div>

            <div className="week-grid">
              {weekDates.map((d) => {
                const items = (byDay[d] || []).slice().sort((a, b) => a.startAt - b.startAt)
                return (
                  <div key={d} className={`day-col ${d === today ? 'is-today' : ''}`}>
                    <div className="day-head" style={{ cursor: 'default' }}>
                      <span className="dow">{EN_DOW[weekdayKey(d)]}</span>
                      <span className="dnum">{dayOfMonth(d)}</span>
                    </div>
                    <div className="day-body">
                      {items.length === 0 && <div className="day-empty">—</div>}
                      {items.map((b) => (
                        <div key={b.id} className="ev" onClick={() => setSelected(b)}
                          title="Client details">
                          <span className="ev-time">{fmt(b.startAt, { hour: '2-digit', minute: '2-digit' })}</span>
                          <span className="ev-name">{b.serviceName}</span>
                          <span className="ev-client">{b.clientName}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )
              })}
            </div>
            <p className="muted small">Times in {TZ}. Click a booking to open the client card.</p>
          </div>
        </div>

        {selected && (
          <Modal title="Booking" onClose={() => setSelected(null)}>
            <div className="stack">
              <div className="detail-when">
                {fmt(selected.startAt, { weekday: 'short', day: '2-digit', month: 'long', hour: '2-digit', minute: '2-digit' })}
              </div>
              <dl className="details">
                <dt>Service</dt><dd>{selected.serviceName}</dd>
                <dt>Duration</dt><dd>{selected.durationMin} min · £{selected.price}</dd>
                <dt>Client</dt><dd>{selected.clientName}</dd>
                <dt>Phone</dt>
                <dd><a href={`tel:${selected.clientPhone.replace(/[^+\d]/g, '')}`}>{selected.clientPhone}</a></dd>
                {selected.comment && (<><dt>Comment</dt><dd>{selected.comment}</dd></>)}
              </dl>
              <div className="row between">
                <button className="btn ghost" onClick={() => setSelected(null)}>Close</button>
                <button className="btn danger-solid" onClick={() => cancel(selected)}>Cancel booking</button>
              </div>
            </div>
          </Modal>
        )}
      </main>
    </div>
  )
}
