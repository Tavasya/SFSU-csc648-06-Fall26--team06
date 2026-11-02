"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import EventSearch from "@/components/gatoraid/EventSearch";
import DataState from "./DataState";
import { useStudentData } from "./useStudentData";

export default function StudentEvents({ saved = false }) {
  const state = useStudentData(saved ? "/api/users/me/saved-events" : "/api/events/for-you");

  const [schedule, setSchedule] = useState([]);
  const [scheduleStatus, setScheduleStatus] = useState("loading");

  useEffect(() => {
    if (saved) {
      setScheduleStatus("unused");
      return;
    }

    const controller = new AbortController();

    async function loadSchedule() {
      try {
        const response = await fetch(
          "/api/users/me/schedule",
          {
            cache: "no-store",
            signal: controller.signal,
          }
        );

        if (response.status === 401) {
          setSchedule([]);
          setScheduleStatus("unknown");
          return;
        }

        if (!response.ok) {
          throw new Error("Unable to load class schedule.");
        }

        const data = await response.json();

        if (!controller.signal.aborted) {
          setSchedule(
            Array.isArray(data.classes) ? data.classes : []
          );
          setScheduleStatus("ready");
        }
      } catch (error) {
        if (!controller.signal.aborted) {
          console.error("Schedule loading failed:", error);
          setScheduleStatus("error");
        }
      }
    }

    loadSchedule();

    return () => controller.abort();
  }, [saved]);


  return <>
    <div className="ga-heading"><div><h1>{saved ? "Saved events" : "Recommended for you"}</h1>
      <p className="ga-muted">{saved ? "Your bookmarks, all in one place. Saving an event does not change your RSVP." : "Campus events matched to your interests. Filter by date or location to find your next plan."}</p>
    </div><Link className="ga-button secondary" href="/interests">Edit interests</Link></div>
    {state.loading || state.error ? <DataState {...state} /> :
      state.data.events.length ?
        <EventSearch
          events={state.data.events}
          categories={state.data.categories}
          schedule={schedule}
          scheduleStatus={scheduleStatus}
        />
        :
        <section className="ga-card ga-empty">
          <h2>{saved ? "No saved events yet" : state.data.category_ids.length ? "No matching recommendations yet" : "Start with your interests"}</h2>
          <p className="ga-muted">{saved ? "Open an event and choose Save event to add it here." : "Choose or update your interests, or explore all campus events while you wait for a match."}</p>
          <div className="student-actions">
            {!saved && <Link className="ga-button" href="/interests">Choose interests</Link>}
            <Link className="ga-button secondary" href="/events">Explore all events</Link>
          </div>
        </section>}
  </>;
}
