/**
 * Public interfaces supporting R3.3, R6.6, R7.1, R7.3, R7.4.
 * @module lib/rooms/model
 */
/*
 * lib/rooms/model.js
 *
 * PURPOSE:
 * Small helpers for the 3D room scan files in the "rooms" storage bucket
 * (rooms.model_view_path). Two kinds of scans are supported side by side:
 *  - .glb meshes open in the Unity viewer (components/rooms/RoomViewer3D.js,
 *    app/(platform)/rooms/[roomId]/3d), which downloads them through
 *    GET /api/rooms/[roomId]/3d-model
 *  - .spz Gaussian splats open in the three.js + Spark viewer
 *    (components/rooms/SplatCanvas.js, app/(platform)/rooms/[roomId]/splat),
 *    which loads them straight from the public bucket, since splat files are
 *    too large to send through an API route on Vercel
 * No imports, so they can be tested on their own.
 */

// Is this scan file a Gaussian splat (.spz)? Anything else is treated as a GLB.
/**
 * Recognize .spz Gaussian-splat paths, case-insensitively.
 * @function isSplatModel
 * @memberof module:lib/rooms/model
 * @static
 * @param {string} path - Stored room-model path.
 * @returns {boolean} Whether the model path ends in .spz.
 */
export function isSplatModel(path) {
  return /\.spz$/i.test(String(path ?? "").trim());
}

// The public link to a scan file in the "rooms" bucket, or null without a path.
//  - supabaseUrl: NEXT_PUBLIC_SUPABASE_URL ("https://<project>.supabase.co")
/**
 * Build a public rooms-bucket URL with encoded path segments; return null without a project URL or path.
 * @function roomModelUrl
 * @memberof module:lib/rooms/model
 * @static
 * @param {string} supabaseUrl - Public database project base URL.
 * @param {string} path - Stored room-model path.
 * @returns {?string} The public model URL, or null when URL/path is missing.
 */
export function roomModelUrl(supabaseUrl, path) {
  if (!supabaseUrl || !path) return null;
  const file = String(path).split("/").map(encodeURIComponent).join("/");
  return `${supabaseUrl.replace(/\/+$/, "")}/storage/v1/object/public/rooms/${file}`;
}

// Where "Full 3D view" goes for a room: the splat page for .spz scans,
// the Unity page for everything else.
/**
 * Choose the room's splat or Unity page based on its model extension.
 * @function roomViewHref
 * @memberof module:lib/rooms/model
 * @static
 * @param {Object} room - Room with its ID and modelPath.
 * @returns {string} A relative /rooms/:id/splat or /rooms/:id/3d URL.
 */
export function roomViewHref(room) {
  return `/rooms/${room.id}/${isSplatModel(room.modelPath) ? "splat" : "3d"}`;
}

// R7.3: where "Back to map" goes from a 3D view: the room's building on the
// Campus Map, or the whole map when we don't know it.
/**
 * Link back to the room's building on the Campus Map, or to the whole map when the building is unknown.
 * @function mapReturnHref
 * @memberof module:lib/rooms/model
 * @static
 * @param {?Object} room - Room with its map building ID (mapId or map_id).
 * @returns {string} A relative /map?place=:id URL, or /map.
 */
export function mapReturnHref(room) {
  const place = room?.mapId || room?.map_id;
  return place ? `/map?place=${encodeURIComponent(place)}` : "/map";
}

// R7.3: what a 3D viewer shows when the scan can't be loaded.
/**
 * Explain why a 3D scan couldn't be shown and point the user back to the Campus Map.
 * @function viewerErrorMessage
 * @memberof module:lib/rooms/model
 * @static
 * @param {number} [status] - HTTP status from loading the scan (404 when it doesn't exist).
 * @returns {string} The message to show in place of the 3D viewer.
 */
export function viewerErrorMessage(status) {
  if (status === 404) return "This room's 3D scan isn't available. You can still see the room on the Campus Map.";
  return "The 3D view couldn't load. Check your connection and try again, or go back to the Campus Map.";
}
