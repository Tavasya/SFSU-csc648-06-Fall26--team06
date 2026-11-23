-- Attendance is self-reported and separate from RSVPs and saved events.
create table public.attended_events (
  user_id uuid not null references auth.users(id) on delete cascade,
  event_id uuid not null references public.events(id) on delete cascade,
  recorded_at timestamptz not null default now(),
  primary key (user_id, event_id)
);
alter table public.attended_events enable row level security;
grant select, insert, delete on public.attended_events to authenticated;
create policy attended_read on public.attended_events for select to authenticated using (user_id = (select auth.uid()));
create policy attended_delete on public.attended_events for delete to authenticated using (user_id = (select auth.uid()));
create policy attended_insert on public.attended_events for insert to authenticated with check (
  user_id = (select auth.uid()) and exists (
    select 1 from public.events e where e.id = event_id and e.publication_status = 'published'
      and e.status <> 'cancelled' and e.end_date_time <= now()
  )
);
