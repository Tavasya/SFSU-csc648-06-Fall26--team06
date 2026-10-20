-- Groups for Campus Map places (Academic, Housing, Outdoor space, ...), which
-- used to be the CATEGORIES list in lib/map/buildings.js. Not to be confused
-- with public.categories, which holds event categories.
-- Also drops locations.has_3d_view: 3D scans now live in public.rooms.
-- Safe to re-run: every statement skips or replaces what already exists.

create table if not exists public.location_categories (
  id text primary key,
  label text not null unique,
  sort_order integer not null default 0
);

-- Everyone can read the groups; nobody can change them through the website.
alter table public.location_categories enable row level security;
revoke truncate, references, trigger on public.location_categories from anon, authenticated;
grant select on public.location_categories to anon, authenticated;
drop policy if exists "Public can read location categories" on public.location_categories;
create policy "Public can read location categories" on public.location_categories
  for select to anon, authenticated using (true);

insert into public.location_categories(id, label, sort_order) values
  ('academic', 'Academic', 1),
  ('student-life', 'Student life', 2),
  ('athletics', 'Athletics & recreation', 3),
  ('dining', 'Dining', 4),
  ('housing', 'Housing', 5),
  ('services', 'Campus services', 6),
  ('outdoor', 'Outdoor space', 7)
on conflict (id) do update set label = excluded.label, sort_order = excluded.sort_order;

-- locations.map_category now points to a row in location_categories
-- instead of being checked against a fixed list.
alter table public.locations drop constraint if exists locations_map_category_check;
alter table public.locations drop constraint if exists locations_map_category_fkey;
alter table public.locations add constraint locations_map_category_fkey
  foreign key (map_category) references public.location_categories(id);

alter table public.locations drop column if exists has_3d_view;
