import Link from "next/link";
import { Plus, CalendarDays, FileText, Users, Bookmark, ArrowRight, Check, Star } from "lucide-react";
import { pageContext } from "@/lib/events/page-data";
import { engagementTotals, withEngagement } from "@/lib/events/engagement";
import Access from "@/components/gatoraid/Access";
import EventTable from "@/components/gatoraid/EventTable";
export default async function Page() {
  const { db, user, host } = await pageContext();
  let events = [],
    error = null;
  if (host) {
    const result = await db
      .from("events")
      .select("*, locations(building_name)")
      .eq("host_id", user.id)
      .order("start_date_time");
    // Each event gets its saves and RSVP counts (counts only, never who).
    events = await withEngagement(db, result.data || []);
    error = result.error;
  }
  // The organizer's own plans as a student (their saves and RSVPs), linking to Your plans.
  let plans = null;
  if (user) {
    const [savedResult, rsvpResult] = await Promise.all([
      db.from("saved_events").select("event_id").eq("user_id", user.id),
      db.from("event_rsvps").select("status").eq("user_id", user.id),
    ]);
    if (!savedResult.error && !rsvpResult.error) {
      const count = (status) => rsvpResult.data.filter((r) => r.status === status).length;
      plans = { going: count("attending"), interested: count("interested"), saved: savedResult.data.length };
    }
  }
  const upcoming = events.filter(
      (e) =>
        e.publication_status === "published" &&
        new Date(e.end_date_time) > new Date(),
    ).length,
    drafts = events.filter((e) => e.publication_status === "draft").length,
    totals = engagementTotals(events);
  return (
    <>
      <div className="ga-heading">
        <div>
          <p className="ga-muted">{host?.display_name || "SFSU organizers"}</p>
          <h1>Your events</h1>
          <p className="ga-muted">
            Create, manage and track your campus events.
          </p>
        </div>
        <Link className="ga-button" href="/host/events/new">
          <Plus size={17} />
          Create event
        </Link>
      </div>
      <div className="ga-stats">
        {[
          [
            CalendarDays,
            "Upcoming events",
            upcoming,
            "Published and coming up",
          ],
          [FileText, "Drafts", drafts, "Your ideas in progress"],
          [
            Users,
            "RSVPs",
            totals ? totals.attending : "—",
            totals
              ? `Attending · ${totals.interested} interested`
              : "Could not load RSVPs right now",
          ],
          [
            Bookmark,
            "Saves",
            totals ? totals.saves : "—",
            totals
              ? "Students who saved your events"
              : "Could not load saves right now",
          ],
        ].map(([Icon, label, value, sub]) => (
          <div className="ga-card" key={label}>
            <div>
              {label}
              <Icon size={18} />
            </div>
            <strong>{value}</strong>
            <small>{sub}</small>
          </div>
        ))}
      </div>
      {!host ? (
        <Access user={user} />
      ) : error ? (
        <p role="alert" className="ga-notice">
          Could not load your events. Refresh to try again.
        </p>
      ) : (
        <EventTable initialEvents={events} />
      )}
      {plans && (
        <Link className="ga-card ga-plans-link" href="/saved">
          <div>
            <h2>Your plans</h2>
            <p className="ga-muted">Events you&apos;re going to, interested in or saved as a student.</p>
          </div>
          <ul>
            <li>
              <Check size={16} /> <strong>{plans.going}</strong> going
            </li>
            <li>
              <Star size={16} /> <strong>{plans.interested}</strong> interested
            </li>
            <li>
              <Bookmark size={16} /> <strong>{plans.saved}</strong> saved
            </li>
          </ul>
          <span className="ga-text-button">
            View your plans <ArrowRight size={15} />
          </span>
        </Link>
      )}
    </>
  );
}
