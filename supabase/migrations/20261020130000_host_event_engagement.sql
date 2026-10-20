-- How many people saved or RSVP'd to a host's events, for the My Events dashboard
-- and GET /api/host/events. Counts only, never who: saved_events and event_rsvps
-- stay owner-only (see 20261020120000_student_interests_saved_rsvps.sql), so this
-- function counts them on the host's behalf, and only for the host's own events.
-- Safe to re-run: the function is replaced and the permissions are set again.

create or replace function public.event_engagement(event_ids uuid[])
returns table (event_id uuid, saves bigint, attending bigint, interested bigint)
language sql
stable
security definer
set search_path = public
as $$
  select
    e.id,
    (select count(*) from public.saved_events s where s.event_id = e.id),
    (select count(*) from public.event_rsvps r where r.event_id = e.id and r.status = 'attending'),
    (select count(*) from public.event_rsvps r where r.event_id = e.id and r.status = 'interested')
  from public.events e
  where e.id = any(event_ids)
    and e.host_id = (select auth.uid());
$$;

-- Only signed-in users can call it; it returns nothing for events they don't host.
revoke execute on function public.event_engagement(uuid[]) from public, anon;
grant execute on function public.event_engagement(uuid[]) to authenticated;
