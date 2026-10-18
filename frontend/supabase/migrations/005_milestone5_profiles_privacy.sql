-- =========================================================
-- MILESTONE 5: Profiles, Directory & Privacy Settings
-- =========================================================

alter table public.profiles
  add column if not exists show_in_directory boolean not null default true,
  add column if not exists github_url text,
  add column if not exists linkedin_url text;

create index if not exists idx_profiles_display_name on public.profiles(display_name);
create index if not exists idx_memberships_class_user on public.class_memberships(class_id, user_id, status);
