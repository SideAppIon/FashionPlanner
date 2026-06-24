import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import {
  findSpecialistBySlug, listServices, listSlotsForDay, createBooking,
} from '../lib/db'
import { computeFreeSlots, weekdayKey, todayStr, dateAtMinutes, timeToMin } from '../lib/slots'

export default function PublicBooking() {
  const { slug } = useParams()
  const [spec, setSpec] = useState(undefined) // undefined=загрузка, null=нет
  const [services, setServices] = useState([])

  useEffect(() => {
    let active = true
    findSpecialistBySlug(slug).then(async (s) => {
      if (!active) return
      setSpec(s)
      if (s) setServices(await listServices(s.id, true))
    })
    return () => { active = false }
  }, [slug])

  if (spec === undefined) return <div className="center-screen muted">Загрузка…</div>
  if (spec === null) {
    return (
      <div className="center-screen">
        <div className="card"><h2>Страница не найдена</h2>
          <p className="muted">Проверьте ссылку.</p></div>
      </div>
    )
  }

  return (
    <div className="public-wrap">
      <header className="public-head">
        <h1>{spec.displayName || 'Запись на услугу'}</h1>
        {spec.about && <p className="muted">{spec.about}</p>}
      </header>
      <BookingWidget spec={spec} services={services} />
      <footer className="public-foot muted small">Работает на FashionPlanner</footer>
    </div>
  )
}

function BookingWidget({ spec, services }) {
  const [service, setService] = useState(null)
  const [date, setDate] = useState(todayStr())
  const [time, setTime] = useState('')
  const [slots, setSlots] = useState(null)
  const [clientName, setClientName] = useState('')
  const [clientPhone, setClientPhone] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [done, setDone] = useState(null)

  useEffect(() => {
    let active = true
    setTime('')
    if (!service) { setSlots(null); return }
    setSlots(null)
    listSlotsForDay(spec.id, date).then((daySlots) => {
      if (!active) return
      const busyIntervals = daySlots.map((s) => {
        const start = timeToMin(s.startAt.toDate().toTimeString().slice(0, 5))
        return { startMin: start, endMin: start + s.durationMin }
      })
      setSlots(computeFreeSlots({
        date,
        workingDay: spec.workingHours?.[weekdayKey(date)],
        slotStep: spec.slotStep || 30,
        durationMin: service.durationMin,
        busy: busyIntervals,
        now: new Date(),
      }))
    })
    return () => { active = false }
  }, [spec.id, date, service])

  async function submit(e) {
    e.preventDefault()
    setError('')
    if (!time) { setError('Выберите время'); return }
    if (!clientName.trim()) { setError('Укажите имя'); return }
    setBusy(true)
    try {
      // Перепроверяем занятость, чтобы снизить риск двойной записи.
      const daySlots = await listSlotsForDay(spec.id, date)
      const taken = daySlots.some((s) => {
        const start = timeToMin(s.startAt.toDate().toTimeString().slice(0, 5))
        const end = start + s.durationMin
        const ns = timeToMin(time)
        const ne = ns + service.durationMin
        return ns < end && start < ne
      })
      if (taken) {
        setError('Это время только что заняли. Выберите другое.')
        setTime('')
        return
      }
      const startDate = dateAtMinutes(date, timeToMin(time))
      await createBooking(spec.id, {
        service, startDate, clientName: clientName.trim(), clientPhone,
      })
      setDone({ service, date, time })
    } catch (err) {
      setError(err.message)
    } finally {
      setBusy(false)
    }
  }

  if (done) {
    return (
      <div className="card success-box stack">
        <h2>Готово! Вы записаны</h2>
        <p>
          <strong>{done.service.name}</strong><br />
          {new Date(done.date).toLocaleDateString('ru-RU', { day: '2-digit', month: 'long' })}, {done.time}<br />
          {done.service.durationMin} мин · {done.service.price} ₽
        </p>
        {spec.phone && <p className="muted small">Вопросы: {spec.phone}</p>}
        <button className="btn ghost" onClick={() => { setDone(null); setService(null); setTime('') }}>
          Записаться ещё
        </button>
      </div>
    )
  }

  return (
    <form className="stack" onSubmit={submit}>
      <div className="card stack">
        <h3>1. Выберите услугу</h3>
        {services.length === 0 && <p className="muted">Услуги пока не добавлены.</p>}
        {services.map((s) => (
          <button type="button" key={s.id}
            className={`service-pick ${service?.id === s.id ? 'active' : ''}`}
            onClick={() => setService(s)}>
            <div className="stack gap-0">
              <strong>{s.name}</strong>
              {s.description && <span className="muted small">{s.description}</span>}
            </div>
            <div className="service-meta">
              <span>{s.durationMin} мин</span>
              <span>{s.price} ₽</span>
            </div>
          </button>
        ))}
      </div>

      {service && (
        <div className="card stack">
          <h3>2. Дата и время</h3>
          <input type="date" value={date} min={todayStr()}
            onChange={(e) => setDate(e.target.value)} />
          {slots === null && <p className="muted small">Загрузка слотов…</p>}
          {slots && slots.length === 0 && <p className="muted small">Нет свободного времени на эту дату.</p>}
          {slots && slots.length > 0 && (
            <div className="slots">
              {slots.map((t) => (
                <button type="button" key={t}
                  className={`slot ${time === t ? 'active' : ''}`}
                  onClick={() => setTime(t)}>{t}</button>
              ))}
            </div>
          )}
        </div>
      )}

      {service && time && (
        <div className="card stack">
          <h3>3. Ваши контакты</h3>
          <label>Имя</label>
          <input value={clientName} onChange={(e) => setClientName(e.target.value)} required />
          <label>Телефон</label>
          <input value={clientPhone} onChange={(e) => setClientPhone(e.target.value)}
            placeholder="+7 ..." />
          {error && <div className="error">{error}</div>}
          <button className="btn primary" disabled={busy}>
            {busy ? '…' : `Записаться · ${service.price} ₽`}
          </button>
        </div>
      )}

      {error && !(service && time) && <div className="error">{error}</div>}
    </form>
  )
}
