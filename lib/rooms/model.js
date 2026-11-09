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
export function roomViewHref(room, eventId = "") {
  return `/rooms/${room.id}/${isSplatModel(room.modelPath) ? "splat" : "3d"}${eventId ? `?eventId=${encodeURIComponent(eventId)}` : ""}`;
}
