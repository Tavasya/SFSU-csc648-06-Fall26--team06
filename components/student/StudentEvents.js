"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import EventSearch from "@/components/gatoraid/EventSearch";
import DataState from "./DataState";
import { useStudentData } from "./useStudentData";
import { studentEmptyState } from "@/lib/student/empty-state";

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
          events={[...state.data.events, ...(state.data.own_events ?? [])]}
          categories={state.data.categories}
          schedule={schedule}
          scheduleStatus={scheduleStatus}
          signedIn={!saved}
          interestIds={saved ? null : state.data.category_ids}
        />
        :
        <EmptyState {...studentEmptyState({ saved, hasInterests: Boolean(state.data.category_ids?.length) })} />}
  </>;
}

// R5.6: an empty list explains why and links to interests and all events.
function EmptyState({ title, text, links }) {
  return (
    <section className="ga-card ga-empty">
      <h2>{title}</h2>
      <p className="ga-muted">{text}</p>
      <div className="student-actions">
        {links.map((link, index) => (
          <Link className={index === 0 && links.length > 1 ? "ga-button" : "ga-button secondary"} href={link.href} key={link.href}>
            {link.label}
          </Link>
        ))}
      </div>
    </section>
  );
}
