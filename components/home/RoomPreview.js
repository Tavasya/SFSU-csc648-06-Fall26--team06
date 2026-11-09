/*
 * components/home/RoomPreview.js
 *
 * PURPOSE:
 * A small interactive drawing of a room for the homepage's 3D exploration
 * feature (app/page.js). It is an illustration, not a real scan, and it uses
 * the same controls as the real 3D viewer (components/rooms/RoomViewer3D.js):
 *  - drag to look around (turns the room)
 *  - W A S D or the arrow keys to walk (moves the "you" dot)
 *
 * While nobody is using it, it slowly turns back and forth to show it's 3D.
 * It stays still for visitors who prefer reduced motion.
 */

"use client";

import { useEffect, useRef, useState } from "react";
import { Box } from "lucide-react";

// Room size in floor tiles (x across, y deep) and wall height.
const ROOM = { x: 10, y: 8, z: 4.6 };
const SCALE = 17;
const MAX_TURN = 34; // degrees either way, so the same two walls stay at the back
const IDLE_MS = 2500; // auto-turn resumes this long after the last interaction

// Tables: x, y, width, depth, height. The gold one is "your" event.
const TABLES = [
  { x: 2, y: 2.2, w: 2.6, d: 1.2, h: 1.1 },
  { x: 5.6, y: 2.2, w: 2.6, d: 1.2, h: 1.1 },
  { x: 2, y: 4.8, w: 2.6, d: 1.2, h: 1.1 },
  { x: 5.6, y: 4.8, w: 2.6, d: 1.2, h: 1.1, gold: true },
];

const KEYS = {
  w: "up", arrowup: "up",
  s: "down", arrowdown: "down",
  a: "left", arrowleft: "left",
  d: "right", arrowright: "right",
};

// Projects a room point (x, y, z) to the drawing for a turn of `deg` degrees.
function projector(deg) {
  const t = (deg * Math.PI) / 180;
  const cos = Math.cos(t);
  const sin = Math.sin(t);
  return (x, y, z = 0) => {
    const dx = x - ROOM.x / 2;
    const dy = y - ROOM.y / 2;
    const rx = dx * cos - dy * sin;
    const ry = dx * sin + dy * cos;
    return {
      sx: 200 + (rx - ry) * 0.866 * SCALE,
      sy: 150 + (rx + ry) * 0.5 * SCALE - z * SCALE,
      depth: rx + ry, // bigger = closer to the viewer
    };
  };
}

const poly = (project, points) =>
  points.map(([x, y, z]) => {
    const p = project(x, y, z);
    return `${p.sx.toFixed(1)},${p.sy.toFixed(1)}`;
  }).join(" ");

function Table({ project, deg, x, y, w, d, h, gold }) {
  const x1 = x + w;
  const y1 = y + d;
  const t = (deg * Math.PI) / 180;
  // A side shows when it faces the viewer (bottom of the drawing).
  const facing = ([nx, ny]) => nx * Math.cos(t) - ny * Math.sin(t) + nx * Math.sin(t) + ny * Math.cos(t) > 0;
  const sides = [
    { n: [1, 0], pts: [[x1, y, 0], [x1, y1, 0], [x1, y1, h], [x1, y, h]], fill: "var(--room-side-a)" },
    { n: [-1, 0], pts: [[x, y, 0], [x, y1, 0], [x, y1, h], [x, y, h]], fill: "var(--room-side-a)" },
    { n: [0, 1], pts: [[x, y1, 0], [x1, y1, 0], [x1, y1, h], [x, y1, h]], fill: "var(--room-side-b)" },
    { n: [0, -1], pts: [[x, y, 0], [x1, y, 0], [x1, y, h], [x, y, h]], fill: "var(--room-side-b)" },
  ];
  return (
    <g stroke="var(--room-edge)" strokeWidth="1" strokeLinejoin="round">
      {sides.filter((s) => facing(s.n)).map((s) => (
        <polygon key={s.n.join()} points={poly(project, s.pts)} fill={s.fill} />
      ))}
      <polygon
        points={poly(project, [[x, y, h], [x1, y, h], [x1, y1, h], [x, y1, h]])}
        fill={gold ? "var(--room-gold)" : "var(--room-top)"}
      />
    </g>
  );
}

export default function RoomPreview() {
  const [deg, setDeg] = useState(0);
  const [you, setYou] = useState({ x: 8.6, y: 7 });
  const [pressed, setPressed] = useState(null);
  const lastUse = useRef(-Infinity);
  const drag = useRef(null);
  const degRef = useRef(0);

  // Gentle back-and-forth turn while idle.
  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    let frame;
    let phase = 0;
    let last = performance.now();
    const tick = (now) => {
      const dt = now - last;
      last = now;
      if (now - lastUse.current > IDLE_MS) {
        phase += dt / 1000;
        const target = Math.sin(phase * 0.6) * 24;
        degRef.current += (target - degRef.current) * Math.min(1, dt / 400);
        setDeg(degRef.current);
      }
      frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, []);

  const turnTo = (value) => {
    degRef.current = Math.max(-MAX_TURN, Math.min(MAX_TURN, value));
    setDeg(degRef.current);
  };

  const onPointerDown = (e) => {
    e.currentTarget.setPointerCapture(e.pointerId);
    drag.current = { x: e.clientX, deg: degRef.current };
    lastUse.current = performance.now();
  };
  const onPointerMove = (e) => {
    if (!drag.current) return;
    lastUse.current = performance.now();
    turnTo(drag.current.deg + (e.clientX - drag.current.x) * 0.35);
  };
  const onPointerUp = () => {
    drag.current = null;
  };

  // Walk relative to the current view: "up" moves away from the viewer.
  const walk = (dir) => {
    lastUse.current = performance.now();
    const t = (degRef.current * Math.PI) / 180;
    const step = 0.45;
    // Screen directions in turned-room space, turned back into room space.
    const screen = { up: [-1, -1], down: [1, 1], left: [-1, 1], right: [1, -1] }[dir];
    const [sx, sy] = [screen[0] * step * 0.707, screen[1] * step * 0.707];
    const dx = sx * Math.cos(t) + sy * Math.sin(t);
    const dy = -sx * Math.sin(t) + sy * Math.cos(t);
    setYou((p) => ({
      x: Math.max(0.6, Math.min(ROOM.x - 0.6, p.x + dx)),
      y: Math.max(0.6, Math.min(ROOM.y - 0.6, p.y + dy)),
    }));
  };

  const onKeyDown = (e) => {
    const dir = KEYS[e.key.toLowerCase()];
    if (!dir) return;
    e.preventDefault();
    setPressed(dir);
    walk(dir);
  };

  const project = projector(deg);
  const grid = [];
  for (let i = 1; i < ROOM.x; i++) grid.push(poly(project, [[i, 0, 0], [i, ROOM.y, 0]]));
  for (let j = 1; j < ROOM.y; j++) grid.push(poly(project, [[0, j, 0], [ROOM.x, j, 0]]));

  // Tables and the "you" dot, drawn back to front.
  const youPoint = project(you.x, you.y, 0);
  const items = [
    ...TABLES.map((t) => ({ kind: "table", t, depth: project(t.x + t.w / 2, t.y + t.d / 2).depth })),
    { kind: "you", depth: youPoint.depth },
  ].sort((a, b) => a.depth - b.depth);

  const keyCap = (label, dir, className = "") => (
    <kbd className={`${className}${pressed === dir ? " pressed" : ""}`}>{label}</kbd>
  );

  return (
    <div className="home-panel home-room">
      <div className="home-room-top">
        <span>
          <Box size={14} /> 3D room preview
        </span>
        <small>Illustration</small>
      </div>
      <div
        className="home-room-stage"
        tabIndex={0}
        role="application"
        aria-label="Interactive room drawing. Drag to turn it. Use W A S D or the arrow keys to walk."
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
        onKeyDown={onKeyDown}
        onKeyUp={() => setPressed(null)}
        onBlur={() => setPressed(null)}
      >
        <svg viewBox="0 0 400 270" className="home-room-svg" aria-hidden="true">
          {/* Back walls, screen and door */}
          <polygon points={poly(project, [[0, 0, 0], [ROOM.x, 0, 0], [ROOM.x, 0, ROOM.z], [0, 0, ROOM.z]])} fill="var(--room-wall-a)" stroke="var(--room-line)" />
          <polygon points={poly(project, [[0, 0, 0], [0, ROOM.y, 0], [0, ROOM.y, ROOM.z], [0, 0, ROOM.z]])} fill="var(--room-wall-b)" stroke="var(--room-line)" />
          <polygon points={poly(project, [[3, 0, 1.5], [7.4, 0, 1.5], [7.4, 0, 3.8], [3, 0, 3.8]])} fill="var(--room-screen)" stroke="var(--room-edge)" />
          <polygon points={poly(project, [[0, 5.2, 0], [0, 6.8, 0], [0, 6.8, 3.2], [0, 5.2, 3.2]])} fill="var(--room-side-a)" stroke="var(--room-edge)" />
          {/* Floor */}
          <polygon points={poly(project, [[0, 0, 0], [ROOM.x, 0, 0], [ROOM.x, ROOM.y, 0], [0, ROOM.y, 0]])} fill="var(--room-floor)" stroke="var(--room-line)" />
          {grid.map((points) => (
            <polyline key={points} points={points} fill="none" stroke="var(--room-grid)" />
          ))}
          {items.map((item) =>
            item.kind === "table" ? (
              <Table key={`${item.t.x}-${item.t.y}`} project={project} deg={deg} {...item.t} />
            ) : (
              <g key="you" transform={`translate(${youPoint.sx} ${youPoint.sy})`}>
                <ellipse rx="11" ry="6" fill="var(--room-you-glow)" />
                <circle r="5" fill="var(--room-you)" stroke="var(--room-you-ring)" strokeWidth="2" />
              </g>
            ),
          )}
        </svg>
      </div>
      <div className="home-room-controls">
        <div className="home-keys">
          {keyCap("W", "up", "w")}
          {keyCap("A", "left")}
          {keyCap("S", "down")}
          {keyCap("D", "right")}
        </div>
        <small>
          <strong>Try it:</strong> drag to look around,
          <br />
          then click and use W A S D to walk.
        </small>
      </div>
    </div>
  );
}
