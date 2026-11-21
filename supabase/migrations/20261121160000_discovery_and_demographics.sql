-- Public ranking exposes only aggregate activity for active published events.
create or replace function public.popular_events()
returns table(event_id uuid, score bigint)
language sql stable security definer set search_path = public as $$
  select e.id,
    (select count(*) from public.saved_events s where s.event_id = e.id) +
    (select count(*) from public.event_rsvps r where r.event_id = e.id and r.status in ('attending', 'interested'))
  from public.events e
  where e.publication_status = 'published' and e.status = 'active' and e.end_date_time > now();
$$;
revoke all on function public.popular_events() from public;
grant execute on function public.popular_events() to anon, authenticated;

-- Only the event owner can see aggregate demographics; suppress small cohorts.
create or replace function public.host_demographics()
returns table(dimension text, label text, count bigint)
language sql stable security definer set search_path = public as $$
  with attendees as (
    select distinct r.user_id from public.event_rsvps r
    join public.events e on e.id = r.event_id
    where e.host_id = (select auth.uid()) and r.status = 'attending'
  ), eligible as (select user_id from attendees where (select count(*) from attendees) >= 5)
  select 'Academic year', p.academic_year, count(*) from eligible a
    join public.student_profiles p on p.user_id = a.user_id where p.academic_year <> ''
    group by p.academic_year having count(*) >= 5
  union all
  select 'Major', p.major, count(*) from eligible a
    join public.student_profiles p on p.user_id = a.user_id where p.major <> ''
    group by p.major having count(*) >= 5;
$$;
revoke all on function public.host_demographics() from public, anon;
grant execute on function public.host_demographics() to authenticated;
