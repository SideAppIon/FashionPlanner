import { useEffect, useState } from 'react'
import { useAuth } from '../auth/AuthContext'
import { listServices, addService, updateService, deleteService } from '../lib/db'

const empty = { name: '', price: '', durationMin: 60, description: '' }

export default function Services() {
  const { user } = useAuth()
  const [items, setItems] = useState(null)
  const [form, setForm] = useState(empty)
  const [busy, setBusy] = useState(false)

  async function reload() {
    setItems(await listServices(user.uid))
  }
  useEffect(() => { reload() }, [user.uid])

  async function add(e) {
    e.preventDefault()
    if (!form.name.trim()) return
    setBusy(true)
    try {
      await addService(user.uid, {
        name: form.name.trim(),
        price: Number(form.price) || 0,
        durationMin: Number(form.durationMin) || 60,
        description: form.description.trim(),
      })
      setForm(empty)
      await reload()
    } finally {
      setBusy(false)
    }
  }

  async function toggle(s) {
    await updateService(user.uid, s.id, { active: s.active === false })
    await reload()
  }

  async function remove(s) {
    if (!confirm(`Удалить услугу «${s.name}»?`)) return
    await deleteService(user.uid, s.id)
    await reload()
  }

  return (
    <div className="stack" style={{ maxWidth: 720 }}>
      <h1>Услуги</h1>

      <form className="card stack" onSubmit={add}>
        <h3>Новая услуга</h3>
        <div className="grid-2">
          <div className="stack">
            <label>Название</label>
            <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })}
              placeholder="Маникюр с покрытием" required />
          </div>
          <div className="stack">
            <label>Цена, ₽</label>
            <input type="number" min="0" value={form.price}
              onChange={(e) => setForm({ ...form, price: e.target.value })} placeholder="2000" />
          </div>
          <div className="stack">
            <label>Длительность, мин</label>
            <input type="number" min="5" step="5" value={form.durationMin}
              onChange={(e) => setForm({ ...form, durationMin: e.target.value })} />
          </div>
          <div className="stack">
            <label>Описание</label>
            <input value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })} />
          </div>
        </div>
        <div>
          <button className="btn primary" disabled={busy}>Добавить</button>
        </div>
      </form>

      <div className="stack">
        {items === null && <div className="muted">Загрузка…</div>}
        {items && items.length === 0 && <div className="muted">Пока нет услуг.</div>}
        {items && items.map((s) => (
          <div key={s.id} className={`card service-row ${s.active === false ? 'inactive' : ''}`}>
            <div className="stack gap-0">
              <strong>{s.name}</strong>
              {s.description && <span className="muted small">{s.description}</span>}
            </div>
            <div className="service-meta">
              <span>{s.durationMin} мин</span>
              <span>{s.price} ₽</span>
            </div>
            <div className="row">
              <button className="btn ghost small" onClick={() => toggle(s)}>
                {s.active === false ? 'Включить' : 'Скрыть'}
              </button>
              <button className="btn ghost small danger" onClick={() => remove(s)}>Удалить</button>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
