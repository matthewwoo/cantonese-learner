-- Cantonese Learner: initial Supabase schema
-- Greenfield setup (no data migration from the previous Prisma database).
--
-- Conventions:
--   * snake_case tables/columns, uuid PKs
--   * user_id on EVERY table (including children) so all RLS policies are a
--     trivial `auth.uid() = user_id` check — fast, indexable, and identical
--     for the future iOS client.
--   * owner-only RLS on every table; AI API routes act with the user's JWT,
--     so these policies apply there too.

-- ---------------------------------------------------------------------------
-- updated_at trigger (replaces Prisma's @updatedAt)
-- ---------------------------------------------------------------------------
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- ---------------------------------------------------------------------------
-- flashcard_sets
-- ---------------------------------------------------------------------------
create table public.flashcard_sets (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references auth.users (id) on delete cascade,
  name       text not null,
  image_url  text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger t_flashcard_sets_updated
  before update on public.flashcard_sets
  for each row execute function public.set_updated_at();

alter table public.flashcard_sets enable row level security;
create policy "owner select" on public.flashcard_sets for select using (auth.uid() = user_id);
create policy "owner insert" on public.flashcard_sets for insert with check (auth.uid() = user_id);
create policy "owner update" on public.flashcard_sets for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "owner delete" on public.flashcard_sets for delete using (auth.uid() = user_id);

create index flashcard_sets_user_id_idx on public.flashcard_sets (user_id, created_at desc);

-- ---------------------------------------------------------------------------
-- flashcards
-- ---------------------------------------------------------------------------
create table public.flashcards (
  id                       uuid primary key default gen_random_uuid(),
  user_id                  uuid not null references auth.users (id) on delete cascade,
  flashcard_set_id         uuid not null references public.flashcard_sets (id) on delete cascade,
  chinese_word             text not null,
  english_translation      text not null,
  pronunciation            text,
  example_sentence_english text,
  example_sentence_chinese text,
  created_at               timestamptz not null default now(),
  updated_at               timestamptz not null default now()
);

create trigger t_flashcards_updated
  before update on public.flashcards
  for each row execute function public.set_updated_at();

alter table public.flashcards enable row level security;
create policy "owner select" on public.flashcards for select using (auth.uid() = user_id);
-- belt-and-braces: inserts must also target a set the user owns
create policy "owner insert" on public.flashcards for insert with check (
  auth.uid() = user_id
  and exists (
    select 1 from public.flashcard_sets s
    where s.id = flashcard_set_id and s.user_id = auth.uid()
  )
);
create policy "owner update" on public.flashcards for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "owner delete" on public.flashcards for delete using (auth.uid() = user_id);

create index flashcards_set_idx on public.flashcards (flashcard_set_id);
create index flashcards_user_id_idx on public.flashcards (user_id);

-- ---------------------------------------------------------------------------
-- study_sessions
-- ---------------------------------------------------------------------------
create table public.study_sessions (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null references auth.users (id) on delete cascade,
  started_at   timestamptz not null default now(),
  completed_at timestamptz,
  total_cards  int not null default 20
);

alter table public.study_sessions enable row level security;
create policy "owner select" on public.study_sessions for select using (auth.uid() = user_id);
create policy "owner insert" on public.study_sessions for insert with check (auth.uid() = user_id);
create policy "owner update" on public.study_sessions for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "owner delete" on public.study_sessions for delete using (auth.uid() = user_id);

create index study_sessions_user_id_idx on public.study_sessions (user_id, started_at desc);

-- ---------------------------------------------------------------------------
-- study_cards
-- (interval_days, not "interval" — avoids the Postgres reserved type name)
-- ---------------------------------------------------------------------------
create table public.study_cards (
  id               uuid primary key default gen_random_uuid(),
  user_id          uuid not null references auth.users (id) on delete cascade,
  flashcard_id     uuid not null references public.flashcards (id) on delete cascade,
  study_session_id uuid not null references public.study_sessions (id) on delete cascade,
  ease_factor      double precision not null default 2.5,
  interval_days    int not null default 0,
  repetitions      int not null default 0,
  next_review_date timestamptz not null default now(),
  was_correct      boolean,
  response_time    int,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);

create trigger t_study_cards_updated
  before update on public.study_cards
  for each row execute function public.set_updated_at();

alter table public.study_cards enable row level security;
create policy "owner select" on public.study_cards for select using (auth.uid() = user_id);
create policy "owner insert" on public.study_cards for insert with check (auth.uid() = user_id);
create policy "owner update" on public.study_cards for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "owner delete" on public.study_cards for delete using (auth.uid() = user_id);

create index study_cards_session_idx on public.study_cards (study_session_id);
create index study_cards_review_idx on public.study_cards (flashcard_id, next_review_date);
create index study_cards_user_id_idx on public.study_cards (user_id);

-- ---------------------------------------------------------------------------
-- chat_sessions
-- ---------------------------------------------------------------------------
create table public.chat_sessions (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null references auth.users (id) on delete cascade,
  theme        text not null,
  target_words jsonb not null default '[]'::jsonb,
  started_at   timestamptz not null default now(),
  ended_at     timestamptz
);

alter table public.chat_sessions enable row level security;
create policy "owner select" on public.chat_sessions for select using (auth.uid() = user_id);
create policy "owner insert" on public.chat_sessions for insert with check (auth.uid() = user_id);
create policy "owner update" on public.chat_sessions for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "owner delete" on public.chat_sessions for delete using (auth.uid() = user_id);

create index chat_sessions_user_id_idx on public.chat_sessions (user_id, started_at desc);

-- ---------------------------------------------------------------------------
-- chat_messages
-- ---------------------------------------------------------------------------
create table public.chat_messages (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid not null references auth.users (id) on delete cascade,
  chat_session_id uuid not null references public.chat_sessions (id) on delete cascade,
  role            text not null,
  content         text not null,
  translation     text,
  created_at      timestamptz not null default now()
);

alter table public.chat_messages enable row level security;
create policy "owner select" on public.chat_messages for select using (auth.uid() = user_id);
create policy "owner insert" on public.chat_messages for insert with check (auth.uid() = user_id);
create policy "owner update" on public.chat_messages for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "owner delete" on public.chat_messages for delete using (auth.uid() = user_id);

create index chat_messages_session_idx on public.chat_messages (chat_session_id, created_at);
create index chat_messages_user_id_idx on public.chat_messages (user_id);

-- ---------------------------------------------------------------------------
-- articles
-- ---------------------------------------------------------------------------
create table public.articles (
  id                 uuid primary key default gen_random_uuid(),
  user_id            uuid not null references auth.users (id) on delete cascade,
  title              text not null,
  source_url         text,
  original_content   jsonb not null,
  translated_content jsonb not null,
  word_definitions   jsonb,
  sentences          jsonb,
  difficulty         text,
  estimated_minutes  int,
  sentence_count     int,
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now()
);

create trigger t_articles_updated
  before update on public.articles
  for each row execute function public.set_updated_at();

alter table public.articles enable row level security;
create policy "owner select" on public.articles for select using (auth.uid() = user_id);
create policy "owner insert" on public.articles for insert with check (auth.uid() = user_id);
create policy "owner update" on public.articles for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "owner delete" on public.articles for delete using (auth.uid() = user_id);

create index articles_user_id_idx on public.articles (user_id, created_at desc);

-- ---------------------------------------------------------------------------
-- reading_sessions (v1 shape — the one the reader UI actually uses)
-- ---------------------------------------------------------------------------
create table public.reading_sessions (
  id                 uuid primary key default gen_random_uuid(),
  user_id            uuid not null references auth.users (id) on delete cascade,
  article_id         uuid not null references public.articles (id) on delete cascade,
  current_position   int not null default 0,
  reading_speed      double precision not null default 1.0,
  show_translation   boolean not null default true,
  total_reading_time int not null default 0,
  started_at         timestamptz not null default now(),
  last_read_at       timestamptz not null default now(),
  completed_at       timestamptz
);

-- last_read_at behaves like Prisma's @updatedAt did
create or replace function public.set_last_read_at()
returns trigger
language plpgsql
as $$
begin
  new.last_read_at = now();
  return new;
end;
$$;

create trigger t_reading_sessions_touched
  before update on public.reading_sessions
  for each row execute function public.set_last_read_at();

alter table public.reading_sessions enable row level security;
create policy "owner select" on public.reading_sessions for select using (auth.uid() = user_id);
create policy "owner insert" on public.reading_sessions for insert with check (auth.uid() = user_id);
create policy "owner update" on public.reading_sessions for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "owner delete" on public.reading_sessions for delete using (auth.uid() = user_id);

create index reading_sessions_user_article_idx on public.reading_sessions (user_id, article_id);
