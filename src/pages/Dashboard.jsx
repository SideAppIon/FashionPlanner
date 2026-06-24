import { useEffect, useMemo, useState } from 'react'
import { useAuth } from '../auth/AuthContext'
import Modal from '../components/Modal'
import {
  getProfile, listServices, listBookingsInRange,
  listSlotsForDay, createBooking, deleteBooking,
} from '../lib/db'
import {
  computeFreeSlots, weekdayKey, WEEKDAY_LABELS, timeToMin,
  mondayOf, addDays, dayOfMonth,
} from '../lib/slots'
import {
  zonedToInstant, instantToTzParts, tzToday, formatInTz, detectTz,
} from '../lib/tz'

export default function Dashboard() {
  const { user } = useAuth()
  const [profile, setProfile] = useState(null)
  const [services, setServices] = useState([])
  const [bookings, setBookings] = useState(null)
  const [weekStart, setWeekStart] = useState(null)
  const [formDate, setFormDate] = useState(null) // выбранная дата для формы записи
  const [selected, setSelected] = useState(null) // запись, открытая в карточке

  const tz = profile?.timezone || detectTz()

  // Загружаем профиль + услуги один раз, инициализируем текущую неделю в зоне.
  useEffect(() => {
    Promise.all([getProfile(user.uid), listServices(user.uid, true)]).then(([p, s]) => {
      setProfile(p)
      setServices(s)
      setWeekStart(mondayOf(tzToday(p?.timezone || detectTz())))
    })
  }, [user.uid])

  const weekDates = useMemo(
    () => (weekStart ? Array.from({ length: 7 }, (_, i) => addDays(weekStart, i)) : []),
    [weekStart],
  )

  async function loadBookings() {
    if (!weekStart) return
    const start = zonedToInstant(weekDates[0], 0, tz)
    const end = new Date(zonedToInstant(weekDates[6], 0, tz).getTime() + 24 * 60 * 60 * 1000)
    setBookings(await listBookingsInRange(user.uid, start, end))
  }
  useEffect(() => { loadBookings() }, [weekStart, user.uid])

  // Группируем записи по дате (в зоне специалиста).
  const byDay = useMemo(() => {
    const map = {}
    for (const b of bookings || []) {
      const { dateStr } = instantToTzParts(b.startAt.toDate(), tz)
      ;(map[dateStr] ||= []).push(b)
    }
    return map
  }, [bookings, tz])

  async function remove(b) {
    if (!confirm('Отменить запись?')) return
    await deleteBooking(user.uid, b.id)
    setSelected(null)
    await loadBookings()
  }

  const today = profile ? tzToday(tz) : null
  const needsSetup = profile && (!profile.slug || services.length === 0)
  const monthLabel = weekStart
    ? formatInTz(zonedToInstant(weekStart, 12 * 60, tz), tz, { month: 'long', year: 'numeric' })
    : ''

  if (!profile || !weekStart) return <div className="muted">Загрузка…</div>

  return (
    <div className="stack">
      <div className="row between">
        <h1>Календарь</h1>
        <button className="btn primary" disabled={services.length === 0}
          onClick={() => setFormDate(formDate ? null : today)}>
          {formDate ? 'Закрыть' : '+ Новая запись'}
        </button>
      </div>

      {needsSetup && (
        <div className="card notice">
          Чтобы принимать записи: добавьте услуги на вкладке «Услуги» и укажите
          адрес страницы в «Настройках».
        </div>
      )}

      {formDate && (
        <ManualBookingForm
          uid={user.uid} profile={profile} services={services} tz={tz}
          initialDate={formDate}
          onDone={() => { setFormDate(null); loadBookings() }}
        />
      )}

      <div className="card stack">
        <div className="row between">
          <div className="cal-nav">
            <button className="btn ghost small" onClick={() => setWeekStart(addDays(weekStart, -7))}>‹</button>
            <button className="btn ghost small" onClick={() => setWeekStart(mondayOf(today))}>Сегодня</button>
            <button className="btn ghost small" onClick={() => setWeekStart(addDays(weekStart, 7))}>›</button>
          </div>
          <strong className="cap">{monthLabel}</strong>
        </div>

        <div className="week-grid">
          {weekDates.map((d) => {
            const items = (byDay[d] || []).slice().sort(
              (a, b) => a.startAt.toDate() - b.startAt.toDate())
            return (
              <div key={d} className={`day-col ${d === today ? 'is-today' : ''}`}>
                <button className="day-head" onClick={() => setFormDate(d)}
                  title="Добавить запись на этот день">
                  <span className="dow">{WEEKDAY_LABELS[weekdayKey(d)]}</span>
                  <span className="dnum">{dayOfMonth(d)}</span>
                </button>
                <div className="day-body">
                  {items.length === 0 && <div className="day-empty">—</div>}
                  {items.map((b) => (
                    <div key={b.id} className="ev" onClick={() => setSelected(b)}
                      title="Подробнее о клиенте">
                      <span className="ev-time">
                        {formatInTz(b.startAt.toDate(), tz, { hour: '2-digit', minute: '2-digit' })}
                      </span>
                      <span className="ev-name">{b.serviceName}</span>
                      <span className="ev-client">{b.clientName}</span>
                    </div>
                  ))}
                </div>
              </div>
            )
          })}
        </div>
        <p className="muted small">Время в поясе: {tz}. Нажмите на запись, чтобы открыть карточку клиента.</p>
      </div>

      {selected && (
        <BookingDetails booking={selected} tz={tz}
          onClose={() => setSelected(null)} onCancel={() => remove(selected)} />
      )}
    </div>
  )
}

function BookingDetails({ booking: b, tz, onClose, onCancel }) {
  const when = formatInTz(b.startAt.toDate(), tz, {
    weekday: 'short', day: '2-digit', month: 'long',
    hour: '2-digit', minute: '2-digit',
  })
  return (
    <Modal title="Запись" onClose={onClose}>
      <div className="stack">
        <div className="detail-when">{when}</div>

        <dl className="details">
          <dt>Услуга</dt>
          <dd>{b.serviceName}</dd>

          <dt>Длительность</dt>
          <dd>{b.durationMin} мин{b.price ? ` · ${b.price} ₽` : ''}</dd>

          <dt>Клиент</dt>
          <dd>{b.clientName}</dd>

          <dt>Телефон</dt>
          <dd>{b.clientPhone
            ? <a href={`tel:${b.clientPhone.replace(/[^+\d]/g, '')}`}>{b.clientPhone}</a>
            : <span className="muted">не указан</span>}</dd>

          {b.comment && (<>
            <dt>Комментарий</dt>
            <dd>{b.comment}</dd>
          </>)}
        </dl>

        <div className="row between">
          <button className="btn ghost" onClick={onClose}>Закрыть</button>
          <button className="btn danger-solid" onClick={onCancel}>Отменить запись</button>
        </div>
      </div>
    </Modal>
  )
}

function ManualBookingForm({ uid, profile, services, tz, initialDate, onDone }) {
  const [serviceId, setServiceId] = useState(services[0]?.id || '')
  const [date, setDate] = useState(initialDate)
  const [time, setTime] = useState('')
  const [slots, setSlots] = useState([])
  const [clientName, setClientName] = useState('')
  const [clientPhone, setClientPhone] = useState('')
  const [comment, setComment] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  const service = services.find((s) => s.id === serviceId)

  useEffect(() => { setDate(initialDate) }, [initialDate])

  useEffect(() => {
    let active = true
    setTime('')
    if (!service) { setSlots([]); return }
    listSlotsForDay(uid, date, tz).then((daySlots) => {
      if (!active) return
      const busyIntervals = daySlots.map((s) => {
        const m = instantToTzParts(s.startAt.toDate(), tz).minutes
        return { startMin: m, endMin: m + s.durationMin }
      })
      setSlots(computeFreeSlots({
        date,
        workingDay: profile?.workingHours?.[weekdayKey(date)],
        slotStep: profile?.slotStep || 30,
        durationMin: service.durationMin,
        busy: busyIntervals,
        now: new Date(),
        timeZone: tz,
      }))
    })
    return () => { active = false }
  }, [uid, date, serviceId, tz])

  async function submit(e) {
    e.preventDefault()
    setError('')
    if (!time) { setError('Выберите время'); return }
    if (!clientName.trim()) { setError('Укажите имя клиента'); return }
    setBusy(true)
    try {
      const startDate = zonedToInstant(date, timeToMin(time), tz)
      await createBooking(uid, {
        service, startDate, clientName: clientName.trim(), clientPhone, comment: comment.trim(),
      })
      onDone()
    } catch (err) {
      setError(err.message)
    } finally {
      setBusy(false)
    }
  }

  return (
    <form className="card stack" onSubmit={submit}>
      <h3>Новая запись</h3>
      <div className="grid-2">
        <div className="stack">
          <label>Услуга</label>
          <select value={serviceId} onChange={(e) => setServiceId(e.target.value)}>
            {services.map((s) => (
              <option key={s.id} value={s.id}>{s.name} · {s.durationMin} мин · {s.price} ₽</option>
            ))}
          </select>
        </div>
        <div className="stack">
          <label>Дата</label>
          <input type="date" value={date} min={tzToday(tz)}
            onChange={(e) => setDate(e.target.value)} />
        </div>
      </div>

      <label>Время</label>
      {slots.length === 0
        ? <p className="muted small">Нет свободных слотов на эту дату.</p>
        : (
          <div className="slots">
            {slots.map((t) => (
              <button type="button" key={t}
                className={`slot ${time === t ? 'active' : ''}`}
                onClick={() => setTime(t)}>{t}</button>
            ))}
          </div>
        )}

      <div className="grid-2">
        <div className="stack">
          <label>Имя клиента</label>
          <input value={clientName} onChange={(e) => setClientName(e.target.value)} required />
        </div>
        <div className="stack">
          <label>Телефон</label>
          <input value={clientPhone} onChange={(e) => setClientPhone(e.target.value)} />
        </div>
      </div>

      <label>Комментарий</label>
      <textarea rows={2} value={comment} onChange={(e) => setComment(e.target.value)}
        placeholder="Пожелания, детали…" />

      {error && <div className="error">{error}</div>}
      <div><button className="btn primary" disabled={busy}>Создать запись</button></div>
    </form>
  )
}
