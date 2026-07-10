import { useEffect, useState } from 'react'
import { computeFreeSlots, weekdayKey, timeToMin, DEFAULT_WORKING_HOURS } from '../lib/slots'
import { zonedToInstant, tzToday, detectTz } from '../lib/tz'
import { channelHref, channelMeta, channelExternal } from '../lib/channels'

// Демо-страница витрины записи для клиента. Английский интерфейс,
// тестовые данные, ничего не сохраняется в базу.

const TZ = detectTz()

const SALON = {
  name: 'Bella Beauty Studio',
  about: 'Nails, brows & lashes — in the heart of the city.',
  slotStep: 30,
  workingHours: DEFAULT_WORKING_HOURS,
  channels: [
    { type: 'instagram', label: 'Instagram', value: '@bella.beauty' },
    { type: 'whatsapp', label: 'WhatsApp', value: '+44 20 7946 0000' },
    { type: 'telegram', label: 'Telegram', value: '@bellabeauty' },
  ],
}

const SERVICES = [
  { id: 's1', name: 'Gel manicure', description: 'Shape, cuticle care & gel polish', durationMin: 90, price: 35 },
  { id: 's2', name: 'Classic pedicure', description: 'Relaxing foot care & polish', durationMin: 60, price: 30 },
  { id: 's3', name: 'Brow shaping & tint', description: 'Wax, tweeze & tint', durationMin: 45, price: 20 },
  { id: 's4', name: 'Lash extensions', description: 'Classic full set', durationMin: 120, price: 60 },
]

// Пара «занятых» интервалов, чтобы показать, что часть времени недоступна.
const DEMO_BUSY = [
  { startMin: 11 * 60, endMin: 12 * 60 },
  { startMin: 15 * 60, endMin: 16 * 60 + 30 },
]

const fmt = (d, opts) => new Intl.DateTimeFormat('en-GB', { timeZone: TZ, ...opts }).format(d)

export default function DemoClient() {
  return (
    <div className="public-wrap">
      <div className="demo-ribbon">Demo · sample data, nothing is saved</div>
      <header className="public-head">
        <h1>{SALON.name}</h1>
        <p className="muted">{SALON.about}</p>
        <div className="channels">
          {SALON.channels.map((c, i) => {
            const meta = channelMeta(c.type)
            const ext = channelExternal(c.type)
            return (
              <div key={i} className="channel">
                <span className="channel-label">{meta.icon} {c.label}</span>
                <a className="channel-link" href={channelHref(c.type, c.value)}
                  {...(ext ? { target: '_blank', rel: 'noreferrer' } : {})}>{c.value}</a>
              </div>
            )
          })}
        </div>
      </header>
      <Widget />
      <footer className="public-foot muted small">
        Powered by FashionPlanner · <a href="#/demo/cabinet">See the specialist cabinet →</a>
      </footer>
    </div>
  )
}

function Widget() {
  const [service, setService] = useState(null)
  const [date, setDate] = useState(tzToday(TZ))
  const [time, setTime] = useState('')
  const [slots, setSlots] = useState(null)
  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
  const [comment, setComment] = useState('')
  const [done, setDone] = useState(null)

  useEffect(() => {
    setTime('')
    if (!service) { setSlots(null); return }
    setSlots(computeFreeSlots({
      date,
      workingDay: SALON.workingHours[weekdayKey(date)],
      slotStep: SALON.slotStep,
      durationMin: service.durationMin,
      busy: DEMO_BUSY,
      now: new Date(),
      timeZone: TZ,
    }))
  }, [service, date])

  function submit(e) {
    e.preventDefault()
    if (!time || !name.trim()) return
    setDone({ service, when: zonedToInstant(date, timeToMin(time), TZ) })
  }

  if (done) {
    return (
      <div className="card success-box stack">
        <h2>You're booked! 🎉</h2>
        <p>
          <strong>{done.service.name}</strong><br />
          {fmt(done.when, { weekday: 'long', day: '2-digit', month: 'long', hour: '2-digit', minute: '2-digit' })}<br />
          {done.service.durationMin} min · £{done.service.price}
        </p>
        <p className="muted small">Times shown in the salon timezone ({TZ})</p>
        <button className="btn ghost" onClick={() => { setDone(null); setService(null); setTime('') }}>
          Book another
        </button>
      </div>
    )
  }

  return (
    <form className="stack" onSubmit={submit}>
      <div className="card stack">
        <h3>1. Choose a service</h3>
        {SERVICES.map((s) => (
          <button type="button" key={s.id}
            className={`service-pick ${service?.id === s.id ? 'active' : ''}`}
            onClick={() => setService(s)}>
            <div className="stack gap-0">
              <strong>{s.name}</strong>
              <span className="muted small">{s.description}</span>
            </div>
            <div className="service-meta">
              <span>{s.durationMin} min</span>
              <span>£{s.price}</span>
            </div>
          </button>
        ))}
      </div>

      {service && (
        <div className="card stack">
          <h3>2. Date & time</h3>
          <input type="date" value={date} min={tzToday(TZ)}
            onChange={(e) => setDate(e.target.value)} />
          {slots && slots.length === 0 && <p className="muted small">No free time on this date.</p>}
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
          <h3>3. Your details</h3>
          <label>Name</label>
          <input value={name} onChange={(e) => setName(e.target.value)} required />
          <label>Phone</label>
          <input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+44 ..." />
          <label>Comment</label>
          <textarea rows={2} value={comment} onChange={(e) => setComment(e.target.value)}
            placeholder="Any requests (optional)" />
          <button className="btn primary">Book · £{service.price}</button>
        </div>
      )}
    </form>
  )
}
