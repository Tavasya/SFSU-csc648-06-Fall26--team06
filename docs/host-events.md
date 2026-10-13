# Host event management

Routes: `/host/events`, `/host/events/new`, `/host/events/[eventId]/edit`, `/host/events/[eventId]/preview`. `/events` and `/events/[eventId]` are minimal integration pages for published events.

Copy `.env.example` to `.env.local` and supply the Supabase URL and publishable key. Run `npm ci`, then `npm run dev`.

## Event ownership

Every signed-in user can create events. Creating an event makes that user its host, identified by `events.host_id`, which references `auth.users.id`. No administrator approval is required. The organizer dashboard lists only the user's own events. Editing, publishing, deletion and image uploads retain ownership checks in APIs and RLS. Student/organizer navigation does not change permissions. The legacy `hosts` table is retained for data preservation but is no longer consulted.

## API contract

- GET/POST `/api/host/events`: list own events / create draft.
- GET/PATCH/DELETE `/api/host/events/:eventId`: fetch, update, delete own event.
- POST `/api/host/events/:eventId/publish`: validate and publish.
- GET `/api/events` and `/api/events/:eventId`: published events only.

Event fields: `id`, `host_id`, `title`, `description`, `start_date_time`, `end_date_time`, `location_id`, `room_number`, `category_ids`, `contact_email`, `capacity`, `admission_type`, `audience`, `rsvp_required`, `wheelchair_accessible`, `asl_available`, `cover_path`, `publication_status`, `status`, timestamps. Times are UTC in storage, Pacific in the form. Categories are a UUID array; teammates should use `category_ids` for matching. A normalized join table can replace this once the shared schema is agreed.

All mutations verify the authenticated user and event ownership. RLS separately restricts event ownership; drafts and private images remain private. No service-role key is used. Cover storage is private, JPG/PNG only, at most 5 MB. Images are rendered using short-lived signed URLs.

The unused legacy `public.Users` table was removed; accounts remain in `auth.users`. Locations/categories are initial team-editable reference data. RSVP counts are deliberately unavailable until the RSVP feature exists. Notifications, recurring events, AI, campus maps, 3D, and payment collection are outside this feature.

Validation: `npm run lint`, `npm run build`, `node --test tests/event-validation.test.mjs`. Check owner/non-owner permissions, draft visibility, publishing, editing, deletion and uploads using real test accounts.

## Campus location catalog

The additive `official_campus_locations` migration preserves existing location IDs and expands the reference data to 76 public main-campus locations with 639 room/space suggestions. `lib/events/campus-locations.json` stores the source-backed snapshot checked October 12, 2026. Location columns include `location_kind`, `building_code`, `room_suggestions`, `source_url`, and `room_source_url`. Existing location RLS and grants still apply.

The create/edit form filters locations by name/code and provides a room datalist for the selected location. Changing the location clears the room. Free text remains supported because the public directories are not exhaustive. These entries describe event locations and do not reserve rooms or report availability. Downtown entries are excluded. The Student Center handbook and outdoor venue manual are older sources; verify booking details with the linked official office.

Sources: [campus directory](https://maps.sfsu.edu/), [classroom directory](https://classrooms.sfsu.edu/rooms), [library floor maps](https://library.sfsu.edu/floor-maps), [conference centers](https://ces.sfsu.edu/conference-centers), [AS handbook](https://asi.sfsu.edu/wp-content/uploads/2021/08/Associated-Students-Event-Services-Handbook.pdf), [outdoor venues manual](https://activities.sfsu.edu/sites/default/files/documents/RSO%20Manual%202023_sfsu.pdf).
