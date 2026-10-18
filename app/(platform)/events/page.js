import Link from "next/link";
import { CalendarDays, MapPin } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import EventSearch from "@/components/gatoraid/EventSearch";
import {
  bannerFor,
  bannerStyle,
  orderedCategoryNames,
} from "@/lib/events/banner";
export default async function Page() {
  const db = await createClient();

  // Category names are needed to pick each event's banner (its first category).
  const [{ data: events, error }, { data: categories }] =
    await Promise.all([
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
        <p role="alert">
          Could not load events. Please refresh.
        </p>
      ) : events?.length > 0 ? (
        // EventSearch handles filtering and renders the event cards.
        <EventSearch
          events={events}
          categories={categories ?? []}
        />
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
