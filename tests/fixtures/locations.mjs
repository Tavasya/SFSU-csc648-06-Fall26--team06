// A few rows shaped like the Supabase "locations" table (see
// supabase/migrations/20261019120000_campus_map_locations.sql), for the map tests.
const row = (id, building_name, fields = {}) => ({
  id,
  building_name,
  building_code: "",
  location_kind: "building",
  map_id: null,
  map_label: null,
  map_category: null,
  parent_id: null,
  osm_ids: [],
  ...fields,
});

// Rows shaped like the "location_categories" table, in menu order.
export const LOCATION_CATEGORIES = [
  { id: "academic", label: "Academic" },
  { id: "student-life", label: "Student life" },
  { id: "athletics", label: "Athletics & recreation" },
  { id: "dining", label: "Dining" },
  { id: "outdoor", label: "Outdoor space" },
];

export const LOCATION_ROWS = [
  row("loc-ccsc", "Cesar Chavez Student Center", { building_code: "CCSC", map_id: "ccsc", map_label: "Student Center", map_category: "student-life", osm_ids: ["r4793449"] }),
  row("loc-bh", "Burk Hall", { building_code: "BH", map_id: "bh", map_category: "academic", osm_ids: ["w338711133"] }),
  row("loc-gym", "Gymnasium", { building_code: "GYM", map_id: "gym", map_label: "Gym", map_category: "athletics", osm_ids: ["r4793453"] }),
  row("loc-quad", "Quad", { location_kind: "outdoor", map_id: "quad", map_category: "outdoor", osm_ids: ["r19710046"] }),
  row("loc-jack", "Jack Adams Hall", { location_kind: "venue", map_id: "jack-adams", parent_id: "loc-ccsc" }),
  row("loc-books", "Bookstore", { location_kind: "venue", map_id: "bookstore", parent_id: "loc-ccsc" }),
  row("loc-nasser", "Nasser Family Plaza", { location_kind: "outdoor", map_id: "nasser-plaza", parent_id: "loc-gym" }),
  // Not on the map: no map_id.
  row("loc-downtown", "Downtown Campus"),
];
