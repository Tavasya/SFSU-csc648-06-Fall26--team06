-- Students choose whether other attendees may see their profile and message them.
alter table public.student_profiles add column attendee_visible boolean not null default false;

create table public.event_messages (
  id bigint generated always as identity primary key,
  event_id uuid not null references public.events(id) on delete cascade,
  sender_id uuid not null references auth.users(id) on delete cascade,
  recipient_id uuid not null references auth.users(id) on delete cascade,
  body text not null check (char_length(trim(body)) between 1 and 2000),
  created_at timestamptz not null default now(),
  check (sender_id <> recipient_id)
);
create index event_messages_thread_idx on public.event_messages(event_id, sender_id, recipient_id, created_at);
alter table public.event_messages enable row level security;
revoke all on public.event_messages from anon, authenticated;

-- Security-definer functions expose only opted-in attendees of an event the caller attends.
create or replace function public.event_attendees(p_event uuid)
returns table(user_id uuid, display_name text, academic_year text, major text, interests text[], avatar_skin_color text, avatar_hair_color text, avatar_shirt_color text)
language sql stable security definer set search_path = public as $$
  select p.user_id, p.display_name, p.academic_year, p.major,
    coalesce(array(select c.name from public.categories c where c.id = any(coalesce(pref.category_ids, '{}')) order by c.name), '{}'),
    p.avatar_skin_color, p.avatar_hair_color, p.avatar_shirt_color
  from public.event_rsvps r join public.student_profiles p on p.user_id = r.user_id
  left join public.student_preferences pref on pref.user_id = p.user_id
  join public.events e on e.id = r.event_id
  where r.event_id = p_event and r.status = 'attending' and p.attendee_visible
    and e.publication_status = 'published' and e.status = 'active' and e.end_date_time > now()
    and exists (select 1 from public.event_rsvps me join public.student_profiles mp on mp.user_id = me.user_id
      where me.event_id = p_event and me.user_id = (select auth.uid()) and me.status = 'attending' and mp.attendee_visible);
$$;

create or replace function public.event_conversation(p_event uuid, p_other uuid)
returns table(id bigint, sender_id uuid, body text, created_at timestamptz)
language sql stable security definer set search_path = public as $$
  select m.id, m.sender_id, m.body, m.created_at from public.event_messages m
  where m.event_id = p_event and ((m.sender_id = (select auth.uid()) and m.recipient_id = p_other)
    or (m.recipient_id = (select auth.uid()) and m.sender_id = p_other))
    and exists (select 1 from public.event_attendees(p_event) a where a.user_id = p_other)
  order by m.created_at, m.id limit 500;
$$;

create or replace function public.send_event_message(p_event uuid, p_other uuid, p_body text)
returns void language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is null or p_other = auth.uid() or not exists (select 1 from public.event_attendees(p_event) a where a.user_id = p_other)
    then raise exception 'Conversation unavailable'; end if;
  if char_length(trim(coalesce(p_body, ''))) not between 1 and 2000 then raise exception 'Message must be 1 to 2000 characters'; end if;
  insert into public.event_messages(event_id, sender_id, recipient_id, body) values (p_event, auth.uid(), p_other, trim(p_body));
end;
$$;
revoke all on function public.event_attendees(uuid), public.event_conversation(uuid, uuid), public.send_event_message(uuid, uuid, text) from public, anon;
grant execute on function public.event_attendees(uuid), public.event_conversation(uuid, uuid), public.send_event_message(uuid, uuid, text) to authenticated;
