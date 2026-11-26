"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { MessageCircle, Users } from "lucide-react";
import { studentRequest } from "@/components/student/useStudentData";

export default function EventAttendees({ event }) {
  const router = useRouter();
  const [attendees, setAttendees] = useState(null);
  const [error, setError] = useState(null);
  const [busyUserId, setBusyUserId] = useState(null);
  const [attempt, setAttempt] = useState(0);

  // Fetch the attendee list when the event changes or a refresh is requested.
  useEffect(() => {
    const controller = new AbortController();

    studentRequest(`/api/events/${event.id}/attendees`, {
      signal: controller.signal,
    })
      .then((data) => {
        setAttendees(data.attendees || []);
        setError(null);
      })
      .catch((requestError) => {
        if (!controller.signal.aborted) {
          setError(requestError);
        }
      });

    return () => controller.abort();
  }, [event.id, attempt]);

  // Listen for successful RSVP updates from EventActions.
  useEffect(() => {
    function handleRsvpUpdated(eventData) {
      if (eventData.detail?.eventId === event.id) {
        setAttendees(null);
        setError(null);
        setAttempt((value) => value + 1);
      }
    }

    window.addEventListener(
      "gatoraid:rsvp-updated",
      handleRsvpUpdated
    );

    return () => {
      window.removeEventListener(
        "gatoraid:rsvp-updated",
        handleRsvpUpdated
      );
    };
  }, [event.id]);

  async function startConversation(otherUserId) {
    setBusyUserId(otherUserId);
    setError(null);

    try {
      const result = await studentRequest("/api/conversations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          event_id: event.id,
          other_user_id: otherUserId,
        }),
      });

      router.push(`/messages?conversation=${result.conversation.id}`);
    } catch (requestError) {
      setError(requestError);
    } finally {
      setBusyUserId(null);
    }
  }

  return (
    <section
      className="ga-attendees"
      aria-labelledby="ga-attendees-heading"
    >
      <div className="ga-attendees-heading">
        <h3 id="ga-attendees-heading">
          <Users size={17} /> Attending students
        </h3>

        {attendees && <span>{attendees.length}</span>}
      </div>

      {error?.status === 401 && (
        <p className="ga-muted ga-small">
          <Link href="/login">Sign in</Link> and RSVP as attending to
          view students attending this event.
        </p>
      )}

      {error?.status === 403 && (
        <p className="ga-muted ga-small">
          RSVP as attending to see who else is coming and message
          other students.
        </p>
      )}

      {error &&
        error.status !== 401 &&
        error.status !== 403 && (
          <div>
            <p className="ga-small" role="alert">
              {error.message}
            </p>

            <button
              className="ga-button secondary"
              type="button"
              onClick={() => {
                setAttendees(null);
                setAttempt((value) => value + 1);
              }}
            >
              Try again
            </button>
          </div>
        )}

      {!attendees && !error && (
        <p className="ga-muted ga-small" role="status">
          Loading attendees…
        </p>
      )}

      {attendees && attendees.length === 0 && (
        <p className="ga-muted ga-small">
          No students have RSVP’d as attending yet.
        </p>
      )}

      {attendees && attendees.length > 0 && (
        <ul className="ga-attendee-list">
          {attendees.map((attendee) => (
            <li
              className="ga-attendee"
              key={attendee.user_id}
            >
              <div
                className="ga-attendee-avatar"
                aria-hidden="true"
              >
                {attendee.display_name?.trim()?.[0]?.toUpperCase() ||
                  "S"}
              </div>

              <div className="ga-attendee-info">
                <strong>{attendee.display_name}</strong>

                <span>
                  {[
                    attendee.academic_year,
                    attendee.major,
                  ]
                    .filter(Boolean)
                    .join(" · ") || "SFSU student"}
                </span>
              </div>

              {attendee.is_self ? (
                <span className="ga-attendee-you">
                  You
                </span>
              ) : (
                <button
                  type="button"
                  className="ga-attendee-message"
                  disabled={busyUserId !== null}
                  onClick={() =>
                    startConversation(attendee.user_id)
                  }
                  aria-label={`Message ${attendee.display_name}`}
                >
                  <MessageCircle size={15} />
                  {busyUserId === attendee.user_id
                    ? "Opening…"
                    : "Message"}
                </button>
              )}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
