import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import { supabase } from '../lib/supabase'
import { Match, MatchPlayer } from '../types'
import { Star, UserCircle, Trophy } from 'lucide-react'
import toast from 'react-hot-toast'

export default function RatingsPage() {
  const { id } = useParams<{ id: string }>()
  const { user } = useAuth()
  const navigate = useNavigate()
  const [match, setMatch] = useState<Match | null>(null)
  const [players, setPlayers] = useState<MatchPlayer[]>([])
  const [ratings, setRatings] = useState<Record<string, number>>({})
  const [goals, setGoals] = useState<Record<string, number>>({})
  const [mvpId, setMvpId] = useState<string | null>(null)
  const [scoreHome, setScoreHome] = useState(0)
  const [scoreAway, setScoreAway] = useState(0)
  const [saving, setSaving] = useState(false)
  const [alreadyRated, setAlreadyRated] = useState(false)
  const isCreator = match?.created_by === user?.id

  useEffect(() => {
    if (!id || !user) return
    async function load() {
      const [matchRes, playersRes, ratedRes] = await Promise.all([
        supabase.from('matches').select('*').eq('id', id).single(),
        supabase.from('match_players').select('*, profile:profiles(*)').eq('match_id', id).eq('status', 'confirmed'),
        supabase.from('match_ratings').select('id').eq('match_id', id).eq('rater_id', user!.id).limit(1),
      ])
      if (matchRes.data) {
        setMatch(matchRes.data)
        setScoreHome(matchRes.data.score_home ?? 0)
        setScoreAway(matchRes.data.score_away ?? 0)
      }
      if (playersRes.data) setPlayers(playersRes.data as MatchPlayer[])
      if (ratedRes.data && ratedRes.data.length > 0) setAlreadyRated(true)
    }
    load()
  }, [id, user])

  async function handleSubmit() {
    if (!user || !id || !match) return
    setSaving(true)

    const otherPlayers = players.filter(p => p.player_id !== user.id)

    // Save ratings
    const ratingsToInsert = otherPlayers
      .filter(p => ratings[p.player_id] !== undefined)
      .map(p => ({ match_id: id, rater_id: user.id, rated_player_id: p.player_id, rating: ratings[p.player_id] }))

    if (ratingsToInsert.length > 0) {
      await supabase.from('match_ratings').upsert(ratingsToInsert, { onConflict: 'match_id,rater_id,rated_player_id' })
    }

    // If creator, save goals, MVP and score
    if (isCreator) {
      for (const p of players) {
        await supabase.from('match_players')
          .update({ goals_scored: goals[p.player_id] ?? 0, is_mvp: p.player_id === mvpId })
          .eq('match_id', id).eq('player_id', p.player_id)
      }
      await supabase.from('matches')
        .update({ status: 'finished', score_home: scoreHome, score_away: scoreAway })
        .eq('id', id)

      // Update player stats
      for (const p of players) {
        const playerRatings = await supabase
          .from('match_ratings')
          .select('rating')
          .eq('match_id', id)
          .eq('rated_player_id', p.player_id)

        const ratingValues = playerRatings.data?.map(r => r.rating) ?? []
        const avg = ratingValues.length > 0 ? ratingValues.reduce((a, b) => a + b, 0) / ratingValues.length : 0
        const isMvp = p.player_id === mvpId

        await supabase.rpc('update_player_stats', {
          p_player_id: p.player_id,
          p_goals: goals[p.player_id] ?? 0,
          p_is_mvp: isMvp,
          p_avg_rating: avg,
        })
      }
    }

    toast.success('¡Puntuaciones guardadas!')
    setSaving(false)
    navigate(`/matches/${id}`)
  }

  function StarRating({ playerId }: { playerId: string }) {
    const val = ratings[playerId] ?? 0
    return (
      <div className="flex gap-1">
        {[2, 4, 6, 8, 10].map(v => (
          <button
            key={v}
            onClick={() => setRatings(prev => ({ ...prev, [playerId]: v }))}
            className={`transition-colors ${v <= val ? 'text-yellow-400' : 'text-white/15 hover:text-yellow-400/50'}`}
          >
            <Star size={20} fill={v <= val ? 'currentColor' : 'none'} />
          </button>
        ))}
        {val > 0 && <span className="text-white/40 text-xs font-mono ml-1 self-center">{val}/10</span>}
      </div>
    )
  }

  if (!match) return <div className="flex items-center justify-center h-64 text-white/30 animate-pulse font-display">CARGANDO...</div>

  if (alreadyRated && !isCreator) return (
    <div className="max-w-lg mx-auto px-4 py-16 text-center">
      <Star size={48} className="text-yellow-400 mx-auto mb-4" />
      <h1 className="font-display text-2xl font-bold text-chalk mb-2">Ya puntuaste este partido</h1>
      <p className="text-white/40 text-sm mb-6">Tus votos ya fueron registrados.</p>
      <button onClick={() => navigate(`/matches/${id}`)} className="btn-primary">Ver partido</button>
    </div>
  )

  return (
    <div className="max-w-lg mx-auto px-4 py-8">
      <h1 className="section-title">Puntuar jugadores</h1>
      <p className="text-white/40 text-sm mb-6">{match.title}</p>

      {/* Score (creator only) */}
      {isCreator && (
        <div className="card mb-6">
          <p className="label mb-3">Resultado del partido</p>
          <div className="flex items-center gap-4 justify-center">
            <input type="number" min={0} max={99} value={scoreHome} onChange={e => setScoreHome(Number(e.target.value))}
              className="input w-20 text-center text-2xl font-display font-bold text-pitch-400" />
            <span className="font-display text-2xl text-white/30">—</span>
            <input type="number" min={0} max={99} value={scoreAway} onChange={e => setScoreAway(Number(e.target.value))}
              className="input w-20 text-center text-2xl font-display font-bold text-pitch-400" />
          </div>
        </div>
      )}

      {/* Players */}
      <div className="space-y-4 mb-6">
        {players.filter(p => p.player_id !== user?.id).map(mp => (
          <div key={mp.player_id} className="card">
            <div className="flex items-center gap-3 mb-3">
              {mp.profile?.avatar_url ? (
                <img src={mp.profile.avatar_url} className="w-9 h-9 rounded-full object-cover border border-pitch-800" alt="" />
              ) : (
                <div className="w-9 h-9 rounded-full bg-pitch-900 border border-pitch-800 flex items-center justify-center">
                  <UserCircle size={18} className="text-pitch-700" />
                </div>
              )}
              <div className="flex-1">
                <p className="text-chalk text-sm font-display">{mp.profile?.full_name ?? mp.profile?.username}</p>
              </div>
              {isCreator && (
                <button
                  onClick={() => setMvpId(prev => prev === mp.player_id ? null : mp.player_id)}
                  className={`flex items-center gap-1 text-xs border rounded px-2 py-1 transition-colors font-display ${
                    mvpId === mp.player_id ? 'border-yellow-400 text-yellow-400 bg-yellow-400/10' : 'border-white/10 text-white/30 hover:border-yellow-400/50'
                  }`}
                >
                  <Trophy size={11} /> MVP
                </button>
              )}
            </div>

            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="text-xs text-white/30 mb-1.5">Rating</p>
                <StarRating playerId={mp.player_id} />
              </div>
              {isCreator && (
                <div className="text-right">
                  <p className="text-xs text-white/30 mb-1.5">Goles</p>
                  <div className="flex items-center gap-2">
                    <button onClick={() => setGoals(g => ({ ...g, [mp.player_id]: Math.max(0, (g[mp.player_id] ?? 0) - 1) }))}
                      className="w-7 h-7 rounded bg-white/5 border border-white/10 text-white/50 hover:text-white flex items-center justify-center">−</button>
                    <span className="font-mono text-pitch-400 w-4 text-center">{goals[mp.player_id] ?? 0}</span>
                    <button onClick={() => setGoals(g => ({ ...g, [mp.player_id]: (g[mp.player_id] ?? 0) + 1 }))}
                      className="w-7 h-7 rounded bg-white/5 border border-white/10 text-white/50 hover:text-white flex items-center justify-center">+</button>
                  </div>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      <button onClick={handleSubmit} disabled={saving} className="btn-primary w-full">
        {saving ? 'Guardando...' : isCreator ? 'Finalizar partido y guardar' : 'Guardar puntuaciones'}
      </button>
    </div>
  )
}
