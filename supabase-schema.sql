-- ============================================================
-- CANCHITA — Schema completo para Supabase
-- Ejecutar en: Supabase Dashboard → SQL Editor → New Query
-- ============================================================

-- 1. PROFILES (extiende auth.users)
-- ============================================================
create table if not exists profiles (
  id          uuid references auth.users(id) on delete cascade primary key,
  username    text unique not null,
  full_name   text,
  avatar_url  text,
  description text,
  created_at  timestamptz default now()
);

-- 2. TEAMS
-- ============================================================
create table if not exists teams (
  id          uuid default gen_random_uuid() primary key,
  name        text not null,
  emoji       text default '⚽',
  description text,
  created_by  uuid references profiles(id) on delete set null,
  created_at  timestamptz default now()
);

-- 3. TEAM MEMBERS (jugador ↔ equipos, muchos a muchos)
-- ============================================================
create table if not exists team_members (
  team_id   uuid references teams(id) on delete cascade,
  player_id uuid references profiles(id) on delete cascade,
  role      text default 'player' check (role in ('player','captain')),
  joined_at timestamptz default now(),
  primary key (team_id, player_id)
);

-- 4. PLAYER STATS (agregadas)
-- ============================================================
create table if not exists player_stats (
  player_id      uuid references profiles(id) on delete cascade primary key,
  matches_played int     default 0,
  goals          int     default 0,
  mvp_count      int     default 0,
  avg_rating     numeric(4,1) default 0,
  updated_at     timestamptz default now()
);

-- 5. MATCHES
-- ============================================================
create table if not exists matches (
  id               uuid default gen_random_uuid() primary key,
  title            text not null,
  location         text not null,
  scheduled_at     timestamptz not null,
  duration_minutes int  default 90,
  max_players      int  default 14,
  status           text default 'scheduled' check (status in ('scheduled','in_progress','finished','cancelled')),
  team_id          uuid references teams(id) on delete set null,
  created_by       uuid references profiles(id) on delete set null,
  score_home       int,
  score_away       int,
  notes            text,
  created_at       timestamptz default now()
);

-- 6. MATCH PLAYERS (jugadores invitados/confirmados por partido)
-- ============================================================
create table if not exists match_players (
  match_id     uuid references matches(id) on delete cascade,
  player_id    uuid references profiles(id) on delete cascade,
  status       text default 'pending' check (status in ('pending','confirmed','declined','maybe')),
  goals_scored int  default 0,
  is_mvp       boolean default false,
  primary key (match_id, player_id)
);

-- 7. MATCH RATINGS (quién le dio qué nota a quién)
-- ============================================================
create table if not exists match_ratings (
  id              uuid default gen_random_uuid() primary key,
  match_id        uuid references matches(id) on delete cascade,
  rater_id        uuid references profiles(id) on delete cascade,
  rated_player_id uuid references profiles(id) on delete cascade,
  rating          int  check (rating between 1 and 10),
  created_at      timestamptz default now(),
  unique (match_id, rater_id, rated_player_id)
);

-- ============================================================
-- TRIGGER: crear perfil + stats automáticamente al registrarse
-- ============================================================
create or replace function handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, username, full_name)
  values (
    new.id,
    split_part(new.email, '@', 1) || '_' || substr(new.id::text, 1, 4),
    coalesce(new.raw_user_meta_data->>'full_name', split_part(new.email, '@', 1))
  )
  on conflict (id) do nothing;

  insert into public.player_stats (player_id)
  values (new.id)
  on conflict (player_id) do nothing;

  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure handle_new_user();

-- ============================================================
-- RPC: actualizar stats del jugador post-partido
-- ============================================================
create or replace function update_player_stats(
  p_player_id  uuid,
  p_goals      int,
  p_is_mvp     boolean,
  p_avg_rating numeric
)
returns void as $$
declare
  current_stats player_stats%rowtype;
  current_count int;
  new_avg       numeric;
begin
  select * into current_stats from player_stats where player_id = p_player_id;

  -- Calcular nuevo promedio ponderado
  current_count := current_stats.matches_played;
  if current_count = 0 or p_avg_rating = 0 then
    new_avg := p_avg_rating;
  else
    new_avg := round(
      ((current_stats.avg_rating * current_count) + p_avg_rating) / (current_count + 1),
      1
    );
  end if;

  update player_stats set
    matches_played = matches_played + 1,
    goals          = goals + p_goals,
    mvp_count      = mvp_count + (case when p_is_mvp then 1 else 0 end),
    avg_rating     = new_avg,
    updated_at     = now()
  where player_id = p_player_id;
end;
$$ language plpgsql security definer;

-- ============================================================
-- ROW LEVEL SECURITY
-- ============================================================

-- Profiles: públicos para leer, solo tú editas el tuyo
alter table profiles     enable row level security;
alter table player_stats enable row level security;
alter table teams        enable row level security;
alter table team_members enable row level security;
alter table matches      enable row level security;
alter table match_players enable row level security;
alter table match_ratings enable row level security;

-- PROFILES
create policy "Perfiles visibles" on profiles for select using (true);
create policy "Crea tu perfil"    on profiles for insert with check (auth.uid() = id);
create policy "Edita tu perfil"   on profiles for update using (auth.uid() = id);

-- PLAYER STATS
create policy "Stats visibles"   on player_stats for select using (true);
create policy "Sistema actualiza stats" on player_stats for all using (true);

-- TEAMS
create policy "Equipos visibles"  on teams for select using (true);
create policy "Autenticado crea"  on teams for insert with check (auth.uid() is not null);
create policy "Creador edita"     on teams for update using (auth.uid() = created_by);
create policy "Creador elimina"   on teams for delete using (auth.uid() = created_by);

-- TEAM MEMBERS
create policy "Miembros visibles" on team_members for select using (true);
create policy "Únete o capitán invita" on team_members for insert with check (
  auth.uid() = player_id or
  exists (select 1 from team_members tm where tm.team_id = team_id and tm.player_id = auth.uid() and tm.role = 'captain')
);
create policy "Capitán elimina miembros" on team_members for delete using (
  auth.uid() = player_id or
  exists (select 1 from team_members tm where tm.team_id = team_id and tm.player_id = auth.uid() and tm.role = 'captain')
);

-- MATCHES
create policy "Partidos visibles"   on matches for select using (true);
create policy "Autenticado crea partido" on matches for insert with check (auth.uid() is not null);
create policy "Creador edita partido"    on matches for update using (auth.uid() = created_by);

-- MATCH PLAYERS
create policy "Jugadores visibles" on match_players for select using (true);
create policy "Inscribirse o ser invitado" on match_players for insert with check (
  auth.uid() = player_id or
  exists (select 1 from matches m where m.id = match_id and m.created_by = auth.uid())
);
create policy "Actualiza tu estado" on match_players for update using (
  auth.uid() = player_id or
  exists (select 1 from matches m where m.id = match_id and m.created_by = auth.uid())
);

-- MATCH RATINGS
create policy "Ratings visibles"   on match_ratings for select using (true);
create policy "Ratea una vez por partido" on match_ratings for insert with check (auth.uid() = rater_id);
create policy "Actualiza tu rating" on match_ratings for update using (auth.uid() = rater_id);

-- ============================================================
-- STORAGE: bucket para fotos de perfil
-- ============================================================
-- Ejecutar también esto (si el bucket no existe aún):

insert into storage.buckets (id, name, public)
values ('avatars', 'avatars', true)
on conflict (id) do nothing;

create policy "Avatars públicos" on storage.objects
  for select using (bucket_id = 'avatars');

create policy "Sube tu propio avatar" on storage.objects
  for insert with check (
    bucket_id = 'avatars'
    and auth.uid() is not null
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "Actualiza tu avatar" on storage.objects
  for update using (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "Elimina tu avatar" on storage.objects
  for delete using (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = auth.uid()::text
  );
