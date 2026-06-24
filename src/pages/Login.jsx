import { useState } from 'react'
import { Navigate } from 'react-router-dom'
import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
} from 'firebase/auth'
import { auth } from '../firebase'
import { useAuth } from '../auth/AuthContext'

const ERRORS = {
  'auth/invalid-email': 'Некорректный email',
  'auth/invalid-credential': 'Неверный email или пароль',
  'auth/wrong-password': 'Неверный пароль',
  'auth/user-not-found': 'Пользователь не найден',
  'auth/email-already-in-use': 'Этот email уже зарегистрирован',
  'auth/weak-password': 'Пароль слишком короткий (минимум 6 символов)',
}

export default function Login() {
  const { user } = useAuth()
  const [mode, setMode] = useState('login') // 'login' | 'register'
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  if (user) return <Navigate to="/" replace />

  async function submit(e) {
    e.preventDefault()
    setError('')
    setBusy(true)
    try {
      if (mode === 'login') {
        await signInWithEmailAndPassword(auth, email.trim(), password)
      } else {
        // Регистрация без подтверждения email — сразу авторизуем.
        await createUserWithEmailAndPassword(auth, email.trim(), password)
      }
    } catch (err) {
      setError(ERRORS[err.code] || err.message)
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="center-screen">
      <form className="card auth-card" onSubmit={submit}>
        <h1 className="auth-title">FashionPlanner</h1>
        <p className="muted">Кабинет специалиста</p>

        <label>Email</label>
        <input type="email" value={email} required autoComplete="email"
          onChange={(e) => setEmail(e.target.value)} />

        <label>Пароль</label>
        <input type="password" value={password} required minLength={6}
          autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
          onChange={(e) => setPassword(e.target.value)} />

        {error && <div className="error">{error}</div>}

        <button className="btn primary" type="submit" disabled={busy}>
          {busy ? '…' : mode === 'login' ? 'Войти' : 'Зарегистрироваться'}
        </button>

        <button type="button" className="btn link"
          onClick={() => { setMode(mode === 'login' ? 'register' : 'login'); setError('') }}>
          {mode === 'login' ? 'Нет аккаунта? Создать' : 'Уже есть аккаунт? Войти'}
        </button>
      </form>
    </div>
  )
}
