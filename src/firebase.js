import { initializeApp } from 'firebase/app'
import { getAuth } from 'firebase/auth'
import { getFirestore } from 'firebase/firestore'

// Веб-конфиг Firebase публичный по дизайну (он всё равно попадает в браузер),
// поэтому держим его прямо в коде. import.meta.env позволяет при желании
// переопределить значения через .env, но по умолчанию работает и без него.
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FB_API_KEY || 'AIzaSyCzOeStZgJuVi_JDCIObvqrlf-DchQjIYw',
  authDomain: import.meta.env.VITE_FB_AUTH_DOMAIN || 'fashionplanner-31f65.firebaseapp.com',
  projectId: import.meta.env.VITE_FB_PROJECT_ID || 'fashionplanner-31f65',
  storageBucket: import.meta.env.VITE_FB_STORAGE_BUCKET || 'fashionplanner-31f65.firebasestorage.app',
  messagingSenderId: import.meta.env.VITE_FB_SENDER_ID || '1049245825956',
  appId: import.meta.env.VITE_FB_APP_ID || '1:1049245825956:web:f564373e6230f1aa731f31',
}

export const isConfigured = Boolean(firebaseConfig.apiKey && firebaseConfig.projectId)

const app = initializeApp(firebaseConfig)
export const auth = getAuth(app)
export const db = getFirestore(app)
