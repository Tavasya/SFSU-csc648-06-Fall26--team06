/*
 * components/rooms/RoomViewer3D.js
 *
 * PURPOSE:
 * A small, reusable 3D room viewer for previews (the Campus Map side panel
 * and the event detail page). It uses the same Unity WebGL build and the same
 * "ImportScan" message as the full 3D page (app/(platform)/rooms/[roomId]/3d),
 * so Unity downloads the scan from /api/rooms/[roomId]/3d-model.
 *
 * Unity is large (~80 MB the first time), so nothing loads until the user
 * clicks "Load 3D preview". That click also counts as the "user gesture"
 * browsers require before Unity may lock the mouse pointer.
 *
 * Only one Unity viewer can run on a page at a time.
 */

"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Box, Expand, Loader2 } from "lucide-react";

const LOADER_URL = "/unity/Build/build.loader.js";

// Adds Unity's loader script once per page and resolves when it's ready.
function loadUnityLoader() {
  if (window.createUnityInstance) return Promise.resolve();
  return new Promise((resolve, reject) => {
    let script = document.querySelector(`script[src="${LOADER_URL}"]`);
    if (!script) {
      script = document.createElement("script");
      script.src = LOADER_URL;
      script.async = true;
      document.body.appendChild(script);
    }
    script.addEventListener("load", () => resolve(), { once: true });
    script.addEventListener("error", () => reject(new Error("Could not load the 3D viewer.")), { once: true });
  });
}

// The Unity canvas. Mounted only after the user asks for the preview.
function UnityCanvas({ roomId }) {
  const canvasRef = useRef(null);
  const [progress, setProgress] = useState(0);
  const [status, setStatus] = useState("loading"); // "loading" | "ready" | "error"

  useEffect(() => {
    let instance = null;
    let cancelled = false;

    loadUnityLoader()
      .then(() =>
        window.createUnityInstance(
          canvasRef.current,
          {
            dataUrl: "/unity/Build/build.data",
            frameworkUrl: "/unity/Build/build.framework.js",
            codeUrl: "/unity/Build/build.wasm",
            streamingAssetsUrl: "/unity/StreamingAssets",
            companyName: "Gatoraid",
            productName: "3D Room Viewer",
            productVersion: "1.0",
          },
          (p) => !cancelled && setProgress(p),
        ),
      )
      .then((created) => {
        if (cancelled) return created.Quit(); // closed while loading
        instance = created;
        created.SendMessage(
          "GLTF Importer",
          "ImportScan",
          JSON.stringify({ baseAPIUrl: window.location.origin, scanId: String(roomId) }),
        );
        setStatus("ready");
      })
      .catch((error) => {
        console.error("3D viewer failed to load:", error);
        if (!cancelled) setStatus("error");
      });

    return () => {
      cancelled = true;
      instance?.Quit().catch(() => {});
    };
  }, [roomId]);

  return (
    <div className="relative h-full w-full">
      <canvas ref={canvasRef} className="block h-full w-full" tabIndex={-1} aria-label="3D room scan" />
      {status !== "ready" && (
        <div className="absolute inset-0 grid place-items-center bg-[#1f1a2b] text-center text-[12px] text-white/85">
          {status === "error" ? (
            <p className="px-4">The 3D preview couldn&apos;t load. Try the full 3D view instead.</p>
          ) : (
            <div className="w-40">
              <Loader2 size={20} className="mx-auto animate-spin" aria-hidden="true" />
              <p className="mt-2">Loading 3D room… {Math.round(progress * 100)}%</p>
              <div className="mt-2 h-1 overflow-hidden rounded-full bg-white/20">
                <div className="h-full bg-[#E3B44B]" style={{ width: `${Math.round(progress * 100)}%` }} />
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default function RoomViewer3D({
  room, // { id, name, scanDate } — id null means no real scan (sample data)
  className = "h-48",
}) {
  const [started, setStarted] = useState(false);
  const scanned = room.scanDate
    ? new Date(`${room.scanDate}T12:00:00`).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })
    : null;

  return (
    <div>
      <div className={`relative overflow-hidden rounded-xl bg-[#1f1a2b] ${className}`}>
        {started ? (
          <UnityCanvas roomId={room.id} />
        ) : (
          <div className="grid h-full place-items-center p-4 text-center">
            <div>
              <Box size={28} className="mx-auto text-[#E3B44B]" aria-hidden="true" />
              {room.id == null ? (
                <p className="mt-2 text-[12px] text-white/80">Sample room: no scan file to preview</p>
              ) : (
                <>
                  <button
                    type="button"
                    onClick={() => setStarted(true)}
                    className="mt-2 inline-flex items-center gap-1.5 rounded-full bg-white px-4 py-2 text-[12px] font-semibold text-[#262332] hover:bg-[#fff4d1] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#E3B44B]"
                  >
                    Load 3D preview
                  </button>
                  <p className="mt-1.5 text-[11px] text-white/60">First load downloads about 80 MB</p>
                </>
              )}
            </div>
          </div>
        )}
      </div>
      <div className="mt-2 flex flex-wrap items-center justify-between gap-2 text-[12px]">
        <span className="text-[#51475f]">
          <span className="font-medium text-[#262332]">{room.name}</span>
          {scanned && <span className="text-[#777180]"> · scanned {scanned}</span>}
        </span>
        {room.id != null && (
          <Link
            href={`/rooms/${room.id}/3d`}
            className="inline-flex items-center gap-1 font-medium text-[#604398] hover:text-[#503581] hover:underline"
          >
            <Expand size={13} aria-hidden="true" />
            Full 3D view
          </Link>
        )}
      </div>
    </div>
  );
}
