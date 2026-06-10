import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import { supabase } from '../lib/supabase'
import { Team } from '../types'
import { Plus, Users, ChevronRight } from 'lucide-react'
import CreateTeamModal from '../components/teams/CreateTeamModal'

type TeamWithExtra = Team & { role: string; image_url?: string; logo_url?: string }

export default function TeamsPage() {
  const { user } = useAuth()
  const [teams, setTeams] = useState<TeamWithExtra[]>([])
  const [loading, setLoading] = useState(true)
  const [showCreate, setShowCreate] = useState(false)

  async function loadTeams() {
    if (!user) return
    const { data } = await supabase
      .from('team_members')
      .select('role, team:teams(*)')
      .eq('player_id', user.id)
      .order('joined_at', { ascending: false })

    if (data) {
      setTeams(data.map((d: any) => ({ ...d.team, role: d.role })))
    }
    setLoading(false)
  }

  useEffect(() => { loadTeams() }, [user])

  return (
    <div className="max-w-2xl mx-auto px-4 py-8">
      <div className="flex items-center justify-between mb-6">
        <h1 className="section-title mb-0">Mis Equipos</h1>
        <button onClick={() => setShowCreate(true)} className="btn-primary flex items-center gap-2 text-xs">
          <Plus size={14} /> Crear equipo
        </button>
      </div>

      {loading ? (
        <div className="card text-center text-white/30 text-sm py-10">Cargando...</div>
      ) : teams.length === 0 ? (
        <div className="card text-center py-12">
          <Users size={40} className="text-white/10 mx-auto mb-3" />
          <p className="text-white/40 text-sm mb-4">Aún no perteneces a ningún equipo</p>
          <button onClick={() => setShowCreate(true)} className="btn-primary inline-flex items-center gap-2">
            <Plus size={14} /> Crear equipo
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {teams.map(team => (
            <Link key={team.id} to={`/teams/${team.id}`} className="card flex items-center gap-4 hover:border-pitch-700 transition-colors group">
              {/* Logo o emoji */}
              {team.logo_url ? (
                <img src={team.logo_url} className="w-10 h-10 rounded-lg object-cover border border-pitch-800 shrink-0" alt="" />
              ) : team.image_url ? (
                <img src={team.image_url} className="w-10 h-10 rounded-lg object-cover border border-pitch-800 shrink-0" alt="" />
              ) : (
                <span className="text-3xl shrink-0">{team.emoji}</span>
              )}
              <div className="flex-1 min-w-0">
                <p className="font-display font-semibold text-chalk group-hover:text-pitch-400 transition-colors">{team.name}</p>
                {team.description && <p className="text-white/40 text-xs mt-0.5 truncate">{team.description}</p>}
              </div>
              <div className="flex items-center gap-2 shrink-0">
                {team.role === 'captain' && <span className="badge">Capitán ©</span>}
                <ChevronRight size={16} className="text-white/20 group-hover:text-pitch-400 transition-colors" />
              </div>
            </Link>
          ))}
        </div>
      )}

      {showCreate && <CreateTeamModal onClose={() => setShowCreate(false)} onCreated={loadTeams} />}
    </div>
  )
}
