import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import { supabase } from '../lib/supabase'
import { ProfileWithStats } from '../types'
import { Edit, Star, Target, Trophy, TrendingUp, UserCircle } from 'lucide-react'

export default function ProfilePage() {
  const { id } = useParams()
  const { user, profile: myProfile } = useAuth()
  const [player, setPlayer] = useState<ProfileWithStats | null>(null)
  const [loading, setLoading] = useState(true)

  const targetId = id ?? user?.id
  const isOwn = !id || id === user?.id

  useEffect(() => {
    if (!targetId) return
    async function load() {
      const { data } = await supabase
        .from('profiles')
        .select(`*, player_stats(*), teams:team_members(role, team:teams(id,name,emoji))`)
        .eq('id', targetId)
        .single()
      if (data) setPlayer(data as ProfileWithStats)
      setLoading(false)
    }
    load()
  }, [targetId])

  if (loading) return <div className="flex items-center justify-center h-64 text-white/30 font-display tracking-widest animate-pulse">CARGANDO...</div>
  if (!player) return <div className="flex items-center justify-center h-64 text-white/30">Jugador no encontrado</div>

  const stats = player.player_stats
  const teams = (player.teams ?? []) as any[]

  return (
    <div className="max-w-2xl mx-auto px-4 py-8">
      {/* Header card */}
      <div className="card mb-6 relative">
        {isOwn && (
          <Link to="/profile/edit" className="absolute top-4 right-4 btn-secondary flex items-center gap-2 text-xs">
            <Edit size={12} /> Editar
          </Link>
        )}

        <div className="flex items-start gap-5">
          {/* Avatar */}
          <div className="shrink-0">
            {player.avatar_url ? (
              <img
                src={player.avatar_url}
                className="w-20 h-20 rounded-full object-cover border-2 border-pitch-700"
                alt={player.username}
              />
            ) : (
              <div className="w-20 h-20 rounded-full bg-pitch-900 border-2 border-pitch-700 flex items-center justify-center">
                <UserCircle size={36} className="text-pitch-600" />
              </div>
            )}
          </div>

          {/* Info */}
          <div className="flex-1 min-w-0">
            <h1 className="font-display text-2xl font-bold text-chalk">{player.full_name ?? player.username}</h1>
            <p className="text-pitch-400 text-sm font-mono">@{player.username}</p>
            {player.description && (
              <p className="text-white/50 text-sm mt-2 leading-relaxed">{player.description}</p>
            )}

            {/* Teams badges */}
            {teams.length > 0 && (
              <div className="flex flex-wrap gap-2 mt-3">
                {teams.map((tm: any) => (
                  <Link key={tm.team.id} to={`/teams/${tm.team.id}`} className="badge hover:border-pitch-600 transition-colors">
                    {tm.team.emoji} {tm.team.name}
                    {tm.role === 'captain' && <span className="text-yellow-400 ml-1">©</span>}
                  </Link>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Stats */}
      <h2 className="section-title">Estadísticas</h2>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
        {[
          { icon: Target,     label: 'Partidos',  value: stats?.matches_played ?? 0 },
          { icon: TrendingUp, label: 'Goles',      value: stats?.goals ?? 0 },
          { icon: Trophy,     label: 'MVPs',       value: stats?.mvp_count ?? 0 },
          { icon: Star,       label: 'Rating avg', value: stats ? Number(stats.avg_rating).toFixed(1) : '—' },
        ].map(({ icon: Icon, label, value }) => (
          <div key={label} className="card text-center">
            <Icon size={15} className="text-pitch-600 mx-auto mb-2" />
            <div className="stat-number">{value}</div>
            <div className="stat-label">{label}</div>
          </div>
        ))}
      </div>

      {/* Rating bar visual */}
      {stats && stats.matches_played > 0 && (
        <div className="card">
          <p className="label mb-3">Rating promedio</p>
          <div className="flex items-center gap-3">
            <div className="flex-1 bg-white/5 rounded-full h-2">
              <div
                className="bg-pitch-500 h-2 rounded-full transition-all duration-500"
                style={{ width: `${(Number(stats.avg_rating) / 10) * 100}%` }}
              />
            </div>
            <span className="font-mono text-pitch-400 font-semibold text-sm">{Number(stats.avg_rating).toFixed(1)}/10</span>
          </div>
        </div>
      )}
    </div>
  )
}
