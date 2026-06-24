// Каналы связи специалиста, отображаемые на публичной странице записи.

export const CHANNEL_TYPES = [
  { key: 'telegram', label: 'Telegram', icon: '✈️', placeholder: '@username или ссылка' },
  { key: 'whatsapp', label: 'WhatsApp', icon: '🟢', placeholder: '+7 999 ...' },
  { key: 'instagram', label: 'Instagram', icon: '📸', placeholder: '@username' },
  { key: 'vk', label: 'VK', icon: '🟦', placeholder: 'username или ссылка' },
  { key: 'phone', label: 'Телефон', icon: '📞', placeholder: '+7 999 ...' },
  { key: 'email', label: 'Email', icon: '✉️', placeholder: 'mail@example.com' },
  { key: 'website', label: 'Сайт', icon: '🌐', placeholder: 'https://...' },
  { key: 'other', label: 'Другое', icon: '🔗', placeholder: 'https://...' },
]

export function channelMeta(type) {
  return CHANNEL_TYPES.find((c) => c.key === type) || CHANNEL_TYPES[CHANNEL_TYPES.length - 1]
}

const isUrl = (v) => /^https?:\/\//i.test(v)
const ensureHttp = (v) => (isUrl(v) ? v : `https://${v}`)
const phoneDigits = (v) => v.replace(/[^\d]/g, '')

// Строит корректную ссылку: принимает и полный URL, и хэндл/номер.
export function channelHref(type, value) {
  const v = (value || '').trim()
  if (!v) return null
  switch (type) {
    case 'telegram': return isUrl(v) ? v : `https://t.me/${v.replace(/^@/, '')}`
    case 'whatsapp': return isUrl(v) ? v : `https://wa.me/${phoneDigits(v)}`
    case 'instagram': return isUrl(v) ? v : `https://instagram.com/${v.replace(/^@/, '')}`
    case 'vk': return isUrl(v) ? v : `https://vk.com/${v.replace(/^@/, '')}`
    case 'phone': return `tel:${v.replace(/[^+\d]/g, '')}`
    case 'email': return `mailto:${v}`
    default: return ensureHttp(v)
  }
}

// Открывать ли в новой вкладке (для http-ссылок да, для tel/mailto — нет).
export function channelExternal(type) {
  return type !== 'phone' && type !== 'email'
}
