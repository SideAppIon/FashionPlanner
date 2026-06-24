import { useEffect, useState } from 'react'
import { useAuth } from '../auth/AuthContext'
import { getProfile, saveProfile, findSpecialistBySlug } from '../lib/db'
import { WEEKDAYS, WEEKDAY_LABELS, DEFAULT_WORKING_HOURS } from '../lib/slots'
import { detectTz, listTimeZones, formatInTz } from '../lib/tz'
import { CHANNEL_TYPES, channelMeta } from '../lib/channels'

function slugify(s) {
  return s.toLowerCase().trim()
    .replace(/[^a-z0-9а-я\s-]/gi, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
}

export default function Settings() {
  const { user } = useAuth()
  const [form, setForm] = useState(null)
  const [status, setStatus] = useState('')
  const [error, setError] = useState('')

  useEffect(() => {
    getProfile(user.uid).then((p) => {
      setForm({
        displayName: p?.displayName || '',
        slug: p?.slug || '',
        phone: p?.phone || '',
        about: p?.about || '',
        slotStep: p?.slotStep || 30,
        timezone: p?.timezone || detectTz(),
        channels: p?.channels || [],
        workingHours: p?.workingHours || DEFAULT_WORKING_HOURS,
      })
    })
  }, [user.uid])

  if (!form) return <div className="muted">Загрузка…</div>

  const set = (patch) => setForm((f) => ({ ...f, ...patch }))
  const setDay = (key, patch) =>
    setForm((f) => ({ ...f, workingHours: { ...f.workingHours, [key]: { ...f.workingHours[key], ...patch } } }))

  const addChannel = () =>
    set({ channels: [...form.channels, { type: 'telegram', label: 'Telegram', value: '' }] })
  const setChannel = (i, patch) =>
    set({ channels: form.channels.map((c, idx) => (idx === i ? { ...c, ...patch } : c)) })
  const removeChannel = (i) => set({ channels: form.channels.filter((_, idx) => idx !== i) })
  // При смене типа подставляем готовую подпись, если пользователь её не менял.
  const setChannelType = (i, type) =>
    set({ channels: form.channels.map((c, idx) => {
      if (idx !== i) return c
      const wasDefault = !c.label || c.label === channelMeta(c.type).label
      return { ...c, type, label: wasDefault ? channelMeta(type).label : c.label }
    }) })

  const publicUrl = form.slug
    ? `${location.origin}${location.pathname}#/b/${form.slug}`
    : ''

  async function save(e) {
    e.preventDefault()
    setStatus(''); setError('')
    const slug = slugify(form.slug)
    if (!slug) { setError('Укажите адрес страницы (slug)'); return }

    // Мягкая проверка уникальности slug.
    const existing = await findSpecialistBySlug(slug)
    if (existing && existing.id !== user.uid) {
      setError('Такой адрес уже занят, выберите другой'); return
    }

    await saveProfile(user.uid, {
      ownerUid: user.uid,
      displayName: form.displayName,
      slug,
      phone: form.phone,
      about: form.about,
      slotStep: Number(form.slotStep),
      timezone: form.timezone,
      channels: form.channels
        .filter((c) => c.value.trim())
        .map((c) => ({
          type: c.type,
          label: (c.label || channelMeta(c.type).label).trim(),
          value: c.value.trim(),
        })),
      workingHours: form.workingHours,
    })
    set({ slug })
    setStatus('Сохранено')
    setTimeout(() => setStatus(''), 2500)
  }

  return (
    <form className="stack" onSubmit={save} style={{ maxWidth: 640 }}>
      <h1>Настройки</h1>

      <div className="card stack">
        <h3>Профиль</h3>
        <label>Имя / название</label>
        <input value={form.displayName} onChange={(e) => set({ displayName: e.target.value })}
          placeholder="Анна, мастер маникюра" />

        <label>Телефон</label>
        <input value={form.phone} onChange={(e) => set({ phone: e.target.value })}
          placeholder="+7 ..." />

        <label>О себе</label>
        <textarea rows={3} value={form.about} onChange={(e) => set({ about: e.target.value })} />

        <label>Адрес публичной страницы (slug)</label>
        <input value={form.slug} onChange={(e) => set({ slug: e.target.value })}
          placeholder="anna-nails" />
        {publicUrl && (
          <p className="muted small">
            Ссылка для клиентов:{' '}
            <a href={publicUrl} target="_blank" rel="noreferrer">{publicUrl}</a>
          </p>
        )}
      </div>

      <div className="card stack">
        <h3>Каналы связи</h3>
        <p className="muted small">Показываются клиентам на странице записи.</p>

        {form.channels.length === 0 && (
          <p className="muted small">Пока не добавлено ни одного канала.</p>
        )}

        {form.channels.map((c, i) => {
          const meta = channelMeta(c.type)
          return (
            <div key={i} className="channel-edit">
              <div className="channel-edit-top">
                <select value={c.type} onChange={(e) => setChannelType(i, e.target.value)}>
                  {CHANNEL_TYPES.map((t) => (
                    <option key={t.key} value={t.key}>{t.icon} {t.label}</option>
                  ))}
                </select>
                <button type="button" className="btn ghost small danger"
                  onClick={() => removeChannel(i)} aria-label="Удалить">✕</button>
              </div>
              <label>Подпись</label>
              <input value={c.label} placeholder={meta.label}
                onChange={(e) => setChannel(i, { label: e.target.value })} />
              <label>Ссылка / контакт</label>
              <input value={c.value} placeholder={meta.placeholder}
                onChange={(e) => setChannel(i, { value: e.target.value })} />
            </div>
          )
        })}

        <div>
          <button type="button" className="btn ghost small" onClick={addChannel}>
            + Добавить канал
          </button>
        </div>
      </div>

      <div className="card stack">
        <h3>График работы</h3>

        <label>Часовой пояс салона</label>
        <select value={form.timezone} onChange={(e) => set({ timezone: e.target.value })}>
          {listTimeZones().map((tz) => <option key={tz} value={tz}>{tz}</option>)}
        </select>
        <p className="muted small">
          Сейчас в этом поясе: <strong>{formatInTz(new Date(), form.timezone, { hour: '2-digit', minute: '2-digit', day: '2-digit', month: 'short' })}</strong>.
          Время всех записей и расписания указывается в нём, клиент видит время салона.
        </p>

        <label>Шаг сетки записи (мин)</label>
        <select value={form.slotStep} onChange={(e) => set({ slotStep: e.target.value })}>
          {[15, 20, 30, 60].map((v) => <option key={v} value={v}>{v}</option>)}
        </select>

        <div className="hours">
          {WEEKDAYS.filter((k) => k !== 'sun').concat('sun').map((key) => {
            const d = form.workingHours[key]
            return (
              <div key={key} className="hours-row">
                <label className="check">
                  <input type="checkbox" checked={d.enabled}
                    onChange={(e) => setDay(key, { enabled: e.target.checked })} />
                  <span>{WEEKDAY_LABELS[key]}</span>
                </label>
                <input type="time" value={d.start} disabled={!d.enabled}
                  onChange={(e) => setDay(key, { start: e.target.value })} />
                <span className="muted">—</span>
                <input type="time" value={d.end} disabled={!d.enabled}
                  onChange={(e) => setDay(key, { end: e.target.value })} />
              </div>
            )
          })}
        </div>
      </div>

      {error && <div className="error">{error}</div>}
      <div className="row">
        <button className="btn primary" type="submit">Сохранить</button>
        {status && <span className="success">{status}</span>}
      </div>
    </form>
  )
}
