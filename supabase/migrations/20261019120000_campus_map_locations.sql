-- Campus Map places (used by the Campus Map, the event form and /api/locations).
-- The map's buildings, outdoor spaces and venues used to live in
-- lib/map/buildings.js; this migration moves that data into the locations table.
-- Every place is a row: buildings and outdoor spaces have OSM shapes (osm_ids),
-- venues have no shape and point to the building they are in (parent_id).
-- The shapes themselves stay in lib/map/geometry.js (generated from OpenStreetMap).
-- Safe to re-run: every statement skips or replaces what already exists.
alter table public.locations add column if not exists map_id text unique;
alter table public.locations add column if not exists map_label text;
alter table public.locations add column if not exists map_category text
  check (map_category in ('academic', 'student-life', 'athletics', 'dining', 'housing', 'services', 'outdoor'));
alter table public.locations add column if not exists parent_id uuid references public.locations(id) on delete set null;
alter table public.locations add column if not exists osm_ids text[] not null default '{}';

-- The old map's 0-100 positions; the OSM map does not use them.
alter table public.locations drop column if exists map_x_position;
alter table public.locations drop column if exists map_y_position;

with v(building_name, map_id, map_label, map_category, parent_name, osm_ids) as (
  values
  ('Burk Hall', 'bh', 'Burk Hall', 'academic', null, array['w338711133']),
  ('Business', 'bus', 'Business', 'academic', null, array['w338711134']),
  ('Creative Arts', 'ca', 'Creative Arts', 'academic', null, array['w338711147']),
  ('Ethnic Studies & Psychology', 'ep', 'EP', 'academic', null, array['r4793451']),
  ('Fine Arts', 'fa', 'Fine Arts', 'academic', null, array['r4793452']),
  ('Greenhouse', 'greenhouse', 'Greenhouse', 'academic', null, array['w338711152']),
  ('Hensill Hall', 'hh', 'Hensill Hall', 'academic', null, array['w338711156', 'w338711157']),
  ('Health & Social Sciences', 'hss', 'HSS', 'academic', null, array['w338711154']),
  ('Humanities', 'hum', 'Humanities', 'academic', null, array['r4793454']),
  ('J. Paul Leonard Library', 'lib', 'Library', 'academic', null, array['w338711158']),
  ('Marcus Hall', 'mh', 'Marcus Hall', 'academic', null, array['w1308021515']),
  ('Science', 'sci', 'Science', 'academic', null, array['w338711167']),
  ('Science & Engineering Innovation Center', 'seic', 'SEIC', 'academic', null, array['w1308023118']),
  ('Temporary Buildings', 'temp', 'T-Buildings', 'academic', null, array['r4793457', 'w338711174', 'w338711175', 'w338711176', 'w338711177', 'w338711178']),
  ('Thornton Hall', 'th', 'Thornton Hall', 'academic', null, array['w338711179']),
  ('Annex I & II', 'anx', 'Annex', 'academic', null, array['w338711172', 'w338711173']),
  ('Cesar Chavez Student Center', 'ccsc', 'Student Center', 'student-life', null, array['r4793449']),
  ('Gymnasium', 'gym', 'Gym', 'athletics', null, array['r4793453']),
  ('Mashouf Wellness Center', 'mwc', 'Mashouf Wellness', 'athletics', null, array['w634526276']),
  ('Monarca Dining Hall', 'monarca', 'Monarca', 'dining', null, array['w338711148']),
  ('Yerba Buena Dining Hall', 'yerba-buena', 'Yerba Buena', 'dining', null, array['w1341470267']),
  ('Seven Hills Center', 'seven-hills', 'Seven Hills', 'student-life', null, array['w338711168']),
  ('Towers Conference Center', 'tcc', 'Towers CC', 'student-life', null, array['w338711180']),
  ('Mary Park Hall', 'mph', 'Mary Park', 'housing', null, array['w338711161']),
  ('Mary Ward Hall', 'mwh', 'Mary Ward', 'housing', null, array['w338711162']),
  ('The Towers at Centennial Square', 'tcsq', 'The Towers', 'housing', null, array['w338711182']),
  ('Village at Centennial Square', 'village', 'The Village', 'housing', null, array['r4793463', 'w338711136', 'w338711137', 'r4793448']),
  ('West Grove Commons', 'wgc', 'West Grove', 'housing', null, array['w1308021521']),
  ('Manzanita Square', 'manzanita', 'Manzanita', 'housing', null, array['r17463397']),
  ('University Park North', 'upn', 'UPN', 'housing', null, array['r4793458', 'w338711183', 'w338711184', 'w338711185', 'w338711186', 'w338711189', 'w338711193', 'w338711197', 'w338711198', 'w338710914', 'w338711200', 'w338711201', 'w338711202', 'w338711203']),
  ('University Park South', 'ups', 'UPS', 'housing', null, array['r4793459', 'r4793460', 'r4793462', 'w338711205']),
  ('Administration', 'adm', 'Admin', 'services', null, array['w338711131']),
  ('Student Services', 'ssb', 'Student Services', 'services', null, array['w338711171']),
  ('Gator Health Center', 'gator-health', 'Health Center', 'services', null, array['w1341470266']),
  ('Corporation Yard', 'cyd', 'Corp Yard', 'services', null, array['w338711140', 'w338711142', 'w338711143']),
  ('Police', 'police', 'Police', 'services', null, array['w1389953881']),
  ('Facilities & Capital Planning', 'fcp', 'Facilities', 'services', null, array['w1389953882']),
  ('Parking Garage', 'parking-garage', 'Parking Garage', 'services', null, array['w338711164']),
  ('Recycling/Resource Center', 'recycling', 'Recycling', 'services', null, array['w338711207']),
  ('Child Care Center', 'ccc', 'Childhood Ed', 'services', null, array['w338711130']),
  ('Children''s Campus', 'childrens-campus', 'Children''s Campus', 'services', null, array['w338711139']),
  ('Quad', 'quad', 'Quad', 'outdoor', null, array['r19710046']),
  ('Malcolm X Plaza', 'malcolm-x', 'Malcolm X Plaza', 'outdoor', null, array['r4751349']),
  ('Cox Stadium', 'cox', 'Cox Stadium', 'outdoor', null, array['r4792985']),
  ('Maloney Field', 'maloney', 'Maloney Field', 'outdoor', null, array['w338698990']),
  ('Garden of Remembrance', 'garden-remembrance', 'Garden', 'outdoor', null, array['w338698526']),
  ('Tennis Courts', 'tennis', 'Tennis Courts', 'outdoor', null, array['w28694495']),
  ('Softball Field', 'softball', 'Softball Field', 'outdoor', null, array['w425872557']),
  ('Memorial Grove', 'memorial-grove', 'Memorial Grove', 'outdoor', null, array['n10774409508']),
  ('Jack Adams Hall', 'jack-adams', null, null, 'Cesar Chavez Student Center', array[]::text[]),
  ('Bookstore', 'bookstore', null, null, 'Cesar Chavez Student Center', array[]::text[]),
  ('Copy Center', 'copy-center', null, null, 'Cesar Chavez Student Center', array[]::text[]),
  ('McKenna Theatre', 'mckenna', null, null, 'Creative Arts', array[]::text[]),
  ('Knuth Hall', 'knuth', null, null, 'Creative Arts', array[]::text[]),
  ('Little Theatre', 'little-theatre', null, null, 'Creative Arts', array[]::text[]),
  ('Studio Theatre', 'studio-theatre', null, null, 'Creative Arts', array[]::text[]),
  ('August Coppola Theatre', 'coppola', null, null, 'Fine Arts', array[]::text[]),
  ('Museum', 'museum', null, null, 'Fine Arts', array[]::text[]),
  ('Labor Archives', 'labor-archives', null, null, 'J. Paul Leonard Library', array[]::text[]),
  ('Sutro Library', 'sutro', null, null, 'J. Paul Leonard Library', array[]::text[]),
  ('Parking & Transportation', 'parking-transportation', null, null, 'Corporation Yard', array[]::text[]),
  ('Procurement', 'procurement', null, null, 'Corporation Yard', array[]::text[]),
  ('Shipping & Receiving', 'shipping', null, null, 'Corporation Yard', array[]::text[]),
  ('Planetarium', 'planetarium', null, null, 'Thornton Hall', array[]::text[]),
  ('OneStop Center', 'onestop', null, null, 'Student Services', array[]::text[]),
  ('Housing Office', 'housing-office', null, null, 'Mary Ward Hall', array[]::text[]),
  ('Housing, Dining & Conference Services', 'hdcs', null, null, 'The Towers at Centennial Square', array[]::text[]),
  ('Student Events Center', 'student-events-center', null, null, 'Annex I & II', array[]::text[]),
  ('Conference Center', 'conference-center', null, null, 'Towers Conference Center', array[]::text[]),
  ('Nasser Family Plaza', 'nasser-plaza', null, null, 'Gymnasium', array[]::text[]),
  ('Temporary Bldg N', 'temp-n', null, null, 'Temporary Buildings', array[]::text[]),
  ('Temporary Bldg O', 'temp-o', null, null, 'Temporary Buildings', array[]::text[]),
  ('Temporary Bldg P', 'temp-p', null, null, 'Temporary Buildings', array[]::text[]),
  ('Temporary Bldg Q', 'temp-q', null, null, 'Temporary Buildings', array[]::text[]),
  ('Temporary Bldg R', 'temp-r', null, null, 'Temporary Buildings', array[]::text[]),
  ('Temporary Bldg S', 'temp-s', null, null, 'Temporary Buildings', array[]::text[])
)
update public.locations l
set map_id = v.map_id,
    map_label = v.map_label,
    map_category = v.map_category,
    parent_id = (select p.id from public.locations p where p.building_name = v.parent_name),
    osm_ids = v.osm_ids
from v
where l.building_name = v.building_name;

-- Police and Facilities & Capital Planning have their own building on the map.
update public.locations set location_kind = 'building'
where building_name in ('Police', 'Facilities & Capital Planning');
