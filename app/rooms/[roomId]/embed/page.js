"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import RoomViewer3D from "@/components/rooms/RoomViewer3D";

export default function RoomEmbedPage() {
  const { roomId } = useParams();

  // The scan file decides the viewer (.glb: Unity, .spz: Spark),
  // so wait for it before showing the preview.
  const [modelPath, setModelPath] = useState(undefined);
  useEffect(() => {
    fetch(`/api/rooms/${roomId}/info`)
      .then((response) => (response.ok ? response.json() : {}))
      .then((info) => setModelPath(info.model_view_path ?? null))
      .catch(() => setModelPath(null));
  }, [roomId]);

  const room = {
    id: roomId,
    name: "3D Venue Preview",
    scanDate: null,
    modelPath,
  };

  return (
    <main className="h-screen w-screen overflow-hidden bg-[#211B2D] p-2">
      {modelPath !== undefined && (
        <RoomViewer3D
          room={room}
          className="h-[calc(100vh-55px)]"
        />
      )}
    </main>
  );
}
