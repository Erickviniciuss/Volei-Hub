-- Execute este script no SQL Editor do projeto Supabase.

-- Tabela de Histórico de Resultados
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

-- Otimização RLS: O uso de (select auth.uid()) avalia a função 1 vez por consulta em vez de 1 vez por linha analisada.
create policy "Users can read their own game results"
  on public.game_results for select
  to authenticated
  using ((select auth.uid()) = user_id);

create policy "Users can create their own game results"
  on public.game_results for insert
  to authenticated
  with check ((select auth.uid()) = user_id);

create policy "Users can update their own game results"
  on public.game_results for update
  to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

create policy "Users can delete their own game results"
  on public.game_results for delete
  to authenticated
  using ((select auth.uid()) = user_id);

-- Índices de desempenho para game_results
create index if not exists idx_game_results_user_id on public.game_results (user_id);
create index if not exists idx_game_results_finished_at on public.game_results (finished_at desc);

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
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

create policy "Anyone can view active live games"
  on public.live_games for select
  to anon, authenticated
  using (is_active = true);

-- Índices de desempenho para live_games
create index if not exists idx_live_games_user_id on public.live_games (user_id);
create index if not exists idx_live_games_share_code_active on public.live_games (share_code) where is_active = true;

-- Trigger para atualizar automaticamente o campo updated_at no banco
create or replace function public.handle_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists set_live_games_updated_at on public.live_games;
create trigger set_live_games_updated_at
  before update on public.live_games
  for each row
  execute function public.handle_updated_at();

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
