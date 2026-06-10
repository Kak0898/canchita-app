import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import { supabase } from '../lib/supabase'
import { Team } from '../types'
import toast from 'react-hot-toast'

export default function CreateMatchPage() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [teams, setTeams] = useState<Team[]>([])
  const [saving, setSaving] = useState(false)

  const [form, setForm] = useState({
    title: '',
    location: '',
    scheduled_at: '',
    duration_minutes: 90,
    max_players: 14,
    team_id: '',
    notes: '',
  })

  useEffect(() => {
    if (!user) return
    supabase
      .from('team_members')
      .select('team:teams(*)')
      .eq('player_id', user.id)
      .then(({ data }) => {
        if (data) setTeams(data.map((d: any) => d.team))
      })
  }, [user])

  function set(field: string, value: string | number) {
    setForm(prev => ({ ...prev, [field]: value }))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!user) return
    if (!form.title || !form.location || !form.scheduled_at) {
      toast.error('Completa los campos obligatorios')
      return
    }

    setSaving(true)
    const { data: match, error } = await supabase
      .from('matches')
      .insert({
        ...form,
        team_id: form.team_id || null,
        created_by: user.id,
        status: 'scheduled',
      })
      .select()
      .single()

    if (error || !match) { toast.error('Error al crear partido'); setSaving(false); return }

    // Creator auto-confirmed
    await supabase.from('match_players').insert({ match_id: match.id, player_id: user.id, status: 'confirmed' })

    toast.success('¡Partido creado!')
    navigate(`/matches/${match.id}`)
  }

  return (
    <div className="max-w-lg mx-auto px-4 py-8">
      <h1 className="section-title">Crear partido</h1>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="label">Título *</label>
          <input className="input" value={form.title} onChange={e => set('title', e.target.value)} placeholder="Partido del domingo" required />
        </div>

        <div>
          <label className="label">Lugar *</label>
          <input className="input" value={form.location} onChange={e => set('location', e.target.value)} placeholder="Cancha Los Leones, Providencia" required />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="label">Fecha y hora *</label>
            <input type="datetime-local" className="input" value={form.scheduled_at} onChange={e => set('scheduled_at', e.target.value)} required />
          </div>
          <div>
            <label className="label">Duración (min)</label>
            <input type="number" className="input" value={form.duration_minutes} onChange={e => set('duration_minutes', Number(e.target.value))} min={30} max={180} step={15} />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="label">Máx. jugadores</label>
            <input type="number" className="input" value={form.max_players} onChange={e => set('max_players', Number(e.target.value))} min={4} max={30} />
          </div>
          <div>
            <label className="label">Equipo (opcional)</label>
            <select className="input" value={form.team_id} onChange={e => set('team_id', e.target.value)}>
              <option value="">Sin equipo</option>
              {teams.map(t => <option key={t.id} value={t.id}>{t.emoji} {t.name}</option>)}
            </select>
          </div>
        </div>

        <div>
          <label className="label">Notas</label>
          <textarea
            className="input resize-none h-20"
            value={form.notes}
            onChange={e => set('notes', e.target.value)}
            placeholder="Llevar camiseta verde, $2000 por persona..."
          />
        </div>

        <div className="flex gap-3 pt-2">
          <button type="button" onClick={() => navigate('/matches')} className="btn-secondary flex-1">Cancelar</button>
          <button type="submit" disabled={saving} className="btn-primary flex-1">
            {saving ? 'Creando...' : 'Crear partido'}
          </button>
        </div>
      </form>
    </div>
  )
}
