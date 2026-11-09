/*
 * components/student/ScheduleConflict.js
 *
 * PURPOSE:
 * A reminder before RSVPing "Going" to an event that overlaps something on the
 * student's schedule (a class, a work shift, ...). It never blocks: the student can RSVP anyway.
 * Used by the map (components/map/MapQuickActions.js), the event page
 * (components/student/EventActions.js) and Allison's cards.
 *
 *   const { confirmGoing, dialog } = useScheduleConflict();
 *   if (!(await confirmGoing(event))) return;   // event: { title, start_date_time, end_date_time }
 *   ...render {dialog} somewhere in the component.
 *
 * The schedule comes from GET /api/users/me/schedule (what the schedule
 * scanner saved), and the overlap check from lib/schedule/conflicts.js, the
 * same one behind the "Schedule conflict" badges.
 */

"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { CalendarX2 } from "lucide-react";
import { getScheduleAvailability } from "@/lib/schedule/conflicts";

// Fetched at the moment of the RSVP, so a schedule uploaded a minute ago counts.
// No schedule (or signed out) means no reminder.
function loadClasses() {
  return fetch("/api/users/me/schedule", { cache: "no-store" })
    .then((response) => (response.ok ? response.json() : { classes: [] }))
    .then((data) => (Array.isArray(data.classes) ? data.classes : []))
    .catch(() => []);
}

const className = (course) => course.name || course.class_name || "something on your schedule";

export function useScheduleConflict() {
  const [pending, setPending] = useState(null); // { event, conflicts, resolve }
  const dialogRef = useRef(null);

  useEffect(() => {
    if (pending) dialogRef.current?.showModal();
  }, [pending]);

  // Resolves true to go ahead with the RSVP, false if the student cancels.
  const confirmGoing = useCallback(async (event) => {
    const classes = await loadClasses();
    const { status, conflicts } = getScheduleAvailability(event, classes);
    if (status !== "conflict") return true;
    return new Promise((resolve) => setPending({ event, conflicts, resolve }));
  }, []);

  function finish(answer) {
    dialogRef.current?.close();
    pending?.resolve(answer);
    setPending(null);
  }

  const dialog =
    pending &&
    createPortal(
      <dialog
        ref={dialogRef}
        className="ga-conflict-dialog"
        aria-labelledby="conflict-title"
        onCancel={(e) => {
          e.preventDefault();
          finish(false);
        }}
      >
        <span className="ga-conflict-icon" aria-hidden="true">
          <CalendarX2 size={22} />
        </span>
        <h2 id="conflict-title">This overlaps with your schedule</h2>
        <p>
          <strong>{pending.event.title}</strong> is at the same time as{" "}
          <strong>{pending.conflicts.map(className).join(", ")}</strong>. You can still RSVP. It&apos;s
          your call.
        </p>
        <div className="ga-conflict-actions">
          <button type="button" className="secondary" onClick={() => finish(false)}>
            Cancel
          </button>
          <button type="button" onClick={() => finish(true)} autoFocus>
            RSVP anyway
          </button>
        </div>
      </dialog>,
      document.body,
    );

  return { confirmGoing, dialog };
}
