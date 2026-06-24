import { NavLink, useNavigate } from 'react-router-dom'
import { signOut } from 'firebase/auth'
import { auth } from '../firebase'
import { useAuth } from '../auth/AuthContext'

export default function Layout({ children }) {
  const { user } = useAuth()
  const navigate = useNavigate()

  async function handleLogout() {
    await signOut(auth)
    navigate('/login')
  }

  return (
    <div className="app">
      <header className="topbar">
        <div className="brand">FashionPlanner</div>
        <nav className="nav">
          <NavLink to="/" end>Записи</NavLink>
          <NavLink to="/services">Услуги</NavLink>
          <NavLink to="/settings">Настройки</NavLink>
        </nav>
        <div className="topbar-right">
          <span className="muted small">{user?.email}</span>
          <button className="btn ghost" onClick={handleLogout}>Выйти</button>
        </div>
      </header>
      <main className="content">{children}</main>
    </div>
  )
}
