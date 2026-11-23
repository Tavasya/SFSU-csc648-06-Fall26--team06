/*
 * components/student/YourPlans.js
 *
 * PURPOSE:
 * The Your plans page (/saved): every event the student saved or RSVP'd to,
 * in one list, with tabs for Going, Interested, Saved and Not going.
 * Data: GET /api/users/me/saved-events and GET /api/users/me/rsvps.
 * The cards are the Explore cards (components/gatoraid/EventSearch.js), which
 * show each event's plan_labels as tags.
 */

"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import EventSearch from "@/components/gatoraid/EventSearch";
import DataState from "./DataState";
import { useStudentData } from "./useStudentData";

const RSVP_LABELS = { attending: "Going", interested: "Interested", not_attending: "Not going" };

const TABS = [
  { id: "all", label: "All", test: () => true },
  { id: "attending", label: "Going", test: (p) => p.rsvp === "attending" },
  { id: "interested", label: "Interested", test: (p) => p.rsvp === "interested" },
  { id: "saved", label: "Saved", test: (p) => p.saved },
  { id: "not_attending", label: "Not going", test: (p) => p.rsvp === "not_attending" },
];

export default function YourPlans() {
  const saved = useStudentData("/api/users/me/saved-events");
  const rsvps = useStudentData("/api/users/me/rsvps");
  const [tab, setTab] = useState("all");

  // One entry per event: { event, saved, rsvp }.
  const plans = useMemo(() => {
    if (!saved.data || !rsvps.data) return [];
    const byId = new Map();
    for (const event of saved.data.events ?? []) byId.set(event.id, { event, saved: true, rsvp: null });
    for (const row of rsvps.data.rsvps ?? []) {
      if (!row.events) continue;
      const current = byId.get(row.events.id) ?? { event: row.events, saved: false, rsvp: null };
      byId.set(row.events.id, { ...current, rsvp: row.status });
    }
    return [...byId.values()].sort((a, b) => a.event.start_date_time.localeCompare(b.event.start_date_time));
  }, [saved.data, rsvps.data]);

  const loading = saved.loading || rsvps.loading;
  const error = saved.error || rsvps.error;
  const active = TABS.find((t) => t.id === tab);
  const shown = plans.filter(active.test).map((p) => ({
    ...p.event,
    plan_labels: [p.rsvp && RSVP_LABELS[p.rsvp], p.saved && "Saved"].filter(Boolean),
  }));

  return (
    <>
      <div className="ga-heading">
        <div>
          <h1>Your plans</h1>
          <p className="ga-muted">
            Everything you saved or RSVP&apos;d to, in one place. Saving an event doesn&apos;t change your RSVP.
          </p>
        </div>
        <Link className="ga-button secondary" href="/events">
          Explore events
        </Link>
      </div>

      {loading || error ? (
        <DataState
          loading={loading}
          error={error}
          retry={() => {
            saved.retry();
            rsvps.retry();
          }}
        />
      ) : (
        <>
          <div className="ga-tabs" role="tablist" aria-label="Filter your events">
            {TABS.map((t) => (
              <button
                key={t.id}
                type="button"
                role="tab"
                aria-selected={tab === t.id}
                className={tab === t.id ? "active" : ""}
                onClick={() => setTab(t.id)}
              >
                {t.label} <span>{plans.filter(t.test).length}</span>
              </button>
            ))}
          </div>

          {shown.length ? (
            <EventSearch key={tab} events={shown} categories={saved.data.categories ?? []} />
          ) : (
            <section className="ga-card ga-empty">
              <h2>{tab === "all" ? "Nothing saved yet" : `No “${active.label}” events`}</h2>
              <p className="ga-muted">
                Open an event and choose Save, Interested or Going to add it here.
              </p>
              <Link className="ga-button" href="/events">
                Explore events
              </Link>
            </section>
          )}
        </>
      )}
    </>
  );
}
