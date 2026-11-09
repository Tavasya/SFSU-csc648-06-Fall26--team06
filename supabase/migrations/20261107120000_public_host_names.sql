-- Let anyone read the display name of hosts who have published an event, so
-- event pages and the Campus Map can say "Hosted by <name>".
-- Hosts with only drafts stay private, and signed-out visitors can read just
-- the id and display name (not created_at).
-- Safe to re-run: the policy is recreated.
grant select (user_id, display_name) on public.hosts to anon;

drop policy if exists hosts_public_read on public.hosts;
create policy hosts_public_read on public.hosts for select to anon, authenticated using (
  exists (
    select 1 from public.events e
    where e.host_id = hosts.user_id
      and e.publication_status = 'published'
  )
);
