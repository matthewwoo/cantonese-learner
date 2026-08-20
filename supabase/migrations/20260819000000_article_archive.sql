-- Archive state for articles ("reads"). `status` is already taken by
-- generation state (pending/ready/failed), so archive is its own nullable
-- timestamp, following the reading_sessions.completed_at pattern:
-- null = inbox, non-null = archived at that time.
alter table public.articles
  add column archived_at timestamptz;
