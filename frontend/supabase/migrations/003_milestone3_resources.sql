-- =========================================================
-- MILESTONE 3: Resource Shelf (Subjects, Resources, Saves, Requests)
-- =========================================================

-- 1. Subjects table
create table if not exists public.subjects (
  id uuid primary key default gen_random_uuid(),
  class_id uuid not null references public.classes(id) on delete cascade,
  name text not null,
  code text,
  semester text default 'Sem 6',
  created_at timestamptz not null default now(),
  unique (class_id, name)
);

create index if not exists idx_subjects_class on public.subjects(class_id);

-- 2. Resources table
create table if not exists public.resources (
  id uuid primary key default gen_random_uuid(),
  class_id uuid not null references public.classes(id) on delete cascade,
  subject_id uuid references public.subjects(id) on delete set null,

  title text not null,
  description text,
  kind text not null default 'notes'
    check (kind in ('notes', 'pyq', 'slides', 'book', 'link', 'assignment', 'other')),

  file_path text,
  external_url text,
  file_name text,
  file_size bigint,
  mime_type text,
  unit text,
  tags text[] default '{}',

  download_count int not null default 0,
  save_count int not null default 0,

  created_by uuid not null references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_resources_class_subject on public.resources(class_id, subject_id, created_at desc);
create index if not exists idx_resources_class_kind on public.resources(class_id, kind);
create index if not exists idx_resources_popularity on public.resources(class_id, save_count desc, download_count desc);
create index if not exists idx_resources_fts on public.resources using gin(to_tsvector('english', title || ' ' || coalesce(description, '')));

-- 3. Resource saves (Bookmarks)
create table if not exists public.resource_saves (
  id uuid primary key default gen_random_uuid(),
  resource_id uuid not null references public.resources(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (resource_id, user_id)
);

create index if not exists idx_resource_saves_user on public.resource_saves(user_id);

-- 4. Resource requests
create table if not exists public.resource_requests (
  id uuid primary key default gen_random_uuid(),
  class_id uuid not null references public.classes(id) on delete cascade,
  subject_id uuid references public.subjects(id) on delete set null,
  title text not null,
  description text,
  status text not null default 'open' check (status in ('open', 'fulfilled', 'closed')),
  fulfilled_resource_id uuid references public.resources(id) on delete set null,
  created_by uuid not null references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_resource_requests_class on public.resource_requests(class_id, status);

-- 5. Private Storage Bucket for Resources
insert into storage.buckets (id, name, public)
values ('resources', 'resources', false)
on conflict (id) do nothing;

-- 6. RLS Policies
alter table public.subjects enable row level security;
alter table public.resources enable row level security;
alter table public.resource_saves enable row level security;
alter table public.resource_requests enable row level security;

-- Subjects RLS
drop policy if exists "members can view subjects" on public.subjects;
create policy "members can view subjects"
  on public.subjects for select
  to authenticated
  using (
    class_id in (
      select class_id from public.class_memberships
      where user_id = auth.uid() and status = 'active'
    )
  );

drop policy if exists "cr or member can create subjects" on public.subjects;
create policy "cr or member can create subjects"
  on public.subjects for insert
  to authenticated
  with check (
    class_id in (
      select class_id from public.class_memberships
      where user_id = auth.uid() and status = 'active'
    )
  );

-- Resources RLS
drop policy if exists "members can view class resources" on public.resources;
create policy "members can view class resources"
  on public.resources for select
  to authenticated
  using (
    class_id in (
      select class_id from public.class_memberships
      where user_id = auth.uid() and status = 'active'
    )
  );

drop policy if exists "members can insert class resources" on public.resources;
create policy "members can insert class resources"
  on public.resources for insert
  to authenticated
  with check (
    created_by = auth.uid()
    and class_id in (
      select class_id from public.class_memberships
      where user_id = auth.uid() and status = 'active'
    )
  );

drop policy if exists "uploader or cr can update resources" on public.resources;
create policy "uploader or cr can update resources"
  on public.resources for update
  to authenticated
  using (
    created_by = auth.uid()
    or exists (
      select 1 from public.profiles p
      join public.class_memberships cm on cm.user_id = p.id
      where p.id = auth.uid()
        and p.role = 'cr'
        and cm.class_id = resources.class_id
        and cm.status = 'active'
    )
  );

drop policy if exists "uploader or cr can delete resources" on public.resources;
create policy "uploader or cr can delete resources"
  on public.resources for delete
  to authenticated
  using (
    created_by = auth.uid()
    or exists (
      select 1 from public.profiles p
      join public.class_memberships cm on cm.user_id = p.id
      where p.id = auth.uid()
        and p.role = 'cr'
        and cm.class_id = resources.class_id
        and cm.status = 'active'
    )
  );

-- Resource Saves RLS
drop policy if exists "users can view their own saves" on public.resource_saves;
create policy "users can view their own saves"
  on public.resource_saves for select
  to authenticated
  using (user_id = auth.uid());

drop policy if exists "users can save resources" on public.resource_saves;
create policy "users can save resources"
  on public.resource_saves for insert
  to authenticated
  with check (user_id = auth.uid());

drop policy if exists "users can delete their saves" on public.resource_saves;
create policy "users can delete their saves"
  on public.resource_saves for delete
  to authenticated
  using (user_id = auth.uid());

-- Resource Requests RLS
drop policy if exists "members can view resource requests" on public.resource_requests;
create policy "members can view resource requests"
  on public.resource_requests for select
  to authenticated
  using (
    class_id in (
      select class_id from public.class_memberships
      where user_id = auth.uid() and status = 'active'
    )
  );

drop policy if exists "members can insert resource requests" on public.resource_requests;
create policy "members can insert resource requests"
  on public.resource_requests for insert
  to authenticated
  with check (
    created_by = auth.uid()
    and class_id in (
      select class_id from public.class_memberships
      where user_id = auth.uid() and status = 'active'
    )
  );

-- Seed subjects for all existing classes
insert into public.subjects (class_id, name, code, semester)
select c.id, s.name, s.code, 'Sem 6'
from public.classes c
cross join (values
  ('Computer Networks', 'CN'),
  ('Database Management Systems', 'DBMS'),
  ('Machine Learning', 'ML'),
  ('Operating Systems', 'OS'),
  ('Web Computing & Dev', 'WCD'),
  ('Applied Mathematics', 'AM-IV'),
  ('General & PYQs', 'GEN')
) as s(name, code)
on conflict (class_id, name) do nothing;
