export interface Profile {
  id: string
  username: string
  full_name: string | null
  avatar_url: string | null
  description: string | null
  created_at: string
}

export interface PlayerStats {
  player_id: string
  matches_played: number
  goals: number
  mvp_count: number
  avg_rating: number
  updated_at: string
}

export interface Team {
  id: string
  name: string
  emoji: string
  description: string | null
  created_by: string
  created_at: string
  member_count?: number
}

export interface TeamMember {
  team_id: string
  player_id: string
  role: 'player' | 'captain'
  joined_at: string
  profile?: Profile
  team?: Team
}

export type MatchStatus = 'scheduled' | 'in_progress' | 'finished' | 'cancelled'
export type PlayerMatchStatus = 'pending' | 'confirmed' | 'declined' | 'maybe'

export interface Match {
  id: string
  title: string
  location: string
  scheduled_at: string
  duration_minutes: number
  max_players: number
  status: MatchStatus
  team_id: string | null
  created_by: string
  score_home: number | null
  score_away: number | null
  notes: string | null
  created_at: string
  team?: Team
  creator?: Profile
  match_players?: MatchPlayer[]
}

export interface MatchPlayer {
  match_id: string
  player_id: string
  status: PlayerMatchStatus
  goals_scored: number
  is_mvp: boolean
  profile?: Profile
}

export interface MatchRating {
  id: string
  match_id: string
  rater_id: string
  rated_player_id: string
  rating: number
  created_at: string
}

export interface ProfileWithStats extends Profile {
  player_stats: PlayerStats | null
  teams?: TeamMember[]
}
