import Image from "next/image";
import {
  CalendarDays,
  Clock,
  MapPin,
  Users,
  Accessibility,
  Mail,
  ArrowLeft,
} from "lucide-react";
import Link from "next/link";
import EventPlacePreview from "@/components/map/EventPlacePreview";
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
  rooms = [],
  places, // the Campus Map places, for the Location section's small map
}) {
  // Categories in the host's order; the first one picks the banner.
  const categoryNames = orderedCategoryNames(event.category_ids, categories);
  const banner = bannerFor(categoryNames[0]);
  const fmt = (v, opts) =>
    new Intl.DateTimeFormat("en-US", {
      timeZone: "America/Los_Angeles",
      ...opts,
    }).format(new Date(v));
  return (
    <>
      <Link className="ga-back" href={preview ? "/host/events" : "/events"}>
        <ArrowLeft size={16} />
        {preview ? "Back to My Events" : "Back to events"}
      </Link>
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
          <p className="ga-muted">Hosted by {hostName || "SFSU organizer"}</p>
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
                event.wheelchair_accessible
                  ? "Wheelchair accessible"
                  : "Contact organizer for access information",
              ],
              [Mail, event.contact_email || "Contact the event organizer"],
            ].map(([Icon, value]) => (
              <div key={value}>
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
              : "RSVP is not available yet. Contact the organizer for registration details."}
          </p>
          {event.contact_email && (
            <a
              className="ga-button secondary"
              href={"mailto:" + event.contact_email}
            >
              Contact organizer
            </a>
          )}
        </aside>
      </div>
    </>
  );
}
