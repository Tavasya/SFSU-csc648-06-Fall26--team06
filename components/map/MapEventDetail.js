/*
 * components/map/MapEventDetail.js
 *
 * PURPOSE:
 * The event detail view inside the map's side panel. It opens when someone
 * clicks an event in a building's list and shows the same information as the
 * full event page (components/gatoraid/EventDetails.js), sized for the panel:
 * cover, categories, date and time, location and room, audience,
 * accessibility, host and contact email, description, admission, and the
 * Save / RSVP buttons (MapEventActions.js).
 *
 */

"use client";

import { useEffect, useRef } from "react";
import Image from "next/image";
import Link from "next/link";
import {
  Accessibility,
  ArrowRight,
  CalendarDays,
  ChevronLeft,
  Clock,
  Mail,
  MapPin,
  Users,
} from "lucide-react";
import { formatLongDate } from "@/lib/map/events";
import MapEventActions from "@/components/map/MapEventActions";
import { accessibilityText } from "@/lib/events/accessibility";
import { bannerFor, bannerStyle } from "@/lib/events/banner";

// Banner for an event without an uploaded cover: its first tag picks the colors
// and icon, using the same rule as Explore events (lib/events/banner.js).
export function coverFor(event) {
  const banner = bannerFor(event.tags?.[0]);
  return { Icon: banner.Icon, style: bannerStyle(banner) };
}

// "Oct" and "22" for the small date tile on the cover.
function dateTile(date) {
  const d = new Date(`${date}T12:00:00`);
  return {
    month: d.toLocaleDateString("en-US", { month: "short" }),
    day: d.toLocaleDateString("en-US", { day: "numeric" }),
  };
}

export default function MapEventDetail({
  event,
  placeName, // where the event is, e.g. "Jack Adams Hall" or "Burk Hall"
  backLabel, // the building / room the list belongs to
  isSample = false,
  onBack,
}) {
  const headingRef = useRef(null);
  const { Icon, style } = coverFor(event);
  const tile = dateTile(event.date);

  // Move keyboard / screen reader focus to the event title when it opens.
  useEffect(() => {
    headingRef.current?.focus();
  }, [event.id]);

  const facts = [
    { Icon: CalendarDays, text: formatLongDate(event) },
    {
      Icon: Clock,
      // Multi-day events: "4:48 PM – 4:48 PM" would be confusing, so say which is which.
      text:
        event.endDate && event.endDate !== event.date
          ? `Starts ${event.startTime} · Ends ${event.endTime} PT`
          : `${event.startTime} – ${event.endTime} PT`,
    },
    {
      Icon: MapPin,
      text: `${placeName || "Campus location"}${event.roomNumber ? `, ${event.roomNumber}` : ""}`,
      detail: event.locationDescription,
    },
    { Icon: Users, text: event.audience },
    {
      Icon: Accessibility,
      text: accessibilityText({ wheelchair: event.wheelchairAccessible, asl: event.aslAvailable }),
    },
  ];

  // We don't verify SFSU clubs yet, so events show the host's own name.
  const hostName = event.hostName || "GatorAid organizer";
  const mailto =
    event.contactEmail &&
    `mailto:${event.contactEmail}?subject=${encodeURIComponent(`Question about ${event.title}`)}`;

  return (
    <article aria-labelledby="map-event-title">
      <button
        type="button"
        onClick={onBack}
        className="-ml-1 flex items-center gap-1 rounded px-1 py-1 text-[13px] font-medium text-[#604398] hover:text-[#503581] focus-visible:outline-2 focus-visible:outline-[#604398]"
      >
        <ChevronLeft size={16} aria-hidden="true" />
        Back to {backLabel}
      </button>

      {/* Cover: the uploaded image, or a colored tile based on the category */}
      <div className="relative mt-3 grid h-36 place-items-center overflow-hidden rounded-[13px]" style={style}>
        {event.coverUrl ? (
          <Image unoptimized fill src={event.coverUrl} alt={`Cover for ${event.title}`} className="object-cover" />
        ) : (
          <Icon size={44} className="text-white/90" aria-hidden="true" />
        )}
        <span className="absolute left-3 top-3 rounded-lg bg-white px-2.5 py-1 text-center text-[11px] font-semibold uppercase leading-tight text-[#604398] shadow-sm">
          {tile.month}
          <span className="block text-[18px] text-[#262332]">{tile.day}</span>
        </span>
      </div>

      {event.tags?.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-1.5">
          {event.tags.map((tag) => (
            <span key={tag} className="rounded-md bg-[#f6f0fc] px-2 py-0.5 text-[11px] font-medium text-[#604398]">
              {tag}
            </span>
          ))}
        </div>
      )}

      <h3
        id="map-event-title"
        ref={headingRef}
        tabIndex={-1}
        className="mt-2 text-[20px] font-bold leading-tight tracking-[-0.3px] text-[#262332] outline-none"
      >
        {event.title}
      </h3>
      {isSample && <p className="mt-1 text-[12px] text-[#777180]">Sample event</p>}

      {/* Host right under the title; the email link opens a new message */}
      <div className="mt-3 flex items-center gap-3 rounded-[13px] bg-[#F5F1FA] p-3 text-[13px]">
        <span
          className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-[#604398] text-[14px] font-semibold text-white"
          aria-hidden="true"
        >
          {hostName[0].toUpperCase()}
        </span>
        <div className="min-w-0">
          <p className="text-[#51475f]">
            Hosted by <span className="font-semibold text-[#262332]">{hostName}</span>
            {event.hostedByYou && " (you)"}
          </p>
          {mailto ? (
            <a
              href={mailto}
              className="flex items-center gap-1 break-all text-[12px] text-[#604398] underline underline-offset-2 hover:text-[#503581]"
            >
              <Mail size={13} className="shrink-0" aria-hidden="true" />
              {event.contactEmail}
            </a>
          ) : (
            <p className="text-[12px] text-[#777180]">No contact email listed</p>
          )}
        </div>
      </div>

      <ul className="mt-4 space-y-2.5">
        {facts.map(({ Icon: FactIcon, text, detail }) => (
          <li key={text} className="flex gap-2.5 text-[13px] text-[#51475f]">
            <FactIcon size={17} className="mt-px shrink-0 text-[#604398]" aria-hidden="true" />
            <span>
              {text}
              {detail && <span className="mt-0.5 block text-[12px] text-[#777180]">{detail}</span>}
            </span>
          </li>
        ))}
      </ul>

      <section className="mt-5">
        <h4 className="text-[14px] font-semibold text-[#262332]">About this event</h4>
        <p className="mt-1.5 whitespace-pre-line text-[13px] text-[#51475f]">{event.description}</p>
      </section>

      {/* Admission, capacity and the Save / Interested / Going buttons */}
      <section className="mt-5 rounded-[13px] border border-[#ebe7f0] bg-[#fbfafd] p-4">
        <p className="flex flex-wrap items-center gap-x-2 gap-y-1 text-[13px] text-[#51475f]">
          <span className="font-semibold text-[#262332]">
            {event.admissionType === "paid" ? "Paid admission" : "Free admission"}
          </span>
          <span aria-hidden="true">·</span>
          <span>
            {event.capacity
              ? event.attendingCount != null
                ? `${Math.min(event.attendingCount, event.capacity)} of ${event.capacity} spots taken`
                : `${event.capacity} spots`
              : "Open capacity"}
          </span>
          <span aria-hidden="true">·</span>
          <span>{event.rsvpRequired ? "RSVP required" : "No RSVP required"}</span>
        </p>
        {isSample ? (
          <p className="mt-2 text-[12px] text-[#777180]">This is a sample event, so saving and RSVP are turned off.</p>
        ) : (
          <MapEventActions event={event} returnTo={`/map?place=${event.venueId ?? event.mapId}&event=${event.id}`} />
        )}
      </section>

      <div className="mt-4 flex flex-wrap gap-2">
        {!isSample && (
          <Link
            href={`/events/${event.id}`}
            className="inline-flex items-center gap-1.5 rounded-full bg-[#604398] px-4 py-2 text-[13px] font-medium text-white hover:bg-[#503581] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#604398]"
          >
            View full event page
            <ArrowRight size={15} aria-hidden="true" />
          </Link>
        )}
      </div>
    </article>
  );
}
