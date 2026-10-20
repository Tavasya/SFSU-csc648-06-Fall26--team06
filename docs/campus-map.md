# Campus map and locations

Routes: `/map` (the interactive 2D campus map), `/map?place=<map_id>` (opens on a building, outdoor space or room), `/map?place=<map_id>&event=<eventId>` (also opens that event in the side panel), and `/map?sample=1` (demo events from `lib/map/sample-events.js`). Event pages show a small map of the event's building in their Location section.

Copy `.env.example` to `.env.local` and supply the Supabase URL and publishable key. Run `npm ci`, then `npm run dev`.

## Where the data comes from

Every place on the map is a row in `public.locations`, the same table the event form uses. Nothing about places is hardcoded in the app.

- Buildings and outdoor spaces have their own shapes: `osm_ids` lists the OpenStreetMap elements that draw them.
- Venues (rooms such as Jack Adams Hall) have no shape. `parent_id` points to the building they are in, and selecting one highlights that building.
- `map_id` is the short id the map and links use (for example `ccsc`), `map_label` is the short name drawn on the map, and `map_category` is the place's group.
- Rows without a `map_id` are not on the map.

`public.location_categories` holds the groups (Academic, Student life, Athletics & recreation, Dining, Housing, Campus services, Outdoor space) in `sort_order`. The "Find a place" menu is grouped by them. These describe places, not events; event categories stay in `public.categories`.

3D room scans come from `public.rooms` (`location_id` links each scan to its building).

The shapes themselves (buildings, roads, paths, green space) are in `lib/map/geometry.js`, generated from OpenStreetMap and keyed by `map_id`. They are not stored in the database.

## Migrations

- `20261019120000_campus_map_locations.sql`: adds `map_id`, `map_label`, `map_category`, `parent_id` and `osm_ids` to `locations`, fills them for all 76 locations, and drops the unused `map_x_position` and `map_y_position`.
- `20261019120100_science_213_scan.sql`: records the SCI 213 scan (room 2), first added in the dashboard.
- `20261019120200_location_categories.sql`: creates `location_categories`, links `locations.map_category` to it, and drops the unused `locations.has_3d_view` (scans live in `rooms`).

All three are safe to re-run. Locations and categories are read-only reference data: anyone can read them, nobody can change them through the website. Change them with a new migration, not in the dashboard.

## How the map loads

Like the other pages, `/map` is a server component that reads Supabase directly (`lib/map/page-data.js`):

- `loadCampusPlaces()` loads the places and categories.
- `loadMapEvents()` loads them together with upcoming events and 3D scans.
- `upcomingEvents()` is the one rule for which events students see (published, active, not ended, soonest first). The map and `/api/locations/:locationId/events` both use it.

The data reaches the components as props: `MapExplorer` builds the map's lookups once (`campusFrom` in `components/map/Map.js`) and passes them to `MapView` and `MapSidePanel`. Filtering by time range, category and building happens in the browser, so clicking a building needs no request. If Supabase can't be reached, the campus shapes still draw with a "couldn't load events" notice.

`lib/map/places.js` turns `locations` rows into the map's buildings, outdoor spaces and venues, and `lib/map/events.js` formats events for the map. Both are plain functions with tests.

## API contract

- GET `/api/locations`: all locations, A-Z. Returns `{ locations }`.
- GET `/api/locations/:locationId`: one location and the rooms inside it. Returns `{ location, venues }`, or 404.
- GET `/api/locations/:locationId/events`: published, active, upcoming events at that location, including the rooms inside it. Returns `{ events }` (an empty list is a 200), or 404 for an unknown location.

All three are read-only and need no sign-in. Errors return `{ error }` with 404 (not found) or 503 (database unavailable). Drafts never appear: RLS only exposes published events to other users.

Location fields: `id`, `building_name`, `description`, `location_kind` (`building`, `venue` or `outdoor`), `building_code`, `room_suggestions`, `source_url`, `room_source_url`, `map_id`, `map_label`, `map_category`, `parent_id`, `osm_ids`.

## Updating the map

To add a place, add or update its `locations` row in a migration (`map_id`, `osm_ids` or `parent_id`, `map_category`). A new building or outdoor space also needs its shape: regenerate `lib/map/geometry.js` from OpenStreetMap.

1. Download the campus area: `https://api.openstreetmap.org/api/0.6/map?bbox=-122.4858,37.7193,-122.4744,37.7297`
2. Run `node scripts/map/build-map.mjs <file.osm>`. The script reads which OSM elements are places from Supabase, using `.env.local`, so it needs internet access.

The script prints how many buildings and outdoor spaces it linked and lists any OSM elements it could not find. Map data © OpenStreetMap contributors (ODbL).

Validation: `npm run lint`, `npm run build`, `npm test` (`tests/map-data.test.mjs` and `tests/map-events.test.mjs` use the sample rows in `tests/fixtures/locations.mjs`). Check `/map`, a `?place=` link, `/map?sample=1`, an event page's Location section, and the three location endpoints.
