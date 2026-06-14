-- supabase/auth-setup.sql
-- Run this ONCE in the Supabase SQL editor AFTER applying the Prisma migration
-- (`prisma migrate deploy`). It is NOT a Prisma migration — Prisma manages only
-- the `public` schema and must never touch `auth`.
--
-- 1) Mirror new Supabase auth users into the public.users profile table.
-- 2) Enable RLS as defense-in-depth (Prisma uses a privileged role and bypasses
--    RLS; this only blocks the auto-generated Supabase data API).

-- 1. Profile-sync trigger ---------------------------------------------------

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.users (id, email, name, "createdAt", "updatedAt")
  values (
    new.id,
    new.email,
    new.raw_user_meta_data ->> 'name',
    now(),
    now()
  );
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- 2. Row Level Security (no permissive policies => blocks anon/authenticated
--    PostgREST access; Prisma's privileged connection still works) -----------

alter table public.users            enable row level security;
alter table public.flashcard_sets   enable row level security;
alter table public.flashcards       enable row level security;
alter table public.study_sessions   enable row level security;
alter table public.study_cards      enable row level security;
alter table public.chat_sessions    enable row level security;
alter table public.chat_messages    enable row level security;
alter table public.articles         enable row level security;
alter table public.reading_sessions enable row level security;
