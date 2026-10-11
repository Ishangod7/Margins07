-- =========================================================
-- MILESTONE 4: Doubt Board (Doubts, Answers, Votes, Follows)
-- =========================================================

-- 1. Doubts table
create table if not exists public.doubts (
  id uuid primary key default gen_random_uuid(),
  class_id uuid not null references public.classes(id) on delete cascade,
  subject_id uuid references public.subjects(id) on delete set null,

  title text not null,
  body text not null,
  status text not null default 'open'
    check (status in ('open', 'answered', 'solved')),

  tags text[] default '{}',
  accepted_answer_id uuid, -- Reference to the accepted answer (set when marked solved)

  answer_count int not null default 0,
  follow_count int not null default 0,

  created_by uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_doubts_class_time on public.doubts(class_id, created_at desc);
create index if not exists idx_doubts_class_status on public.doubts(class_id, status);
create index if not exists idx_doubts_class_subject on public.doubts(class_id, subject_id);
create index if not exists idx_doubts_creator on public.doubts(created_by);
create index if not exists idx_doubts_fts on public.doubts using gin(to_tsvector('english', title || ' ' || body));

-- 2. Answers table
create table if not exists public.answers (
  id uuid primary key default gen_random_uuid(),
  doubt_id uuid not null references public.doubts(id) on delete cascade,
  body text not null,
  is_accepted boolean not null default false,
  helpful_count int not null default 0,

  created_by uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_answers_doubt on public.answers(doubt_id, is_accepted desc, helpful_count desc, created_at asc);
create index if not exists idx_answers_creator on public.answers(created_by);

-- Add foreign key constraint to accepted_answer_id in doubts
do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'fk_doubts_accepted_answer'
  ) then
    alter table public.doubts
      add constraint fk_doubts_accepted_answer
      foreign key (accepted_answer_id)
      references public.answers(id)
      on delete set null;
  end if;
end $$;

-- 3. Answer Votes table (Upvoting helpful answers)
create table if not exists public.answer_votes (
  id uuid primary key default gen_random_uuid(),
  answer_id uuid not null references public.answers(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (answer_id, user_id)
);

create index if not exists idx_answer_votes_user on public.answer_votes(user_id);

-- 4. Doubt Follows table
create table if not exists public.doubt_follows (
  id uuid primary key default gen_random_uuid(),
  doubt_id uuid not null references public.doubts(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (doubt_id, user_id)
);

create index if not exists idx_doubt_follows_user on public.doubt_follows(user_id);

-- =========================================================
-- TRIGGERS: Automatic Counter Maintenance & Status Flow
-- =========================================================

-- Trigger function: Update doubt answer count & status
create or replace function public.fn_sync_doubt_answers()
returns trigger as $$
begin
  if tg_op = 'INSERT' then
    update public.doubts
    set
      answer_count = answer_count + 1,
      status = case when status = 'open' then 'answered' else status end,
      updated_at = now()
    where id = new.doubt_id;
    return new;
  elsif tg_op = 'DELETE' then
    update public.doubts
    set
      answer_count = greatest(0, answer_count - 1),
      status = case
        when answer_count - 1 <= 0 then 'open'
        when id = old.doubt_id and accepted_answer_id = old.id then 'answered'
        else status
      end,
      accepted_answer_id = case when accepted_answer_id = old.id then null else accepted_answer_id end,
      updated_at = now()
    where id = old.doubt_id;
    return old;
  end if;
  return null;
end;
$$ language plpgsql security definer;

drop trigger if exists trg_sync_doubt_answers on public.answers;
create trigger trg_sync_doubt_answers
  after insert or delete on public.answers
  for each row execute function public.fn_sync_doubt_answers();

-- Trigger function: Update answer helpful count on vote
create or replace function public.fn_sync_answer_votes()
returns trigger as $$
begin
  if tg_op = 'INSERT' then
    update public.answers
    set helpful_count = helpful_count + 1, updated_at = now()
    where id = new.answer_id;
    return new;
  elsif tg_op = 'DELETE' then
    update public.answers
    set helpful_count = greatest(0, helpful_count - 1), updated_at = now()
    where id = old.answer_id;
    return old;
  end if;
  return null;
end;
$$ language plpgsql security definer;

drop trigger if exists trg_sync_answer_votes on public.answer_votes;
create trigger trg_sync_answer_votes
  after insert or delete on public.answer_votes
  for each row execute function public.fn_sync_answer_votes();

-- Trigger function: Update doubt follow count
create or replace function public.fn_sync_doubt_follows()
returns trigger as $$
begin
  if tg_op = 'INSERT' then
    update public.doubts
    set follow_count = follow_count + 1, updated_at = now()
    where id = new.doubt_id;
    return new;
  elsif tg_op = 'DELETE' then
    update public.doubts
    set follow_count = greatest(0, follow_count - 1), updated_at = now()
    where id = old.doubt_id;
    return old;
  end if;
  return null;
end;
$$ language plpgsql security definer;

drop trigger if exists trg_sync_doubt_follows on public.doubt_follows;
create trigger trg_sync_doubt_follows
  after insert or delete on public.doubt_follows
  for each row execute function public.fn_sync_doubt_follows();

-- =========================================================
-- ROW LEVEL SECURITY (RLS)
-- =========================================================

alter table public.doubts enable row level security;
alter table public.answers enable row level security;
alter table public.answer_votes enable row level security;
alter table public.doubt_follows enable row level security;

-- Read policies for class members
create policy "Members can read class doubts"
  on public.doubts for select
  using (
    class_id in (
      select class_id from public.class_memberships
      where user_id = auth.uid() and status = 'active'
    )
  );

create policy "Members can read answers to class doubts"
  on public.answers for select
  using (
    doubt_id in (
      select d.id from public.doubts d
      join public.class_memberships cm on cm.class_id = d.class_id
      where cm.user_id = auth.uid() and cm.status = 'active'
    )
  );

create policy "Users can view answer votes"
  on public.answer_votes for select
  using (true);

create policy "Users can view their doubt follows"
  on public.doubt_follows for select
  using (user_id = auth.uid());
