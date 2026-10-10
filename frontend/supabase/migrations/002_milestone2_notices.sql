-- =========================================================
-- MILESTONE 2: notices + RLS
-- =========================================================

create table if not exists public.notices (
  id uuid primary key default gen_random_uuid(),
  class_id uuid not null references public.classes(id) on delete cascade,

  title text not null,
  content text not null,
  category text not null default 'General'
    check (category in ('Academic','Deadline','Exam','Assignment','General','Important')),

  is_pinned boolean not null default false,

  attachment_path text,

  created_by uuid not null references auth.users(id),
  updated_by uuid references auth.users(id),

  published_at timestamptz not null default now(),
  expires_at timestamptz,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_notices_class_pinned on public.notices (class_id, is_pinned desc, published_at desc);

alter table public.notices enable row level security;

-- Everyone in the class can read notices for that class
drop policy if exists "members can view class notices" on public.notices;
create policy "members can view class notices"
  on public.notices for select
  to authenticated
  using (
    class_id in (
      select class_id from public.class_memberships
      where user_id = auth.uid() and status = 'active'
    )
  );

-- Only CRs can insert, and only for a class they belong to
drop policy if exists "cr can create notices" on public.notices;
create policy "cr can create notices"
  on public.notices for insert
  to authenticated
  with check (
    created_by = auth.uid()
    and exists (
      select 1 from public.profiles p
      join public.class_memberships cm on cm.user_id = p.id
      where p.id = auth.uid()
        and p.role = 'cr'
        and cm.class_id = notices.class_id
        and cm.status = 'active'
    )
  );

-- Only CRs can update/pin, and only within their own class
drop policy if exists "cr can update notices" on public.notices;
create policy "cr can update notices"
  on public.notices for update
  to authenticated
  using (
    exists (
      select 1 from public.profiles p
      join public.class_memberships cm on cm.user_id = p.id
      where p.id = auth.uid()
        and p.role = 'cr'
        and cm.class_id = notices.class_id
        and cm.status = 'active'
    )
  )
  with check (
    exists (
      select 1 from public.profiles p
      join public.class_memberships cm on cm.user_id = p.id
      where p.id = auth.uid()
        and p.role = 'cr'
        and cm.class_id = notices.class_id
        and cm.status = 'active'
    )
  );

-- Only CRs can delete, same scoping
drop policy if exists "cr can delete notices" on public.notices;
create policy "cr can delete notices"
  on public.notices for delete
  to authenticated
  using (
    exists (
      select 1 from public.profiles p
      join public.class_memberships cm on cm.user_id = p.id
      where p.id = auth.uid()
        and p.role = 'cr'
        and cm.class_id = notices.class_id
        and cm.status = 'active'
    )
  );

drop trigger if exists trg_notices_updated_at on public.notices;
create trigger trg_notices_updated_at
  before update on public.notices
  for each row execute function public.set_updated_at();
