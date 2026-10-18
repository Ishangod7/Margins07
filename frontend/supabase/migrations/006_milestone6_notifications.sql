-- =========================================================
-- MILESTONE 6: In-App Notifications & Alerts
-- =========================================================

create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  class_id uuid not null references public.classes(id) on delete cascade,
  actor_id uuid references public.profiles(id) on delete set null,
  type text not null check (type in ('notice_published', 'doubt_answered', 'answer_accepted', 'resource_uploaded')),
  title text not null,
  body text not null default '',
  link text not null default '/',
  is_read boolean not null default false,
  created_at timestamptz not null default now()
);

-- Enable RLS
alter table public.notifications enable row level security;

-- Drop any previous policies to avoid conflicts
drop policy if exists "Users can read own notifications" on public.notifications;
drop policy if exists "Users can update own notifications" on public.notifications;

-- Create policies for client-side access
create policy "Users can read own notifications"
  on public.notifications for select
  using (auth.uid() = user_id);

create policy "Users can update own notifications"
  on public.notifications for update
  using (auth.uid() = user_id);

-- Performance indexes
create index if not exists idx_notifications_user_read on public.notifications(user_id, is_read, created_at desc);
create index if not exists idx_notifications_class on public.notifications(class_id, created_at desc);
