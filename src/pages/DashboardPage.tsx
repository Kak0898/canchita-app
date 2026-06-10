import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import { supabase } from '../lib/supabase'
import { Match, PlayerStats } from '../types'
import { Calendar, Plus, TrendingUp, Star, Target, Trophy } from 'lucide-react'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'

export default function DashboardPage() {
  const { profile, user } = useAuth()
  const [upcomingMatches, setUpcomingMatches] = useState<Match[]>([])
  const [stats, setStats] = useState<PlayerStats | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!user) return
    async function load() {
      const [matchesRes, statsRes] = await Promise.all([
        supabase
          .from('matches')
          .select('*, team:teams(name,emoji), match_players!inner(player_id,status)')
          .eq('match_players.player_id', user!.id)
          .in('status', ['scheduled', 'in_progress'])
          .order('scheduled_at', { ascending: true })
          .limit(4),
        supabase.from('player_stats').select('*').eq('player_id', user!.id).single(),
      ])
      if (matchesRes.data) setUpcomingMatches(matchesRes.data as Match[])
      if (statsRes.data) setStats(statsRes.data)
      setLoading(false)
    }
    load()
  }, [user])

  const statCards = [
    { icon: Target,   label: 'Partidos',  value: stats?.matches_played ?? 0 },
    { icon: TrendingUp, label: 'Goles',   value: stats?.goals ?? 0 },
    { icon: Trophy,   label: 'MVPs',       value: stats?.mvp_count ?? 0 },
    { icon: Star,     label: 'Rating',     value: stats ? stats.avg_rating.toFixed(1) : '—' },
  ]

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      {/* Header */}
      <div className="mb-8">
        <p className="text-white/40 text-sm font-display tracking-widest uppercase mb-1">Bienvenido</p>
        <h1 className="font-display text-4xl font-bold text-chalk">
          {profile?.full_name ?? profile?.username ?? 'Jugador'}
        </h1>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-8">
        {statCards.map(({ icon: Icon, label, value }) => (
          <div key={label} className="card text-center">
            <Icon size={16} className="text-pitch-600 mx-auto mb-2" />
            <div className="stat-number">{value}</div>
            <div className="stat-label">{label}</div>
          </div>
        ))}
      </div>

      {/* Upcoming matches */}
      <div className="flex items-center justify-between mb-4">
        <h2 className="section-title mb-0">Próximos Partidos</h2>
        <Link to="/matches/new" className="btn-primary flex items-center gap-2 text-xs">
          <Plus size={14} /> Crear partido
        </Link>
      </div>

      {loading ? (
        <div className="card text-center text-white/30 text-sm py-10">Cargando...</div>
      ) : upcomingMatches.length === 0 ? (
        <div className="card text-center py-10">
          <Calendar size={32} className="text-white/20 mx-auto mb-3" />
          <p className="text-white/40 text-sm mb-4">No tienes partidos próximos</p>
          <Link to="/matches/new" className="btn-primary inline-flex items-center gap-2">
            <Plus size={14} /> Crear el primero
          </Link>
        </div>
      ) : (
        <div className="space-y-3">
          {upcomingMatches.map(match => (
            <Link key={match.id} to={`/matches/${match.id}`} className="card flex items-center gap-4 hover:border-pitch-700 transition-colors group">
              <div className="text-3xl">{match.team?.emoji ?? '⚽'}</div>
              <div className="flex-1 min-w-0">
                <p className="font-display font-semibold text-chalk group-hover:text-pitch-400 transition-colors">{match.title}</p>
                <p className="text-white/40 text-xs mt-0.5">{match.location}</p>
              </div>
              <div className="text-right shrink-0">
                <p className="text-pitch-400 text-sm font-mono font-semibold">
                  {format(new Date(match.scheduled_at), 'dd MMM', { locale: es })}
                </p>
                <p className="text-white/30 text-xs">
                  {format(new Date(match.scheduled_at), 'HH:mm')}
                </p>
              </div>
            </Link>
          ))}
          <Link to="/matches" className="block text-center text-pitch-400 hover:text-pitch-300 text-sm font-display tracking-wide uppercase pt-1 transition-colors">
            Ver todos →
          </Link>
        </div>
      )}
    </div>
  )
}
