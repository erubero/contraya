-- Content hash on inbox items, so the same document arriving twice files once.
--
-- The Cloudflare email worker has no idempotency key, and an MTA that does not
-- see a timely 2xx re-delivers: the same contract lands in the inbox two or
-- three times and the user deletes the copies by hand. Hashing the bytes is
-- the fix, and it costs nothing: no model call, no extra round trip, just the
-- digest of what we already hold in memory.
--
-- Scoped per user and only against rows STILL in the inbox. Importing a
-- document deletes its inbox row, so re-forwarding the same PDF months later
-- (a renewal, a corrected copy) arrives normally. What gets suppressed is a
-- duplicate of something already sitting there unread, which is the only case
-- where a second row helps nobody.

alter table public.inbox_items
  add column if not exists content_sha256 text;

-- Lowercase hex SHA-256. Nullable because every row that predates this
-- migration has no digest, and there is no way to compute one without
-- re-downloading every stored object.
alter table public.inbox_items
  drop constraint if exists inbox_items_sha_format;
alter table public.inbox_items
  add constraint inbox_items_sha_format
  check (content_sha256 is null or content_sha256 ~ '^[a-f0-9]{64}$');

-- Partial, so the pre-existing null rows do not collide with each other. This
-- is the race-safe backstop; the edge function also checks first so it can
-- skip the upload rather than orphan an object.
create unique index if not exists inbox_items_user_sha_unique
  on public.inbox_items (user_id, content_sha256)
  where content_sha256 is not null;

-- Restated rather than assumed. Table-level grants do cover columns added
-- later, but this repo has been bitten by privileges that did not survive
-- `db push` (see the GRANT migration note in CLAUDE.md), and re-granting is
-- idempotent. Clients still only ever read and delete their own rows; only
-- the edge function inserts.
revoke all on public.inbox_items from anon;
grant select, delete on public.inbox_items to authenticated;
grant all on public.inbox_items to service_role;
