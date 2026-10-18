/*
 * components/rooms/RoomScansCard.js
 *
 * PURPOSE:
 * The "3D room scan" card shown in the Campus Map side panel and on the
 * event detail page. It lists the scanned rooms of one building and shows a
 * click-to-load 3D preview (components/rooms/RoomViewer3D.js) of the chosen
 * room. Buildings without a scanned room never render this card.
 *
 * rooms: [{ id, name, scanDate }] from the Supabase "rooms" table
 * (see loadRoomScans in lib/map/page-data.js).
 */

"use client";

import { useState } from "react";
import { Box } from "lucide-react";
import RoomViewer3D from "@/components/rooms/RoomViewer3D";

export default function RoomScansCard({ rooms, viewerClassName }) {
  const [index, setIndex] = useState(0);
  if (!rooms?.length) return null;
  const room = rooms[Math.min(index, rooms.length - 1)];

  return (
    <div className="rounded-[13px] bg-[#f3eefa] p-4">
      <p className="flex items-center gap-2 text-[14px] font-semibold text-[#262332]">
        <Box size={18} className="text-[#604398]" aria-hidden="true" />
        3D room scan{rooms.length > 1 ? "s" : ""} available
      </p>

      {/* Several scanned rooms: pick which one to preview (one viewer at a time) */}
      {rooms.length > 1 && (
        <div role="group" aria-label="Scanned rooms" className="mt-2 flex flex-wrap gap-1.5">
          {rooms.map((r, i) => (
            <button
              key={r.id ?? r.name}
              type="button"
              aria-pressed={r === room}
              onClick={() => setIndex(i)}
              className={`rounded-full border px-2.5 py-1 text-[11px] font-medium focus-visible:outline-2 focus-visible:outline-[#604398] ${
                r === room
                  ? "border-[#604398] bg-[#604398] text-white"
                  : "border-[#d9cfe8] bg-white text-[#51475f] hover:border-[#604398]"
              }`}
            >
              {r.name}
            </button>
          ))}
        </div>
      )}

      <div className="mt-3">
        {/* key: switching rooms closes the previous viewer before opening the next */}
        <RoomViewer3D key={room.id ?? room.name} room={room} className={viewerClassName} />
      </div>
    </div>
  );
}
