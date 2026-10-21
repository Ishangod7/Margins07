-- =========================================================
-- PHASE 10: Threaded Discussions & Answer Comments
-- =========================================================

create table if not exists public.answer_comments (
  id uuid primary key default gen_random_uuid(),
  answer_id uuid not null references public.answers(id) on delete cascade,
  body text not null,
  created_by uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_answer_comments_answer on public.answer_comments(answer_id, created_at asc);
create index if not exists idx_answer_comments_creator on public.answer_comments(created_by);
