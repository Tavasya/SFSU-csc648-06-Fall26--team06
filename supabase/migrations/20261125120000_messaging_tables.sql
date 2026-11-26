-- One-to-one student messaging.
-- Conversations are unique per pair of users and are not tied to an event.
create table if not exists public.conversations (
  id uuid primary key default gen_random_uuid(),
  user_one_id uuid not null references auth.users(id) on delete cascade,
  user_two_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint conversations_distinct_users check (user_one_id <> user_two_id),
  constraint conversations_sorted_users check (user_one_id < user_two_id),
  constraint conversations_unique_pair unique (user_one_id, user_two_id)
);

create table if not exists public.messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.conversations(id) on delete cascade,
  sender_id uuid not null references auth.users(id) on delete cascade,
  content text not null check (char_length(btrim(content)) between 1 and 2000),
  created_at timestamptz not null default now()
);

create table if not exists public.message_read_receipts (
  message_id uuid not null references public.messages(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  read_at timestamptz not null default now(),
  primary key (message_id, user_id)
);

create index if not exists conversations_user_one_updated_idx
  on public.conversations(user_one_id, updated_at desc);
create index if not exists conversations_user_two_updated_idx
  on public.conversations(user_two_id, updated_at desc);
create index if not exists messages_conversation_created_idx
  on public.messages(conversation_id, created_at);
create index if not exists message_read_receipts_user_idx
  on public.message_read_receipts(user_id, read_at desc);

create or replace function public.validate_message_sender()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if not exists (
    select 1 from public.conversations c
    where c.id = new.conversation_id
      and new.sender_id in (c.user_one_id, c.user_two_id)
  ) then
    raise exception 'Message sender is not a conversation participant';
  end if;
  return new;
end;
$$;

drop trigger if exists messages_validate_sender on public.messages;
create trigger messages_validate_sender
before insert on public.messages
for each row execute function public.validate_message_sender();

create or replace function public.validate_message_read_receipt()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if not exists (
    select 1
    from public.messages m
    join public.conversations c on c.id = m.conversation_id
    where m.id = new.message_id
      and new.user_id in (c.user_one_id, c.user_two_id)
      and m.sender_id <> new.user_id
  ) then
    raise exception 'Read receipt must belong to the recipient of a message';
  end if;
  return new;
end;
$$;

drop trigger if exists message_read_receipts_validate on public.message_read_receipts;
create trigger message_read_receipts_validate
before insert or update on public.message_read_receipts
for each row execute function public.validate_message_read_receipt();

create or replace function public.touch_conversation_updated_at()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  update public.conversations
  set updated_at = now()
  where id = new.conversation_id;
  return new;
end;
$$;

drop trigger if exists messages_touch_conversation on public.messages;
create trigger messages_touch_conversation
after insert on public.messages
for each row execute function public.touch_conversation_updated_at();

alter table public.conversations enable row level security;
alter table public.messages enable row level security;
alter table public.message_read_receipts enable row level security;

revoke all on public.conversations, public.messages, public.message_read_receipts from anon, authenticated;
grant select on public.conversations, public.messages, public.message_read_receipts to authenticated;
grant all on public.conversations, public.messages, public.message_read_receipts to service_role;

drop policy if exists conversations_participant_read on public.conversations;
create policy conversations_participant_read on public.conversations
for select to authenticated
using (auth.uid() in (user_one_id, user_two_id));

drop policy if exists messages_participant_read on public.messages;
create policy messages_participant_read on public.messages
for select to authenticated
using (exists (
  select 1 from public.conversations c
  where c.id = conversation_id and auth.uid() in (c.user_one_id, c.user_two_id)
));

drop policy if exists message_receipts_participant_read on public.message_read_receipts;
create policy message_receipts_participant_read on public.message_read_receipts
for select to authenticated
using (exists (
  select 1
  from public.messages m
  join public.conversations c on c.id = m.conversation_id
  where m.id = message_id and auth.uid() in (c.user_one_id, c.user_two_id)
));

-- Supabase Realtime publishes message inserts and read-receipt changes.
do $$
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    if not exists (
      select 1 from pg_publication_tables
      where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'messages'
    ) then
      alter publication supabase_realtime add table public.messages;
    end if;
    if not exists (
      select 1 from pg_publication_tables
      where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'message_read_receipts'
    ) then
      alter publication supabase_realtime add table public.message_read_receipts;
    end if;
  end if;
end $$;