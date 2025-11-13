create extension if not exists "pgcrypto";

create table if not exists public.ctdp_todos (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  title text not null,
  tag text not null default '突击单元',
  energy text not null default '主战',
  focus_minutes integer not null default 45,
  created_at timestamptz not null default now()
);

alter table public.ctdp_todos enable row level security;

create policy "Users can read their todos"
  on public.ctdp_todos
  for select
  using (auth.uid() = user_id);

create policy "Users can manage their todos"
  on public.ctdp_todos
  for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create table if not exists public.ctdp_subtasks (
  id uuid primary key default gen_random_uuid(),
  todo_id uuid not null references public.ctdp_todos (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  label text not null,
  done boolean not null default false,
  created_at timestamptz not null default now()
);

alter table public.ctdp_subtasks enable row level security;

create policy "Users can read their subtasks"
  on public.ctdp_subtasks
  for select
  using (auth.uid() = user_id);

create policy "Users can manage their subtasks"
  on public.ctdp_subtasks
  for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create table if not exists public.ctdp_focus_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  todo_id uuid references public.ctdp_todos (id) on delete set null,
  todo_title text not null,
  wait_seconds integer not null,
  focus_seconds integer not null,
  note text,
  created_at timestamptz not null default now()
);

alter table public.ctdp_focus_sessions enable row level security;

create policy "Users can read their focus sessions"
  on public.ctdp_focus_sessions
  for select
  using (auth.uid() = user_id);

create policy "Users can manage their focus sessions"
  on public.ctdp_focus_sessions
  for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create index if not exists ctdp_todos_user_id_idx on public.ctdp_todos (user_id, created_at desc);
create index if not exists ctdp_subtasks_todo_id_idx on public.ctdp_subtasks (todo_id);
create index if not exists ctdp_focus_sessions_user_id_idx on public.ctdp_focus_sessions (user_id, created_at desc);
