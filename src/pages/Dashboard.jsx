import { useEffect, useState } from 'react'
import { useAuth } from '../auth/AuthContext'
import {
  getProfile, listServices, listUpcomingBookings,
  listSlotsForDay, createBooking, deleteBooking,
} from '../lib/db'
import { computeFreeSlots, weekdayKey, todayStr, dateAtMinutes, timeToMin } from '../lib/slots'

function fmtDateTime(ts) {
  const d = ts?.toDate ? ts.toDate() : new Date(ts)
  return d.toLocaleString('ru-RU', {
    day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit',
  })
}

export default function Dashboard() {
  const { user } = useAuth()
  const [profile, setProfile] = useState(null)
  const [services, setServices] = useState([])
  const [bookings, setBookings] = useState(null)
  const [showForm, setShowForm] = useState(false)

  async function reload() {
    const [p, s, b] = await Promise.all([
      getProfile(user.uid),
      listServices(user.uid, true),
      listUpcomingBookings(user.uid),
    ])
    setProfile(p)
    setServices(s)
    setBookings(b)
  }
  useEffect(() => { reload() }, [user.uid])

  async function remove(b) {
    if (!confirm('Отменить запись?')) return
    await deleteBooking(user.uid, b.id)
    await reload()
  }

  const needsSetup = profile && (!profile.slug || services.length === 0)

  return (
    <div className="stack" style={{ maxWidth: 720 }}>
      <div className="row between">
        <h1>Записи</h1>
        <button className="btn primary" onClick={() => setShowForm((v) => !v)}
          disabled={services.length === 0}>
          {showForm ? 'Закрыть' : '+ Новая запись'}
        </button>
      </div>

      {needsSetup && (
        <div className="card notice">
          Чтобы принимать записи: добавьте услуги на вкладке «Услуги» и укажите
          адрес страницы в «Настройках».
        </div>
      )}

      {showForm && (
        <ManualBookingForm
          uid={user.uid} profile={profile} services={services}
          onDone={() => { setShowForm(false); reload() }}
        />
      )}

      <div className="stack">
        {bookings === null && <div className="muted">Загрузка…</div>}
        {bookings && bookings.length === 0 && <div className="muted">Предстоящих записей нет.</div>}
        {bookings && bookings.map((b) => (
          <div key={b.id} className="card booking-row">
            <div className="booking-time">{fmtDateTime(b.startAt)}</div>
            <div className="stack gap-0">
              <strong>{b.serviceName}</strong>
              <span className="muted small">
                {b.clientName}{b.clientPhone ? ` · ${b.clientPhone}` : ''} · {b.durationMin} мин
                {b.price ? ` · ${b.price} ₽` : ''}
              </span>
            </div>
            <button className="btn ghost small danger" onClick={() => remove(b)}>Отменить</button>
          </div>
        ))}
      </div>
    </div>
  )
}

function ManualBookingForm({ uid, profile, services, onDone }) {
  const [serviceId, setServiceId] = useState(services[0]?.id || '')
  const [date, setDate] = useState(todayStr())
  const [time, setTime] = useState('')
  const [slots, setSlots] = useState([])
  const [clientName, setClientName] = useState('')
  const [clientPhone, setClientPhone] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  const service = services.find((s) => s.id === serviceId)

  useEffect(() => {
    let active = true
    setTime('')
    if (!service) { setSlots([]); return }
    listSlotsForDay(uid, date).then((daySlots) => {
      if (!active) return
      const busyIntervals = daySlots.map((s) => {
        const start = timeToMin(
          s.startAt.toDate().toTimeString().slice(0, 5))
        return { startMin: start, endMin: start + s.durationMin }
      })
      const free = computeFreeSlots({
        date,
        workingDay: profile?.workingHours?.[weekdayKey(date)],
        slotStep: profile?.slotStep || 30,
        durationMin: service.durationMin,
        busy: busyIntervals,
        now: new Date(),
      })
      setSlots(free)
    })
    return () => { active = false }
  }, [uid, date, serviceId])

  async function submit(e) {
    e.preventDefault()
    setError('')
    if (!time) { setError('Выберите время'); return }
    if (!clientName.trim()) { setError('Укажите имя клиента'); return }
    setBusy(true)
    try {
      const startDate = dateAtMinutes(date, timeToMin(time))
      await createBooking(uid, { service, startDate, clientName: clientName.trim(), clientPhone })
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
          <input type="date" value={date} min={todayStr()}
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

      {error && <div className="error">{error}</div>}
      <div><button className="btn primary" disabled={busy}>Создать запись</button></div>
    </form>
  )
}
