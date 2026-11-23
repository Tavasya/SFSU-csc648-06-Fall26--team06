/*
 * components/rooms/SplatCanvas.js
 *
 * PURPOSE:
 * A three.js + Spark viewer for 3D room scans saved as Gaussian splats (.spz).
 * It sits next to the Unity viewer, which keeps handling .glb scans: the
 * preview card (components/rooms/RoomViewer3D.js) and the full splat page
 * (app/(platform)/rooms/[roomId]/splat) pick this canvas only for .spz files.
 *
 * The file is downloaded straight from the public "rooms" bucket (with a
 * progress bar), then handed to Spark. three.js and Spark are imported inside
 * the effect so they only load in the browser, and only when a splat is shown.
 *
 * Controls (createWalkControls below): drag to look around, W A S D or the
 * arrow keys to walk, scroll to step forward or back. A short hint over the
 * scan says so; the Unity viewer keeps its own instructions.
 */

"use client";

import { useEffect, useRef, useState } from "react";
import { Loader2 } from "lucide-react";
import { startView } from "@/lib/rooms/splat-view";
import { createClient } from "@/lib/supabase/client";
import Link from "next/link";

// Downloads a file and reports progress (0 to 1) while it arrives.
async function download(url, onProgress, signal) {
  const response = await fetch(url, { signal });
  if (!response.ok) throw new Error(`Scan download failed (${response.status})`);
  const total = Number(response.headers.get("Content-Length")) || 0;
  if (!total || !response.body) return new Uint8Array(await response.arrayBuffer());

  const bytes = new Uint8Array(total);
  const reader = response.body.getReader();
  let received = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    bytes.set(value, received);
    received += value.length;
    onProgress(received / total);
  }
  return bytes;
}

// Walking controls, like moving through a real room:
//  - drag (mouse or finger) to look around
//  - W A S D or the arrow keys to walk (Shift to go faster)
//  - scroll to step forward or back
// Walking stays level (no flying through the floor). The keys only work while
// the canvas is focused (clicking it focuses it), so they never take over the
// rest of the page.
const MOVE_KEYS = {
  KeyW: [0, 1], ArrowUp: [0, 1],
  KeyS: [0, -1], ArrowDown: [0, -1],
  KeyA: [-1, 0], ArrowLeft: [-1, 0],
  KeyD: [1, 0], ArrowRight: [1, 0],
};

function createWalkControls(camera, canvas) {
  const pressed = new Set();
  let yaw = 0;
  let pitch = 0;
  let drag = null;
  let fast = false;
  const controls = { speed: 1 };

  const aim = () => camera.rotation.set(pitch, yaw, 0);
  const step = (forward, right) => {
    // Level directions for the current yaw (the camera looks down -z).
    camera.position.x += -Math.sin(yaw) * forward + Math.cos(yaw) * right;
    camera.position.z += -Math.cos(yaw) * forward - Math.sin(yaw) * right;
  };

  const onPointerDown = (e) => {
    canvas.focus();
    canvas.setPointerCapture(e.pointerId);
    drag = { x: e.clientX, y: e.clientY };
    canvas.style.cursor = "grabbing";
  };
  const onPointerMove = (e) => {
    if (!drag) return;
    yaw += (e.clientX - drag.x) * 0.004;
    pitch = Math.max(-1.4, Math.min(1.4, pitch + (e.clientY - drag.y) * 0.004));
    drag = { x: e.clientX, y: e.clientY };
    aim();
  };
  const onPointerUp = () => {
    drag = null;
    canvas.style.cursor = "";
  };
  const onWheel = (e) => {
    e.preventDefault(); // scroll moves you instead of the page
    step(-Math.sign(e.deltaY) * controls.speed * 0.4, 0);
  };
  const onKeyDown = (e) => {
    fast = e.shiftKey;
    if (!MOVE_KEYS[e.code]) return;
    e.preventDefault(); // arrow keys would scroll the page
    pressed.add(e.code);
  };
  const onKeyUp = (e) => {
    fast = e.shiftKey;
    pressed.delete(e.code);
  };
  const onBlur = () => pressed.clear();

  canvas.addEventListener("pointerdown", onPointerDown);
  canvas.addEventListener("pointermove", onPointerMove);
  canvas.addEventListener("pointerup", onPointerUp);
  canvas.addEventListener("pointercancel", onPointerUp);
  canvas.addEventListener("wheel", onWheel, { passive: false });
  canvas.addEventListener("keydown", onKeyDown);
  canvas.addEventListener("keyup", onKeyUp);
  canvas.addEventListener("blur", onBlur);

  // Face a point ([x, y, z]) from where the camera is.
  controls.lookAt = ([x, y, z]) => {
    const dx = x - camera.position.x;
    const dy = y - camera.position.y;
    const dz = z - camera.position.z;
    yaw = Math.atan2(-dx, -dz);
    pitch = Math.atan2(dy, Math.hypot(dx, dz));
    aim();
  };

  // Move for the keys held down during the last `seconds`.
  controls.update = (seconds) => {
    let forward = 0;
    let right = 0;
    for (const code of pressed) {
      right += MOVE_KEYS[code][0];
      forward += MOVE_KEYS[code][1];
    }
    if (!forward && !right) return;
    const distance = controls.speed * (fast ? 2.5 : 1) * seconds / Math.hypot(forward, right);
    step(forward * distance, right * distance);
  };

  controls.dispose = () => {
    canvas.removeEventListener("pointerdown", onPointerDown);
    canvas.removeEventListener("pointermove", onPointerMove);
    canvas.removeEventListener("pointerup", onPointerUp);
    canvas.removeEventListener("pointercancel", onPointerUp);
    canvas.removeEventListener("wheel", onWheel);
    canvas.removeEventListener("keydown", onKeyDown);
    canvas.removeEventListener("keyup", onKeyUp);
    canvas.removeEventListener("blur", onBlur);
  };

  return controls;
}

export default function SplatCanvas({
  url, // public link to the .spz file (roomModelUrl in lib/rooms/model.js)
  label = "3D room scan",
  eventId = null,
}) {
  const containerRef = useRef(null);
  const [progress, setProgress] = useState(0);
  const [status, setStatus] = useState("loading"); // "loading" | "ready" | "error"
  const [attendees, setAttendees] = useState([]);

  useEffect(() => {
    const container = containerRef.current;
    const abort = new AbortController();
    let cleanup = () => {};

    (async () => {
      const [THREE, { SplatMesh }] = await Promise.all([
        import("three"),
        import("@sparkjsdev/spark"),
      ]);
      const bytes = await download(url, setProgress, abort.signal);
      if (abort.signal.aborted) return;

      const renderer = new THREE.WebGLRenderer({ antialias: false });
      renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
      const canvas = renderer.domElement;
      canvas.className = "block h-full w-full cursor-grab touch-none outline-none";
      canvas.setAttribute("aria-label", `${label}. Drag to look around, use W A S D or the arrow keys to walk.`);
      canvas.tabIndex = 0; // so the canvas can take the walking keys
      container.appendChild(canvas);

      const scene = new THREE.Scene();
      const avatarResources = [];
      const camera = new THREE.PerspectiveCamera(65, 1, 0.01, 1000);
      camera.rotation.order = "YXZ"; // turn left/right first, then look up/down
      const walk = createWalkControls(camera, canvas);

      const splat = new SplatMesh({ fileBytes: bytes, fileName: "scan.spz" });
      scene.add(splat);

      // Keep the canvas the size of its box.
      const resize = () => {
        const { clientWidth: w, clientHeight: h } = container;
        if (!w || !h) return;
        renderer.setSize(w, h, false);
        camera.aspect = w / h;
        camera.updateProjectionMatrix();
      };
      const observer = new ResizeObserver(resize);
      observer.observe(container);
      resize();

      cleanup = () => {
        observer.disconnect();
        renderer.setAnimationLoop(null);
        walk.dispose();
        splat.dispose();
        avatarResources.forEach((resource) => resource.dispose());
        renderer.dispose();
        canvas.remove();
      };

      await splat.initialized;
      if (abort.signal.aborted) return;

      // Start at one end of the scan, looking along its longest side
      // (lib/rooms/splat-view.js). About 20,000 splat centers are enough.
      const points = [];
      const every = Math.max(1, Math.floor(splat.packedSplats.numSplats / 20000));
      splat.forEachSplat((i, center, scales, quaternion, opacity) => {
        if (i % every === 0 && opacity > 0.3) points.push([center.x, center.y, center.z]);
      });
      const view = startView(points);
      if (view) {
        camera.position.set(...view.position);
        walk.lookAt(view.target);
        walk.speed = view.length * 0.06; // crosses the scan in about 15 seconds
        camera.near = view.length / 2000;
        camera.far = view.length * 20;
        camera.updateProjectionMatrix();

        if (eventId) {
          // The positions are illustrative, not live physical locations.
          let result;
          try { result = await createClient().rpc("event_attendees", { p_event: eventId }); }
          catch { result = { data: [], error: true }; }
          if (abort.signal.aborted) return;
          const people = result.error ? [] : (result.data || []).slice(0, 12);
          setAttendees(people);
          const dx = view.target[0] - view.position[0], dz = view.target[2] - view.position[2];
          const length = Math.hypot(dx, dz) || 1;
          const forward = [dx / length, dz / length], right = [-forward[1], forward[0]];
          const size = Math.max(view.length * 0.05, 0.01);
          people.forEach((person, index) => {
            const group = new THREE.Group();
            const body = new THREE.CapsuleGeometry(size * 0.42, size * 0.55, 4, 12);
            const head = new THREE.SphereGeometry(size * 0.35, 16, 12);
            const hair = new THREE.SphereGeometry(size * 0.36, 16, 8, 0, Math.PI * 2, 0, Math.PI * 0.43);
            const materials = [person.avatar_shirt_color, person.avatar_skin_color, person.avatar_hair_color]
              .map((color) => new THREE.MeshBasicMaterial({ color }));
            avatarResources.push(body, head, hair, ...materials);
            const torso = new THREE.Mesh(body, materials[0]); torso.position.y = size * 0.7;
            const face = new THREE.Mesh(head, materials[1]); face.position.y = size * 1.6;
            const cap = new THREE.Mesh(hair, materials[2]); cap.position.y = size * 1.65;
            group.add(torso, face, cap);
            const lateral = ((index % 4) - 1.5) * size * 1.3;
            const distance = view.length * (0.2 + Math.floor(index / 4) * 0.08);
            group.position.set(view.position[0] + forward[0] * distance + right[0] * lateral,
              view.position[1] - size * 1.3, view.position[2] + forward[1] * distance + right[1] * lateral);
            scene.add(group);
          });
        }
      }

      let last = performance.now();
      renderer.setAnimationLoop((now) => {
        walk.update(Math.min((now - last) / 1000, 0.1));
        last = now;
        renderer.render(scene, camera);
      });
      setStatus("ready");
    })().catch((error) => {
      if (abort.signal.aborted) return;
      console.error("Splat viewer failed to load:", error);
      setStatus("error");
    });

    return () => {
      abort.abort();
      cleanup();
    };
  }, [url, label, eventId]);

  return (
    <div className="relative h-full w-full">
      <div ref={containerRef} className="h-full w-full" />

      {status === "ready" && (
        <p className="pointer-events-none absolute inset-x-2 bottom-2 rounded-full bg-black/55 px-3 py-1 text-center text-[11px] text-white/90">
          Drag to look around · Click, then W A S D or arrow keys to walk · Scroll to step
        </p>
      )}
      {status === "ready" && attendees.length > 0 && <div className="absolute left-2 top-2 max-w-[85%] rounded-xl bg-black/75 px-3 py-2 text-xs text-white">
        <strong>Attending avatars</strong><span> · Illustrative positions</span>
        <div className="mt-1 flex flex-wrap gap-2">{attendees.map((person) => <Link key={person.user_id} href={`/events/${eventId}/connections`} title={`${person.display_name}${person.major ? ` · ${person.major}` : ""}${person.interests?.length ? ` · ${person.interests.join(", ")}` : ""}`} className="underline">{person.display_name}</Link>)}</div>
      </div>}

      {status !== "ready" && (
        <div className="absolute inset-0 grid place-items-center bg-[#1f1a2b] text-center text-[12px] text-white/85">
          {status === "error" ? (
            <p className="px-4">The 3D scan couldn&apos;t load. Please try again later.</p>
          ) : (
            <div className="w-40">
              <Loader2 size={20} className="mx-auto animate-spin" aria-hidden="true" />
              <p className="mt-2">Loading 3D scan… {Math.round(progress * 100)}%</p>
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
