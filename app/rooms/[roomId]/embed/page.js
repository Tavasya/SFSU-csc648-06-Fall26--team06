/**
 * Public interfaces supporting R7.1.
 * @module app/rooms/roomId/embed/page
 */
"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import RoomViewer3D from "@/components/rooms/RoomViewer3D";

/**
 * Render an embedded room viewer using the room ID in the route.
 * @function RoomEmbedPage
 * @memberof module:app/rooms/roomId/embed/page
 * @static
 * @returns {React.ReactElement} Rendered component tree.
 */
export default function RoomEmbedPage() {
  const { roomId } = useParams();

  // The scan file decides the viewer (.glb: Unity, .spz: Spark),
  // so wait for it before showing the preview.
  // ?autostart=1 (the AI Assistant's cards) opens the viewer without a second click.
  const [modelPath, setModelPath] = useState(undefined);
  const [autoStart, setAutoStart] = useState(false);
  useEffect(() => {
    const autoStartParam = new URLSearchParams(window.location.search).get("autostart") === "1";
    fetch(`/api/rooms/${roomId}/info`)
      .then((response) => (response.ok ? response.json() : {}))
      .then((info) => info.model_view_path ?? null, () => null)
      .then((path) => {
        setAutoStart(autoStartParam);
        setModelPath(path);
      });
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
          autoStart={autoStart}
          fullViewTarget="_top"
          className="h-[calc(100vh-55px)]"
        />
      )}
    </main>
  );
}
