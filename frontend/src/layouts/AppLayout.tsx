import { NavLink, Outlet } from 'react-router-dom'
import { useState } from 'react'
import { useAuth } from '../context/AuthContext'

const links = [
  { to: '/', label: 'Dashboard' },
  { to: '/customers', label: 'Customers' },
  { to: '/enquiries', label: 'Enquiries' },
  { to: '/quotations', label: 'Quotations' },
  { to: '/sales-orders', label: 'Sales Orders' },
  { to: '/inventory', label: 'Inventory' },
]

export const AppLayout = () => {
  const { user, logout } = useAuth()
  const [open, setOpen] = useState(false)

  return (
    <div className="app-shell">
      <aside className={`sidebar ${open ? 'open' : ''}`}>
        <div className="brand">
          <span className="brand-mark">ERP</span>
          <div>
            <strong>Krithi Supply</strong>
            <small>Manufacturing &amp; Supply</small>
          </div>
        </div>
        <nav>
          {links.map((link) => (
            <NavLink key={link.to} to={link.to} end={link.to === '/'} onClick={() => setOpen(false)}>
              {link.label}
            </NavLink>
          ))}
        </nav>
      </aside>
      <div className="main-col">
        <header className="topbar">
          <button type="button" className="btn ghost menu-btn" onClick={() => setOpen((value) => !value)}>
            Menu
          </button>
          <div className="workflow">Enquiry → Quotation → Order → Dispatch</div>
          <div className="user-chip">
            <div>
              <strong>{user?.username}</strong>
              <small>{user?.role}</small>
            </div>
            <button type="button" className="btn ghost" onClick={logout}>
              Logout
            </button>
          </div>
        </header>
        <main className="content">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
