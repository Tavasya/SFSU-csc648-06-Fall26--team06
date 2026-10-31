"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { studentRequest } from "./useStudentData";
import { canAttend, RSVP_STATUSES } from "@/lib/student/validation";

const labels = { attending: "Attending", interested: "Interested", not_attending: "Not Attending" };
export default function EventActions({ event }) {
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [attempt, setAttempt] = useState(0);
  const base = `/api/events/${event.id}`;
  useEffect(() => {
    const controller = new AbortController();
    Promise.all([
      studentRequest(`${base}/saved`, { signal: controller.signal }),
      studentRequest(`${base}/rsvps/me`, { signal: controller.signal }),
    ]).then(([saved, rsvp]) => { setData({ ...saved, ...rsvp }); setError(null); })
      .catch((error) => { if (!controller.signal.aborted) setError(error); });
    return () => controller.abort();
  }, [base, attempt]);
  async function change(url, method, body) {
    setBusy(true); setMessage(""); setError(null);
    try {
      const result = await studentRequest(url, {
        method, headers: { "Content-Type": "application/json" },
        ...(body ? { body: JSON.stringify(body) } : {}),
      });
      setData((current) => ({ ...current, ...result }));
      setMessage(result.rsvp ? `RSVP updated: ${labels[result.rsvp.status]}.` :
        result.saved ? "Event saved." : "Event removed from saved events.");
    } catch (error) { setError(error); }
    finally { setBusy(false); }
  }
  if (error?.status === 401) return <div className="student-event-actions">
    <p>Sign in to save this event or RSVP.</p><Link href="/login" className="ga-button">Sign in</Link></div>;
  if (!data) return <div className="student-event-actions">
    {error ? <><p role="alert">{error.message}</p><button className="ga-button secondary" onClick={() => setAttempt(attempt + 1)}>Try again</button></> :
      <p role="status">Loading saved and RSVP status…</p>}</div>;
  const available = canAttend(event);
  return <div className="student-event-actions">
    <button className="ga-button secondary" disabled={busy} aria-pressed={data.saved}
      onClick={() => change(`${base}/saved`, data.saved ? "DELETE" : "PUT")}>
      {data.saved ? "Unsave event" : "Save event"}
    </button>
    <fieldset disabled={busy}>
      <legend>Your RSVP</legend>
      <p className="ga-small ga-muted">Current status: {data.rsvp ? labels[data.rsvp.status] : "No RSVP yet"}</p>
      <div className="mt-2 flex flex-wrap gap-2">
        {RSVP_STATUSES.map((status) => (
          <button
            type="button"
            key={status}
            className={`rounded-full border px-3 py-2 text-xs font-semibold transition ${data.rsvp?.status === status
                ? "border-[#65449B] bg-[#65449B] text-white"
                : "border-[#D8CDE9] bg-white text-[#65449B] hover:bg-[#F3EEFA]"
              }`}
            aria-pressed={data.rsvp?.status === status}
            disabled={busy || (status === "attending" && !available)}
            onClick={() =>
              change(`${base}/rsvps/me`, "PUT", { status })
            }
          >
            {labels[status]}
          </button>
        ))}
      </div>
    </fieldset>
    {!available && <p>This event is cancelled or completed. New attending RSVPs are closed.</p>}
    <p className="ga-muted ga-small">Saving and RSVPing are separate. An RSVP does not complete any external registration required by the organizer.</p>
    {busy && <p role="status">Saving…</p>}
    {message && <p role="status">{message}</p>}
    {error && <p role="alert">{error.message}</p>}
  </div>;
}
