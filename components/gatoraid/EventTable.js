"use client";

import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { CalendarDays, MoreHorizontal, Plus, Trash2, X, Ban } from "lucide-react";

export default function EventTable({ initialEvents }) {
  const [events, setEvents] = useState(initialEvents),
    [tab, setTab] = useState("Published"),
    [menu, setMenu] = useState(null),
    [deleting, setDeleting] = useState(null),
    [cancelling, setCancelling] = useState(null),
    [cancellationMessage, setCancellationMessage] = useState(""),
    [busy, setBusy] = useState(false),
    [notice, setNotice] = useState("");

  const dialog = useRef(null);
  const cancelDialog = useRef(null);

  // Open or close the delete confirmation dialog
  useEffect(() => {
    if (deleting) {
      dialog.current?.showModal();
    } else {
      dialog.current?.close();
    }
  }, [deleting]);

  // Open or close the cancellation dialog
  useEffect(() => {
    if (cancelling) {
      cancelDialog.current?.showModal();
    } else {
      cancelDialog.current?.close();
    }
  }, [cancelling]);

  const inTab = (e, t) =>
    t === "Drafts"
      ? e.publication_status === "draft"
      : t === "Cancelled"
        ? e.status === "cancelled"
        : t === "Past"
          ? e.publication_status === "published" &&
            e.status !== "cancelled" &&
            new Date(e.end_date_time) < new Date()
          : e.publication_status === "published" &&
            e.status === "active" &&
            new Date(e.end_date_time) >= new Date();

  async function remove() {
    setBusy(true);
    try {
      const r = await fetch("/api/host/events/" + deleting.id, {
        method: "DELETE",
      }),
        data = await r.json();
      if (!r.ok) throw new Error(data.error);
      setEvents(events.filter((e) => e.id !== deleting.id));
      setDeleting(null);
      setNotice("Draft deleted.");
    } catch (e) {
      setNotice(e.message);
    } finally {
      setBusy(false);
    }
  }

  async function cancelEvent() {
    const message = cancellationMessage.trim();

    if (message.length < 10 || message.length > 1000) {
      setNotice(
        "The cancellation message must be between 10 and 1000 characters."
      );
      return;
    }

    setBusy(true);
    setNotice("");

    try {
      const r = await fetch(
          "/api/host/events/" + cancelling.id + "/cancel",
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              confirm: true,
              cancellation_message: message,
            }),
          }
        ),
        data = await r.json();

      if (!r.ok) throw new Error(data.error);

      setEvents(
        events.map((e) =>
          e.id === cancelling.id
            ? {
                ...e,
                ...data.event,
              }
            : e
        )
      );

      setCancelling(null);
      setCancellationMessage("");
      setTab("Cancelled");
      setNotice("Event cancelled successfully.");
    } catch (e) {
      setNotice(e.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <div className="ga-tabs" role="tablist" aria-label="Event status">
        {["Published", "Drafts", "Past", "Cancelled"].map((t) => (
          <button
            key={t}
            role="tab"
            aria-selected={tab === t}
            className={tab === t ? "active" : ""}
            onClick={() => setTab(t)}
          >
            {t}
            <span>{events.filter((e) => inTab(e, t)).length}</span>
          </button>
        ))}
      </div>
      {notice && (
        <p className="ga-notice" role="status">
          {notice}
        </p>
      )}
      <div className="ga-table-wrap ga-card">
        <table>
          <thead>
            <tr>
              <th>Event</th>
              <th>Date & time</th>
              <th>Status</th>
              <th>RSVPs & saves</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {events
              .filter((e) => inTab(e, tab))
              .map((e, i) => (
                <tr key={e.id}>
                  <td>
                    <div className="ga-event-name">
                      <span className={"ga-event-icon c" + (i % 4)}>
                        <CalendarDays size={22} />
                      </span>
                      <div>
                        <Link href={"/host/events/" + e.id + "/preview"}>
                          {e.title}
                        </Link>
                        <small>
                          {e.locations?.building_name}
                          {e.room_number ? " · " + e.room_number : ""}
                        </small>

                        {e.status === "cancelled" &&
                          e.cancellation_message && (
                            <small className="ga-cancellation-message">
                              Cancellation reason: {e.cancellation_message}
                            </small>
                          )}
                      </div>
                    </div>
                  </td>
                  <td>
                    {new Date(e.start_date_time).toLocaleDateString("en-US", {
                      month: "short",
                      day: "numeric",
                      timeZone: "America/Los_Angeles",
                    })}
                    <small>
                      {new Date(e.start_date_time).toLocaleTimeString("en-US", {
                        hour: "numeric",
                        minute: "2-digit",
                        timeZone: "America/Los_Angeles",
                      })}{" "}
                      PT
                    </small>
                  </td>
                  <td>
                    <span
                      className={
                        "ga-badge " +
                        (e.status === "cancelled"
                          ? "cancelled"
                          : e.status === "completed"
                            ? "completed"
                            : e.publication_status)
                      }
                    >
                      {e.status === "cancelled"
                        ? "Cancelled"
                        : e.status === "completed"
                          ? "Completed"
                          : e.publication_status === "published"
                            ? "Published"
                            : "Draft"}
                    </span>
                  </td>
                  <td>
                    {e.engagement ? (
                      <>
                        {e.engagement.attending} attending
                        <small>
                          {e.engagement.interested} interested ·{" "}
                          {e.engagement.saves}{" "}
                          {e.engagement.saves === 1 ? "save" : "saves"}
                        </small>
                      </>
                    ) : (
                      "—"
                    )}
                  </td>
                  <td>
                    <div className="ga-actions">
                    {e.status !== "cancelled" &&
                        e.status !== "completed" &&
                        (tab === "Published" || tab === "Drafts") && (
                          <Link href={"/host/events/" + e.id + "/edit"}>Edit</Link>
                        )}
                      <div className="ga-menu-wrap">
                        <button
                          aria-label={"More actions for " + e.title}
                          aria-expanded={menu === e.id}
                          className="ga-icon-button"
                          onClick={() => setMenu(menu === e.id ? null : e.id)}
                        >
                          <MoreHorizontal size={19} />
                        </button>
                        {menu === e.id && (
                          <div className="ga-menu">
                            <Link href={"/host/events/" + e.id + "/preview"}>
                              Preview event
                            </Link>
                            {e.publication_status === "published" &&
                              e.status === "active" && (
                                <button
                                  onClick={() => {
                                    setCancelling(e);
                                    setCancellationMessage("");
                                    setMenu(null);
                                    setNotice("");
                                  }}
                                >
                                  <Ban size={15} />
                                  Cancel event
                                </button>
                              )}
                            {e.publication_status === "draft" && (
                              <button
                                onClick={() => {
                                  setDeleting(e);
                                  setMenu(null);
                                }}
                              >
                                <Trash2 size={15} />
                                Delete draft
                              </button>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  </td>
                </tr>
              ))}
          </tbody>
        </table>
        {!events.some((e) => inTab(e, tab)) && (
          <div className="ga-empty">
            <CalendarDays size={35} />
            <h2>
              {tab === "Drafts"
                ? "Room for your next idea"
                : tab === "Past"
                  ? "Your event history starts here"
                  : tab === "Cancelled"
                    ? "No cancelled events"
                    : "Bring your campus together"}
            </h2>
            <p className="ga-muted">
              {tab === "Published"
                ? "Create an event, preview it, and publish when you’re ready."
                : "No " + tab.toLowerCase() + " events yet."}
            </p>
            {tab !== "Cancelled" && (
              <Link className="ga-button" href="/host/events/new">
                <Plus size={16} />
                Create your first event
              </Link>
            )}
          </div>
        )}
      </div>
      <dialog
        ref={dialog}
        className="ga-dialog"
        onCancel={(e) => {
          if (busy) e.preventDefault();
          else setDeleting(null);
        }}
        onClose={() => {
          if (!busy) setDeleting(null);
        }}
      >
        <button
          className="ga-dialog-close ga-icon-button"
          aria-label="Close delete confirmation"
          disabled={busy}
          onClick={() => setDeleting(null)}
        >
          <X size={18} />
        </button>
        <Trash2 className="ga-danger" />
        <h2>Delete “{deleting?.title}”?</h2>
        <p>
          This removes your draft from GatorAid. This action cannot be undone.
        </p>
        <div className="ga-actions">
          <button
            className="ga-button secondary"
            disabled={busy}
            onClick={() => setDeleting(null)}
          >
            Cancel
          </button>
          <button className="ga-button danger" disabled={busy} onClick={remove}>
            {busy ? "Deleting…" : "Delete draft"}
          </button>
        </div>
      </dialog>
      <dialog
        ref={cancelDialog}
        className="ga-dialog"
        onCancel={(e) => {
          if (busy) e.preventDefault();
          else setCancelling(null);
        }}
        onClose={() => {
          if (!busy) setCancelling(null);
        }}
      >
        <button
          className="ga-dialog-close ga-icon-button"
          aria-label="Close cancellation confirmation"
          disabled={busy}
          onClick={() => setCancelling(null)}
        >
          <X size={18} />
        </button>

        <Ban className="ga-danger" />

        <h2>Cancel “{cancelling?.title}”?</h2>

        <p>
          This event will be marked as cancelled and no longer be visible. 
          Students who RSVP'd can still view the event details.
        </p>

        <label htmlFor="cancellation-message">
          Cancellation message
        </label>

        <textarea
          id="cancellation-message"
          value={cancellationMessage}
          onChange={(e) => setCancellationMessage(e.target.value)}
          placeholder="Explain why this event is being cancelled..."
          rows={4}
          minLength={10}
          maxLength={1000}
          disabled={busy}
        />

        <small>
          {cancellationMessage.trim().length}/1000 characters (minimum 10)
        </small>

        <div className="ga-actions">
          <button
            className="ga-button secondary"
            disabled={busy}
            onClick={() => setCancelling(null)}
          >
            Go back
          </button>

          <button
            className="ga-button danger"
            disabled={busy}
            onClick={cancelEvent}
          >
            {busy ? "Cancelling…" : "Confirm cancellation"}
          </button>
        </div>
      </dialog>
    </>
  );
}
