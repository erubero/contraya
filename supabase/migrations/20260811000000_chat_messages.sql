-- Persist Ask Contry conversations, so closing the screen stops erasing them.
--
-- The transcript lived in component state only ("Session-only transcript;
-- persistence is a roadmap item"), so leaving the chat threw the conversation
-- away and the owner's TestFlight feedback said exactly that. Server-side
-- rather than AsyncStorage because every other user artifact already lives
-- here: history survives reinstall and follows the account.
--
-- The wire protocol does not change. The client still replays history in the
-- request body and chat-contract still treats it as untrusted (its system
-- prompt says so); this table is the client's own record, not a new source of
-- truth for the model. The edge function is deliberately untouched.
--
-- Append-only, like contract_documents: select/insert/delete and NO update
-- grant. A message never changes once sent, and no update grant means the
-- freeze-parent trigger contract_dates needs has no hole to close here.
--
-- seq, not created_at, is the sort key: an exchange inserts its user and
-- assistant rows in one statement, so both carry the same now() and a
-- timestamp sort would tie exactly where order matters most. Identity is
-- assigned in insert order, and `generated always` means the client cannot
-- supply it.

create table public.chat_messages (
  id uuid primary key default gen_random_uuid(),
  contract_id uuid not null references public.contracts (id) on delete cascade,
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  seq bigint generated always as identity,
  role text not null
    constraint chat_messages_role_enum check (role in ('user', 'assistant')),
  -- Ceiling well above what the app can produce: questions are capped at
  -- 1,000 chars client-side and answers by the model's max_tokens.
  content text not null
    constraint chat_messages_content_len check (length(content) between 1 and 20000),
  created_at timestamptz not null default now()
);

alter table public.chat_messages enable row level security;
revoke all on public.chat_messages from anon;
-- No update: messages are immutable once written. Delete backs the screen's
-- "Clear conversation".
grant select, insert, delete on public.chat_messages to authenticated;
grant all on public.chat_messages to service_role;

create policy "select own chat messages" on public.chat_messages
  for select to authenticated
  using (user_id = (select auth.uid()));

-- with check re-proves the parent contract, like every child table: without
-- it a user could file messages under another user's contract_id.
create policy "insert own chat messages" on public.chat_messages
  for insert to authenticated
  with check (
    user_id = (select auth.uid())
    and exists (
      select 1 from public.contracts c
      where c.id = contract_id and c.user_id = (select auth.uid())
    )
  );

create policy "delete own chat messages" on public.chat_messages
  for delete to authenticated
  using (user_id = (select auth.uid()));

create index chat_messages_contract_seq_idx on public.chat_messages (contract_id, seq);
create index chat_messages_user_id_idx on public.chat_messages (user_id);

-- Its own cap, not enforce_child_cap: the generic one raises at 100 rows per
-- contract, which for messages is 50 exchanges ever. 1000 rows is years of
-- real use on one contract, and the raise is a hard insert failure the app
-- surfaces as the standard send error.
create or replace function public.enforce_chat_messages_cap()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if (select count(*) from public.chat_messages where contract_id = new.contract_id) >= 1000 then
    raise exception 'message limit reached for this contract';
  end if;
  return new;
end;
$$;

create trigger chat_messages_cap before insert on public.chat_messages
  for each row execute function public.enforce_chat_messages_cap();

-- Account deletion needs nothing new: delete-account removes storage objects
-- and then deletes the auth user, and user_id's cascade takes these rows with
-- it. Contract deletion cascades through contract_id the same way.
