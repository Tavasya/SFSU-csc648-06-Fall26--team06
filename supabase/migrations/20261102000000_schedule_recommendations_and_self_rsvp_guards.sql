alter table public.student_preferences
  add column class_schedule jsonb not null default '[]'::jsonb
  check (
    case
      when jsonb_typeof(class_schedule) = 'array'
        then jsonb_array_length(class_schedule) <= 100
      else false
    end
  );

-- A saved schedule belongs with the rest of the signed-in student's profile.

-- Keep hosts from saving or RSVPing to their own events, even outside the app UI.
drop policy saved_owner_insert on public.saved_events;
create policy saved_owner_insert on public.saved_events for insert to authenticated with check (
  user_id = (select auth.uid()) and exists (
    select 1 from public.events e
    where e.id = saved_events.event_id
      and e.publication_status = 'published'
      and e.host_id <> (select auth.uid())
  )
);

drop policy rsvp_owner_insert on public.event_rsvps;
create policy rsvp_owner_insert on public.event_rsvps for insert to authenticated with check (
  user_id = (select auth.uid()) and exists (
    select 1 from public.events e
    where e.id = event_rsvps.event_id
      and e.publication_status = 'published'
      and e.host_id <> (select auth.uid())
      and (event_rsvps.status <> 'attending' or (e.status = 'active' and e.end_date_time > now()))
  )
);

drop policy rsvp_owner_update on public.event_rsvps;
create policy rsvp_owner_update on public.event_rsvps for update to authenticated
  using (user_id = (select auth.uid()) and exists (
    select 1 from public.events e
    where e.id = event_rsvps.event_id
      and e.publication_status = 'published'
      and e.host_id <> (select auth.uid())
  ))
  with check (user_id = (select auth.uid()) and exists (
    select 1 from public.events e
    where e.id = event_rsvps.event_id
      and e.publication_status = 'published'
      and e.host_id <> (select auth.uid())
      and (event_rsvps.status <> 'attending' or (e.status = 'active' and e.end_date_time > now()))
  ));
