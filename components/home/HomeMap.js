/*
 * components/home/HomeMap.js
 *
 * PURPOSE:
 * The real Campus Map on the homepage (app/page.js), with the same pins as
 * /map: one per building with upcoming events, plus a cube where a 3D room
 * exists. Visitors can pan and zoom; selecting a building opens it on the
 * full map (/map?place=<id>).
 *
 * Pins are built the same way as in MapExplorer (components/map/MapExplorer.js).
 */

"use client";

import { useMemo } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowRight, Box, MapPin } from "lucide-react";
import MapView, { campusFrom } from "@/components/map/Map";
import "@/components/map/map.css";

export default function HomeMap({ places, events = [], scans = {} }) {
  const router = useRouter();
  const campus = useMemo(() => campusFrom(places), [places]);

  const pins = useMemo(() => {
    const counts = new Map();
    for (const event of events) counts.set(event.mapId, (counts.get(event.mapId) ?? 0) + 1);
    const pin = (mapId, count) => {
      const feature = campus.getCampusFeature(mapId);
      return {
        id: mapId,
        name: feature?.name ?? mapId,
        label: feature?.mapLabel ?? mapId,
        count,
        has3D: Boolean(scans[mapId]),
      };
    };
    return [
      ...[...counts].map(([mapId, count]) => pin(mapId, count)),
      ...Object.keys(scans)
        .filter((mapId) => !counts.has(mapId))
        .map((mapId) => pin(mapId, 0)),
    ].sort((a, b) => b.count - a.count || a.name.localeCompare(b.name));
  }, [events, scans, campus]);

  // The busiest building, shown under the map.
  const top = pins.find((p) => p.count > 0);

  return (
    <div className="home-panel home-map campus-map">
      <MapView
        compact
        quiet
        campus={campus}
        initialFocusId={top?.id ?? null}
        pins={pins}
        selectedId={top?.id ?? null}
        onSelect={(id) => id && router.push(`/map?place=${id}`)}
      />
      {top && (
        <Link className="home-map-card" href={`/map?place=${top.id}`}>
          <MapPin size={18} />
          <div>
            <strong>{top.name}</strong>
            <small>
              {top.count} upcoming {top.count === 1 ? "event" : "events"}
              {top.has3D && (
                <>
                  {" · "}
                  <Box size={12} /> 3D room
                </>
              )}
            </small>
          </div>
          <ArrowRight size={16} />
        </Link>
      )}
    </div>
  );
}
