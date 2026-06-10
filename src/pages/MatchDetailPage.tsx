import { useEffect, useState } from 'react'
import { useParams, Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import { supabase } from '../lib/supabase'
import { Match, MatchPlayer, PlayerMatchStatus } from '../types'
import { MapPin, Clock, Users, Star, CheckCircle, XCircle, HelpCircle, UserPlus, UserCircle } from 'lucide-react'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'
import toast from 'react-hot-toast'

const statusLabels: Record<PlayerMatchStatus, string> = {
  confirmed: '✓ Confirmado',
  declined:  '✗ No voy',
  maybe:     '? Quizás',
  pending:   '· Pendiente',
}

export default function MatchDetailPage() {
  const { id } = useParams<{ id: string }>()
  const { user } = useAuth()
  const navigate = useNavigate()
  const [match, setMatch] = useState<Match | null>(null)
  const [players, setPlayers] = useState<MatchPlayer[]>([])
  const [loading, setLoading] = useState(true)
  const [inviteUsername, setInviteUsername] = useState('')
  const [inviting, setInviting] = useState(false)

  const myPlayer = players.find(p => p.player_id === user?.id)
  const isCreator = match?.created_by === user?.id
  const confirmed = players.filter(p => p.status === 'confirmed')
  const declined  = players.filter(p => p.status === 'declined')
  const pending   = players.filter(p => p.status === 'pending' || p.status === 'maybe')

  async function load() {
    const [matchRes, playersRes] = await Promise.all([
      supabase.from('matches').select('*, team:teams(*), creator:profiles!created_by(*)').eq('id', id).single(),
      supabase.from('match_players').select('*, profile:profiles(*)').eq('match_id', id),
    ])
    if (matchRes.data) setMatch(matchRes.data as Match)
    if (playersRes.data) setPlayers(playersRes.data as MatchPlayer[])
    setLoading(false)
  }

  useEffect(() => { load() }, [id])

  async function updateMyStatus(status: PlayerMatchStatus) {
    if (!user || !id) return
    if (myPlayer) {
      await supabase.from('match_players').update({ status }).eq('match_id', id).eq('player_id', user.id)
    } else {
      await supabase.from('match_players').insert({ match_id: id, player_id: user.id, status })
    }
    load()
    toast.success(status === 'confirmed' ? '¡Confirmado! Te vemos en la cancha 🔥' : 'Respuesta guardada')
  }

  async function updateMatchStatus(status: string) {
    await supabase.from('matches').update({ status }).eq('id', id)
    load()
    toast.success('Estado del partido actualizado')
  }

  async function handleInvite(e: React.FormEvent) {
    e.preventDefault()
    if (!inviteUsername.trim()) return
    setInviting(true)
    const { data: found } = await supabase.from('profiles').select('id').eq('username', inviteUsername.trim()).single()
    if (!found) { toast.error('Jugador no encontrado'); setInviting(false); return }
    const alreadyIn = players.some(p => p.player_id === found.id)
    if (alreadyIn) { toast.error('Ya está en el partido'); setInviting(false); return }
    await supabase.from('match_players').insert({ match_id: id, player_id: found.id, status: 'pending' })
    toast.success('Jugador invitado')
    setInviteUsername('')
    setInviting(false)
    load()
  }

  if (loading) return <div className="flex items-center justify-center h-64 text-white/30 font-display animate-pulse">CARGANDO...</div>
  if (!match) return <div className="flex items-center justify-center h-64 text-white/30">Partido no encontrado</div>

  return (
    <div className="max-w-2xl mx-auto px-4 py-8">
      {/* Header */}
      <div className="card mb-5">
        <div className="flex items-start justify-between gap-3 mb-4">
          <div>
            <p className="text-white/30 text-xs font-mono mb-1">{match.team ? `${match.team.emoji} ${match.team.name}` : 'Partido libre'}</p>
            <h1 className="font-display text-3xl font-bold text-chalk">{match.title}</h1>
          </div>
          <span className={`text-xs font-mono border rounded px-2 py-1 shrink-0 ${
            match.status === 'scheduled'   ? 'text-pitch-400 border-pitch-800 bg-pitch-900' :
            match.status === 'in_progress' ? 'text-yellow-400 border-yellow-400/30 bg-yellow-400/10' :
            match.status === 'finished'    ? 'text-white/30 border-white/10 bg-white/5' :
                                             'text-red-400 border-red-400/20 bg-red-400/10'
          }`}>
            {match.status === 'scheduled' ? 'Programado' : match.status === 'in_progress' ? 'En curso' : match.status === 'finished' ? 'Finalizado' : 'Cancelado'}
          </span>
        </div>

        <div className="space-y-1.5 text-sm text-white/50">
          <div className="flex items-center gap-2"><Clock size={13} className="text-pitch-600" />
            {format(new Date(match.scheduled_at), "EEEE dd 'de' MMMM · HH:mm", { locale: es })} · {match.duration_minutes} min
          </div>
          <div className="flex items-center gap-2"><MapPin size={13} className="text-pitch-600" />{match.location}</div>
          <div className="flex items-center gap-2"><Users size={13} className="text-pitch-600" />{confirmed.length}/{match.max_players} confirmados</div>
        </div>

        {match.notes && <p className="mt-3 text-white/30 text-xs italic border-t border-white/5 pt-3">{match.notes}</p>}

        {/* Finished score */}
        {match.status === 'finished' && match.score_home !== null && (
          <div className="mt-4 text-center">
            <span className="font-display text-4xl font-bold text-pitch-400">{match.score_home} — {match.score_away}</span>
          </div>
        )}
      </div>

      {/* My RSVP */}
      {match.status !== 'finished' && match.status !== 'cancelled' && (
        <div className="card mb-5">
          <p className="label mb-3">¿Vas al partido?</p>
          <div className="flex gap-2">
            {(['confirmed', 'maybe', 'declined'] as PlayerMatchStatus[]).map(s => (
              <button
                key={s}
                onClick={() => updateMyStatus(s)}
                className={`flex-1 py-2 rounded border text-xs font-display tracking-wide uppercase transition-colors ${
                  myPlayer?.status === s
                    ? s === 'confirmed' ? 'border-pitch-500 bg-pitch-900 text-pitch-400'
                    : s === 'declined'  ? 'border-red-500 bg-red-900/20 text-red-400'
                    : 'border-yellow-500 bg-yellow-900/20 text-yellow-400'
                    : 'border-white/10 text-white/30 hover:border-white/20'
                }`}
              >
                {s === 'confirmed' ? '✓ Voy' : s === 'declined' ? '✗ No voy' : '? Quizás'}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Creator controls */}
      {isCreator && match.status !== 'finished' && match.status !== 'cancelled' && (
        <div className="card mb-5">
          <p className="label mb-3">Gestionar partido</p>
          <div className="flex gap-2 flex-wrap">
            {match.status === 'scheduled' && (
              <button onClick={() => updateMatchStatus('in_progress')} className="btn-primary text-xs flex items-center gap-2">
                ▶ Iniciar partido
              </button>
            )}
            {match.status === 'in_progress' && (
              <button onClick={() => navigate(`/matches/${id}/rate`)} className="btn-primary text-xs flex items-center gap-2">
                <Star size={12} /> Finalizar y puntuar
              </button>
            )}
            <button onClick={() => updateMatchStatus('cancelled')} className="text-xs border border-red-500/30 text-red-400 hover:bg-red-400/10 px-4 py-2 rounded transition-colors font-display uppercase tracking-wide">
              Cancelar partido
            </button>
          </div>
        </div>
      )}

      {/* Invite players */}
      {isCreator && match.status !== 'finished' && match.status !== 'cancelled' && (
        <div className="card mb-5">
          <p className="label">Invitar jugador</p>
          <form onSubmit={handleInvite} className="flex gap-2">
            <input className="input flex-1" value={inviteUsername} onChange={e => setInviteUsername(e.target.value)} placeholder="username" />
            <button type="submit" disabled={inviting} className="btn-primary flex items-center gap-2 whitespace-nowrap">
              <UserPlus size={14} /> {inviting ? '...' : 'Invitar'}
            </button>
          </form>
        </div>
      )}

      {/* Link to rate if finished */}
      {match.status === 'finished' && myPlayer && (
        <Link to={`/matches/${id}/rate`} className="card mb-5 flex items-center gap-3 hover:border-pitch-700 transition-colors group">
          <Star size={20} className="text-pitch-400" />
          <span className="font-display text-sm tracking-wide uppercase text-chalk group-hover:text-pitch-400 transition-colors">
            Ver puntuaciones del partido
          </span>
        </Link>
      )}

      {/* Players list */}
      <h2 className="section-title">Jugadores ({players.length})</h2>
      {[
        { list: confirmed, icon: CheckCircle, color: 'text-pitch-400', title: `Confirmados (${confirmed.length})` },
        { list: pending,   icon: HelpCircle,  color: 'text-yellow-400', title: `Sin responder (${pending.length})` },
        { list: declined,  icon: XCircle,     color: 'text-red-400',    title: `No van (${declined.length})` },
      ].map(({ list, icon: Icon, color, title }) => list.length > 0 && (
        <div key={title} className="mb-4">
          <div className={`flex items-center gap-2 text-xs font-display tracking-widest uppercase mb-2 ${color}`}>
            <Icon size={12} /> {title}
          </div>
          <div className="space-y-2">
            {list.map(mp => (
              <Link
                key={mp.player_id}
                to={mp.player_id === user?.id ? '/profile' : `/players/${mp.player_id}`}
                className="card flex items-center gap-3 hover:border-pitch-700 transition-colors group py-3"
              >
                {mp.profile?.avatar_url ? (
                  <img src={mp.profile.avatar_url} className="w-8 h-8 rounded-full object-cover border border-pitch-800" alt="" />
                ) : (
                  <div className="w-8 h-8 rounded-full bg-pitch-900 border border-pitch-800 flex items-center justify-center">
                    <UserCircle size={16} className="text-pitch-700" />
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <p className="text-chalk text-sm font-display group-hover:text-pitch-400 transition-colors">
                    {mp.profile?.full_name ?? mp.profile?.username}
                  </p>
                </div>
                {mp.is_mvp && <span className="badge text-yellow-400 border-yellow-400/30">⭐ MVP</span>}
                {mp.goals_scored > 0 && <span className="badge">⚽ {mp.goals_scored}</span>}
              </Link>
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}
