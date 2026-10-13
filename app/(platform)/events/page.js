import Link from "next/link";
import { CalendarDays, MapPin } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
export default async function Page() {
  const db = await createClient();
  const { data: events, error } = await db
    .from("events")
    .select("*, locations(building_name)")
    .eq("publication_status", "published")
    .eq("status", "active")
    .gte("end_date_time", new Date().toISOString())
    .order("start_date_time");
  return (
    <>
      <div className="ga-heading">
        <div>
          <h1>Explore campus events</h1>
          <p className="ga-muted">
            Find your people. Try something new. Show up.
          </p>
        </div>
      </div>

      {error ? (
        <p role="alert">Could not load events. Please refresh.</p>
      ) : events.length ? (
        <div className="ga-public-grid">
          {events.map((e) => (
            <Link
              href={"/events/" + e.id}
              className="ga-card ga-public-card"
              key={e.id}
            >
              <div className="ga-cover">
                <CalendarDays size={45} />
              </div>
              <h2>{e.title}</h2>
              <p className="ga-muted">
                {new Date(e.start_date_time).toLocaleDateString("en-US", {
                  month: "long",
                  day: "numeric",
                  timeZone: "America/Los_Angeles",
                })}
              </p>
              <p>
                <MapPin size={15} />
                {e.locations?.building_name}
              </p>
              <span className="ga-badge">
                {e.admission_type === "free" ? "Free" : "Paid"}
              </span>
            </Link>
          ))}
        </div>
      ) : (
        <div className="ga-empty ga-card">
          <CalendarDays size={40} />
          <h2>Campus possibilities, coming soon</h2>
          <p className="ga-muted">
            Published events will appear here. Hosts can start by creating a
            draft.
          </p>
          <Link className="ga-button" href="/host/events">
            Open organizer dashboard
          </Link>
        </div>
      )}
    </>
  );
}
