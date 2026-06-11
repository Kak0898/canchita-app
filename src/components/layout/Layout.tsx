import { Outlet, NavLink, useNavigate } from 'react-router-dom'
import { useAuth } from '../../hooks/useAuth'
import { LayoutDashboard, Users, Calendar, Trophy, UserCircle, LogOut, Menu, X, Shield } from 'lucide-react'
import { useState } from 'react'
import toast from 'react-hot-toast'

// navItems are computed dynamically below based on admin role
const baseNavItems = [
  { to: '/dashboard', icon: LayoutDashboard, label: 'Inicio' },
  { to: '/matches',   icon: Calendar,         label: 'Partidos' },
  { to: '/teams',     icon: Users,            label: 'Equipos' },
  { to: '/profile',  icon: UserCircle,        label: 'Mi Perfil' },
]

export default function Layout() {
  const { profile, signOut } = useAuth()
  const isAdmin = (profile as any)?.role === 'admin'
  const navItems = isAdmin ? [...baseNavItems, { to: '/admin', icon: Shield, label: 'Admin' }] : baseNavItems
  const navigate = useNavigate()
  const [mobileOpen, setMobileOpen] = useState(false)

  async function handleSignOut() {
    await signOut()
    toast.success('Hasta la próxima')
    navigate('/login')
  }

  return (
    <div className="min-h-screen flex bg-turf">
      {/* Sidebar desktop */}
      <aside className="hidden md:flex flex-col w-56 bg-grass border-r border-white/5 shrink-0">
        {/* Logo */}
        <div className="px-5 py-6 border-b border-white/5">
          <span className="font-display text-xl font-bold text-pitch-400 tracking-wider">⚽ CANCHITA</span>
        </div>

        {/* Nav */}
        <nav className="flex-1 px-3 py-4 space-y-1">
          {navItems.map(({ to, icon: Icon, label }) => (
            <NavLink
              key={to}
              to={to}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-display tracking-wide uppercase transition-colors duration-150 ${
                  isActive
                    ? 'bg-pitch-900 text-pitch-400'
                    : 'text-white/40 hover:text-white/70 hover:bg-white/5'
                }`
              }
            >
              <Icon size={16} />
              {label}
            </NavLink>
          ))}
        </nav>

        {/* User bottom */}
        <div className="px-3 py-4 border-t border-white/5">
          <div className="flex items-center gap-3 px-3 py-2 mb-1">
            {profile?.avatar_url ? (
              <img src={profile.avatar_url} className="w-8 h-8 rounded-full object-cover border border-pitch-700" alt="" />
            ) : (
              <div className="w-8 h-8 rounded-full bg-pitch-900 border border-pitch-700 flex items-center justify-center text-pitch-400 text-xs font-display">
                {profile?.username?.[0]?.toUpperCase() ?? '?'}
              </div>
            )}
            <div className="flex-1 min-w-0">
              <p className="text-xs font-display text-chalk truncate">{profile?.username ?? '—'}</p>
            </div>
          </div>
          <button onClick={handleSignOut} className="flex items-center gap-2 w-full px-3 py-2 text-white/30 hover:text-red-400 text-xs font-display tracking-wide uppercase transition-colors rounded-lg hover:bg-white/5">
            <LogOut size={14} /> Salir
          </button>
        </div>
      </aside>

      {/* Mobile header */}
      <div className="md:hidden fixed top-0 left-0 right-0 z-50 flex items-center justify-between px-4 py-3 bg-grass border-b border-white/5">
        <span className="font-display text-lg font-bold text-pitch-400 tracking-wider">⚽ CANCHITA</span>
        <button onClick={() => setMobileOpen(!mobileOpen)} className="text-white/50 hover:text-white">
          {mobileOpen ? <X size={20} /> : <Menu size={20} />}
        </button>
      </div>

      {/* Mobile menu overlay */}
      {mobileOpen && (
        <div className="md:hidden fixed inset-0 z-40 bg-grass pt-14">
          <nav className="px-4 py-4 space-y-1">
            {navItems.map(({ to, icon: Icon, label }) => (
              <NavLink
                key={to}
                to={to}
                onClick={() => setMobileOpen(false)}
                className={({ isActive }) =>
                  `flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-display tracking-wide uppercase transition-colors ${
                    isActive ? 'bg-pitch-900 text-pitch-400' : 'text-white/50 hover:text-white hover:bg-white/5'
                  }`
                }
              >
                <Icon size={18} /> {label}
              </NavLink>
            ))}
          </nav>
          <div className="px-4 border-t border-white/5 pt-4">
            <button onClick={handleSignOut} className="flex items-center gap-2 px-4 py-3 text-white/30 hover:text-red-400 text-sm font-display tracking-wide uppercase">
              <LogOut size={16} /> Salir
            </button>
          </div>
        </div>
      )}

      {/* Main content */}
      <main className="flex-1 md:overflow-auto">
        <div className="pt-14 md:pt-0 min-h-screen">
          <Outlet />
        </div>
      </main>
    </div>
  )
}
