-- The first Gaussian splat room scan: "Art Gallery" in the Creative Arts building,
-- using Niantic's Leake Street Arches sample scan (leake_street_arches.spz in the
-- "rooms" bucket). .spz scans open in the three.js + Spark viewer instead of Unity
-- (see lib/rooms/model.js). It was first added in the Supabase dashboard; this
-- migration records it in the repo.
-- Safe to re-run: the row is skipped if it already exists.
insert into public.rooms(id, room_name, has_3d_view, model_view_path, scan_date)
overriding system value
values (4, 'Art Gallery', true, 'leake_street_arches.spz', null)
on conflict (id) do nothing;
update public.rooms
set location_id = (select id from public.locations where building_name = 'Creative Arts')
where id = 4;
-- Keep the automatic numbering ahead of the rows inserted above.
select setval(pg_get_serial_sequence('public.rooms', 'id'), greatest((select max(id) from public.rooms), 1));
