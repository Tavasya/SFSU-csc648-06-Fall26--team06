"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import {
  CalendarDays,
  MapPin,
  Search,
  X,
  ChevronDown,
} from "lucide-react";
import {
  bannerFor,
  bannerStyle,
  orderedCategoryNames,
} from "@/lib/events/banner";

function dateInPacificTime(value) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Los_Angeles",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date(value));

  const part = (type) =>
    parts.find((item) => item.type === type)?.value;

  return `${part("year")}-${part("month")}-${part("day")}`;
}

export default function EventSearch({ events, categories }) {
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("");
  const [date, setDate] = useState("");
  const [location, setLocation] = useState("");

  const locations = useMemo(
    () =>
      [
        ...new Set(
          events
            .map((event) => event.locations?.building_name)
            .filter(Boolean)
        ),
      ].sort((a, b) => a.localeCompare(b)),
    [events]
  );

  const filteredEvents = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();

    return events.filter((event) => {
      const categoryNames = orderedCategoryNames(
        event.category_ids,
        categories
      );

      const searchableText = [
        event.title,
        event.description,
        event.locations?.building_name,
        ...categoryNames,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      const matchesQuery =
        !normalizedQuery ||
        searchableText.includes(normalizedQuery);

      const matchesCategory =
        !category || categoryNames.includes(category);

      const matchesDate =
        !date ||
        dateInPacificTime(event.start_date_time) === date;

      const matchesLocation =
        !location ||
        event.locations?.building_name === location;

      return (
        matchesQuery &&
        matchesCategory &&
        matchesDate &&
        matchesLocation
      );
    });
  }, [events, categories, query, category, date, location]);

  function clearFilters() {
    setQuery("");
    setCategory("");
    setDate("");
    setLocation("");
  }

  const hasFilters = Boolean(
    query || category || date || location
  );

  return (
    <section
      className="space-y-5"
      aria-label="Search campus events"
    >
      <div className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-4">

        {/* Search bar */}
        <div className="relative lg:col-span-4">
          <Search
            size={19}
            className="absolute left-3 top-1/2 -translate-y-1/2 ga-muted"
          />

          <input
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search events, topics, or keywords..."
            aria-label="Search events by keyword"
            style={{ paddingLeft: "48px" }}
            className="w-full rounded-lg border border-gray-300 bg-white py-3 pr-3 text-sm text-gray-900"
          />
        </div>

        {/* Category filter */}
        <div className="relative min-w-0">
          <select
            value={category}
            onChange={(event) => setCategory(event.target.value)}
            aria-label="Filter by category"
            className="w-full appearance-none rounded-lg border border-gray-300 bg-white py-3 pl-3 pr-10 text-sm text-gray-900"
          >
            <option value="">All categories</option>

            {categories.map((item) => (
              <option key={item.id} value={item.name}>
                {item.name}
              </option>
            ))}
          </select>

          <ChevronDown
            size={16}
            aria-hidden="true"
            className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-gray-600"
          />
        </div>

        {/* Date filter */}
        <input
          type="date"
          value={date}
          onChange={(event) => setDate(event.target.value)}
          aria-label="Filter by event date"
          className="w-full min-w-0 rounded-lg border border-gray-300 bg-white p-3 text-sm text-gray-900"
        />

        {/* Location filter */}
        <div className="relative min-w-0">
          <select
            value={location}
            onChange={(event) => setLocation(event.target.value)}
            aria-label="Filter by location"
            className="w-full appearance-none rounded-lg border border-gray-300 bg-white py-3 pl-3 pr-10 text-sm text-gray-900"
          >
            <option value="">All locations</option>

            {locations.map((name) => (
              <option key={name} value={name}>
                {name}
              </option>
            ))}
          </select>

          <ChevronDown
            size={16}
            aria-hidden="true"
            className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-gray-600"
          />
        </div>

        {/* Clear filters */}
        <button
          type="button"
          onClick={clearFilters}
          disabled={!hasFilters}
          className="inline-flex items-center justify-center gap-2 rounded-lg border border-gray-300 px-3 py-2 text-sm disabled:cursor-not-allowed disabled:opacity-50"
        >
          <X size={16} />
          Clear filters
        </button>
      </div>

      {/* Results count */}
      <p className="text-sm ga-muted" aria-live="polite">
        {filteredEvents.length}{" "}
        {filteredEvents.length === 1 ? "event" : "events"} found
      </p>

      {/* Event results */}
      {filteredEvents.length > 0 ? (
        <div className="ga-public-grid">
          {filteredEvents.map((event) => {
            const categoryNames = orderedCategoryNames(
              event.category_ids,
              categories
            );

            const banner = bannerFor(categoryNames[0]);

            return (
              <Link
                href={`/events/${event.id}`}
                className="ga-card ga-public-card"
                key={event.id}
              >
                <div
                  className="ga-cover"
                  style={bannerStyle(banner)}
                >
                  <banner.Icon size={45} />
                </div>

                <div className="ga-chip-group ga-public-card-chips">
                  {categoryNames.map((name) => (
                    <span className="ga-badge" key={name}>
                      {name}
                    </span>
                  ))}
                </div>

                <h2>{event.title}</h2>
                {event.recommendation_reasons?.length > 0 && (
                  <p className="ga-muted student-match">
                    Matches your interests: {event.recommendation_reasons.join(", ")}
                  </p>
                )}
                {event.status !== "active" && <span className="ga-badge">{event.status}</span>}

                <p className="ga-muted">
                  {new Date(
                    event.start_date_time
                  ).toLocaleDateString("en-US", {
                    month: "long",
                    day: "numeric",
                    timeZone: "America/Los_Angeles",
                  })}
                </p>

                <p>
                  <MapPin size={15} />
                  {event.locations?.building_name}
                </p>

                <span className="ga-badge price-badge">
                  {event.admission_type === "free"
                    ? "Free"
                    : "Paid"}
                </span>
              </Link>
            );
          })}
        </div>
      ) : (
        /* No results message */
        <div className="ga-empty ga-card">
          <CalendarDays size={40} />

          <h2>No matching events found</h2>

          <p className="ga-muted">
            Try another keyword or adjust your filters.
          </p>

          <button
            type="button"
            className="ga-button"
            onClick={clearFilters}
          >
            Clear filters
          </button>
        </div>
      )}
    </section>
  );
}
