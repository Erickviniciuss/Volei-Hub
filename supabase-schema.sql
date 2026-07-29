-- Execute este script no SQL Editor do projeto Supabase.
create table if not exists public.game_results (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade default auth.uid(),
  local_id text not null,
  finished_at timestamptz not null default now(),
  game_data jsonb not null,
  created_at timestamptz not null default now(),
  unique (user_id, local_id)
);

alter table public.game_results enable row level security;

drop policy if exists "Users can read their own game results" on public.game_results;
drop policy if exists "Users can create their own game results" on public.game_results;
drop policy if exists "Users can update their own game results" on public.game_results;
drop policy if exists "Users can delete their own game results" on public.game_results;

create policy "Users can read their own game results"
  on public.game_results for select
  to authenticated
  using (auth.uid() = user_id);

create policy "Users can create their own game results"
  on public.game_results for insert
  to authenticated
  with check (auth.uid() = user_id);

create policy "Users can update their own game results"
  on public.game_results for update
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "Users can delete their own game results"
  on public.game_results for delete
  to authenticated
  using (auth.uid() = user_id);

-- Partidas em andamento compartilhadas por código de acompanhamento.
create table if not exists public.live_games (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade default auth.uid(),
  share_code text not null unique,
  game_data jsonb not null,
  is_active boolean not null default true,
  updated_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

alter table public.live_games enable row level security;

drop policy if exists "Owners manage their live games" on public.live_games;
drop policy if exists "Anyone can view active live games" on public.live_games;

create policy "Owners manage their live games"
  on public.live_games for all
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "Anyone can view active live games"
  on public.live_games for select
  to anon, authenticated
  using (is_active = true);

grant select on public.live_games to anon, authenticated;
grant insert, update, delete on public.live_games to authenticated;
alter table public.live_games replica identity full;

-- Necessário para a atualização imediata dos espectadores.
do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'live_games'
  ) then
    alter publication supabase_realtime add table public.live_games;
  end if;
end $$;
