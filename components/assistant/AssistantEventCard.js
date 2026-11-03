/*
 * components/assistant/AssistantEventCard.js
 *
 * PURPOSE:
 * One event in Allison's answers. It looks like the Explore events cards
 * (components/gatoraid/EventSearch.js) and adds actions right on the card:
 * Save, Interested, Going (RSVP), a 3D venue preview and View details.
 *
 * Save and RSVP use the same APIs as the event page (components/student/EventActions.js):
 *  - PUT / DELETE /api/events/[eventId]/saved
 *  - PUT /api/events/[eventId]/rsvps/me  { status }
 * The 3D preview (VenuePreview) opens in the grid cell next to the card, using the embed page
 * (/rooms/[roomId]/embed?autostart=1) so the viewer runs in its own frame and
 * never takes over the chat's mouse.
 *
 * There is no "remove RSVP" API, so tapping Interested or Going again sets
 * "not_attending", which the calendar and Saved page already treat as no RSVP.
 */

"use client";

import { useState } from "react";
import Link from "next/link";
import { Bookmark, BookmarkCheck, Box, CalendarDays, Check, MapPin, Star, X } from "lucide-react";
import { bannerFor, bannerStyle, orderedCategoryNames } from "@/lib/events/banner";
import { canAttend } from "@/lib/student/validation";
import { studentRequest } from "@/components/student/useStudentData";

const DATE = new Intl.DateTimeFormat("en-US", {
  weekday: "short", month: "short", day: "numeric", hour: "numeric", minute: "2-digit",
  timeZone: "America/Los_Angeles",
});

function EventActions({ event, status, onStatus }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const base = `/api/events/${event.id}`;
  const rsvp = status?.rsvp ?? null;

  async function run(request, update) {
    setBusy(true);
    setError("");
    try {
      const result = await request();
      onStatus(event.id, update(result));
    } catch (err) {
      setError(err.status === 401 ? "Sign in to save or RSVP." : err.message);
    } finally {
      setBusy(false);
    }
  }

  const toggleSave = () => run(
    () => studentRequest(`${base}/saved`, { method: status?.saved ? "DELETE" : "PUT" }),
    (result) => ({ saved: result.saved }),
  );
  const setRsvp = (next) => run(
    () => studentRequest(`${base}/rsvps/me`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: rsvp === next ? "not_attending" : next }),
    }),
    (result) => ({ rsvp: result.rsvp?.status === "not_attending" ? null : result.rsvp?.status ?? null }),
  );

  return (
    <div className="ga-assistant-card-rsvp">
      <div role="group" aria-label={`Save or RSVP to ${event.title}`}>
        <button type="button" disabled={busy || !status} aria-pressed={Boolean(status?.saved)} onClick={toggleSave}>
          {status?.saved ? <BookmarkCheck size={14} /> : <Bookmark size={14} />}
          {status?.saved ? "Saved" : "Save"}
        </button>
        <button type="button" disabled={busy || !status} aria-pressed={rsvp === "interested"} onClick={() => setRsvp("interested")}>
          <Star size={14} /> Interested
        </button>
        <button
          type="button"
          disabled={busy || !status || (!canAttend(event) && rsvp !== "attending")}
          aria-pressed={rsvp === "attending"}
          onClick={() => setRsvp("attending")}
        >
          <Check size={14} /> Going
        </button>
      </div>
      {error && <p role="alert" className="ga-assistant-card-error">{error}</p>}
    </div>
  );
}

// The 3D preview that sits in the grid cell next to its card
// (placement: lib/assistant/grid.js).
export function VenuePreview({ event, onClose }) {
  const [index, setIndex] = useState(0);
  const room = event.rooms[Math.min(index, event.rooms.length - 1)];
  return (
    <section className="ga-card ga-assistant-preview" aria-label={`3D preview for ${event.title}`}>
      <header>
        <div>
          <h3><Box size={15} /> 3D preview · {event.locations?.building_name}</h3>
          <p className="ga-muted">A scanned room in this building; it may not be the exact room for {event.title}.</p>
        </div>
        <button type="button" className="ga-assistant-icon-button" onClick={onClose} aria-label="Close 3D preview">
          <X size={16} />
        </button>
      </header>
      {event.rooms.length > 1 && (
        <div className="ga-chip-group" role="group" aria-label="Scanned rooms">
          {event.rooms.map((r, i) => (
            <button key={r.id} type="button" className="ga-chip" aria-pressed={i === index} onClick={() => setIndex(i)}>
              {r.name}
            </button>
          ))}
        </div>
      )}
      <iframe key={room.id} src={`/rooms/${room.id}/embed?autostart=1`} title={`3D view of ${room.name}`} allow="fullscreen" />
    </section>
  );
}

export default function AssistantEventCard({
  event, // an event from POST /api/assistant (includes `rooms`: 3D scans of its building)
  categories, // [{ id, name }]
  status, // { saved, rsvp } for the signed-in student, or undefined while loading
  onStatus, // (eventId, changes) => void
  previewOpen, // is this card's 3D preview the one showing?
  onPreview, // () => void, toggles this card's 3D preview
}) {
  const categoryNames = orderedCategoryNames(event.category_ids, categories);
  const banner = bannerFor(categoryNames[0]);
  // ?from=assistant makes the event page's back arrow return to this chat.
  const href = `/events/${event.id}?from=assistant`;

  return (
    <article className="ga-card ga-public-card ga-assistant-card">
      <Link href={href} className="ga-assistant-card-link">
        <div className="ga-cover" style={bannerStyle(banner)}>
          <banner.Icon size={45} />
        </div>
        <div className="ga-chip-group ga-public-card-chips">
          {categoryNames.map((name) => <span className="ga-badge" key={name}>{name}</span>)}
        </div>
        <h2>{event.title}</h2>
        <p className="ga-muted"><CalendarDays size={15} />{DATE.format(new Date(event.start_date_time))}</p>
        <p><MapPin size={15} />{event.room_number ? `${event.room_number}, ` : ""}{event.locations?.building_name}</p>
        <div className="ga-assistant-card-tags">
          <span className="ga-badge price-badge">{event.admission_type === "free" ? "Free" : "Paid"}</span>
          <span className="ga-badge">{event.rsvp_required ? "RSVP required" : "Drop-in"}</span>
        </div>
      </Link>

      <EventActions event={event} status={status} onStatus={onStatus} />

      <div className="ga-assistant-card-actions">
        {event.rooms?.length > 0 && (
          <button type="button" className="ga-button" aria-expanded={previewOpen} onClick={onPreview}>
            <Box size={14} /> {previewOpen ? "Hide 3D preview" : "Preview venue in 3D"}
          </button>
        )}
        <Link className="ga-button secondary" href={href}>View details</Link>
      </div>
    </article>
  );
}
