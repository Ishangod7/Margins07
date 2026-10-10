-- =========================================================
-- MILESTONE 1: classes, class_memberships, profiles + RLS
-- =========================================================

-- ---------- CLASSES ----------
create table if not exists public.classes (
  id uuid primary key default gen_random_uuid(),
  name text not null,             -- e.g. 'AI&DS'
  division text not null,         -- e.g. 'A'
  academic_year text not null,    -- e.g. '2026-27'
  invite_code text not null unique,
  created_at timestamptz not null default now()
);

-- seed your one class (change invite code before real use)
insert into public.classes (name, division, academic_year, invite_code)
values ('AI&DS', 'A', '2026-27', 'DIVA2026')
on conflict (invite_code) do nothing;

-- ---------- PROFILES ----------
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text not null,
  avatar_path text,
  bio text,
  role text not null default 'member' check (role in ('member','cr')),

  skills text[] default '{}',
  interests text[] default '{}',
  can_help_with text[] default '{}',
  currently_learning text[] default '{}',

  show_avatar boolean not null default true,
  show_bio boolean not null default true,
  show_skills boolean not null default true,
  show_interests boolean not null default true,
  show_contributions boolean not null default true,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ---------- CLASS MEMBERSHIPS ----------
create table if not exists public.class_memberships (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  class_id uuid not null references public.classes(id) on delete cascade,
  status text not null default 'active' check (status in ('active','suspended','removed')),
  joined_at timestamptz not null default now(),
  removed_at timestamptz,
  unique (user_id, class_id)
);

-- =========================================================
-- RLS
-- =========================================================

alter table public.classes enable row level security;
alter table public.profiles enable row level security;
alter table public.class_memberships enable row level security;

-- classes: any authenticated user can read class metadata they belong to
-- (invite code check happens server-side at signup, NOT via this policy)
drop policy if exists "members can view their class" on public.classes;
create policy "members can view their class"
  on public.classes for select
  to authenticated
  using (
    id in (
      select class_id from public.class_memberships
      where user_id = auth.uid() and status = 'active'
    )
  );

-- profiles: user can insert/update only their own row
drop policy if exists "user can insert own profile" on public.profiles;
create policy "user can insert own profile"
  on public.profiles for insert
  to authenticated
  with check (id = auth.uid());

drop policy if exists "user can update own profile" on public.profiles;
create policy "user can update own profile"
  on public.profiles for update
  to authenticated
  using (id = auth.uid())
  with check (id = auth.uid());

-- profiles: any classmate (shared active membership) can view display fields
-- (fine-grained field visibility like show_bio is enforced in the app query layer,
--  not by hiding rows — RLS controls row access, not column masking)
drop policy if exists "classmates can view profiles in shared class" on public.profiles;
create policy "classmates can view profiles in shared class"
  on public.profiles for select
  to authenticated
  using (
    id = auth.uid()
    or id in (
      select cm2.user_id
      from public.class_memberships cm1
      join public.class_memberships cm2 on cm1.class_id = cm2.class_id
      where cm1.user_id = auth.uid()
        and cm1.status = 'active'
        and cm2.status = 'active'
    )
  );

-- class_memberships: user can view their own membership rows;
-- classmates can see who else is in the same class (needed for the People page later)
drop policy if exists "user can view own membership" on public.class_memberships;
create policy "user can view own membership"
  on public.class_memberships for select
  to authenticated
  using (
    user_id = auth.uid()
    or class_id in (
      select class_id from public.class_memberships
      where user_id = auth.uid() and status = 'active'
    )
  );

-- membership rows are only ever created server-side (after invite-code check),
-- so NO insert policy for regular users here — inserts go through a server
-- route using the service role key.

-- =========================================================
-- Keep updated_at fresh on profiles
-- =========================================================
create or replace function public.set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists trg_profiles_updated_at on public.profiles;
create trigger trg_profiles_updated_at
  before update on public.profiles
  for each row execute function public.set_updated_at();
