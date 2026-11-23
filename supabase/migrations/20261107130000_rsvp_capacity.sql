-- RSVP capacity.
--  1. event_attendance(): how many people are attending each published event
--     (counts only, never who), so pages can show "RSVP capacity has been
--     reached". event_rsvps stays owner-only, so this counts on everyone's behalf.
--  2. A trigger that refuses new "attending" RSVPs once an event with a
--     capacity is full. It runs in the database, so two students clicking at
--     the same time can't both take the last spot.
-- Safe to re-run: functions are replaced and the trigger is recreated.

create or replace function public.event_attendance(event_ids uuid[])
returns table (event_id uuid, attending bigint)
language sql
stable
security definer
set search_path = public
as $$
  select
    e.id,
    (select count(*) from public.event_rsvps r where r.event_id = e.id and r.status = 'attending')
  from public.events e
  where e.id = any(event_ids)
    and e.publication_status = 'published';
$$;

revoke execute on function public.event_attendance(uuid[]) from public;
grant execute on function public.event_attendance(uuid[]) to anon, authenticated;

create or replace function public.enforce_rsvp_capacity()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  cap integer;
  taken bigint;
begin
  if new.status <> 'attending' then
    return new;
  end if;
  -- Already attending (re-saving the same RSVP): never blocked.
  if exists (
    select 1 from public.event_rsvps r
    where r.event_id = new.event_id and r.user_id = new.user_id and r.status = 'attending'
  ) then
    return new;
  end if;
  -- Lock the event row so simultaneous RSVPs are counted one at a time.
  select capacity into cap from public.events where id = new.event_id for update;
  if cap is null then
    return new;
  end if;
  select count(*) into taken from public.event_rsvps r
  where r.event_id = new.event_id and r.status = 'attending';
  if taken >= cap then
    raise exception 'RSVP capacity has been reached' using errcode = 'P0001';
  end if;
  return new;
end;
$$;

drop trigger if exists rsvp_capacity on public.event_rsvps;
create trigger rsvp_capacity
  before insert or update of status on public.event_rsvps
  for each row execute function public.enforce_rsvp_capacity();
