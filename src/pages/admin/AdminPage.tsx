import { useEffect, useState } from 'react'
import { Link, Navigate } from 'react-router-dom'
import { useAuth } from '../../hooks/useAuth'
import { supabase } from '../../lib/supabase'
import { Users, Trophy, Calendar, TrendingUp, Trash2, Shield, ShieldOff, UserCircle, Search } from 'lucide-react'
import toast from 'react-hot-toast'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'

interface AdminUser {
  id: string
  username: string
  full_name: string | null
  avatar_url: string | null
  role: string
  created_at: string
  player_stats: {
    matches_played: number
    goals: number
    mvp_count: number
    avg_rating: number
  } | null
  team_count: number
}

interface AdminStats {
  total_users: number
  total_teams: number
  total_matches: number
  matches_finished: number
}

type Tab = 'overview' | 'users' | 'teams' | 'matches'

export default function AdminPage() {
  const { profile } = useAuth()
  const [tab, setTab] = useState<Tab>('overview')
  const [stats, setStats] = useState<AdminStats | null>(null)
  const [users, setUsers] = useState<AdminUser[]>([])
  const [teams, setTeams] = useState<any[]>([])
  const [matches, setMatches] = useState<any[]>([])
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)

  // Guard: only admins
  if (profile && (profile as any).role !== 'admin') {
    return <Navigate to="/dashboard" replace />
  }

  async function loadOverview() {
    const [usersRes, teamsRes, matchesRes] = await Promise.all([
      supabase.from('profiles').select('id', { count: 'exact', head: true }),
      supabase.from('teams').select('id', { count: 'exact', head: true }),
      supabase.from('matches').select('id, status', { count: 'exact' }),
    ])
    setStats({
      total_users:      usersRes.count ?? 0,
      total_teams:      teamsRes.count ?? 0,
      total_matches:    matchesRes.count ?? 0,
      matches_finished: (matchesRes.data ?? []).filter((m: any) => m.status === 'finished').length,
    })
  }

  async function loadUsers() {
    const { data } = await supabase
      .from('profiles')
      .select(`*, player_stats(matches_played, goals, mvp_count, avg_rating)`)
      .order('created_at', { ascending: false })

    if (!data) return

    // Get team counts
    const ids = data.map((u: any) => u.id)
    const { data: teamCounts } = await supabase
      .from('team_members')
      .select('player_id')
      .in('player_id', ids)

    const countMap: Record<string, number> = {}
    for (const t of (teamCounts ?? [])) {
      countMap[t.player_id] = (countMap[t.player_id] ?? 0) + 1
    }

    setUsers(data.map((u: any) => ({ ...u, team_count: countMap[u.id] ?? 0 })))
  }

  async function loadTeams() {
    const { data } = await supabase
      .from('teams')
      .select('*, creator:profiles!created_by(username, full_name)')
      .order('created_at', { ascending: false })
    if (data) setTeams(data)
  }

  async function loadMatches() {
    const { data } = await supabase
      .from('matches')
      .select('*, team:teams(name, emoji), creator:profiles!created_by(username)')
      .order('scheduled_at', { ascending: false })
      .limit(50)
    if (data) setMatches(data)
  }

  useEffect(() => {
    async function init() {
      setLoading(true)
      await Promise.all([loadOverview(), loadUsers(), loadTeams(), loadMatches()])
      setLoading(false)
    }
    init()
  }, [])

  async function handleDeleteUser(userId: string, username: string) {
    if (!confirm(`¿Eliminar al usuario @${username}? Esto borrará su perfil y stats.`)) return
    const { error } = await supabase.from('profiles').delete().eq('id', userId)
    if (error) { toast.error('Error al eliminar — puede requerir borrar desde Auth también'); return }
    toast.success(`@${username} eliminado`)
    loadUsers()
    loadOverview()
  }

  async function handleToggleAdmin(userId: string, currentRole: string, username: string) {
    const newRole = currentRole === 'admin' ? 'user' : 'admin'
    const { error } = await supabase.from('profiles').update({ role: newRole }).eq('id', userId)
    if (error) { toast.error('Error al cambiar rol'); return }
    toast.success(`@${username} ahora es ${newRole === 'admin' ? 'admin 🛡️' : 'usuario normal'}`)
    loadUsers()
  }

  async function handleDeleteTeam(teamId: string, teamName: string) {
    if (!confirm(`¿Eliminar el equipo "${teamName}"?`)) return
    const { error } = await supabase.from('teams').delete().eq('id', teamId)
    if (error) { toast.error('Error al eliminar equipo'); return }
    toast.success(`Equipo "${teamName}" eliminado`)
    loadTeams()
    loadOverview()
  }

  async function handleDeleteMatch(matchId: string, matchTitle: string) {
    if (!confirm(`¿Eliminar el partido "${matchTitle}"?`)) return
    const { error } = await supabase.from('matches').delete().eq('id', matchId)
    if (error) { toast.error('Error al eliminar partido'); return }
    toast.success(`Partido eliminado`)
    loadMatches()
    loadOverview()
  }

  const filteredUsers = users.filter(u =>
    u.username.toLowerCase().includes(search.toLowerCase()) ||
    (u.full_name ?? '').toLowerCase().includes(search.toLowerCase())
  )

  const statusColors: Record<string, string> = {
    scheduled:   'text-pitch-400 border-pitch-800 bg-pitch-900',
    in_progress: 'text-yellow-400 border-yellow-400/30 bg-yellow-400/10',
    finished:    'text-white/30 border-white/10 bg-white/5',
    cancelled:   'text-red-400 border-red-400/20 bg-red-400/10',
  }
  const statusLabel: Record<string, string> = {
    scheduled: 'Programado', in_progress: 'En curso', finished: 'Finalizado', cancelled: 'Cancelado'
  }

  if (loading) return (
    <div className="flex items-center justify-center h-64 text-white/30 font-display animate-pulse tracking-widest">
      CARGANDO PANEL ADMIN...
    </div>
  )

  return (
    <div className="max-w-5xl mx-auto px-4 py-8">
      {/* Header */}
      <div className="flex items-center gap-3 mb-8">
        <div className="w-10 h-10 rounded-xl bg-pitch-900 border border-pitch-700 flex items-center justify-center">
          <Shield size={18} className="text-pitch-400" />
        </div>
        <div>
          <h1 className="font-display text-3xl font-bold text-chalk">Panel Admin</h1>
          <p className="text-white/30 text-xs font-mono">Acceso total — úsalo con cuidado</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1.5 mb-6 flex-wrap">
        {([
          { key: 'overview', label: 'Resumen',  icon: TrendingUp },
          { key: 'users',    label: `Usuarios (${users.length})`, icon: Users },
          { key: 'teams',    label: `Equipos (${teams.length})`,  icon: Trophy },
          { key: 'matches',  label: `Partidos (${matches.length})`, icon: Calendar },
        ] as const).map(({ key, label, icon: Icon }) => (
          <button
            key={key}
            onClick={() => setTab(key)}
            className={`flex items-center gap-2 text-xs font-display tracking-wide uppercase px-4 py-2 rounded border transition-colors ${
              tab === key
                ? 'border-pitch-600 bg-pitch-900 text-pitch-400'
                : 'border-white/10 text-white/30 hover:border-white/20 hover:text-white/60'
            }`}
          >
            <Icon size={13} /> {label}
          </button>
        ))}
      </div>

      {/* ── OVERVIEW ───────────────────────────────────────── */}
      {tab === 'overview' && stats && (
        <div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-8">
            {[
              { label: 'Usuarios',          value: stats.total_users,      icon: Users },
              { label: 'Equipos',           value: stats.total_teams,      icon: Trophy },
              { label: 'Partidos totales',  value: stats.total_matches,    icon: Calendar },
              { label: 'Partidos jugados',  value: stats.matches_finished, icon: TrendingUp },
            ].map(({ label, value, icon: Icon }) => (
              <div key={label} className="card text-center">
                <Icon size={15} className="text-pitch-600 mx-auto mb-2" />
                <div className="stat-number">{value}</div>
                <div className="stat-label">{label}</div>
              </div>
            ))}
          </div>

          {/* Top jugadores por rating */}
          <h2 className="section-title">Top jugadores por rating</h2>
          <div className="space-y-2">
            {[...users]
              .filter(u => (u.player_stats?.matches_played ?? 0) > 0)
              .sort((a, b) => (b.player_stats?.avg_rating ?? 0) - (a.player_stats?.avg_rating ?? 0))
              .slice(0, 5)
              .map((u, i) => (
                <Link key={u.id} to={`/players/${u.id}`} className="card flex items-center gap-3 hover:border-pitch-700 transition-colors group py-3">
                  <span className="font-display text-xl font-bold text-white/20 w-6 text-center">{i + 1}</span>
                  {u.avatar_url ? (
                    <img src={u.avatar_url} className="w-9 h-9 rounded-full object-cover border border-pitch-800" alt="" />
                  ) : (
                    <div className="w-9 h-9 rounded-full bg-pitch-900 border border-pitch-800 flex items-center justify-center">
                      <UserCircle size={18} className="text-pitch-700" />
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="text-chalk text-sm font-display group-hover:text-pitch-400 transition-colors">{u.full_name ?? u.username}</p>
                    <p className="text-white/30 text-xs font-mono">@{u.username}</p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="font-mono text-pitch-400 font-bold">{Number(u.player_stats?.avg_rating ?? 0).toFixed(1)}</p>
                    <p className="text-white/20 text-xs">{u.player_stats?.matches_played} partidos</p>
                  </div>
                </Link>
              ))}
          </div>
        </div>
      )}

      {/* ── USERS ──────────────────────────────────────────── */}
      {tab === 'users' && (
        <div>
          {/* Search */}
          <div className="relative mb-4">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-white/30" />
            <input
              className="input pl-9"
              placeholder="Buscar usuario..."
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            {filteredUsers.map(u => (
              <div key={u.id} className="card flex items-center gap-3 group py-3">
                <Link to={`/players/${u.id}`} className="flex items-center gap-3 flex-1 min-w-0">
                  {u.avatar_url ? (
                    <img src={u.avatar_url} className="w-10 h-10 rounded-full object-cover border border-pitch-800 shrink-0" alt="" />
                  ) : (
                    <div className="w-10 h-10 rounded-full bg-pitch-900 border border-pitch-800 flex items-center justify-center shrink-0">
                      <UserCircle size={20} className="text-pitch-700" />
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="text-chalk text-sm font-display truncate">{u.full_name ?? u.username}</p>
                      {u.role === 'admin' && <span className="badge text-pitch-400 border-pitch-700 shrink-0">Admin</span>}
                    </div>
                    <p className="text-white/30 text-xs font-mono">@{u.username}</p>
                  </div>
                </Link>

                {/* Stats mini */}
                <div className="hidden md:flex items-center gap-4 text-xs text-white/30 shrink-0">
                  <span className="font-mono">{u.player_stats?.matches_played ?? 0} partidos</span>
                  <span className="font-mono">⚽ {u.player_stats?.goals ?? 0}</span>
                  <span className="font-mono text-pitch-400">{Number(u.player_stats?.avg_rating ?? 0).toFixed(1)} ★</span>
                  <span className="font-mono">{u.team_count} equipos</span>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-1 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button
                    onClick={() => handleToggleAdmin(u.id, u.role, u.username)}
                    title={u.role === 'admin' ? 'Quitar admin' : 'Hacer admin'}
                    className={`p-1.5 rounded transition-colors ${u.role === 'admin' ? 'text-pitch-400 hover:text-white/40' : 'text-white/20 hover:text-pitch-400'}`}
                  >
                    {u.role === 'admin' ? <ShieldOff size={15} /> : <Shield size={15} />}
                  </button>
                  <button
                    onClick={() => handleDeleteUser(u.id, u.username)}
                    title="Eliminar usuario"
                    className="p-1.5 rounded text-white/20 hover:text-red-400 transition-colors"
                  >
                    <Trash2 size={15} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── TEAMS ──────────────────────────────────────────── */}
      {tab === 'teams' && (
        <div className="space-y-2">
          {teams.map(team => (
            <div key={team.id} className="card flex items-center gap-3 group py-3">
              <Link to={`/teams/${team.id}`} className="flex items-center gap-3 flex-1 min-w-0">
                {team.logo_url ? (
                  <img src={team.logo_url} className="w-10 h-10 rounded-lg object-cover border border-pitch-800 shrink-0" alt="" />
                ) : (
                  <span className="text-2xl shrink-0">{team.emoji}</span>
                )}
                <div className="flex-1 min-w-0">
                  <p className="text-chalk text-sm font-display">{team.name}</p>
                  <p className="text-white/30 text-xs font-mono">
                    Creado por @{team.creator?.username} · {format(new Date(team.created_at), "dd MMM yyyy", { locale: es })}
                  </p>
                </div>
              </Link>
              <button
                onClick={() => handleDeleteTeam(team.id, team.name)}
                className="p-1.5 rounded text-white/20 hover:text-red-400 transition-colors opacity-0 group-hover:opacity-100 shrink-0"
                title="Eliminar equipo"
              >
                <Trash2 size={15} />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* ── MATCHES ────────────────────────────────────────── */}
      {tab === 'matches' && (
        <div className="space-y-2">
          {matches.map(match => (
            <div key={match.id} className="card flex items-center gap-3 group py-3">
              <Link to={`/matches/${match.id}`} className="flex-1 min-w-0 flex items-center gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="text-chalk text-sm font-display">{match.team?.emoji ?? '⚽'} {match.title}</p>
                    <span className={`text-xs font-mono border rounded px-1.5 py-0.5 ${statusColors[match.status]}`}>
                      {statusLabel[match.status]}
                    </span>
                  </div>
                  <p className="text-white/30 text-xs font-mono mt-0.5">
                    @{match.creator?.username} · {match.location} · {format(new Date(match.scheduled_at), "dd MMM yyyy · HH:mm", { locale: es })}
                  </p>
                </div>
              </Link>
              <button
                onClick={() => handleDeleteMatch(match.id, match.title)}
                className="p-1.5 rounded text-white/20 hover:text-red-400 transition-colors opacity-0 group-hover:opacity-100 shrink-0"
                title="Eliminar partido"
              >
                <Trash2 size={15} />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
