import Link from "next/link";
import { CalendarDays, MapPin } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import {
  bannerFor,
  bannerStyle,
  orderedCategoryNames,
} from "@/lib/events/banner";
export default async function Page() {
  const db = await createClient();
  // Category names are needed to pick each event's banner (its first category).
  const [{ data: events, error }, { data: categories }] = await Promise.all([
    db
      .from("events")
      .select("*, locations(building_name)")
      .eq("publication_status", "published")
      .eq("status", "active")
      .gte("end_date_time", new Date().toISOString())
      .order("start_date_time"),
    db.from("categories").select("id, name"),
  ]);
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
          {events.map((e) => {
            const categoryNames = orderedCategoryNames(e.category_ids, categories);
            const banner = bannerFor(categoryNames[0]);
            return (
              <Link
                href={"/events/" + e.id}
                className="ga-card ga-public-card"
                key={e.id}
              >
                <div className="ga-cover" style={bannerStyle(banner)}>
                  <banner.Icon size={45} />
                </div>
                <div className="ga-chip-group  ga-public-card-chips">
                  {categoryNames.map((name) => (
                    <span className="ga-badge" key={name}>
                      {name}
                    </span>
                  ))}
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
                <span className="ga-badge price-badge">
                 {e.eventCategories === "free" ? "Free" : "Paid"}
                </span>
              </Link>
            );
          })}
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
