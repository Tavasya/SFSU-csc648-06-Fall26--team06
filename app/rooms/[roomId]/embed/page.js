
"use client";

import { useParams } from "next/navigation";
import RoomViewer3D from "@/components/rooms/RoomViewer3D";

export default function RoomEmbedPage() {
  const { roomId } = useParams();

  const room = {
    id: roomId,
    name: "3D Venue Preview",
    scanDate: null,
  };

  return (
    <main className="h-screen w-screen overflow-hidden bg-[#211B2D] p-2">
      <RoomViewer3D
        room={room}
        className="h-[calc(100vh-55px)]"
      />
    </main>
  );
}
