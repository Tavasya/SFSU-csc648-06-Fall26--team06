/*
 * components/map/MapQuickActions.js
 *
 * PURPOSE:
 * Save, Interested and Going in the map's event detail view (MapEventActions.js).
 *  - useEventStatuses(): the student's saves and RSVPs
 *    (GET /api/users/me/saved-events and /api/users/me/rsvps)
 *  - <MapQuickActions>: the three buttons for one event, using the same APIs
 *    as the event page (PUT / DELETE /api/events/[id]/saved,
 *    PUT /api/events/[id]/rsvps/me)
 *
 * Like Allison's cards (components/assistant/AssistantEventCard.js), tapping
 * Interested or Going again sets "not_attending", which the app treats as no RSVP.
 */

"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { Bookmark, BookmarkCheck, Check, Star } from "lucide-react";
import { studentRequest } from "@/components/student/useStudentData";
import { useScheduleConflict } from "@/components/student/ScheduleConflict";
import { canAttend } from "@/lib/student/validation";

// { signedIn, statuses: { [eventId]: { saved, rsvp } }, update(eventId, change), reload() }
// signedIn is null while loading.
export function useEventStatuses() {
  const [state, setState] = useState({ signedIn: null, statuses: {} });
  const [version, setVersion] = useState(0);

  useEffect(() => {
    let current = true;
    Promise.all([studentRequest("/api/users/me/saved-events"), studentRequest("/api/users/me/rsvps")])
      .then(([saved, rsvps]) => {
        const statuses = {};
        for (const event of saved.events ?? []) statuses[event.id] = { saved: true, rsvp: null };
        for (const row of rsvps.rsvps ?? []) {
          const id = row.events?.id;
          if (!id) continue;
          statuses[id] = {
            saved: statuses[id]?.saved ?? false,
            rsvp: row.status === "not_attending" ? null : row.status,
          };
        }
        if (current) setState({ signedIn: true, statuses });
      })
      .catch((error) => {
        if (current) setState({ signedIn: error.status === 401 ? false : null, statuses: {} });
      });
    return () => {
      current = false;
    };
  }, [version]);

  const update = useCallback((eventId, change) => {
    setState((s) => ({ ...s, statuses: { ...s.statuses, [eventId]: { ...s.statuses[eventId], ...change } } }));
  }, []);
  const reload = useCallback(() => setVersion((v) => v + 1), []);

  return { ...state, update, reload };
}

const buttonClass =
  "inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-[12px] font-medium transition focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-[#604398] disabled:opacity-50";
const on = "border-[#604398] bg-[#604398] text-white";
const off = "border-[#ebe7f0] bg-white text-[#51475f] hover:border-[#d9cfe8] hover:bg-[#F5F1FA]";

export default function MapQuickActions({ event, statuses, returnTo }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const { confirmGoing, dialog } = useScheduleConflict();
  const status = statuses.statuses[event.id] ?? { saved: false, rsvp: null };
  const base = `/api/events/${event.id}`;

  if (statuses.signedIn === false) {
    return (
      <Link
        href={`/login?next=${encodeURIComponent(returnTo)}`}
        className="inline-flex items-center gap-1.5 text-[12px] font-medium text-[#604398] hover:underline"
      >
        <Bookmark size={13} aria-hidden="true" />
        Sign in to save or RSVP
      </Link>
    );
  }

  async function run(request, change) {
    setBusy(true);
    setError("");
    try {
      const result = await request();
      statuses.update(event.id, change(result));
    } catch (err) {
      setError(err.status === 401 ? "Sign in to save or RSVP." : err.message);
    } finally {
      setBusy(false);
    }
  }

  const toggleSave = () =>
    run(
      () => studentRequest(`${base}/saved`, { method: status.saved ? "DELETE" : "PUT" }),
      (result) => ({ saved: result.saved }),
    );
  const setRsvp = async (next) => {
    // Going to an event during a class: remind them, but let them decide.
    if (next === "attending" && status.rsvp !== "attending") {
      const ok = await confirmGoing({
        title: event.title,
        start_date_time: event.startDateTime,
        end_date_time: event.endDateTime,
      });
      if (!ok) return;
    }
    return run(
      () =>
        studentRequest(`${base}/rsvps/me`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ status: status.rsvp === next ? "not_attending" : next }),
        }),
      (result) => ({ rsvp: result.rsvp?.status === "not_attending" ? null : result.rsvp?.status ?? null }),
    );
  };

  const loading = statuses.signedIn === null;
  const attendable = canAttend({
    publication_status: "published",
    status: event.status,
    end_date_time: event.endDateTime,
  });
  // Full: every spot is taken and this student isn't one of them.
  const full = event.full && status.rsvp !== "attending";

  return (
    <div>
      <div className="flex flex-wrap gap-1.5" role="group" aria-label={`Save or RSVP to ${event.title}`}>
        <button
          type="button"
          className={`${buttonClass} ${status.saved ? on : off}`}
          aria-pressed={status.saved}
          disabled={busy || loading}
          onClick={toggleSave}
        >
          {status.saved ? <BookmarkCheck size={13} aria-hidden="true" /> : <Bookmark size={13} aria-hidden="true" />}
          {status.saved ? "Saved" : "Save"}
        </button>
        <button
          type="button"
          className={`${buttonClass} ${status.rsvp === "interested" ? on : off}`}
          aria-pressed={status.rsvp === "interested"}
          disabled={busy || loading}
          onClick={() => setRsvp("interested")}
        >
          <Star size={13} aria-hidden="true" /> Interested
        </button>
        <button
          type="button"
          className={`${buttonClass} ${status.rsvp === "attending" ? on : off}`}
          aria-pressed={status.rsvp === "attending"}
          disabled={busy || loading || ((!attendable || full) && status.rsvp !== "attending")}
          onClick={() => setRsvp("attending")}
        >
          <Check size={13} aria-hidden="true" /> Going
        </button>
      </div>
      {full && !error && (
        <p role="status" className="mt-2 text-[12px] font-medium text-red-700">
          RSVP capacity has been reached. You can still save it or mark yourself interested.
        </p>
      )}
      {error && (
        <p role="alert" className="mt-1.5 text-[12px] text-red-700">
          {error}
        </p>
      )}
      {dialog}
    </div>
  );
}
