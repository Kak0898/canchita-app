import { useEffect, useState } from 'react'
import { useParams, Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import { supabase } from '../lib/supabase'
import { Match, MatchPlayer, PlayerMatchStatus, Profile, Team } from '../types'
import { MapPin, Clock, Users, Star, CheckCircle, XCircle, HelpCircle, UserPlus, UserCircle } from 'lucide-react'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'
import toast from 'react-hot-toast'

interface TeamWithMembers extends Team {
  members: (Profile & { role: string })[]
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

  // Quick invite
  const [myTeams, setMyTeams] = useState<TeamWithMembers[]>([])
  const [selectedTeamId, setSelectedTeamId] = useState<string>('all')
  const [invitingId, setInvitingId] = useState<string | null>(null)

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

  async function loadMyTeams() {
    if (!user) return
    // Get all my teams
    const { data: myMemberships } = await supabase
      .from('team_members')
      .select('team_id, role, team:teams(id, name, emoji)')
      .eq('player_id', user.id)
    if (!myMemberships || myMemberships.length === 0) return

    const teamIds = myMemberships.map((d: any) => d.team_id)

    // Get all members of those teams (excluding myself)
    const { data: allMembers } = await supabase
      .from('team_members')
      .select('team_id, player_id, role, profile:profiles(id, username, full_name, avatar_url)')
      .in('team_id', teamIds)
      .neq('player_id', user.id)

    // Build teams map
    const teamsMap: Record<string, TeamWithMembers> = {}
    for (const m of myMemberships as any[]) {
      teamsMap[m.team_id] = { ...m.team, members: [] }
    }
    for (const m of (allMembers ?? []) as any[]) {
      if (teamsMap[m.team_id]) {
        const already = teamsMap[m.team_id].members.find((x: any) => x.id === m.profile.id)
        if (!already) teamsMap[m.team_id].members.push({ ...m.profile, role: m.role })
      }
    }
    setMyTeams(Object.values(teamsMap))
  }

  useEffect(() => { load() }, [id])
  useEffect(() => { if (isCreator) loadMyTeams() }, [isCreator, id])

  // All unique contacts across teams
  const allContacts: (Profile & { role: string })[] = []
  const seen = new Set<string>()
  for (const team of myTeams) {
    for (const m of team.members) {
      if (!seen.has(m.id)) { seen.add(m.id); allContacts.push(m) }
    }
  }

  const quickList = selectedTeamId === 'all' ? allContacts : (myTeams.find(t => t.id === selectedTeamId)?.members ?? [])
  const quickListFiltered = quickList.filter(p => !players.some(mp => mp.player_id === p.id))

  async function handleQuickInvite(playerId: string, name: string) {
    setInvitingId(playerId)
    await supabase.from('match_players').insert({ match_id: id, player_id: playerId, status: 'pending' })
    toast.success(`${name} invitado 🔥`)
    setInvitingId(null)
    load()
  }

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
          <p className="label mb-3">Invitar jugadores</p>

          {/* Quick invite from teams */}
          {myTeams.length > 0 && (
            <div className="mb-4">
              {/* Team filter tabs */}
              <div className="flex gap-1.5 flex-wrap mb-3">
                <button
                  onClick={() => setSelectedTeamId('all')}
                  className={`text-xs font-display tracking-wide uppercase px-3 py-1 rounded border transition-colors ${
                    selectedTeamId === 'all'
                      ? 'border-pitch-600 bg-pitch-900 text-pitch-400'
                      : 'border-white/10 text-white/30 hover:border-white/20'
                  }`}
                >
                  Todos mis equipos
                </button>
                {myTeams.map(team => (
                  <button
                    key={team.id}
                    onClick={() => setSelectedTeamId(team.id)}
                    className={`text-xs font-display tracking-wide uppercase px-3 py-1 rounded border transition-colors ${
                      selectedTeamId === team.id
                        ? 'border-pitch-600 bg-pitch-900 text-pitch-400'
                        : 'border-white/10 text-white/30 hover:border-white/20'
                    }`}
                  >
                    {team.emoji} {team.name}
                  </button>
                ))}
              </div>

              {/* Player chips */}
              {quickListFiltered.length === 0 ? (
                <p className="text-white/20 text-xs py-2">Todos los jugadores de este equipo ya están invitados</p>
              ) : (
                <div className="flex flex-wrap gap-2">
                  {quickListFiltered.map(p => (
                    <button
                      key={p.id}
                      onClick={() => handleQuickInvite(p.id, p.full_name ?? p.username)}
                      disabled={invitingId === p.id}
                      className="flex items-center gap-2 bg-white/5 border border-white/10 hover:border-pitch-600 hover:bg-pitch-900/50 rounded-full pl-1 pr-3 py-1 transition-colors group/chip disabled:opacity-40"
                    >
                      {p.avatar_url ? (
                        <img src={p.avatar_url} className="w-6 h-6 rounded-full object-cover" alt="" />
                      ) : (
                        <div className="w-6 h-6 rounded-full bg-pitch-900 flex items-center justify-center">
                          <UserCircle size={14} className="text-pitch-700" />
                        </div>
                      )}
                      <span className="text-xs text-white/60 group-hover/chip:text-chalk transition-colors">
                        {invitingId === p.id ? '...' : (p.full_name ?? p.username)}
                      </span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Manual invite by username */}
          <div className="border-t border-white/5 pt-3">
            <p className="text-white/30 text-xs mb-2">O buscar por username</p>
            <form onSubmit={handleInvite} className="flex gap-2">
              <input className="input flex-1" value={inviteUsername} onChange={e => setInviteUsername(e.target.value)} placeholder="username del jugador" />
              <button type="submit" disabled={inviting} className="btn-primary flex items-center gap-2 whitespace-nowrap">
                <UserPlus size={14} /> {inviting ? '...' : 'Invitar'}
              </button>
            </form>
          </div>
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
