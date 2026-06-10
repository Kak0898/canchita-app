import { useState, useRef, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import { supabase } from '../lib/supabase'
import toast from 'react-hot-toast'
import { Camera, UserCircle } from 'lucide-react'

export default function EditProfilePage() {
  const { user, profile, refreshProfile } = useAuth()
  const navigate = useNavigate()
  const fileRef = useRef<HTMLInputElement>(null)

  const [fullName, setFullName]     = useState(profile?.full_name ?? '')
  const [username, setUsername]     = useState(profile?.username ?? '')
  const [description, setDescription] = useState(profile?.description ?? '')
  const [avatarUrl, setAvatarUrl]   = useState(profile?.avatar_url ?? '')
  const [uploading, setUploading]   = useState(false)
  const [saving, setSaving]         = useState(false)

  useEffect(() => {
    if (profile) {
      setFullName(profile.full_name ?? '')
      setUsername(profile.username ?? '')
      setDescription(profile.description ?? '')
      setAvatarUrl(profile.avatar_url ?? '')
    }
  }, [profile])

  async function handleAvatarChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file || !user) return
    if (file.size > 2 * 1024 * 1024) { toast.error('La imagen debe pesar menos de 2MB'); return }

    setUploading(true)
    const ext = file.name.split('.').pop()
    const path = `${user.id}/avatar.${ext}`

    const { error } = await supabase.storage.from('avatars').upload(path, file, { upsert: true })
    if (error) { toast.error('Error al subir imagen'); setUploading(false); return }

    const { data } = supabase.storage.from('avatars').getPublicUrl(path)
    setAvatarUrl(data.publicUrl + '?t=' + Date.now())
    setUploading(false)
    toast.success('Foto actualizada')
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    if (!user) return
    if (!username.trim()) { toast.error('El username es obligatorio'); return }

    setSaving(true)
    const { error } = await supabase
      .from('profiles')
      .update({ full_name: fullName, username: username.trim(), description, avatar_url: avatarUrl })
      .eq('id', user.id)

    setSaving(false)
    if (error) {
      if (error.code === '23505') toast.error('Ese username ya está en uso')
      else toast.error('Error al guardar')
      return
    }
    await refreshProfile()
    toast.success('Perfil actualizado')
    navigate('/profile')
  }

  return (
    <div className="max-w-lg mx-auto px-4 py-8">
      <h1 className="section-title">Editar perfil</h1>

      <form onSubmit={handleSave} className="space-y-5">
        {/* Avatar */}
        <div className="flex flex-col items-center gap-3 py-4">
          <div className="relative cursor-pointer group" onClick={() => fileRef.current?.click()}>
            {avatarUrl ? (
              <img src={avatarUrl} className="w-24 h-24 rounded-full object-cover border-2 border-pitch-700 group-hover:border-pitch-500 transition-colors" alt="" />
            ) : (
              <div className="w-24 h-24 rounded-full bg-pitch-900 border-2 border-pitch-700 group-hover:border-pitch-500 flex items-center justify-center transition-colors">
                <UserCircle size={40} className="text-pitch-600" />
              </div>
            )}
            <div className="absolute bottom-0 right-0 w-7 h-7 bg-pitch-600 rounded-full flex items-center justify-center border-2 border-turf">
              {uploading ? <span className="text-white text-xs animate-spin">↻</span> : <Camera size={12} className="text-white" />}
            </div>
          </div>
          <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleAvatarChange} />
          <p className="text-white/30 text-xs">JPG o PNG · Máx 2MB</p>
        </div>

        {/* Fields */}
        <div>
          <label className="label">Nombre completo</label>
          <input className="input" value={fullName} onChange={e => setFullName(e.target.value)} placeholder="Tu nombre" />
        </div>

        <div>
          <label className="label">Username *</label>
          <input
            className="input"
            value={username}
            onChange={e => setUsername(e.target.value.toLowerCase().replace(/\s/g, ''))}
            placeholder="messi10"
            required
          />
        </div>

        <div>
          <label className="label">Descripción</label>
          <textarea
            className="input resize-none h-24"
            value={description}
            onChange={e => setDescription(e.target.value)}
            placeholder="Posición, estilo de juego, número favorito..."
            maxLength={200}
          />
          <p className="text-right text-white/20 text-xs mt-1">{description.length}/200</p>
        </div>

        <div className="flex gap-3 pt-2">
          <button type="button" onClick={() => navigate('/profile')} className="btn-secondary flex-1">
            Cancelar
          </button>
          <button type="submit" disabled={saving} className="btn-primary flex-1">
            {saving ? 'Guardando...' : 'Guardar cambios'}
          </button>
        </div>
      </form>
    </div>
  )
}
