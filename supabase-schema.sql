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
