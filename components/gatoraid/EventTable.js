"use client";
import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { CalendarDays, MoreHorizontal, Plus, Trash2, X } from "lucide-react";
export default function EventTable({ initialEvents }) {
  const [events, setEvents] = useState(initialEvents),
    [tab, setTab] = useState("Published"),
    [menu, setMenu] = useState(null),
    [deleting, setDeleting] = useState(null),
    [busy, setBusy] = useState(false),
    [notice, setNotice] = useState("");
  const dialog = useRef(null);
  useEffect(() => {
    if (deleting) dialog.current?.showModal();
    else dialog.current?.close();
  }, [deleting]);
  const inTab = (e, t) =>
    t === "Drafts"
      ? e.publication_status === "draft"
      : t === "Past"
        ? e.publication_status === "published" &&
          new Date(e.end_date_time) < new Date()
        : e.publication_status === "published" &&
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
      setNotice("Event deleted. It is no longer visible to students.");
    } catch (e) {
      setNotice(e.message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <>
      <div className="ga-tabs" role="tablist" aria-label="Event status">
        {["Published", "Drafts", "Past"].map((t) => (
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
                    <span className={"ga-badge " + e.publication_status}>
                      {e.publication_status === "published"
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
                      <Link href={"/host/events/" + e.id + "/edit"}>Edit</Link>
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
                            <button
                              onClick={() => {
                                setDeleting(e);
                                setMenu(null);
                              }}
                            >
                              <Trash2 size={15} />
                              Delete event
                            </button>
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
                  : "Bring your campus together"}
            </h2>
            <p className="ga-muted">
              {tab === "Published"
                ? "Create an event, preview it, and publish when you’re ready."
                : "No " + tab.toLowerCase() + " events yet."}
            </p>
            <Link className="ga-button" href="/host/events/new">
              <Plus size={16} />
              Create your first event
            </Link>
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
          This removes the event from GatorAid. This action cannot be undone.
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
            {busy ? "Deleting…" : "Delete event"}
          </button>
        </div>
      </dialog>
    </>
  );
}
