import { Routes, Route, Navigate } from 'react-router-dom'
import { useAuth } from './auth/AuthContext'
import { isConfigured } from './firebase'
import Layout from './components/Layout'
import Login from './pages/Login'
import Dashboard from './pages/Dashboard'
import Services from './pages/Services'
import Settings from './pages/Settings'
import PublicBooking from './pages/PublicBooking'

function NotConfigured() {
  return (
    <div className="center-screen">
      <div className="card" style={{ maxWidth: 460 }}>
        <h2>Firebase не настроен</h2>
        <p className="muted">
          Создай файл <code>.env</code> на основе <code>.env.example</code> и заполни
          ключи из Firebase Console, затем перезапусти <code>npm run dev</code>.
        </p>
      </div>
    </div>
  )
}

function Protected({ children }) {
  const { user } = useAuth()
  if (user === undefined) return <div className="center-screen muted">Загрузка…</div>
  if (!user) return <Navigate to="/login" replace />
  return <Layout>{children}</Layout>
}

export default function App() {
  if (!isConfigured) return <NotConfigured />

  return (
    <Routes>
      {/* Публичная страница записи клиента */}
      <Route path="/b/:slug" element={<PublicBooking />} />

      <Route path="/login" element={<Login />} />
      <Route path="/" element={<Protected><Dashboard /></Protected>} />
      <Route path="/services" element={<Protected><Services /></Protected>} />
      <Route path="/settings" element={<Protected><Settings /></Protected>} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}
