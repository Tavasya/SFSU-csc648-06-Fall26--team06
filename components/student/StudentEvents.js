"use client";
import Link from "next/link";
import EventSearch from "@/components/gatoraid/EventSearch";
import DataState from "./DataState";
import { useStudentData } from "./useStudentData";
import { eventConflictsWithSchedule } from "@/lib/student/schedule";
import { useState } from "react";

export default function StudentEvents({ saved = false }) {
  const state = useStudentData(saved ? "/api/users/me/saved-events" : "/api/events/for-you");
  const [mode, setMode] = useState("both");
  const events = state.data?.events || [];
  // Keep the three choices here so students can decide how their profile shapes For You.
  const filteredEvents = saved ? events : events.filter((event) => {
    const matchesInterests = event.recommendation_reasons?.length > 0;
    const fitsSchedule = !eventConflictsWithSchedule(event, state.data.classes || []);
    if (mode === "interests") return matchesInterests;
    if (mode === "schedule") return fitsSchedule;
    return state.data.category_ids.length > 0 && matchesInterests && fitsSchedule;
  });
  return <>
    <div className="ga-heading"><div><h1>{saved ? "Saved events" : "Recommended for you"}</h1>
      <p className="ga-muted">{saved ? "Your bookmarks, all in one place. Saving an event does not change your RSVP." : "Find upcoming events using your interests and class schedule."}</p>
    </div><Link className="ga-button secondary" href="/profile">Edit profile</Link></div>
    {state.loading || state.error ? <DataState {...state} /> :
      <>
        {!saved && <fieldset className="ga-card student-recommendation-modes">
          <legend>What should For You consider?</legend>
          <div role="group" aria-label="Recommendation preferences">
            {[
              ["both", "Interests + schedule"],
              ["interests", "Interests only"],
              ["schedule", "Schedule only"],
            ].map(([value, label]) => (
              <button
                type="button"
                key={value}
                className={`ga-button ${mode === value ? "" : "secondary"}`}
                aria-pressed={mode === value}
                onClick={() => setMode(value)}
              >
                {label}
              </button>
            ))}
          </div>
          {(state.data.classes || []).length === 0 && (
            <p className="ga-muted">
              Add your class schedule in Your profile to avoid event-time conflicts.
            </p>
          )}
        </fieldset>}
        {filteredEvents.length ? <EventSearch events={filteredEvents} categories={state.data.categories} /> :
        <section className="ga-card ga-empty">
          <h2>{saved ? "No saved events yet" : mode === "both" && !state.data.category_ids.length ? "Start with your interests" : "No matching recommendations yet"}</h2>
          <p className="ga-muted">{saved ? "Open an event and choose Save event to add it here." : mode === "both" && !state.data.category_ids.length ? "Choose your interests to get recommendations, or switch to Schedule only to see events that fit your availability." : "Try another recommendation setting, update your profile, or explore all campus events."}</p>
          <div className="student-actions">
            {!saved && <Link className="ga-button" href="/profile">Update your profile</Link>}
            <Link className="ga-button secondary" href="/events">Explore all events</Link>
          </div>
        </section>}
      </>}
  </>;
}
