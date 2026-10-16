create table public.hosts (user_id uuid primary key references auth.users(id) on delete cascade, display_name text not null, created_at timestamptz not null default now());
create table public.categories (id uuid primary key default gen_random_uuid(), name text not null unique);
create table public.locations (id uuid primary key default gen_random_uuid(), building_name text not null unique, description text, map_x_position numeric check (map_x_position between 0 and 100), map_y_position numeric check (map_y_position between 0 and 100), has_3d_view boolean not null default false);
create table public.events (
 id uuid primary key default gen_random_uuid(), host_id uuid not null references public.hosts(user_id), title text not null check (length(trim(title)) between 3 and 120), description text not null check (length(trim(description)) between 10 and 5000),
 start_date_time timestamptz not null, end_date_time timestamptz not null, location_id uuid not null references public.locations(id), room_number text not null default '',
 category_ids uuid[] not null default '{}', contact_email text not null default '', admission_type text not null default 'free' check (admission_type in ('free','paid')), capacity integer check (capacity > 0), audience text not null default 'All students', rsvp_required boolean not null default true, wheelchair_accessible boolean not null default false, asl_available boolean not null default false,
 cover_path text, publication_status text not null default 'draft' check (publication_status in ('draft','published')), status text not null default 'active' check (status in ('active','cancelled','completed')), created_at timestamptz not null default now(), updated_at timestamptz not null default now(), check (end_date_time > start_date_time)
);
create index events_host_idx on public.events(host_id);
create index events_location_idx on public.events(location_id);
create index events_published_start_idx on public.events(start_date_time) where publication_status = 'published';
alter table public.hosts enable row level security;
alter table public.categories enable row level security;
alter table public.locations enable row level security;
alter table public.events enable row level security;
grant select on public.hosts to authenticated;
grant select on public.categories, public.locations to anon, authenticated;
grant select on public.events to anon, authenticated;
grant insert, update, delete on public.events to authenticated;
create policy host_self on public.hosts for select to authenticated using ((select auth.uid()) = user_id);
create policy categories_read on public.categories for select to anon, authenticated using (true);
create policy locations_read on public.locations for select to anon, authenticated using (true);
create policy events_read on public.events for select to anon, authenticated using (publication_status = 'published' or host_id = (select auth.uid()));
create policy events_create on public.events for insert to authenticated with check (host_id = (select auth.uid()) and exists (select 1 from public.hosts where user_id = (select auth.uid())));
create policy events_update on public.events for update to authenticated using (host_id = (select auth.uid())) with check (host_id = (select auth.uid()));
create policy events_delete on public.events for delete to authenticated using (host_id = (select auth.uid()));
insert into public.categories(name) values ('Academic'),('Career'),('Social'),('Sports'),('Technology'),('Arts'),('Health & Wellness');
insert into public.locations(building_name,description) values ('Cesar Chavez Student Center','Student services and campus gathering spaces.'),('Thornton Hall','Science and engineering classrooms.'),('J. Paul Leonard Library','Library, study rooms, and learning resources.'),('Mashouf Wellness Center','Recreation and wellness facilities.');
insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types) values ('event-covers','event-covers',false,5242880,array['image/jpeg','image/png']);
create policy covers_owner_read on storage.objects for select to authenticated using (bucket_id = 'event-covers' and (storage.foldername(name))[1] = (select auth.uid())::text);
create policy covers_published_read on storage.objects for select to anon, authenticated using (bucket_id = 'event-covers' and exists (select 1 from public.events where cover_path = name and publication_status = 'published'));
create policy covers_host_insert on storage.objects for insert to authenticated with check (bucket_id = 'event-covers' and (storage.foldername(name))[1] = (select auth.uid())::text and exists (select 1 from public.hosts where user_id = (select auth.uid())));
create policy covers_owner_delete on storage.objects for delete to authenticated using (bucket_id = 'event-covers' and (storage.foldername(name))[1] = (select auth.uid())::text);
