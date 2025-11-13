-- Add archived_at column to ctdp_todos table
alter table public.ctdp_todos
add column if not exists archived_at timestamptz;

-- Create index for archived todos queries
create index if not exists ctdp_todos_archived_at_idx 
on public.ctdp_todos (user_id, archived_at desc) 
where archived_at is not null;

