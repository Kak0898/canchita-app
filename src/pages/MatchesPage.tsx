import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import { supabase } from '../lib/supabase'
import { Match, MatchStatus } from '../types'
import { Plus, Calendar, MapPin, Users } from 'lucide-react'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'

const statusColors: Record<MatchStatus, string> = {
  scheduled:   'text-pitch-400 bg-pitch-900 border-pitch-800',
  in_progress: 'text-yellow-400 bg-yellow-400/10 border-yellow-400/30',
  finished:    'text-white/40 bg-white/5 border-white/10',
  cancelled:   'text-red-400 bg-red-400/10 border-red-400/20',
}

const statusLabels: Record<MatchStatus, string> = {
  scheduled:   'Programado',
  in_progress: 'En curso',
  finished:    'Finalizado',
  cancelled:   'Cancelado',
}

export default function MatchesPage() {
  const { user } = useAuth()
  const [matches, setMatches] = useState<Match[]>([])
  const [filter, setFilter] = useState<'all' | 'upcoming' | 'finished'>('upcoming')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!user) return
    async function load() {
      setLoading(true)
      let query = supabase
        .from('matches')
        .select('*, team:teams(name,emoji), match_players!inner(player_id,status,goals_scored,is_mvp)')
        .eq('match_players.player_id', user!.id)
        .order('scheduled_at', { ascending: filter === 'upcoming' })

      if (filter === 'upcoming') query = query.in('status', ['scheduled', 'in_progress'])
      if (filter === 'finished') query = query.eq('status', 'finished')

      const { data } = await query.limit(20)
      if (data) setMatches(data as Match[])
      setLoading(false)
    }
    load()
  }, [user, filter])

  return (
    <div className="max-w-2xl mx-auto px-4 py-8">
      <div className="flex items-center justify-between mb-6">
        <h1 className="section-title mb-0">Partidos</h1>
        <Link to="/matches/new" className="btn-primary flex items-center gap-2 text-xs">
          <Plus size={14} /> Crear
        </Link>
      </div>

      {/* Filters */}
      <div className="flex gap-2 mb-6">
        {(['upcoming', 'finished', 'all'] as const).map(f => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`text-xs font-display tracking-wide uppercase px-4 py-1.5 rounded border transition-colors ${
              filter === f ? 'border-pitch-600 bg-pitch-900 text-pitch-400' : 'border-white/10 text-white/30 hover:border-white/20'
            }`}
          >
            {f === 'upcoming' ? 'Próximos' : f === 'finished' ? 'Jugados' : 'Todos'}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="card text-center py-10 text-white/30 text-sm">Cargando...</div>
      ) : matches.length === 0 ? (
        <div className="card text-center py-12">
          <Calendar size={40} className="text-white/10 mx-auto mb-3" />
          <p className="text-white/40 text-sm mb-4">No hay partidos aquí</p>
          <Link to="/matches/new" className="btn-primary inline-flex items-center gap-2">
            <Plus size={14} /> Crear partido
          </Link>
        </div>
      ) : (
        <div className="space-y-3">
          {matches.map(match => {
            const myPlayer = match.match_players?.[0]
            return (
              <Link key={match.id} to={`/matches/${match.id}`} className="card flex flex-col gap-3 hover:border-pitch-700 transition-colors group">
                {/* Top */}
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <p className="font-display font-semibold text-chalk group-hover:text-pitch-400 transition-colors">
                      {match.team?.emoji ?? '⚽'} {match.title}
                    </p>
                    <div className="flex items-center gap-3 mt-1.5 text-white/40 text-xs">
                      <span className="flex items-center gap-1"><MapPin size={10} /> {match.location}</span>
                    </div>
                  </div>
                  <span className={`shrink-0 text-xs font-mono border rounded px-2 py-0.5 ${statusColors[match.status]}`}>
                    {statusLabels[match.status]}
                  </span>
                </div>

                {/* Bottom */}
                <div className="flex items-center justify-between text-xs">
                  <span className="font-mono text-pitch-400">
                    {format(new Date(match.scheduled_at), "dd MMM · HH:mm", { locale: es })}
                  </span>
                  {myPlayer && (
                    <span className={`font-display uppercase tracking-wide ${
                      myPlayer.status === 'confirmed' ? 'text-pitch-400' :
                      myPlayer.status === 'declined'  ? 'text-red-400' : 'text-yellow-400'
                    }`}>
                      {myPlayer.status === 'confirmed' ? '✓ Confirmado' :
                       myPlayer.status === 'declined'  ? '✗ No voy' : '? Pendiente'}
                    </span>
                  )}
                </div>
              </Link>
            )
          })}
        </div>
      )}
    </div>
  )
}
