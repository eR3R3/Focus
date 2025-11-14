-- Add total_seconds column to ctdp_subtasks table
alter table public.ctdp_subtasks
add column total_seconds integer not null default 0;

-- Create table to track subtask time per session
create table if not exists public.ctdp_subtask_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  subtask_id uuid not null references public.ctdp_subtasks (id) on delete cascade,
  session_id uuid not null references public.ctdp_focus_sessions (id) on delete cascade,
  seconds integer not null,
  created_at timestamptz not null default now()
);

alter table public.ctdp_subtask_sessions enable row level security;

create policy "Users can read their subtask sessions"
  on public.ctdp_subtask_sessions
  for select
  using (auth.uid() = user_id);

create policy "Users can manage their subtask sessions"
  on public.ctdp_subtask_sessions
  for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create index if not exists ctdp_subtask_sessions_subtask_id_idx on public.ctdp_subtask_sessions (subtask_id);
create index if not exists ctdp_subtask_sessions_session_id_idx on public.ctdp_subtask_sessions (session_id);

