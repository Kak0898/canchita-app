// import { useEffect, useState } from 'react'
// import { useParams, Link } from 'react-router-dom'
// import { useAuth } from '../hooks/useAuth'
// import { supabase } from '../lib/supabase'
// import { Team, TeamMember } from '../types'
// import { UserCircle, UserPlus, Crown } from 'lucide-react'
// import toast from 'react-hot-toast'

// export default function TeamDetailPage() {
//   const { id } = useParams<{ id: string }>()
//   const { user } = useAuth()
//   const [team, setTeam] = useState<Team | null>(null)
//   const [members, setMembers] = useState<TeamMember[]>([])
//   const [loading, setLoading] = useState(true)
//   const [inviteUsername, setInviteUsername] = useState('')
//   const [inviting, setInviting] = useState(false)

//   const myRole = members.find(m => m.player_id === user?.id)?.role

//   async function load() {
//     const [teamRes, membersRes] = await Promise.all([
//       supabase.from('teams').select('*').eq('id', id).single(),
//       supabase.from('team_members').select('*, profile:profiles(*)').eq('team_id', id),
//     ])
//     if (teamRes.data) setTeam(teamRes.data)
//     if (membersRes.data) setMembers(membersRes.data as TeamMember[])
//     setLoading(false)
//   }

//   useEffect(() => { load() }, [id])

//   async function handleInvite(e: React.FormEvent) {
//     e.preventDefault()
//     if (!inviteUsername.trim()) return
//     setInviting(true)

//     const { data: found } = await supabase
//       .from('profiles')
//       .select('id')
//       .eq('username', inviteUsername.trim().toLowerCase())
//       .single()

//     if (!found) { toast.error('Jugador no encontrado'); setInviting(false); return }

//     const alreadyIn = members.some(m => m.player_id === found.id)
//     if (alreadyIn) { toast.error('Ya está en el equipo'); setInviting(false); return }

//     const { error } = await supabase.from('team_members').insert({ team_id: id, player_id: found.id, role: 'player' })
//     if (error) { toast.error('Error al agregar jugador'); setInviting(false); return }

//     toast.success('¡Jugador agregado!')
//     setInviteUsername('')
//     setInviting(false)
//     load()
//   }

//   if (loading) return <div className="flex items-center justify-center h-64 text-white/30 font-display animate-pulse">CARGANDO...</div>
//   if (!team) return <div className="flex items-center justify-center h-64 text-white/30">Equipo no encontrado</div>

//   return (
//     <div className="max-w-2xl mx-auto px-4 py-8">
//       {/* Header */}
//       <div className="card mb-6">
//         <div className="flex items-center gap-4">
//           <span className="text-5xl">{team.emoji}</span>
//           <div>
//             <h1 className="font-display text-3xl font-bold text-chalk">{team.name}</h1>
//             {team.description && <p className="text-white/40 text-sm mt-1">{team.description}</p>}
//             <p className="text-white/20 text-xs mt-1 font-mono">{members.length} jugador{members.length !== 1 ? 'es' : ''}</p>
//           </div>
//         </div>
//       </div>

//       {/* Invite (captain only) */}
//       {myRole === 'captain' && (
//         <div className="card mb-6">
//           <p className="label">Agregar jugador por username</p>
//           <form onSubmit={handleInvite} className="flex gap-2">
//             <input
//               className="input flex-1"
//               value={inviteUsername}
//               onChange={e => setInviteUsername(e.target.value)}
//               placeholder="username del jugador"
//             />
//             <button type="submit" disabled={inviting} className="btn-primary flex items-center gap-2 whitespace-nowrap">
//               <UserPlus size={14} /> {inviting ? '...' : 'Agregar'}
//             </button>
//           </form>
//         </div>
//       )}

//       {/* Members */}
//       <h2 className="section-title">Jugadores</h2>
//       <div className="space-y-2">
//         {members.map(member => (
//           <Link
//             key={member.player_id}
//             to={member.player_id === user?.id ? '/profile' : `/players/${member.player_id}`}
//             className="card flex items-center gap-3 hover:border-pitch-700 transition-colors group"
//           >
//             {member.profile?.avatar_url ? (
//               <img src={member.profile.avatar_url} className="w-10 h-10 rounded-full object-cover border border-pitch-800" alt="" />
//             ) : (
//               <div className="w-10 h-10 rounded-full bg-pitch-900 border border-pitch-800 flex items-center justify-center">
//                 <UserCircle size={20} className="text-pitch-700" />
//               </div>
//             )}
//             <div className="flex-1 min-w-0">
//               <p className="text-chalk font-display text-sm group-hover:text-pitch-400 transition-colors">
//                 {member.profile?.full_name ?? member.profile?.username}
//               </p>
//               <p className="text-white/30 text-xs font-mono">@{member.profile?.username}</p>
//             </div>
//             {member.role === 'captain' && (
//               <Crown size={14} className="text-yellow-400 shrink-0" />
//             )}
//           </Link>
//         ))}
//       </div>
//     </div>
//   )
// }

import { useEffect, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import { supabase } from '../lib/supabase'
import { Team, TeamMember } from '../types'
import { UserCircle, UserPlus, Crown, Pencil, Check, X, Trash2 } from 'lucide-react'
import toast from 'react-hot-toast'

export default function TeamDetailPage() {
  const { id } = useParams<{ id: string }>()
  const { user } = useAuth()
  const [team, setTeam] = useState<Team | null>(null)
  const [members, setMembers] = useState<TeamMember[]>([])
  const [loading, setLoading] = useState(true)
  const [inviteUsername, setInviteUsername] = useState('')
  const [inviting, setInviting] = useState(false)

  // Edit team name state
  const [editingName, setEditingName] = useState(false)
  const [newName, setNewName] = useState('')
  const [savingName, setSavingName] = useState(false)

  const myRole = members.find(m => m.player_id === user?.id)?.role

  async function load() {
    const [teamRes, membersRes] = await Promise.all([
      supabase.from('teams').select('*').eq('id', id).single(),
      supabase.from('team_members').select('*, profile:profiles(*)').eq('team_id', id),
    ])
    if (teamRes.data) { setTeam(teamRes.data); setNewName(teamRes.data.name) }
    if (membersRes.data) setMembers(membersRes.data as TeamMember[])
    setLoading(false)
  }

  useEffect(() => { load() }, [id])

  async function handleSaveName() {
    if (!newName.trim() || !id) return
    setSavingName(true)
    const { error } = await supabase.from('teams').update({ name: newName.trim() }).eq('id', id)
    if (error) { toast.error('Error al guardar'); setSavingName(false); return }
    toast.success('Nombre actualizado')
    setSavingName(false)
    setEditingName(false)
    load()
  }

  async function handleRemovePlayer(playerId: string, username: string) {
    if (!confirm(`¿Eliminar a @${username} del equipo?`)) return
    const { error } = await supabase
      .from('team_members')
      .delete()
      .eq('team_id', id)
      .eq('player_id', playerId)
    if (error) { toast.error('Error al eliminar jugador'); return }
    toast.success(`@${username} eliminado del equipo`)
    load()
  }

  async function handleInvite(e: React.FormEvent) {
    e.preventDefault()
    if (!inviteUsername.trim()) return
    setInviting(true)

    const { data: found } = await supabase
      .from('profiles')
      .select('id')
      .eq('username', inviteUsername.trim().toLowerCase())
      .single()

    if (!found) { toast.error('Jugador no encontrado'); setInviting(false); return }

    const alreadyIn = members.some(m => m.player_id === found.id)
    if (alreadyIn) { toast.error('Ya está en el equipo'); setInviting(false); return }

    const { error } = await supabase.from('team_members').insert({ team_id: id, player_id: found.id, role: 'player' })
    if (error) { toast.error('Error al agregar jugador'); setInviting(false); return }

    toast.success('¡Jugador agregado!')
    setInviteUsername('')
    setInviting(false)
    load()
  }

  if (loading) return <div className="flex items-center justify-center h-64 text-white/30 font-display animate-pulse">CARGANDO...</div>
  if (!team) return <div className="flex items-center justify-center h-64 text-white/30">Equipo no encontrado</div>

  return (
    <div className="max-w-2xl mx-auto px-4 py-8">
      {/* Header */}
      <div className="card mb-6">
        <div className="flex items-center gap-4">
          <span className="text-5xl">{team.emoji}</span>
          <div className="flex-1 min-w-0">
            {/* Editable name */}
            {editingName ? (
              <div className="flex items-center gap-2">
                <input
                  className="input flex-1 font-display text-xl font-bold"
                  value={newName}
                  onChange={e => setNewName(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter') handleSaveName(); if (e.key === 'Escape') setEditingName(false) }}
                  autoFocus
                />
                <button onClick={handleSaveName} disabled={savingName} className="text-pitch-400 hover:text-pitch-300 transition-colors">
                  <Check size={18} />
                </button>
                <button onClick={() => { setEditingName(false); setNewName(team.name) }} className="text-white/30 hover:text-white transition-colors">
                  <X size={18} />
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-2 group/name">
                <h1 className="font-display text-3xl font-bold text-chalk">{team.name}</h1>
                {myRole === 'captain' && (
                  <button
                    onClick={() => setEditingName(true)}
                    className="opacity-0 group-hover/name:opacity-100 text-white/30 hover:text-pitch-400 transition-all"
                  >
                    <Pencil size={14} />
                  </button>
                )}
              </div>
            )}
            {team.description && <p className="text-white/40 text-sm mt-1">{team.description}</p>}
            <p className="text-white/20 text-xs mt-1 font-mono">{members.length} jugador{members.length !== 1 ? 'es' : ''}</p>
          </div>
        </div>
      </div>

      {/* Invite (captain only) */}
      {myRole === 'captain' && (
        <div className="card mb-6">
          <p className="label">Agregar jugador por username</p>
          <form onSubmit={handleInvite} className="flex gap-2">
            <input
              className="input flex-1"
              value={inviteUsername}
              onChange={e => setInviteUsername(e.target.value)}
              placeholder="username del jugador"
            />
            <button type="submit" disabled={inviting} className="btn-primary flex items-center gap-2 whitespace-nowrap">
              <UserPlus size={14} /> {inviting ? '...' : 'Agregar'}
            </button>
          </form>
        </div>
      )}

      {/* Members */}
      <h2 className="section-title">Jugadores</h2>
      <div className="space-y-2">
        {members.map(member => (
          <div key={member.player_id} className="card flex items-center gap-3 group">
            <Link
              to={member.player_id === user?.id ? '/profile' : `/players/${member.player_id}`}
              className="flex items-center gap-3 flex-1 min-w-0"
            >
              {member.profile?.avatar_url ? (
                <img src={member.profile.avatar_url} className="w-10 h-10 rounded-full object-cover border border-pitch-800" alt="" />
              ) : (
                <div className="w-10 h-10 rounded-full bg-pitch-900 border border-pitch-800 flex items-center justify-center">
                  <UserCircle size={20} className="text-pitch-700" />
                </div>
              )}
              <div className="flex-1 min-w-0">
                <p className="text-chalk font-display text-sm group-hover:text-pitch-400 transition-colors">
                  {member.profile?.full_name ?? member.profile?.username}
                </p>
                <p className="text-white/30 text-xs font-mono">@{member.profile?.username}</p>
              </div>
            </Link>

            <div className="flex items-center gap-2 shrink-0">
              {member.role === 'captain' && <Crown size={14} className="text-yellow-400" />}
              {/* Remove button: captain can remove anyone except themselves, players can leave */}
              {myRole === 'captain' && member.player_id !== user?.id && (
                <button
                  onClick={() => handleRemovePlayer(member.player_id, member.profile?.username ?? '?')}
                  className="opacity-0 group-hover:opacity-100 text-white/20 hover:text-red-400 transition-all"
                  title="Eliminar del equipo"
                >
                  <Trash2 size={14} />
                </button>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
