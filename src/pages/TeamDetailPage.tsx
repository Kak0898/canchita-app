import { useEffect, useState, useRef } from 'react'
import { useParams, Link } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import { supabase } from '../lib/supabase'
import { Team, TeamMember, Profile } from '../types'
import { UserCircle, UserPlus, Crown, Pencil, Check, X, Trash2, Camera, Shield } from 'lucide-react'
import toast from 'react-hot-toast'

const EMOJIS = ['⚽','🏆','🔥','💪','⚡','🦁','🐯','🦅','🌟','🏅','🎯','🤝']

export default function TeamDetailPage() {
  const { id } = useParams<{ id: string }>()
  const { user } = useAuth()
  const fileRef = useRef<HTMLInputElement>(null)
  const logoRef = useRef<HTMLInputElement>(null)

  const [team, setTeam] = useState<Team & { image_url?: string } | null>(null)
  const [members, setMembers] = useState<TeamMember[]>([])
  const [loading, setLoading] = useState(true)

  // Edit state
  const [editingName, setEditingName]     = useState(false)
  const [newName, setNewName]             = useState('')
  const [editingDesc, setEditingDesc]     = useState(false)
  const [newDesc, setNewDesc]             = useState('')
  const [editingEmoji, setEditingEmoji]   = useState(false)
  const [savingField, setSavingField]     = useState<'name'|'desc'|'emoji'|null>(null)
  const [uploadingImg, setUploadingImg]   = useState(false)
  const [uploadingLogo, setUploadingLogo]   = useState(false)

  // Invite + suggestions
  const [inviteUsername, setInviteUsername] = useState('')
  const [inviting, setInviting]             = useState(false)
  const [suggestions, setSuggestions]       = useState<Profile[]>([])
  const [showSuggestions, setShowSuggestions] = useState(false)
  const [loadingSuggestions, setLoadingSuggestions] = useState(false)
  const suggestRef = useRef<HTMLDivElement>(null)

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

  // Close suggestions on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (suggestRef.current && !suggestRef.current.contains(e.target as Node)) {
        setShowSuggestions(false)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  // ── Suggestions search ─────────────────────────────────────
  useEffect(() => {
    if (inviteUsername.trim().length < 2) { setSuggestions([]); setShowSuggestions(false); return }
    const timer = setTimeout(async () => {
      setLoadingSuggestions(true)
      const term = inviteUsername.trim()
      const [byUsername, byName] = await Promise.all([
        supabase.from('profiles').select('id, username, full_name, avatar_url')
          .ilike('username', `%${term}%`).neq('id', user!.id).limit(6),
        supabase.from('profiles').select('id, username, full_name, avatar_url')
          .ilike('full_name', `%${term}%`).neq('id', user!.id).limit(6),
      ])
      // Merge and deduplicate
      const merged: Profile[] = []
      const seen = new Set<string>()
      for (const p of [...(byUsername.data ?? []), ...(byName.data ?? [])]) {
        if (!seen.has(p.id)) { seen.add(p.id); merged.push(p as Profile) }
      }
      const alreadyIn = new Set(members.map(m => m.player_id))
      const filtered = merged.filter(p => !alreadyIn.has(p.id)).slice(0, 6)
      setSuggestions(filtered)
      setShowSuggestions(filtered.length > 0)
      setLoadingSuggestions(false)
    }, 300)
    return () => clearTimeout(timer)
  }, [inviteUsername, members])

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

  // ── Save emoji ─────────────────────────────────────────────
  async function handleSaveEmoji(emoji: string) {
    setSavingField('emoji')
    const { error } = await supabase.from('teams').update({ emoji }).eq('id', id)
    setSavingField(null)
    if (error) { toast.error('Error al guardar'); return }
    toast.success('Ícono actualizado')
    setEditingEmoji(false)
    load()
  }

  // ── Upload team image ──────────────────────────────────────
  async function handleImageChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file || !id) return
    if (file.size > 2 * 1024 * 1024) { toast.error('Máx 2MB'); return }
    setUploadingImg(true)
    const ext = file.name.split('.').pop()
    const path = `${id}/cover.${ext}`
    const { error } = await supabase.storage.from('team-images').upload(path, file, { upsert: true })
    if (error) { toast.error('Error al subir imagen'); setUploadingImg(false); return }
    const { data } = supabase.storage.from('team-images').getPublicUrl(path)
    await supabase.from('teams').update({ image_url: data.publicUrl + '?t=' + Date.now() }).eq('id', id)
    setUploadingImg(false)
    toast.success('Imagen actualizada')
    load()
  }

  // ── Upload team logo (small icon) ─────────────────────────
  async function handleLogoChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file || !id) return
    if (file.size > 2 * 1024 * 1024) { toast.error('Máx 2MB'); return }
    setUploadingLogo(true)
    const ext = file.name.split('.').pop()
    const path = `${id}/logo.${ext}`
    const { error } = await supabase.storage.from('team-images').upload(path, file, { upsert: true })
    if (error) { toast.error('Error al subir logo'); setUploadingLogo(false); return }
    const { data } = supabase.storage.from('team-images').getPublicUrl(path)
    await supabase.from('teams').update({ logo_url: data.publicUrl + '?t=' + Date.now() }).eq('id', id)
    setUploadingLogo(false)
    toast.success('Logo actualizado')
    load()
  }

  // ── Transfer captaincy ─────────────────────────────────────
  async function handleTransferCaptain(toId: string, toName: string) {
    if (!confirm(`¿Pasar la capitanía a ${toName}?`)) return
    // First promote new captain, then demote current
    const { error: e1 } = await supabase
      .from('team_members').update({ role: 'captain' }).eq('team_id', id).eq('player_id', toId)
    const { error: e2 } = await supabase
      .from('team_members').update({ role: 'player' }).eq('team_id', id).eq('player_id', user!.id)
    if (e1 || e2) { toast.error('Error al transferir — revisa el SQL de la policy'); return }
    toast.success(`${toName} ahora es el capitán ©`)
    load()
  }

  // ── Remove player ──────────────────────────────────────────
  async function handleRemovePlayer(playerId: string, username: string) {
    if (!confirm(`¿Eliminar a @${username} del equipo?`)) return
    const { error } = await supabase.from('team_members').delete().eq('team_id', id).eq('player_id', playerId)
    if (error) { toast.error('Error al eliminar jugador'); return }
    toast.success(`@${username} eliminado`)
    load()
  }

  // ── Invite by selecting suggestion or submitting form ──────
  async function invitePlayer(playerId: string, label: string) {
    setInviting(true)
    setShowSuggestions(false)
    const alreadyIn = members.some(m => m.player_id === playerId)
    if (alreadyIn) { toast.error('Ya está en el equipo'); setInviting(false); return }
    const { error } = await supabase.from('team_members').insert({ team_id: id, player_id: playerId, role: 'player' })
    if (error) { toast.error('Error al agregar jugador'); setInviting(false); return }
    toast.success(`¡${label} agregado!`)
    setInviteUsername('')
    setSuggestions([])
    setInviting(false)
    load()
  }

  async function handleInviteSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!inviteUsername.trim()) return
    // If there's an exact match in suggestions, use it
    const exact = suggestions.find(s => s.username === inviteUsername.trim().toLowerCase())
    if (exact) { invitePlayer(exact.id, exact.full_name ?? exact.username); return }
    // Otherwise search
    setInviting(true)
    const { data: found } = await supabase.from('profiles').select('id, full_name, username').eq('username', inviteUsername.trim().toLowerCase()).single()
    setInviting(false)
    if (!found) { toast.error('Jugador no encontrado'); return }
    invitePlayer(found.id, found.full_name ?? found.username)
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
            <span className="text-7xl opacity-10">{team.emoji}</span>
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-grass/90 to-transparent" />
          {isCaptain && (
            <button
              onClick={() => fileRef.current?.click()}
              disabled={uploadingImg}
              className="absolute top-3 right-3 flex items-center gap-1.5 bg-black/50 hover:bg-black/70 border border-white/20 text-white/70 hover:text-white text-xs font-display uppercase tracking-wide px-3 py-1.5 rounded transition-colors"
            >
              <Camera size={12} />
              {uploadingImg ? 'Subiendo...' : 'Portada'}
            </button>
          )}
          <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleImageChange} />
        </div>

        {/* Team info */}
        <div className="p-5">
          <div className="flex items-start gap-3">

            {/* Logo / Emoji — clickable for captain */}
            <div className="shrink-0 relative">
              {/* The logo button itself */}
              {isCaptain ? (
                <button
                  onClick={() => setEditingEmoji(!editingEmoji)}
                  className="w-14 h-14 rounded-xl bg-pitch-900 border border-pitch-700 hover:border-pitch-500 flex items-center justify-center transition-colors overflow-hidden group/logo"
                  title="Cambiar logo"
                >
                  {(team as any).logo_url ? (
                    <img src={(team as any).logo_url} className="w-full h-full object-cover" alt="" />
                  ) : (
                    <span className="text-4xl">{team.emoji}</span>
                  )}
                </button>
              ) : (
                <div className="w-14 h-14 rounded-xl bg-pitch-900 border border-pitch-800 flex items-center justify-center overflow-hidden">
                  {(team as any).logo_url ? (
                    <img src={(team as any).logo_url} className="w-full h-full object-cover" alt="" />
                  ) : (
                    <span className="text-4xl">{team.emoji}</span>
                  )}
                </div>
              )}

              {/* Picker dropdown */}
              {editingEmoji && (
                <div className="absolute top-16 left-0 z-20 bg-grass border border-white/10 rounded-xl p-3 shadow-xl w-56">
                  {/* Upload image option */}
                  <button
                    onClick={() => { logoRef.current?.click(); setEditingEmoji(false) }}
                    disabled={uploadingLogo}
                    className="w-full flex items-center gap-2 text-xs font-display tracking-wide uppercase text-pitch-400 hover:text-pitch-300 border border-pitch-800 hover:border-pitch-600 rounded-lg px-3 py-2 mb-3 transition-colors"
                  >
                    <Camera size={13} />
                    {uploadingLogo ? 'Subiendo...' : 'Subir imagen (JPG/PNG)'}
                  </button>
                  {/* Emoji grid */}
                  <p className="text-white/20 text-xs font-display uppercase tracking-widest mb-2">O elige un emoji</p>
                  <div className="grid grid-cols-6 gap-1.5">
                    {EMOJIS.map(e => (
                      <button
                        key={e}
                        onClick={() => handleSaveEmoji(e)}
                        disabled={savingField === 'emoji'}
                        className={`text-xl w-8 h-8 rounded-lg hover:bg-pitch-900 transition-colors flex items-center justify-center ${team.emoji === e ? 'bg-pitch-900 border border-pitch-600' : ''}`}
                      >
                        {e}
                      </button>
                    ))}
                  </div>
                  <button onClick={() => setEditingEmoji(false)} className="w-full text-white/20 hover:text-white text-xs font-display uppercase tracking-wide mt-2 transition-colors">
                    Cerrar
                  </button>
                </div>
              )}

              {/* Hidden logo file input */}
              <input ref={logoRef} type="file" accept="image/*" className="hidden" onChange={handleLogoChange} />
            </div>

            <div className="flex-1 min-w-0">
              {/* Editable name */}
              {editingName ? (
                <div className="flex items-center gap-2 mb-1">
                  <input className="input flex-1 font-display text-xl font-bold py-1" value={newName}
                    onChange={e => setNewName(e.target.value)}
                    onKeyDown={e => { if (e.key === 'Enter') handleSaveName(); if (e.key === 'Escape') setEditingName(false) }}
                    autoFocus />
                  <button onClick={handleSaveName} disabled={savingField === 'name'} className="text-pitch-400 hover:text-pitch-300 transition-colors shrink-0"><Check size={16} /></button>
                  <button onClick={() => { setEditingName(false); setNewName(team.name) }} className="text-white/30 hover:text-white transition-colors shrink-0"><X size={16} /></button>
                </div>
              ) : (
                <div className="flex items-center gap-2 group/name mb-1">
                  <h1 className="font-display text-2xl font-bold text-chalk">{team.name}</h1>
                  {isCaptain && (
                    <button onClick={() => setEditingName(true)} className="opacity-0 group-hover/name:opacity-100 text-white/30 hover:text-pitch-400 transition-all"><Pencil size={13} /></button>
                  )}
                </div>
              )}

              {/* Editable description */}
              {editingDesc ? (
                <div className="flex flex-col gap-2">
                  <textarea className="input resize-none h-16 text-sm" value={newDesc}
                    onChange={e => setNewDesc(e.target.value)}
                    placeholder="Descripción del equipo..." maxLength={200} autoFocus />
                  <div className="flex gap-2">
                    <button onClick={handleSaveDesc} disabled={savingField === 'desc'} className="btn-primary text-xs py-1 px-3">
                      {savingField === 'desc' ? 'Guardando...' : 'Guardar'}
                    </button>
                    <button onClick={() => { setEditingDesc(false); setNewDesc(team.description ?? '') }} className="btn-ghost text-xs">Cancelar</button>
                  </div>
                </div>
              ) : (
                <div className="flex items-start gap-2 group/desc">
                  <p className="text-white/40 text-sm flex-1 italic">
                    {team.description ?? (isCaptain ? <span className="text-white/20">Sin descripción · click para agregar</span> : '')}
                  </p>
                  {isCaptain && (
                    <button onClick={() => setEditingDesc(true)} className="opacity-0 group-hover/desc:opacity-100 text-white/30 hover:text-pitch-400 transition-all shrink-0 mt-0.5"><Pencil size={13} /></button>
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
          <p className="label">Agregar jugador</p>
          <div className="relative" ref={suggestRef}>
            <form onSubmit={handleInviteSubmit} className="flex gap-2">
              <div className="relative flex-1">
                <input
                  className="input w-full"
                  value={inviteUsername}
                  onChange={e => { setInviteUsername(e.target.value); setShowSuggestions(true) }}
                  onFocus={() => suggestions.length > 0 && setShowSuggestions(true)}
                  placeholder="Escribe el username..."
                  autoComplete="off"
                />
                {loadingSuggestions && (
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-white/20 text-xs animate-pulse">buscando...</span>
                )}
              </div>
              <button type="submit" disabled={inviting} className="btn-primary flex items-center gap-2 whitespace-nowrap">
                <UserPlus size={14} /> {inviting ? '...' : 'Agregar'}
              </button>
            </form>

            {/* Suggestions dropdown */}
            {showSuggestions && suggestions.length > 0 && (
              <div className="absolute top-full left-0 right-0 mt-1 z-30 bg-grass border border-white/10 rounded-xl overflow-hidden shadow-xl">
                {suggestions.map((s, i) => (
                  <button
                    key={s.id}
                    onMouseDown={e => { e.preventDefault(); invitePlayer(s.id, s.full_name ?? s.username) }}
                    className={`w-full flex items-center gap-3 px-4 py-2.5 hover:bg-pitch-900 transition-colors text-left ${i > 0 ? 'border-t border-white/5' : ''}`}
                  >
                    {s.avatar_url ? (
                      <img src={s.avatar_url} className="w-8 h-8 rounded-full object-cover border border-pitch-800 shrink-0" alt="" />
                    ) : (
                      <div className="w-8 h-8 rounded-full bg-pitch-900 border border-pitch-800 flex items-center justify-center shrink-0">
                        <UserCircle size={16} className="text-pitch-700" />
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="text-chalk text-sm font-display truncate">{s.full_name ?? s.username}</p>
                      <p className="text-white/30 text-xs font-mono">@{s.username}</p>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── Members ─────────────────────────────────────────── */}
      <h2 className="section-title">Jugadores</h2>
      <div className="space-y-2">
        {members.map(member => (
          <div key={member.player_id} className="card flex items-center gap-3 group py-3">
            <Link to={member.player_id === user?.id ? '/profile' : `/players/${member.player_id}`} className="flex items-center gap-3 flex-1 min-w-0">
              {member.profile?.avatar_url ? (
                <img src={member.profile.avatar_url} className="w-10 h-10 rounded-full object-cover border border-pitch-800" alt="" />
              ) : (
                <div className="w-10 h-10 rounded-full bg-pitch-900 border border-pitch-800 flex items-center justify-center">
                  <UserCircle size={20} className="text-pitch-700" />
                </div>
              )}
              <div className="flex-1 min-w-0">
                <p className="text-chalk font-display text-sm group-hover:text-pitch-400 transition-colors">{member.profile?.full_name ?? member.profile?.username}</p>
                <p className="text-white/30 text-xs font-mono">@{member.profile?.username}</p>
              </div>
            </Link>

            <div className="flex items-center gap-1.5 shrink-0">
              {member.role === 'captain' && <Crown size={14} className="text-yellow-400" />}
              {isCaptain && member.player_id !== user?.id && (
                <>
                  <button
                    onClick={() => handleTransferCaptain(member.player_id, member.profile?.full_name ?? member.profile?.username ?? '?')}
                    title="Pasar capitanía"
                    className="opacity-0 group-hover:opacity-100 text-white/20 hover:text-yellow-400 transition-all p-1 rounded"
                  >
                    <Shield size={14} />
                  </button>
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
