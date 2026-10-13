alter table public.events drop constraint events_host_id_fkey;
alter table public.events add constraint events_host_id_fkey foreign key (host_id) references auth.users(id);
drop policy events_create on public.events;
create policy events_create on public.events for insert to authenticated with check (host_id = (select auth.uid()));
drop policy covers_host_insert on storage.objects;
create policy covers_owner_insert on storage.objects for insert to authenticated with check (bucket_id = 'event-covers' and (storage.foldername(name))[1] = (select auth.uid())::text);
comment on column public.events.host_id is 'Authenticated user who owns this event; any signed-in user may create events.';
comment on table public.hosts is 'Legacy approval records, no longer used for event authorization.';
