import { useState } from 'react'
import { useAuth } from '../../hooks/useAuth'
import { supabase } from '../../lib/supabase'
import toast from 'react-hot-toast'
import { X } from 'lucide-react'

const EMOJIS = ['⚽','🏆','🔥','💪','⚡','🦁','🐯','🦅','🌟','🏅','🎯','🤝']

interface Props { onClose: () => void; onCreated: () => void }

export default function CreateTeamModal({ onClose, onCreated }: Props) {
  const { user } = useAuth()
  const [name, setName] = useState('')
  const [emoji, setEmoji] = useState('⚽')
  const [description, setDescription] = useState('')
  const [saving, setSaving] = useState(false)

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault()
    if (!user || !name.trim()) return
    setSaving(true)

    const { data: team, error } = await supabase
      .from('teams')
      .insert({ name: name.trim(), emoji, description, created_by: user.id })
      .select()
      .single()

    if (error || !team) { toast.error('Error al crear equipo'); setSaving(false); return }

    await supabase.from('team_members').insert({ team_id: team.id, player_id: user.id, role: 'captain' })

    toast.success('¡Equipo creado!')
    setSaving(false)
    onCreated()
    onClose()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-4">
      <div className="bg-grass border border-white/10 rounded-2xl w-full max-w-md p-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="font-display text-xl font-bold text-chalk tracking-wide uppercase">Nuevo Equipo</h2>
          <button onClick={onClose} className="text-white/30 hover:text-white transition-colors"><X size={20} /></button>
        </div>

        <form onSubmit={handleCreate} className="space-y-4">
          <div>
            <label className="label">Ícono del equipo</label>
            <div className="flex flex-wrap gap-2">
              {EMOJIS.map(e => (
                <button
                  key={e}
                  type="button"
                  onClick={() => setEmoji(e)}
                  className={`text-2xl w-10 h-10 rounded-lg border transition-colors ${emoji === e ? 'border-pitch-500 bg-pitch-900' : 'border-white/10 hover:border-white/30'}`}
                >
                  {e}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="label">Nombre del equipo *</label>
            <input className="input" value={name} onChange={e => setName(e.target.value)} placeholder="Los Cracks FC" required />
          </div>

          <div>
            <label className="label">Descripción</label>
            <input className="input" value={description} onChange={e => setDescription(e.target.value)} placeholder="Barrio, ciudad, estilo..." />
          </div>

          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose} className="btn-secondary flex-1">Cancelar</button>
            <button type="submit" disabled={saving} className="btn-primary flex-1">
              {saving ? 'Creando...' : 'Crear equipo'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
