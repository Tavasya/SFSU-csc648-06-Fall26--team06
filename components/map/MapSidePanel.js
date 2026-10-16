/*
 * components/map/MapSidePanel.js
 *
 * PURPOSE: 
 * Provides a detailed view of events on a side panel. 
 *
 */

"use client";

import {
  BookOpen,
  Box,
  Briefcase,
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  HeartPulse,
  MapPin,
  Palette,
  Sparkles,
  Trophy,
  Users,
} from "lucide-react";
import { getCampusFeature } from "@/components/map/Map";

// Cover images for an event, picked from its first tag.
const COVERS = [
  { tags: ["Career", "Networking"], Icon: Briefcase, bg: "from-[#7b5cc4] to-[#4b2f8a]" },
  { tags: ["Technology", "Tech", "AI"], Icon: Sparkles, bg: "from-[#5b7fdb] to-[#9db4ee]" },
  { tags: ["Sports"], Icon: Trophy, bg: "from-[#e0913a] to-[#f2c14e]" },
  { tags: ["Academic", "Study"], Icon: BookOpen, bg: "from-[#3f9a8a] to-[#7fcab9]" },
  { tags: ["Arts"], Icon: Palette, bg: "from-[#d35c7a] to-[#f19aac]" },
  { tags: ["Social", "Clubs", "Free food"], Icon: Users, bg: "from-[#e0634f] to-[#f0a08f]" },
  { tags: ["Health & Wellness"], Icon: HeartPulse, bg: "from-[#3f9a6a] to-[#8fd0a8]" },
];
function coverFor(event) {
  const tag = event.tags?.[0];
  return COVERS.find((c) => c.tags.includes(tag)) ?? { Icon: CalendarDays, bg: "from-[#5b7fdb] to-[#9db4ee]" };
}

// "Thu, Oct 22 · 4:48 PM – 6:00 PM", or for multi-day events
// "Thu, Oct 22, 4:48 PM – Wed, Oct 28, 4:48 PM".
function formatWhen(event) {
  const day = (ymd) =>
    new Date(`${ymd}T12:00:00`).toLocaleDateString("en-US", {
      weekday: "short",
      month: "short",
      day: "numeric",
    });
  if (event.endDate && event.endDate !== event.date) {
    return `${day(event.date)}, ${event.startTime} – ${day(event.endDate)}, ${event.endTime}`;
  }
  return `${day(event.date)} · ${event.startTime} – ${event.endTime}`;
}

const plural = (n, word) => `${n} ${word}${n === 1 ? "" : "s"}`;

// Groups a building's events by room: named venues first (A-Z), then
// events with no venue under "Elsewhere in this building".
function groupEventsByVenue(events) {
  const groups = new Map();
  for (const event of events) {
    const key = event.venueId ?? "";
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(event);
  }
  return [...groups.entries()]
    .map(([venueId, groupEvents]) => ({
      venueId,
      label: venueId ? getCampusFeature(venueId)?.name ?? venueId : "Elsewhere in this building",
      events: groupEvents,
    }))
    .sort((a, b) => (!a.venueId ? 1 : !b.venueId ? -1 : a.label.localeCompare(b.label)));
}

function EventRow({ event }) {
  const { Icon, bg } = coverFor(event);
  return (
    <li className="flex items-start gap-3 rounded-[13px] border border-[#ebe7f0] bg-white p-3">
      <div className={`grid h-12 w-12 shrink-0 place-items-center rounded-xl bg-linear-to-br ${bg}`}>
        <Icon size={22} className="text-white" aria-hidden="true" />
      </div>
      <div className="min-w-0 flex-1">
        <h4 className="text-[14px] font-semibold leading-snug text-[#262332]">{event.title}</h4>
        <p className="mt-0.5 text-[12px] text-[#777180]">
          {formatWhen(event)}
          {event.roomNumber ? ` · Room ${event.roomNumber}` : ""}
        </p>
        <div className="mt-1.5 flex flex-wrap items-center gap-2">
          {(event.tags ?? []).slice(0, 2).map((tag) => (
            <span key={tag} className="rounded-md bg-[#f6f0fc] px-2 py-0.5 text-[11px] font-medium text-[#604398]">
              {tag}
            </span>
          ))}
          {event.rsvpCount != null && (
            <span className="flex items-center gap-1 text-[11px] text-[#777180]">
              <Users size={12} aria-hidden="true" />
              {event.rsvpCount} going
            </span>
          )}
        </div>
      </div>
    </li>
  );
}

export default function MapSidePanel({
  selection, // null, or { id, name, venue, parent, events, has3D, scannedRoom }
  buildings, // [{ id, name, count, has3D }] buildings with events in range
  rangeText, // "today" | "this week" | "coming up"
  isSample = false, // true when showing the demo events
  onSelect,
  onBack,
}) {
  return (
    <aside className="w-full shrink-0 rounded-[13px] border border-[#ebe7f0] bg-white p-5 lg:w-90">
      {!selection ? (
        <>
          <h2 className="text-[18px] font-[650] text-[#262332]">Buildings with events {rangeText}</h2>
          {buildings.length === 0 ? (
            <p className="mt-3 text-[13px] text-[#777180]">
              No events {rangeText}. Try a different time range or category.
            </p>
          ) : (
            <ul className="mt-2 divide-y divide-[#ebe7f0]">
              {buildings.map((b) => (
                <li key={b.id}>
                  <button
                    type="button"
                    onClick={() => onSelect(b.id)}
                    className="flex w-full items-center gap-3 rounded-lg px-1 py-3 text-left transition hover:bg-[#f7f5fb] focus-visible:outline-2 focus-visible:outline-[#604398]"
                  >
                    <MapPin size={18} className="text-[#604398]" aria-hidden="true" />
                    <span className="min-w-0 flex-1">
                      <span className="block text-[14px] font-medium text-[#262332]">{b.name}</span>
                      <span className="block text-[12px] text-[#777180]">
                        {plural(b.count, "upcoming event")}
                        {b.has3D ? " · 3D room" : ""}
                      </span>
                    </span>
                    <ChevronRight size={16} className="text-[#777180]" aria-hidden="true" />
                  </button>
                </li>
              ))}
            </ul>
          )}
        </>
      ) : (
        <>
          <button
            type="button"
            onClick={onBack}
            className="-ml-1 flex items-center gap-1 rounded px-1 py-1 text-[13px] font-medium text-[#604398] hover:text-[#503581] focus-visible:outline-2 focus-visible:outline-[#604398]"
          >
            <ChevronLeft size={16} aria-hidden="true" />
            Back to full map
          </button>
          <h2 className="mt-2 text-[20px] font-bold leading-tight tracking-[-0.3px] text-[#262332]">
            {selection.name}
          </h2>

          {/* A venue says which building it's in. That building is highlighted. */}
          {selection.venue && selection.parent && (
            <p className="mt-1 text-[13px] text-[#51475f]">
              {selection.venue.relation === "at" ? "At " : "Inside "}
              <button
                type="button"
                onClick={() => onSelect(selection.parent.id)}
                className="font-medium text-[#604398] underline underline-offset-2 hover:text-[#503581] focus-visible:outline-2 focus-visible:outline-[#604398]"
              >
                {selection.parent.name}
              </button>{" "}
              (highlighted on the map)
            </p>
          )}

          <p className="mt-2 text-[13px] text-[#777180]">
            {plural(selection.events.length, "upcoming event")} {rangeText}
            {isSample ? " · sample data" : ""}
          </p>

          <div className="mt-4">
            {selection.events.length === 0 && (
              <p className="rounded-[13px] border border-dashed border-[#ebe7f0] p-4 text-center text-[13px] text-[#777180]">
                No upcoming events here {rangeText}.
              </p>
            )}
            {groupEventsByVenue(selection.events).map((group, i, groups) => (
              <section key={group.venueId || "elsewhere"} className="mb-4">
                {!selection.venue && (groups.length > 1 || group.venueId) && (
                  <h3 className="mb-2 flex items-center justify-between text-[12px] font-semibold uppercase tracking-wide text-[#604398]">
                    <span>{group.label}</span>
                    <span className="font-normal normal-case tracking-normal text-[#777180]">
                      {plural(group.events.length, "event")}
                    </span>
                  </h3>
                )}
                <ul className="space-y-2.5">
                  {group.events.map((event) => (
                    <EventRow key={event.id} event={event} />
                  ))}
                </ul>
              </section>
            ))}
          </div>

          {selection.has3D && (
            <div className="mt-2 rounded-[13px] bg-[#f3eefa] p-4">
              <p className="flex items-center gap-2 text-[14px] font-semibold text-[#262332]">
                <Box size={18} className="text-[#604398]" aria-hidden="true" />
                3D room scan available
              </p>
              {selection.scannedRoom && (
                <p className="mt-1 text-[13px] text-[#777180]">{selection.scannedRoom}</p>
              )}
              <button
                type="button"
                aria-disabled="true"
                title="3D room scans are coming soon"
                className="mt-3 inline-flex cursor-not-allowed items-center gap-1.5 rounded-full bg-[#604398] px-4 py-2 text-[12px] font-[550] text-white opacity-80"
              >
                <Box size={14} aria-hidden="true" />
                Explore in 3D
              </button>
              <span className="ml-2 text-[11px] text-[#777180]">Coming soon</span>
            </div>
          )}
        </>
      )}
    </aside>
  );
}
