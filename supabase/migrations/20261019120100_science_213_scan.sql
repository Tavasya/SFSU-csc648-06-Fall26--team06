-- The second 3D room scan, SCI 213 in the Science building. It was first added
-- in the Supabase dashboard; this migration records it in the repo.
-- Safe to re-run: the row is skipped if it already exists.
insert into public.rooms(id, room_name, has_3d_view, model_view_path, scan_date)
overriding system value
values (2, 'SCI 213', true, 'science_213.glb', '2026-09-22')
on conflict (id) do nothing;
update public.rooms
set location_id = (select id from public.locations where building_name = 'Science')
where id = 2 and location_id is null;
-- Keep the automatic numbering ahead of the rows inserted above.
select setval(pg_get_serial_sequence('public.rooms', 'id'), greatest((select max(id) from public.rooms), 1));
