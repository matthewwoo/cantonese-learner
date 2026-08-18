-- Generation status for asynchronously-created rows.
--
-- Deck and article creation now respond immediately and finish the AI work in
-- the background, so a row exists while it is still being filled in. The list
-- pages render a placeholder card off this column and poll until it settles.
--
-- Default 'ready': everything already in these tables was created by the old
-- blocking flow, so it is finished by definition.

alter table public.flashcard_sets
  add column status text not null default 'ready'
    check (status in ('pending', 'ready', 'failed')),
  add column error_message text;

alter table public.articles
  add column status text not null default 'ready'
    check (status in ('pending', 'ready', 'failed')),
  add column error_message text;
