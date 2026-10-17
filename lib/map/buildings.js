/*
 * lib/map/buildings.js
 *
 * PURPOSE:
 * Defines the campus buildings, outdoor spaces, and indoor venues that
 * users can select on the 2D Campus Map. This file connects OpenStreetMap
 * (OSM) shapes to the names, IDs, labels, and categories used by GatorAid.
 *
 * WHAT IT CONTAINS:
 * - BUILDINGS: Campus buildings that can be selected on the map.
 * - PLACES: Outdoor spaces, such as the Quad and Cox Stadium, that can
 *   also be selected.
 * - VENUES: Rooms or facilities associated with a parent building. These
 *   do not have their own map shapes; selecting one identifies its parent.
 * - NOT_BUILDINGS: OSM shapes tagged as buildings that should be excluded
 *   from the building layer.
 * - CATEGORIES: Display names for the map's location categories.
 *
 * HOW IT CONNECTS TO THE REST OF THE APP:
 * Each building or place links its OSM shape IDs to an app-specific map ID
 * and a locationName. The locationName must match the corresponding
 * locations.building_name value in Supabase so events can be associated
 * with the correct map location.
 *
 * IMPORTANT:
 * This file is maintained by hand, unlike geometry.js, which is generated
 * from OSM data. If you change OSM IDs, update the relevant entries here
 * and regenerate the map geometry.
 *
 * TO REGENERATE MAP GEOMETRY:
 * Run: node scripts/map/build-map.mjs <file.osm>
 *
 * OSM building IDs and locations should be checked against the official
 * SFSU campus map: https://maps.sfsu.edu/
 */

export const BUILDINGS = [
  // Academic
  { id: "bh", code: "BH", name: "Burk Hall", mapLabel: "Burk Hall", category: "academic", locationName: "Burk Hall", osm: ["w338711133"] },
  { id: "bus", code: "BUS", name: "Business", mapLabel: "Business", category: "academic", locationName: "Business", osm: ["w338711134"] },
  { id: "ca", code: "CA", name: "Creative Arts", mapLabel: "Creative Arts", category: "academic", locationName: "Creative Arts", osm: ["w338711147"] },
  { id: "ep", code: "EP", name: "Ethnic Studies & Psychology", mapLabel: "EP", category: "academic", locationName: "Ethnic Studies & Psychology", osm: ["r4793451"] },
  { id: "fa", code: "FA", name: "Fine Arts", mapLabel: "Fine Arts", category: "academic", locationName: "Fine Arts", osm: ["r4793452"] },
  { id: "greenhouse", code: "", name: "Greenhouse", mapLabel: "Greenhouse", category: "academic", locationName: "Greenhouse", osm: ["w338711152"] },
  { id: "hh", code: "HH", name: "Hensill Hall", mapLabel: "Hensill Hall", category: "academic", locationName: "Hensill Hall", osm: ["w338711156", "w338711157"] },
  { id: "hss", code: "HSS", name: "Health & Social Sciences", mapLabel: "HSS", category: "academic", locationName: "Health & Social Sciences", osm: ["w338711154"] },
  { id: "hum", code: "HUM", name: "Humanities", mapLabel: "Humanities", category: "academic", locationName: "Humanities", osm: ["r4793454"] },
  { id: "lib", code: "LIB", name: "J. Paul Leonard Library", mapLabel: "Library", category: "academic", locationName: "J. Paul Leonard Library", osm: ["w338711158"] },
  { id: "mh", code: "MH", name: "Marcus Hall", mapLabel: "Marcus Hall", category: "academic", locationName: "Marcus Hall", osm: ["w1308021515"] },
  { id: "sci", code: "SCI", name: "Science", mapLabel: "Science", category: "academic", locationName: "Science", osm: ["w338711167"] },
  { id: "seic", code: "SEIC", name: "Science & Engineering Innovation Center", mapLabel: "SEIC", category: "academic", locationName: "Science & Engineering Innovation Center", osm: ["w1308023118"] },
  { id: "temp", code: "", name: "Temporary Buildings (T-N to T-S)", mapLabel: "T-Buildings", category: "academic", locationName: "Temporary Buildings", osm: ["r4793457", "w338711174", "w338711175", "w338711176", "w338711177", "w338711178"] },
  { id: "th", code: "TH", name: "Thornton Hall", mapLabel: "Thornton Hall", category: "academic", locationName: "Thornton Hall", osm: ["w338711179"] },
  { id: "anx", code: "ANX", name: "Annex I & II", mapLabel: "Annex", category: "academic", locationName: "Annex I & II", osm: ["w338711172", "w338711173"] },

  // Student life, athletics and dining
  { id: "ccsc", code: "CCSC", name: "Cesar Chavez Student Center", mapLabel: "Student Center", category: "student-life", locationName: "Cesar Chavez Student Center", osm: ["r4793449"] },
  { id: "gym", code: "GYM", name: "Gymnasium", mapLabel: "Gym", category: "athletics", locationName: "Gymnasium", osm: ["r4793453"] },
  { id: "mwc", code: "MWC", name: "Mashouf Wellness Center", mapLabel: "Mashouf Wellness", category: "athletics", locationName: "Mashouf Wellness Center", osm: ["w634526276"] },
  { id: "monarca", code: "", name: "Monarca Dining Hall", mapLabel: "Monarca", category: "dining", locationName: "Monarca Dining Hall", osm: ["w338711148"] },
  { id: "yerba-buena", code: "", name: "Yerba Buena Dining Hall", mapLabel: "Yerba Buena", category: "dining", locationName: "Yerba Buena Dining Hall", osm: ["w1341470267"] },
  { id: "seven-hills", code: "", name: "Seven Hills Center", mapLabel: "Seven Hills", category: "student-life", locationName: "Seven Hills Center", osm: ["w338711168"] },
  { id: "tcc", code: "TCC", name: "Towers Conference Center", mapLabel: "Towers CC", category: "student-life", locationName: "Towers Conference Center", osm: ["w338711180"] },

  // Housing
  { id: "mph", code: "MPH", name: "Mary Park Hall", mapLabel: "Mary Park", category: "housing", locationName: "Mary Park Hall", osm: ["w338711161"] },
  { id: "mwh", code: "MWH", name: "Mary Ward Hall", mapLabel: "Mary Ward", category: "housing", locationName: "Mary Ward Hall", osm: ["w338711162"] },
  { id: "tcsq", code: "TCSQ", name: "The Towers at Centennial Square", mapLabel: "The Towers", category: "housing", locationName: "The Towers at Centennial Square", osm: ["w338711182"] },
  { id: "village", code: "", name: "Village at Centennial Square", mapLabel: "The Village", category: "housing", locationName: "Village at Centennial Square", osm: ["r4793463", "w338711136", "w338711137", "r4793448"] },
  { id: "wgc", code: "WGC", name: "West Grove Commons", mapLabel: "West Grove", category: "housing", locationName: "West Grove Commons", osm: ["w1308021521"] },
  { id: "manzanita", code: "", name: "Manzanita Square", mapLabel: "Manzanita", category: "housing", locationName: "Manzanita Square", osm: ["r17463397"] },
  // OSM letters UPN/UPS buildings A-N while the official map numbers them, so they are grouped instead of labelled individually.
  { id: "upn", code: "UPN", name: "University Park North", mapLabel: "UPN", category: "housing", locationName: "University Park North", osm: ["r4793458", "w338711183", "w338711184", "w338711185", "w338711186", "w338711189", "w338711193", "w338711197", "w338711198", "w338710914", "w338711200", "w338711201", "w338711202", "w338711203"] },
  { id: "ups", code: "UPS", name: "University Park South", mapLabel: "UPS", category: "housing", locationName: "University Park South", osm: ["r4793459", "r4793460", "r4793462", "w338711205"] },

  // Services
  { id: "adm", code: "ADM", name: "Administration", mapLabel: "Admin", category: "services", locationName: "Administration", osm: ["w338711131"] },
  { id: "ssb", code: "SSB", name: "Student Services", mapLabel: "Student Services", category: "services", locationName: "Student Services", osm: ["w338711171"] },
  { id: "gator-health", code: "", name: "Gator Health Center", mapLabel: "Health Center", category: "services", locationName: "Gator Health Center", osm: ["w1341470266"] },
  { id: "cyd", code: "CYD", name: "Corporation Yard", mapLabel: "Corp Yard", category: "services", locationName: "Corporation Yard", osm: ["w338711140", "w338711142", "w338711143"] },
  { id: "police", code: "", name: "University Police", mapLabel: "Police", category: "services", locationName: "Police", osm: ["w1389953881"] },
  { id: "fcp", code: "", name: "Facilities & Capital Planning", mapLabel: "Facilities", category: "services", locationName: "Facilities & Capital Planning", osm: ["w1389953882"] },
  { id: "parking-garage", code: "", name: "Parking Garage", mapLabel: "Parking Garage", category: "services", locationName: "Parking Garage", osm: ["w338711164"] },
  { id: "recycling", code: "", name: "Recycling/Resource Center", mapLabel: "Recycling", category: "services", locationName: "Recycling/Resource Center", osm: ["w338711207"] },
  { id: "ccc", code: "", name: "Child Care Center", mapLabel: "Childhood Ed", category: "services", locationName: "Child Care Center", osm: ["w338711130"] },
  { id: "childrens-campus", code: "", name: "Children's Campus", mapLabel: "Children's Campus", category: "services", locationName: "Children's Campus", osm: ["w338711139"] },
];

// Open spaces that host events. Drawn in the landscape layer, but selectable.
export const PLACES = [
  { id: "quad", name: "Quad", mapLabel: "Quad", category: "outdoor", locationName: "Quad", osm: ["r19710046"] },
  { id: "malcolm-x", name: "Malcolm X Plaza", mapLabel: "Malcolm X Plaza", category: "outdoor", locationName: "Malcolm X Plaza", osm: ["r4751349"] },
  { id: "cox", name: "Cox Stadium", mapLabel: "Cox Stadium", category: "outdoor", locationName: "Cox Stadium", osm: ["r4792985"] },
  { id: "maloney", name: "Maloney Field", mapLabel: "Maloney Field", category: "outdoor", locationName: "Maloney Field", osm: ["w338698990"] },
  { id: "garden-remembrance", name: "Garden of Remembrance", mapLabel: "Garden", category: "outdoor", locationName: "Garden of Remembrance", osm: ["w338698526"] },
  { id: "tennis", name: "Tennis Courts", mapLabel: "Tennis Courts", category: "outdoor", locationName: "Tennis Courts", osm: ["w28694495"] },
  { id: "softball", name: "Softball Field", mapLabel: "Softball Field", category: "outdoor", locationName: "Softball Field", osm: ["w425872557"] },
  { id: "memorial-grove", name: "Memorial Grove", mapLabel: "Memorial Grove", category: "outdoor", locationName: "Memorial Grove", osm: ["n10774409508"] },
];

// Rooms and venues that sit inside (or at) a building on the map. They have
// no shape of their own: selecting one highlights `parentId` instead.
// Parents come from the official directory notes in our Supabase `locations`
// table, e.g. "Jack Adams Hall (in CCSC)".
export const VENUES = [
  { id: "jack-adams", name: "Jack Adams Hall", parentId: "ccsc", relation: "inside", locationName: "Jack Adams Hall" },
  { id: "bookstore", name: "Bookstore", parentId: "ccsc", relation: "inside", locationName: "Bookstore" },
  { id: "copy-center", name: "Copy Center", parentId: "ccsc", relation: "inside", locationName: "Copy Center" },
  { id: "mckenna", name: "McKenna Theatre", parentId: "ca", relation: "inside", locationName: "McKenna Theatre" },
  { id: "knuth", name: "Knuth Hall", parentId: "ca", relation: "inside", locationName: "Knuth Hall" },
  { id: "little-theatre", name: "Little Theatre", parentId: "ca", relation: "inside", locationName: "Little Theatre" },
  { id: "studio-theatre", name: "Studio Theatre", parentId: "ca", relation: "inside", locationName: "Studio Theatre" },
  { id: "coppola", name: "August Coppola Theatre", parentId: "fa", relation: "inside", locationName: "August Coppola Theatre" },
  { id: "museum", name: "Museum", parentId: "fa", relation: "inside", locationName: "Museum" },
  { id: "labor-archives", name: "Labor Archives", parentId: "lib", relation: "inside", locationName: "Labor Archives" },
  { id: "sutro", name: "Sutro Library", parentId: "lib", relation: "inside", locationName: "Sutro Library" },
  { id: "parking-transportation", name: "Parking & Transportation", parentId: "cyd", relation: "inside", locationName: "Parking & Transportation" },
  { id: "procurement", name: "Procurement", parentId: "cyd", relation: "inside", locationName: "Procurement" },
  { id: "shipping", name: "Shipping & Receiving", parentId: "cyd", relation: "inside", locationName: "Shipping & Receiving" },
  { id: "planetarium", name: "Planetarium", parentId: "th", relation: "inside", locationName: "Planetarium" },
  { id: "onestop", name: "OneStop Center", parentId: "ssb", relation: "inside", locationName: "OneStop Center" },
  { id: "housing-office", name: "Housing Office", parentId: "mwh", relation: "inside", locationName: "Housing Office" },
  { id: "hdcs", name: "Housing, Dining & Conference Services", parentId: "tcsq", relation: "inside", locationName: "Housing, Dining & Conference Services" },
  { id: "student-events-center", name: "Student Events Center", parentId: "anx", relation: "inside", locationName: "Student Events Center" },
  { id: "conference-center", name: "Conference Center", parentId: "tcc", relation: "inside", locationName: "Conference Center" },
  { id: "nasser-plaza", name: "Nasser Family Plaza", parentId: "gym", relation: "at", locationName: "Nasser Family Plaza" },
];

// OSM elements tagged as buildings that are really open spaces or canopies.
export const NOT_BUILDINGS = ["w338711146", "r4793455"];

export const CATEGORIES = {
  academic: "Academic",
  "student-life": "Student life",
  athletics: "Athletics & recreation",
  dining: "Dining",
  housing: "Housing",
  services: "Campus services",
  outdoor: "Outdoor space",
};