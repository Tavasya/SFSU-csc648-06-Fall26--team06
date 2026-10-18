/*
 * components/map/MapEventDetail.js
 *
 * PURPOSE:
 * The event detail view inside the map's side panel. It opens when someone
 * clicks an event in a building's list and shows the same information as the
 * full event page (components/gatoraid/EventDetails.js), sized for the panel:
 * cover, categories, date and time, location and room, audience,
 * accessibility, contact, description and admission / RSVP info.
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
  Hand,
  Mail,
  MapPin,
  Users,
} from "lucide-react";
import { formatLongDate } from "@/lib/map/events";
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
      text: `${placeName || "Campus location"}${event.roomNumber ? `, Room ${event.roomNumber}` : ""}`,
      detail: event.locationDescription,
    },
    { Icon: Users, text: event.audience },
    {
      Icon: Accessibility,
      text: event.wheelchairAccessible ? "Wheelchair accessible" : "Contact organizer for access information",
    },
    event.aslAvailable && { Icon: Hand, text: "ASL interpretation available" },
    { Icon: Mail, text: event.contactEmail || "Contact the event organizer" },
  ].filter(Boolean);

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

      {/* Admission and RSVP (same wording as the full event page) */}
      <section className="mt-5 rounded-[13px] border border-[#ebe7f0] bg-[#fbfafd] p-4">
        <h4 className="text-[15px] font-semibold text-[#262332]">
          {event.admissionType === "paid" ? "Paid admission" : "Free admission"}
        </h4>
        <p className="mt-0.5 text-[12px] text-[#777180]">
          {event.capacity ? `${event.capacity} attendee capacity` : "Open capacity"}
        </p>
        <span className="mt-2 inline-block rounded-md bg-[#f6f0fc] px-2 py-0.5 text-[11px] font-medium text-[#604398]">
          {event.rsvpRequired ? "RSVP required" : "No RSVP required"}
        </span>
        <p className="mt-2 text-[12px] text-[#777180]">
          RSVP is not available yet. Contact the organizer for registration details.
        </p>
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
        {event.contactEmail && (
          <a
            href={`mailto:${event.contactEmail}`}
            className="inline-flex items-center gap-1.5 rounded-full border border-[#ebe7f0] bg-white px-4 py-2 text-[13px] font-medium text-[#262332] hover:border-[#d9cfe8] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#604398]"
          >
            <Mail size={15} aria-hidden="true" />
            Contact organizer
          </a>
        )}
      </div>
    </article>
  );
}
