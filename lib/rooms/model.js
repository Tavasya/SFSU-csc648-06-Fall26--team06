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
export function isSplatModel(path) {
  return /\.spz$/i.test(String(path ?? "").trim());
}

// The public link to a scan file in the "rooms" bucket, or null without a path.
//  - supabaseUrl: NEXT_PUBLIC_SUPABASE_URL ("https://<project>.supabase.co")
export function roomModelUrl(supabaseUrl, path) {
  if (!supabaseUrl || !path) return null;
  const file = String(path).split("/").map(encodeURIComponent).join("/");
  return `${supabaseUrl.replace(/\/+$/, "")}/storage/v1/object/public/rooms/${file}`;
}

// Where "Full 3D view" goes for a room: the splat page for .spz scans,
// the Unity page for everything else.
export function roomViewHref(room) {
  return `/rooms/${room.id}/${isSplatModel(room.modelPath) ? "splat" : "3d"}`;
}

// R7.3: where "Back to map" goes from a 3D view: the room's building on the
// Campus Map, or the whole map when we don't know it.
export function mapReturnHref(room) {
  const place = room?.mapId || room?.map_id;
  return place ? `/map?place=${encodeURIComponent(place)}` : "/map";
}

// R7.3: what a 3D viewer shows when the scan can't be loaded.
export function viewerErrorMessage(status) {
  if (status === 404) return "This room's 3D scan isn't available. You can still see the room on the Campus Map.";
  return "The 3D view couldn't load. Check your connection and try again, or go back to the Campus Map.";
}
