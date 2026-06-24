import {
  collection, doc, getDoc, getDocs, setDoc, addDoc, deleteDoc, updateDoc,
  query, where, orderBy, limit, writeBatch, Timestamp, serverTimestamp,
} from 'firebase/firestore'
import { db } from '../firebase'
import { zonedToInstant } from './tz'

// ---- Профиль специалиста ----
export async function getProfile(uid) {
  const snap = await getDoc(doc(db, 'specialists', uid))
  return snap.exists() ? { id: snap.id, ...snap.data() } : null
}

export async function saveProfile(uid, data) {
  await setDoc(doc(db, 'specialists', uid), data, { merge: true })
}

export async function findSpecialistBySlug(slug) {
  const q = query(collection(db, 'specialists'), where('slug', '==', slug), limit(1))
  const snap = await getDocs(q)
  if (snap.empty) return null
  const d = snap.docs[0]
  return { id: d.id, ...d.data() }
}

// ---- Услуги ----
export async function listServices(uid, onlyActive = false) {
  const snap = await getDocs(collection(db, 'specialists', uid, 'services'))
  let items = snap.docs.map((d) => ({ id: d.id, ...d.data() }))
  if (onlyActive) items = items.filter((s) => s.active !== false)
  return items.sort((a, b) => (a.name || '').localeCompare(b.name || ''))
}

export async function addService(uid, data) {
  return addDoc(collection(db, 'specialists', uid, 'services'), {
    ...data, active: true, createdAt: serverTimestamp(),
  })
}

export async function updateService(uid, id, data) {
  return updateDoc(doc(db, 'specialists', uid, 'services', id), data)
}

export async function deleteService(uid, id) {
  return deleteDoc(doc(db, 'specialists', uid, 'services', id))
}

// ---- Слоты (публичные интервалы занятости) на конкретный день ----
// Границы дня берутся в зоне специалиста, запрос — по абсолютным моментам.
export async function listSlotsForDay(uid, dateStr, timeZone) {
  const start = timeZone
    ? zonedToInstant(dateStr, 0, timeZone)
    : new Date(`${dateStr}T00:00:00`)
  const end = new Date(start.getTime() + 24 * 60 * 60 * 1000)
  const q = query(
    collection(db, 'specialists', uid, 'slots'),
    where('startAt', '>=', Timestamp.fromDate(start)),
    where('startAt', '<', Timestamp.fromDate(end)),
    orderBy('startAt'),
  )
  const snap = await getDocs(q)
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }))
}

// ---- Записи (для специалиста) ----
export async function listBookingsInRange(uid, startDate, endDate) {
  const q = query(
    collection(db, 'specialists', uid, 'bookings'),
    where('startAt', '>=', Timestamp.fromDate(startDate)),
    where('startAt', '<', Timestamp.fromDate(endDate)),
    orderBy('startAt'),
  )
  const snap = await getDocs(q)
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }))
}

// Создаёт одновременно публичный slot и приватный booking с одним id.
export async function createBooking(uid, { service, startDate, clientName, clientPhone, comment }) {
  const batch = writeBatch(db)
  const id = doc(collection(db, 'specialists', uid, 'bookings')).id
  const startAt = Timestamp.fromDate(startDate)
  const common = {
    serviceId: service.id,
    serviceName: service.name,
    durationMin: service.durationMin,
    startAt,
    createdAt: serverTimestamp(),
  }
  batch.set(doc(db, 'specialists', uid, 'slots', id), common)
  batch.set(doc(db, 'specialists', uid, 'bookings', id), {
    ...common,
    price: service.price ?? null,
    clientName,
    clientPhone: clientPhone || '',
    comment: comment || '',
    status: 'pending',
  })
  await batch.commit()
  return id
}

export async function deleteBooking(uid, id) {
  const batch = writeBatch(db)
  batch.delete(doc(db, 'specialists', uid, 'bookings', id))
  batch.delete(doc(db, 'specialists', uid, 'slots', id))
  await batch.commit()
}
