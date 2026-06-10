import { useEffect, useState, useRef } from 'react'
import { useParams, Link } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import { supabase } from '../lib/supabase'
import { Team, TeamMember } from '../types'
import { UserCircle, UserPlus, Crown, Pencil, Check, X, Trash2, Camera, Shield } from 'lucide-react'
import toast from 'react-hot-toast'

export default function TeamDetailPage() {
  const { id } = useParams<{ id: string }>()
  const { user } = useAuth()
  const fileRef = useRef<HTMLInputElement>(null)

  const [team, setTeam] = useState<Team & { image_url?: string } | null>(null)
  const [members, setMembers] = useState<TeamMember[]>([])
  const [loading, setLoading] = useState(true)
  const [inviteUsername, setInviteUsername] = useState('')
  const [inviting, setInviting] = useState(false)

  // Edit state
  const [editingName, setEditingName]   = useState(false)
  const [newName, setNewName]           = useState('')
  const [editingDesc, setEditingDesc]   = useState(false)
  const [newDesc, setNewDesc]           = useState('')
  const [savingField, setSavingField]   = useState<'name' | 'desc' | null>(null)
  const [uploadingImg, setUploadingImg] = useState(false)

  const myRole = members.find(m => m.player_id === user?.id)?.role
  const isCaptain = myRole === 'captain'

  async function load() {
    const [teamRes, membersRes] = await Promise.all([
      supabase.from('teams').select('*').eq('id', id).single(),
      supabase.from('team_members').select('*, profile:profiles(*)').eq('team_id', id),
    ])
    if (teamRes.data) {
      setTeam(teamRes.data)
      setNewName(teamRes.data.name)
      setNewDesc(teamRes.data.description ?? '')
    }
    if (membersRes.data) setMembers(membersRes.data as TeamMember[])
    setLoading(false)
  }

  useEffect(() => { load() }, [id])

  // ── Save name ──────────────────────────────────────────────
  async function handleSaveName() {
    if (!newName.trim()) return
    setSavingField('name')
    const { error } = await supabase.from('teams').update({ name: newName.trim() }).eq('id', id)
    setSavingField(null)
    if (error) { toast.error('Error al guardar'); return }
    toast.success('Nombre actualizado')
    setEditingName(false)
    load()
  }

  // ── Save description ───────────────────────────────────────
  async function handleSaveDesc() {
    setSavingField('desc')
    const { error } = await supabase.from('teams').update({ description: newDesc.trim() || null }).eq('id', id)
    setSavingField(null)
    if (error) { toast.error('Error al guardar'); return }
    toast.success('Descripción actualizada')
    setEditingDesc(false)
    load()
  }

  // ── Upload team image ──────────────────────────────────────
  async function handleImageChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file || !id) return
    if (file.size > 2 * 1024 * 1024) { toast.error('La imagen debe pesar menos de 2MB'); return }
    setUploadingImg(true)
    const ext = file.name.split('.').pop()
    const path = `${id}/cover.${ext}`
    const { error } = await supabase.storage.from('team-images').upload(path, file, { upsert: true })
    if (error) { toast.error('Error al subir imagen'); setUploadingImg(false); return }
    const { data } = supabase.storage.from('team-images').getPublicUrl(path)
    const url = data.publicUrl + '?t=' + Date.now()
    await supabase.from('teams').update({ image_url: url }).eq('id', id)
    setUploadingImg(false)
    toast.success('Imagen del equipo actualizada')
    load()
  }

  // ── Transfer captaincy ─────────────────────────────────────
  async function handleTransferCaptain(toId: string, toName: string) {
    if (!confirm(`¿Pasar la capitanía a ${toName}?`)) return
    const { error: e1 } = await supabase
      .from('team_members').update({ role: 'player' }).eq('team_id', id).eq('player_id', user!.id)
    const { error: e2 } = await supabase
      .from('team_members').update({ role: 'captain' }).eq('team_id', id).eq('player_id', toId)
    if (e1 || e2) { toast.error('Error al transferir capitanía'); return }
    toast.success(`${toName} ahora es el capitán ©`)
    load()
  }

  // ── Remove player ──────────────────────────────────────────
  async function handleRemovePlayer(playerId: string, username: string) {
    if (!confirm(`¿Eliminar a @${username} del equipo?`)) return
    const { error } = await supabase.from('team_members').delete().eq('team_id', id).eq('player_id', playerId)
    if (error) { toast.error('Error al eliminar jugador'); return }
    toast.success(`@${username} eliminado del equipo`)
    load()
  }

  // ── Invite ─────────────────────────────────────────────────
  async function handleInvite(e: React.FormEvent) {
    e.preventDefault()
    if (!inviteUsername.trim()) return
    setInviting(true)
    const { data: found } = await supabase.from('profiles').select('id').eq('username', inviteUsername.trim().toLowerCase()).single()
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

      {/* ── Header card ─────────────────────────────────────── */}
      <div className="card mb-6 overflow-hidden p-0">

        {/* Cover image */}
        <div className="relative h-28 bg-pitch-900 flex items-center justify-center overflow-hidden">
          {team.image_url ? (
            <img src={team.image_url} className="w-full h-full object-cover" alt="" />
          ) : (
            <span className="text-6xl opacity-20">{team.emoji}</span>
          )}
          {/* dark overlay */}
          <div className="absolute inset-0 bg-gradient-to-t from-grass/80 to-transparent" />

          {/* Upload button */}
          {isCaptain && (
            <button
              onClick={() => fileRef.current?.click()}
              disabled={uploadingImg}
              className="absolute top-3 right-3 flex items-center gap-1.5 bg-black/50 hover:bg-black/70 border border-white/20 text-white/70 hover:text-white text-xs font-display uppercase tracking-wide px-3 py-1.5 rounded transition-colors"
            >
              <Camera size={12} />
              {uploadingImg ? 'Subiendo...' : 'Cambiar foto'}
            </button>
          )}
          <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleImageChange} />
        </div>

        {/* Team info */}
        <div className="p-5">
          <div className="flex items-start gap-3">
            <span className="text-4xl -mt-1">{team.emoji}</span>
            <div className="flex-1 min-w-0">

              {/* Editable name */}
              {editingName ? (
                <div className="flex items-center gap-2 mb-1">
                  <input
                    className="input flex-1 font-display text-xl font-bold py-1"
                    value={newName}
                    onChange={e => setNewName(e.target.value)}
                    onKeyDown={e => { if (e.key === 'Enter') handleSaveName(); if (e.key === 'Escape') setEditingName(false) }}
                    autoFocus
                  />
                  <button onClick={handleSaveName} disabled={savingField === 'name'} className="text-pitch-400 hover:text-pitch-300 transition-colors shrink-0"><Check size={16} /></button>
                  <button onClick={() => { setEditingName(false); setNewName(team.name) }} className="text-white/30 hover:text-white transition-colors shrink-0"><X size={16} /></button>
                </div>
              ) : (
                <div className="flex items-center gap-2 group/name mb-1">
                  <h1 className="font-display text-2xl font-bold text-chalk">{team.name}</h1>
                  {isCaptain && (
                    <button onClick={() => setEditingName(true)} className="opacity-0 group-hover/name:opacity-100 text-white/30 hover:text-pitch-400 transition-all">
                      <Pencil size={13} />
                    </button>
                  )}
                </div>
              )}

              {/* Editable description */}
              {editingDesc ? (
                <div className="flex flex-col gap-2">
                  <textarea
                    className="input resize-none h-16 text-sm"
                    value={newDesc}
                    onChange={e => setNewDesc(e.target.value)}
                    placeholder="Descripción del equipo..."
                    maxLength={200}
                    autoFocus
                  />
                  <div className="flex gap-2">
                    <button onClick={handleSaveDesc} disabled={savingField === 'desc'} className="btn-primary text-xs py-1 px-3">
                      {savingField === 'desc' ? 'Guardando...' : 'Guardar'}
                    </button>
                    <button onClick={() => { setEditingDesc(false); setNewDesc(team.description ?? '') }} className="btn-ghost text-xs">
                      Cancelar
                    </button>
                  </div>
                </div>
              ) : (
                <div className="flex items-start gap-2 group/desc">
                  <p className="text-white/40 text-sm flex-1">
                    {team.description ?? (isCaptain ? <span className="italic text-white/20">Sin descripción — haz click para agregar</span> : '')}
                  </p>
                  {isCaptain && (
                    <button onClick={() => setEditingDesc(true)} className="opacity-0 group-hover/desc:opacity-100 text-white/30 hover:text-pitch-400 transition-all shrink-0 mt-0.5">
                      <Pencil size={13} />
                    </button>
                  )}
                </div>
              )}

            </div>
          </div>
          <p className="text-white/20 text-xs font-mono mt-3">{members.length} jugador{members.length !== 1 ? 'es' : ''}</p>
        </div>
      </div>

      {/* ── Invite ──────────────────────────────────────────── */}
      {isCaptain && (
        <div className="card mb-6">
          <p className="label">Agregar jugador por username</p>
          <form onSubmit={handleInvite} className="flex gap-2">
            <input className="input flex-1" value={inviteUsername} onChange={e => setInviteUsername(e.target.value)} placeholder="username del jugador" />
            <button type="submit" disabled={inviting} className="btn-primary flex items-center gap-2 whitespace-nowrap">
              <UserPlus size={14} /> {inviting ? '...' : 'Agregar'}
            </button>
          </form>
        </div>
      )}

      {/* ── Members ─────────────────────────────────────────── */}
      <h2 className="section-title">Jugadores</h2>
      <div className="space-y-2">
        {members.map(member => (
          <div key={member.player_id} className="card flex items-center gap-3 group py-3">
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

            {/* Actions (captain only, not on self) */}
            <div className="flex items-center gap-1.5 shrink-0">
              {member.role === 'captain' && <Crown size={14} className="text-yellow-400" />}

              {isCaptain && member.player_id !== user?.id && (
                <>
                  {/* Transfer captaincy */}
                  <button
                    onClick={() => handleTransferCaptain(member.player_id, member.profile?.full_name ?? member.profile?.username ?? '?')}
                    title="Pasar capitanía"
                    className="opacity-0 group-hover:opacity-100 text-white/20 hover:text-yellow-400 transition-all p-1 rounded"
                  >
                    <Shield size={14} />
                  </button>

                  {/* Remove */}
                  <button
                    onClick={() => handleRemovePlayer(member.player_id, member.profile?.username ?? '?')}
                    title="Eliminar del equipo"
                    className="opacity-0 group-hover:opacity-100 text-white/20 hover:text-red-400 transition-all p-1 rounded"
                  >
                    <Trash2 size={14} />
                  </button>
                </>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
