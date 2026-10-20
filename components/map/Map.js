/*
* components/map/Map.js
*
* PURPOSE:
* Implements MapView, the interactive 2D SFSU campus map. It draws the
* campus using SVG geographic data from lib/map/geometry.js and uses
* the Supabase "locations" table (passed in as the `campus` prop) to identify
* buildings, outdoor spaces, and venues.
* 
*/ 

"use client";

import { useCallback, useEffect, useImperativeHandle, useRef, useState } from "react";
import { Box, MapPin, Maximize2, Minus, Navigation2, Plus } from "lucide-react";
import geometry from "@/lib/map/geometry";
import { createCampus, NO_PLACES } from "@/lib/map/places";

const W = geometry.width;
const H = geometry.height;
const MAX_ZOOM = 6;
const LABEL_ZOOM = 1.8; // plain building names appear from this zoom level
const PIN_NAME_ZOOM = 1.5; // pins show their names from this zoom level

// Map colors
const C = {
  ground: "#F0EDF3",
  campus: "#FAF8F3",
  green: "#BCDCA3",
  sport: "#9ACB8C",
  plaza: "#EEE5D3",
  water: "#BCD7E6",
  casing: "#D9D2E2",
  road: "#FFFFFF",
  other: "#ECE5D3",
  otherStroke: "#B8923F",
  offCampus: "#E3DEE9",
  label: "#5B4D7C",
  purple: "#604398",
  gold: "#E3B44B",
};

// The generated SVG shape and geographic coordinates for each ID.
const SHAPES = new Map(
  [...geometry.buildings, ...geometry.places].map((s) => [s.id, s]),
);

// The lookups the map components use (see createCampus in lib/map/places.js),
// for the places loaded from the "locations" table.
export const campusFrom = (places = NO_PLACES) => createCampus(places, SHAPES);
const EMPTY_CAMPUS = campusFrom();

// Calculates the viewport needed to show the entire campus.
function fullView(aspect) {
  const w = Math.max(W, H / aspect);
  const h = w * aspect;
  return { x: (W - w) / 2, y: (H - h) / 2, w, h };
}

// Limits zooming and panning so users cannot zoom beyond the allowed range 
// or move the campus completely out of view.
function clampView(v, aspect) {
  const maxW = fullView(aspect).w;
  const w = Math.min(maxW, Math.max(W / MAX_ZOOM, v.w));
  const h = w * aspect;
  const clampAxis = (pos, size, total) =>
    size >= total ? (total - size) / 2 : Math.min(total - size, Math.max(0, pos));
  return { w, h, x: clampAxis(v.x, w, W), y: clampAxis(v.y, h, H) };
}

export default function MapView({
  ref,
  selectedId,
  onSelect,
  pins = [], // [{ id, label, count, has3D }] — buildings that get a pill pin
  initialFocusId = null, // start zoomed in on this building / place / room
  compact = false, // smaller card without the legend (event page preview)
  campus = EMPTY_CAMPUS, // buildings, outdoor spaces and venues, from campusFrom()
}) {
  // Buildings, outdoor spaces and venues from the "locations" table.
  const { meta: META, mapIdFor } = campus;
  // A shape whose place couldn't be loaded still draws, just without a name.
  const placeFor = (id) => META.get(id) ?? { id, name: "Campus building", mapLabel: "" };
  const wrapRef = useRef(null);
  // Only the first view uses initialFocusId; later changes come from selecting.
  const initialFocusRef = useRef(initialFocusId);
  const svgRef = useRef(null);
  const [aspect, setAspect] = useState(H / W);
  const aspectRef = useRef(H / W);
  const [view, setView] = useState(() => fullView(H / W));
  const viewRef = useRef(view);
  const [size, setSize] = useState({ w: 1, h: 1 });
  const [hoverId, setHoverId] = useState(null);
  const [dragging, setDragging] = useState(false);
  const pointers = useRef(new Map());
  const gesture = useRef(null);
  const dragged = useRef(false);
  const animation = useRef(0);

  // The center the user last chose (by panning, zooming or selecting).
  // Resizing the card keeps this centre instead of drifting.
  const centerRef = useRef({ x: W / 2, y: H / 2 });
  const resizingRef = useRef(false);

  useEffect(() => {
    viewRef.current = view;
    if (!resizingRef.current) {
      centerRef.current = { x: view.x + view.w / 2, y: view.y + view.h / 2 };
    }
    resizingRef.current = false;
  }, [view]);

  // The view that frames one building / place / room (rooms frame their building).
  const focusView = useCallback(
    (id, a) => {
      const el = svgRef.current?.querySelector(`[data-shape="${mapIdFor(id)}"]`);
      if (!el) return null;
      const bb = el.getBBox();
      const w = Math.max(bb.width * 3.2, (bb.height * 3.2) / a, W / 4);
      return clampView({ w, x: bb.x + bb.width / 2 - w / 2, y: bb.y + bb.height / 2 - (w * a) / 2 }, a);
    },
    [mapIdFor],
  );

  // Track the card size; keep the view's aspect equal to the card's.
  useEffect(() => {
    const el = wrapRef.current;
    const update = () => {
      const r = el.getBoundingClientRect();
      if (!r.width || !r.height) return;
      const a = r.height / r.width;
      const firstMeasure = aspectRef.current === H / W && viewRef.current.w === fullView(H / W).w;
      aspectRef.current = a;
      setAspect(a);
      setSize({ w: r.width, h: r.height });
      // Keep the user's center point when the card changes shape (e.g. rotating a phone).
      resizingRef.current = true;
      if (firstMeasure) {
        // Start on the whole campus, or zoomed in on initialFocusId. Remember its
        // center so the next size update keeps it instead of re-centering on campus.
        const first = (initialFocusRef.current && focusView(initialFocusRef.current, a)) || fullView(a);
        centerRef.current = { x: first.x + first.w / 2, y: first.y + first.h / 2 };
        setView(first);
        return;
      }
      setView((v) => {
        const { x: cx, y: cy } = centerRef.current;
        return clampView({ w: v.w, x: cx - v.w / 2, y: cy - (v.w * a) / 2 }, a);
      });
    };
    update();
    const observer = new ResizeObserver(update);
    observer.observe(el);
    return () => observer.disconnect();
  }, [focusView]);

  const zoom = fullView(aspect).w / view.w; // 1 = whole campus visible
  const pxPerUnit = size.w / view.w;
  const px = (n) => n / pxPerUnit; // screen pixels -> map units
  const clamp = useCallback((v) => clampView(v, aspectRef.current), []);

  const clientToMap = useCallback((clientX, clientY) => {
    const p = new DOMPoint(clientX, clientY).matrixTransform(
      svgRef.current.getScreenCTM().inverse(),
    );
    return [p.x, p.y];
  }, []);

  const zoomAt = useCallback(
    (factor, mx, my) => {
      cancelAnimationFrame(animation.current);
      setView((v) => {
        const target = clamp({ ...v, w: v.w * factor });
        const k = target.w / v.w;
        return clamp({ w: target.w, x: mx - (mx - v.x) * k, y: my - (my - v.y) * k });
      });
    },
    [clamp],
  );

  const zoomCenter = (factor) => {
    const v = viewRef.current;
    zoomAt(factor, v.x + v.w / 2, v.y + v.h / 2);
  };

  const animateTo = useCallback((target) => {
    cancelAnimationFrame(animation.current);
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setView(target);
      return;
    }
    const from = viewRef.current;
    const start = performance.now();
    const step = (now) => {
      const t = Math.min(1, (now - start) / 450);
      const e = 1 - (1 - t) ** 3;
      setView({
        x: from.x + (target.x - from.x) * e,
        y: from.y + (target.y - from.y) * e,
        w: from.w + (target.w - from.w) * e,
        h: from.h + (target.h - from.h) * e,
      });
      if (t < 1) animation.current = requestAnimationFrame(step);
    };
    animation.current = requestAnimationFrame(step);
  }, []);

  const reset = useCallback(() => animateTo(fullView(aspectRef.current)), [animateTo]);

  // Fly to a building, place or venue (venues fly to their building).
  // Expose a small map-control API to the parent component through the ref.
  // This allows other UI elements, such as a location dropdown, to call flyTo(id) or reset().
  const flyTo = useCallback(
    (id) => {
      const target = focusView(id, aspectRef.current);
      if (target) animateTo(target);
    },
    [animateTo, focusView],
  );

  useImperativeHandle(ref, () => ({ flyTo, reset }), [flyTo, reset]);

  // Mouse wheel / trackpad zoom (needs a non-passive listener).
  useEffect(() => {
    const svg = svgRef.current;
    const onWheel = (e) => {
      e.preventDefault();
      const [mx, my] = clientToMap(e.clientX, e.clientY);
      zoomAt(Math.exp(e.deltaY * 0.0015), mx, my);
    };
    svg.addEventListener("wheel", onWheel, { passive: false });
    return () => svg.removeEventListener("wheel", onWheel);
  }, [clientToMap, zoomAt]);

  // Drag to pan, two fingers to pinch-zoom.
  const onPointerDown = (e) => {
    if (e.pointerType === "mouse" && e.button !== 0) return;
    pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    dragged.current = false;
    gesture.current = { startX: e.clientX, startY: e.clientY, pinch: null };
  };

  const onPointerMove = (e) => {
    const pts = pointers.current;
    const prev = pts.get(e.pointerId);
    if (!prev || !gesture.current) return;
    pts.set(e.pointerId, { x: e.clientX, y: e.clientY });

    if (pts.size === 1) {
      const moved =
        Math.hypot(e.clientX - gesture.current.startX, e.clientY - gesture.current.startY) > 4;
      if (!moved && !dragged.current) return;
      if (!dragged.current) {
        dragged.current = true;
        setDragging(true);
        svgRef.current.setPointerCapture(e.pointerId);
      }
      const dx = e.clientX - prev.x;
      const dy = e.clientY - prev.y;
      cancelAnimationFrame(animation.current);
      setView((v) => clamp({ ...v, x: v.x - dx / pxPerUnit, y: v.y - dy / pxPerUnit }));
    } else if (pts.size === 2) {
      const [a, b] = [...pts.values()];
      const dist = Math.hypot(a.x - b.x, a.y - b.y);
      const [mx, my] = clientToMap((a.x + b.x) / 2, (a.y + b.y) / 2);
      if (gesture.current.pinch) zoomAt(gesture.current.pinch / dist, mx, my);
      gesture.current.pinch = dist;
      dragged.current = true;
    }
  };

  const onPointerUp = (e) => {
    pointers.current.delete(e.pointerId);
    if (pointers.current.size === 1) {
      const [p] = [...pointers.current.values()];
      gesture.current = { startX: p.x, startY: p.y, pinch: null };
    } else if (pointers.current.size === 0) {
      gesture.current = null;
      setDragging(false);
    }
  };

  const select = (id) => {
    if (dragged.current) return; // the pointer was dragging, not clicking
    onSelect?.(id);
  };

  const onShapeKey = (e, id) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      onSelect?.(id);
    }
  };

  // Arrow keys pan, +/- zoom, 0 resets (when the map has keyboard focus).
  const onMapKey = (e) => {
    if (e.target !== e.currentTarget) return;
    const step = viewRef.current.w * 0.1;
    const pan = { ArrowLeft: [-step, 0], ArrowRight: [step, 0], ArrowUp: [0, -step], ArrowDown: [0, step] }[e.key];
    if (pan) {
      e.preventDefault();
      setView((v) => clamp({ ...v, x: v.x + pan[0], y: v.y + pan[1] }));
    } else if (e.key === "+" || e.key === "=") zoomCenter(1 / 1.4);
    else if (e.key === "-") zoomCenter(1.4);
    else if (e.key === "0") reset();
  };

  // `activeId` is the shape that lights up; a selected venue lights up its building.
  const activeId = selectedId ? mapIdFor(selectedId) : null;
  const pinIds = new Set(pins.map((p) => p.id));
  const showLabel = (id) =>
    !pinIds.has(id) && (zoom >= LABEL_ZOOM || id === activeId || id === hoverId);
  const selectedShape = activeId ? SHAPES.get(activeId) : null;
  const L = geometry.layers;

  // Pins: event buildings, plus the selected building even without events.
  const pinList = [...pins];
  if (activeId && !pinIds.has(activeId) && META.has(activeId)) {
    pinList.push({ id: activeId, label: META.get(activeId).mapLabel, count: 0, has3D: false });
  }
  const toScreen = (s) => ({
    left: `${((s.labelX - view.x) / view.w) * 100}%`,
    top: `${((s.labelY - view.y) / view.h) * 100}%`,
    visible: s.labelX >= view.x && s.labelX <= view.x + view.w && s.labelY >= view.y && s.labelY <= view.y + view.h,
  });

  return (
    <div
      ref={wrapRef}
      className={`relative w-full overflow-hidden rounded-[13px] border border-[#ebe7f0] bg-[#F0EDF3] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#604398] ${
        compact ? "h-64 sm:h-72" : "h-110 sm:h-130 lg:h-[min(72vh,660px)]"
      }`}
      tabIndex={0}
      role="group"
      aria-label="SFSU campus map. Arrow keys move the map, plus and minus zoom, 0 resets."
      onKeyDown={onMapKey}
    >
      <svg
        ref={svgRef}
        viewBox={`${view.x} ${view.y} ${view.w} ${view.h}`}
        className={`block h-full w-full touch-none select-none ${dragging ? "cursor-grabbing" : "cursor-grab"}`}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
      >
        <defs>
          <clipPath id="campus-frame">
            <rect width={W} height={H} />
          </clipPath>
        </defs>
        <rect x={-W} y={-H} width={W * 3} height={H * 3} fill={C.ground} aria-hidden="true" />

        <g clipPath="url(#campus-frame)">
          {/* Landscape */}
          <g aria-hidden="true">
            <rect width={W} height={H} fill={C.ground} />
            <path d={L.campus} fill={C.campus} />
            <path d={L.green} fill={C.green} fillRule="evenodd" />
            <path d={L.sport} fill={C.sport} fillRule="evenodd" />
            <path d={L.plaza} fill={C.plaza} />
            <path d={L.water} fill={C.water} />
          </g>

          {/* Selectable open spaces (Quad, Cox Stadium, ...) */}
          <g>
            {geometry.places.map((p) => {
              const selected = p.id === activeId;
              return (
                <g
                  key={p.id}
                  role="button"
                  tabIndex={0}
                  aria-label={placeFor(p.id).name}
                  aria-pressed={selected}
                  className="group cursor-pointer outline-none"
                  onClick={() => select(p.id)}
                  onKeyDown={(e) => onShapeKey(e, p.id)}
                  onPointerEnter={() => setHoverId(p.id)}
                  onPointerLeave={() => setHoverId(null)}
                >
                  <title>{placeFor(p.id).name}</title>
                  <path
                    data-shape={p.id}
                    d={p.d}
                    fillRule="evenodd"
                    vectorEffect="non-scaling-stroke"
                    className={
                      selected
                        ? "fill-[#604398]/25 stroke-[#604398] stroke-[2.5px]"
                        : "fill-[#B0D69A]/60 stroke-transparent stroke-[2.5px] [stroke-dasharray:6_4] transition-colors group-hover:fill-[#E3B44B]/45 group-hover:stroke-[#604398] group-focus-visible:fill-[#E3B44B]/45 group-focus-visible:stroke-[#604398]"
                    }
                  />
                </g>
              );
            })}
          </g>

          {/* Roads and paths (not clickable, so clicks reach the places below) */}
          <g fill="none" strokeLinecap="round" strokeLinejoin="round" pointerEvents="none" aria-hidden="true">
            <path d={L.paths} stroke={C.road} strokeWidth="2.4" />
            <path d={L.roadsService} stroke={C.casing} strokeWidth="6.5" />
            <path d={L.roadsStreet} stroke={C.casing} strokeWidth="11" />
            <path d={L.roadsMajor} stroke={C.casing} strokeWidth="15" />
            <path d={L.roadsService} stroke={C.road} strokeWidth="4.5" />
            <path d={L.roadsStreet} stroke={C.road} strokeWidth="9" />
            <path d={L.roadsMajor} stroke={C.road} strokeWidth="13" />
          </g>

          {/* Context buildings (not linked to any location) */}
          <g pointerEvents="none" aria-hidden="true">
            <path d={L.offCampusBuildings} fill={C.offCampus} />
            <path d={L.contextBuildings} fill={C.other} stroke={C.otherStroke} strokeWidth="0.4" />
          </g>

          {/* Soft shadow under campus buildings for depth */}
          <g transform="translate(0 1.6)" fill="#3F2E66" opacity="0.16" pointerEvents="none" aria-hidden="true">
            {geometry.buildings.map((b) => (
              <path key={b.id} d={b.d} fillRule="evenodd" />
            ))}
          </g>

          {/* Campus buildings */}
          <g>
            {geometry.buildings.map((b) => {
              const meta = placeFor(b.id);
              const selected = b.id === activeId;
              return (
                <g
                  key={b.id}
                  role="button"
                  tabIndex={0}
                  aria-label={meta.name}
                  aria-pressed={selected}
                  className="group cursor-pointer outline-none"
                  onClick={() => select(b.id)}
                  onKeyDown={(e) => onShapeKey(e, b.id)}
                  onPointerEnter={() => setHoverId(b.id)}
                  onPointerLeave={() => setHoverId(null)}
                >
                  <title>{meta.name}</title>
                  <path
                    data-shape={b.id}
                    d={b.d}
                    fillRule="evenodd"
                    vectorEffect="non-scaling-stroke"
                    className={
                      selected
                        ? "fill-[#604398] stroke-[#E3B44B] stroke-[2px]"
                        : "fill-[#EBCB7E] stroke-[#B8923F] stroke-[0.9px] transition-colors group-hover:fill-[#E0B65A] group-hover:stroke-[#946F22] group-focus-visible:fill-[#E0B65A] group-focus-visible:stroke-[#604398] group-focus-visible:stroke-[2.5px]"
                    }
                  />
                </g>
              );
            })}
          </g>

          {/* Selected outline drawn on top so neighbours never cover it */}
          {selectedShape && (
            <path
              d={selectedShape.d}
              fill="none"
              stroke={C.gold}
              strokeWidth="2.5"
              vectorEffect="non-scaling-stroke"
              pointerEvents="none"
              aria-hidden="true"
              style={{ filter: "drop-shadow(0 2px 4px rgba(64,46,102,0.45))" }}
            />
          )}

          {/* Street names */}
          <g pointerEvents="none" aria-hidden="true" fill={C.label} fontWeight="500" textAnchor="middle" dominantBaseline="central">
            {geometry.labels.map((l) => (
              <text
                key={l.text}
                transform={`translate(${l.x} ${l.y}) rotate(${l.angle})`}
                fontSize={px(11)}
                letterSpacing={px(0.4)}
              >
                {l.text}
              </text>
            ))}
          </g>

          {/* Plain labels for buildings without a pin */}
          <g pointerEvents="none" aria-hidden="true" textAnchor="middle" dominantBaseline="central">
            {[...geometry.places, ...geometry.buildings].map((s) =>
              showLabel(s.id) ? (
                <text
                  key={s.id}
                  x={s.labelX}
                  y={s.labelY}
                  fontSize={px(11)}
                  fontWeight={600}
                  fill="#3B2F5C"
                  stroke="#FFFFFF"
                  strokeWidth={px(3)}
                  paintOrder="stroke"
                  strokeLinejoin="round"
                >
                  {placeFor(s.id).mapLabel}
                </text>
              ) : null,
            )}
          </g>
        </g>
      </svg>

      {/* Pill pins (HTML so they stay crisp and are real buttons) */}
      <div className="pointer-events-none absolute inset-0">
        {pinList.map((pin) => {
          const shape = SHAPES.get(pin.id);
          if (!shape) return null;
          const pos = toScreen(shape);
          if (!pos.visible) return null;
          const selected = pin.id === activeId;
          const showName = selected || zoom >= PIN_NAME_ZOOM || pin.id === hoverId;
          const name = META.get(pin.id)?.name ?? pin.label;
          return (
            <button
              key={pin.id}
              type="button"
              aria-label={`${name}${pin.count ? `, ${pin.count} upcoming ${pin.count === 1 ? "event" : "events"}` : ""}${pin.has3D ? ", 3D room available" : ""}`}
              aria-pressed={selected}
              onClick={() => onSelect?.(pin.id)}
              onPointerEnter={() => setHoverId(pin.id)}
              onPointerLeave={() => setHoverId(null)}
              style={{ left: pos.left, top: pos.top }}
              className={`pointer-events-auto absolute flex -translate-x-1/2 -translate-y-1/2 items-center gap-1.5 whitespace-nowrap rounded-full border px-2.5 py-1 text-[12px] font-medium shadow-[0_2px_6px_rgba(38,35,50,0.14)] transition focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#604398] ${
                selected
                  ? "z-20 border-[#604398] bg-[#604398] text-white"
                  : "z-10 border-[#ebe7f0] bg-white text-[#262332] hover:border-[#604398]/40"
              }`}
            >
              <MapPin className={`h-3.5 w-3.5 ${selected ? "text-white" : "text-[#604398]"}`} />
              {showName && <span>{pin.label}</span>}
              {pin.count > 0 && (
                <span
                  className={`grid h-4.5 min-w-4.5 place-items-center rounded-full px-1 text-[11px] font-semibold ${
                    selected ? "bg-[#F7C12E] text-[#262332]" : "bg-[#604398] text-white"
                  }`}
                >
                  {pin.count}
                </span>
              )}
              {pin.has3D && (
                <Box className={`h-3.5 w-3.5 ${selected ? "text-white/80" : "text-[#777180]"}`} />
              )}
            </button>
          );
        })}
      </div>

      {/* Legend */}
      {!compact && (
      <div className="pointer-events-none absolute bottom-3 left-3 flex flex-wrap items-center gap-x-4 gap-y-1 rounded-lg border border-[#ebe7f0] bg-white/95 px-3 py-1.5 text-[11px] text-[#51475f] shadow-sm">
        <span className="flex items-center gap-1.5">
          <MapPin className="h-3.5 w-3.5 text-[#604398]" />
          Building with events
        </span>
        <span className="flex items-center gap-1.5">
          <Box className="h-3.5 w-3.5 text-[#777180]" />
          3D room available
        </span>
      </div>
      )}

      {/* North arrow + zoom controls */}
      <div className="absolute bottom-3 right-3 flex flex-col items-center gap-2">
        <div className="flex h-11 w-9 flex-col items-center justify-center rounded-lg border border-[#ebe7f0] bg-white text-[#262332] shadow-sm" aria-label="North is up" role="img">
          <span className="text-[11px] font-semibold leading-none">N</span>
          <Navigation2 className="mt-0.5 h-3.5 w-3.5 fill-current" aria-hidden="true" />
        </div>
        <div className="flex flex-col overflow-hidden rounded-lg border border-[#ebe7f0] bg-white shadow-sm">
          <button type="button" aria-label="Zoom in" onClick={() => zoomCenter(1 / 1.5)} disabled={zoom >= MAX_ZOOM - 0.01} className="grid h-9 w-9 place-items-center text-[#262332] hover:bg-[#f0e9f9] disabled:opacity-40 focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-[#604398]"><Plus size={16} aria-hidden="true" /></button>
          <button type="button" aria-label="Zoom out" onClick={() => zoomCenter(1.5)} disabled={zoom <= 1.01} className="grid h-9 w-9 place-items-center border-t border-[#ebe7f0] text-[#262332] hover:bg-[#f0e9f9] disabled:opacity-40 focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-[#604398]"><Minus size={16} aria-hidden="true" /></button>
          <button type="button" aria-label="Show whole campus" onClick={reset} className="grid h-9 w-9 place-items-center border-t border-[#ebe7f0] text-[#262332] hover:bg-[#f0e9f9] focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-[#604398]"><Maximize2 size={15} aria-hidden="true" /></button>
        </div>
      </div>

      {/* Required OpenStreetMap attribution (ODbL) */}
      <a
        href="https://www.openstreetmap.org/copyright"
        target="_blank"
        rel="noreferrer"
        className="absolute right-3 top-2 rounded bg-white/85 px-1.5 py-0.5 text-[10px] text-[#777180] hover:underline"
      >
        © OpenStreetMap contributors
      </a>
    </div>
  );
}

