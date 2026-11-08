import Image from "next/image";
import {
  CalendarDays,
  Clock,
  MapPin,
  Users,
  Accessibility,
  Mail,
  ArrowLeft,
  Megaphone,
  Pencil,
} from "lucide-react";
import Link from "next/link";
import EventPlacePreview from "@/components/map/EventPlacePreview";
import EventActions from "@/components/student/EventActions";
import { accessibilityText } from "@/lib/events/accessibility";
import {
  bannerFor,
  bannerStyle,
  orderedCategoryNames,
} from "@/lib/events/banner";
export default function EventDetails({
  event,
  categories,
  location,
  coverUrl,
  hostName,
  preview = false,
  isHost = false, // the signed-in user created this event
  rooms = [],
  places, // the Campus Map places, for the Location section's small map
  from = null, // "assistant" when opened from the AI Assistant (Allison)
}) {
  // Categories in the host's order; the first one picks the banner.
  const categoryNames = orderedCategoryNames(event.category_ids, categories);
  const banner = bannerFor(categoryNames[0]);
  const fmt = (v, opts) =>
    new Intl.DateTimeFormat("en-US", {
      timeZone: "America/Los_Angeles",
      ...opts,
    }).format(new Date(v));
  // We don't verify SFSU clubs yet, so events show the host's own name.
  const host = hostName || "GatorAid organizer";
  // Opens a new email to the host, with the event in the subject.
  const mailto =
    event.contact_email &&
    "mailto:" + event.contact_email + "?subject=" + encodeURIComponent("Question about " + event.title);
  return (
    <>
      <Link
        className="ga-back"
        href={preview ? "/host/events" : from === "assistant" ? "/assistant" : "/events"}
      >
        <ArrowLeft size={16} />
        {preview ? "Back to your events" : from === "assistant" ? "Back to chat with Allison" : "Back to events"}
      </Link>
      {/* The host sees their own event as theirs, with links to manage it. */}
      {isHost && !preview && (
        <div className="ga-preview-bar ga-host-bar">
          <span>
            <Megaphone size={17} /> You&apos;re hosting this event. Students see this page as shown below.
          </span>
          <div className="ga-actions">
            <Link className="ga-button secondary" href={"/host/events/" + event.id + "/edit"}>
              <Pencil size={14} /> Edit event
            </Link>
            <Link className="ga-button" href="/host/events">
              Your events
            </Link>
          </div>
        </div>
      )}
      <div className="ga-detail-grid">
        <div>
          <div
            className="ga-detail-cover ga-cover"
            style={coverUrl ? undefined : bannerStyle(banner)}
          >
            {coverUrl ? (
              <Image
                unoptimized
                width={1440}
                height={800}
                src={coverUrl}
                alt={"Cover for " + event.title}
              />
            ) : (
              <banner.Icon size={80} />
            )}
            <span className="ga-date-tile">
              {fmt(event.start_date_time, { month: "short" })}
              <strong>{fmt(event.start_date_time, { day: "numeric" })}</strong>
            </span>
          </div>
          <div className="ga-chip-group">
            {categoryNames.map((name) => (
              <span className="ga-badge" key={name}>
                {name}
              </span>
            ))}
          </div>
          <h1>{event.title}</h1>
          <p className="ga-muted">Hosted by {host}</p>
          <div className="ga-detail-facts">
            {[
              [
                CalendarDays,
                fmt(event.start_date_time, {
                  weekday: "long",
                  month: "long",
                  day: "numeric",
                  year: "numeric",
                }),
              ],
              [
                Clock,
                fmt(event.start_date_time, {
                  hour: "numeric",
                  minute: "2-digit",
                }) +
                  " – " +
                  fmt(event.end_date_time, {
                    hour: "numeric",
                    minute: "2-digit",
                  }) +
                  " PT",
              ],
              [
                MapPin,
                (location?.building_name || "Campus location") +
                  (event.room_number ? ", " + event.room_number : ""),
              ],
              [Users, event.audience],
              [
                Accessibility,
                accessibilityText({ wheelchair: event.wheelchair_accessible, asl: event.asl_available }),
              ],
              [
                Mail,
                mailto ? (
                  <a className="ga-detail-email" href={mailto}>
                    {event.contact_email}
                  </a>
                ) : (
                  "No contact email listed"
                ),
              ],
            ].map(([Icon, value], i) => (
              <div key={i}>
                <Icon size={19} />
                <span>{value}</span>
              </div>
            ))}
          </div>
          <section className="ga-detail-section">
            <h2>About this event</h2>
            <p>{event.description}</p>
          </section>
          <section className="ga-detail-section">
            <h2>Location</h2>
            <div className="ga-location-info">
              <MapPin size={26} />
              <div>
                <strong>{location?.building_name}</strong>
                <p>{location?.description}</p>
                {event.room_number && <p>{event.room_number}</p>}
              </div>
            </div>
            <EventPlacePreview
              buildingName={location?.building_name}
              eventId={preview ? null : event.id}
              rooms={rooms}
              places={places}
            />
          </section>
        </div>
        <aside className="ga-card ga-registration">
          <h2>{event.admission_type === "free" ? "Free" : "Paid admission"}</h2>
          <p className="ga-muted">
            {event.capacity
              ? event.capacity + " attendee capacity"
              : "Open capacity"}
          </p>
          <span className="ga-badge">
            {event.rsvp_required ? "RSVP required" : "No RSVP required"}
          </span>
          <p className="ga-muted ga-small">
            {preview
              ? "This is how your event will appear to students."
              : "Manage your saved event and RSVP below."}
          </p>
          {!preview && !isHost && <EventActions event={event} />}
          {isHost && !preview && (
            <p className="ga-small ga-muted">
              Hosts can&apos;t save or RSVP to their own events. See how many students are coming on{" "}
              <Link href="/host/events">Your events</Link>.
            </p>
          )}
        </aside>
      </div>
    </>
  );
}
