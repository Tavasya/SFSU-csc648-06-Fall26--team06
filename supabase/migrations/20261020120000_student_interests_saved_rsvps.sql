-- Student preferences, bookmarks and RSVPs have independent lifecycles.
create table public.student_preferences (
  user_id uuid primary key references auth.users(id) on delete cascade,
  category_ids uuid[] not null default '{}',
  updated_at timestamptz not null default now()
);
create table public.saved_events (
  user_id uuid not null references auth.users(id) on delete cascade,
  event_id uuid not null references public.events(id) on delete cascade,
  saved_at timestamptz not null default now(),
  primary key (user_id, event_id)
);
create table public.event_rsvps (
  user_id uuid not null references auth.users(id) on delete cascade,
  event_id uuid not null references public.events(id) on delete cascade,
  status text not null check (status in ('attending', 'interested', 'not_attending')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (user_id, event_id)
);
alter table public.student_preferences enable row level security;
alter table public.saved_events enable row level security;
alter table public.event_rsvps enable row level security;
grant select, insert, update, delete on public.student_preferences, public.saved_events, public.event_rsvps to authenticated;
create policy preferences_owner on public.student_preferences for all to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
create policy saved_owner_read on public.saved_events for select to authenticated using (user_id = (select auth.uid()));
create policy saved_owner_delete on public.saved_events for delete to authenticated using (user_id = (select auth.uid()));
create policy saved_owner_insert on public.saved_events for insert to authenticated with check (
  user_id = (select auth.uid()) and exists (select 1 from public.events where id = event_id and publication_status = 'published')
);
create policy rsvp_owner_read on public.event_rsvps for select to authenticated using (user_id = (select auth.uid()));
create policy rsvp_owner_delete on public.event_rsvps for delete to authenticated using (user_id = (select auth.uid()));
create policy rsvp_owner_insert on public.event_rsvps for insert to authenticated with check (
  user_id = (select auth.uid()) and exists (select 1 from public.events where id = event_id and publication_status = 'published'
    and (event_rsvps.status <> 'attending' or (events.status = 'active' and end_date_time > now())))
);
create policy rsvp_owner_update on public.event_rsvps for update to authenticated using (user_id = (select auth.uid())) with check (
  user_id = (select auth.uid()) and exists (select 1 from public.events where id = event_id and publication_status = 'published'
    and (event_rsvps.status <> 'attending' or (events.status = 'active' and end_date_time > now())))
);
create index saved_events_event_idx on public.saved_events(event_id);
create index event_rsvps_event_idx on public.event_rsvps(event_id);

-- Validate preferences even when writes come directly through Supabase.
create function public.validate_student_preferences() returns trigger
language plpgsql set search_path = public as $$
begin
  if cardinality(new.category_ids) > 100 or exists (
    select 1 from unnest(new.category_ids) as selected(id)
    where not exists (select 1 from public.categories c where c.id = selected.id)
  ) then raise exception 'Invalid interest categories'; end if;
  new.category_ids := array(select distinct unnest(new.category_ids));
  new.updated_at := now();
  return new;
end;
$$;
create trigger validate_student_preferences before insert or update on public.student_preferences
for each row execute function public.validate_student_preferences();
