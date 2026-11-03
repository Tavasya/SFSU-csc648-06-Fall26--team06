/*
 * app/(platform)/rooms/[roomId]/splat/page.js
 *
 * PURPOSE:
 * The full 3D view for rooms scanned as Gaussian splats (.spz), shown with
 * the three.js + Spark viewer (components/rooms/SplatCanvas.js). Rooms with a
 * .glb scan keep using the Unity page (/rooms/[roomId]/3d), and are sent there
 * if they land here.
 */

import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import SplatCanvas from "@/components/rooms/SplatCanvas";
import { isSplatModel, roomModelUrl } from "@/lib/rooms/model";

export default async function Page({ params }) {
  const { roomId } = await params;
  const db = await createClient();
  const { data: room, error } = await db
    .from("rooms")
    .select("id, room_name, scan_date, has_3d_view, model_view_path")
    .eq("id", roomId)
    .maybeSingle();
  if (error || !room?.has_3d_view) notFound();
  if (!isSplatModel(room.model_view_path)) redirect(`/rooms/${room.id}/3d`);

  const scanned = room.scan_date
    ? new Date(`${room.scan_date}T12:00:00`).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })
    : null;

  return (
    <div className="mx-auto max-w-5xl">
      <h1>{room.room_name || "Room"}</h1>
      <p className="ga-muted">
        3D scan{scanned ? ` · Scanned ${scanned}` : ""}
      </p>
      <p className="ga-muted">
        Drag to look around. Click the scan, then use the W, A, S, and D keys (or the arrow keys) to walk
        through it. Scroll to step forward or back, and hold Shift to move faster.
      </p>
      <div className="mt-4 aspect-[3/2] w-full overflow-hidden rounded-[20px] bg-[#1f1a2b]">
        <SplatCanvas
          url={roomModelUrl(process.env.NEXT_PUBLIC_SUPABASE_URL, room.model_view_path)}
          label={`3D scan of ${room.room_name || "room"}`}
        />
      </div>
    </div>
  );
}
