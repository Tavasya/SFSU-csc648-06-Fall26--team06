"use client";
import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Eye, CheckCircle2 } from "lucide-react";
export default function PublishBar({ event }) {
  const router = useRouter(),
    [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  async function publish() {
    setBusy(true);
    setError("");
    try {
      const r = await fetch("/api/host/events/" + event.id + "/publish", {
          method: "POST",
        }),
        data = await r.json();
      if (!r.ok) throw new Error(data.error);
      router.refresh();
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <>
      <div
        className={
          "ga-preview-bar " +
          (event.publication_status === "published" ? "published" : "")
        }
      >
        <span>
          {event.publication_status === "published" ? (
            <CheckCircle2 size={17} />
          ) : (
            <Eye size={17} />
          )}
          <strong>
            {event.publication_status === "published"
              ? "Your event is live!"
              : "Preview"}
          </strong>
          <small>
            {event.publication_status === "published"
              ? "Students can now discover this event."
              : "This event is not visible to students yet."}
          </small>
        </span>
        <div className="ga-actions">
          <Link
            className="ga-button secondary"
            href={"/host/events/" + event.id + "/edit"}
          >
            Back to edit
          </Link>
          {event.publication_status === "published" ? (
            <Link className="ga-button" href={"/events/" + event.id}>
              View public event
            </Link>
          ) : (
            <button className="ga-button" disabled={busy} onClick={publish}>
              {busy ? "Publishing…" : "Publish event"}
            </button>
          )}
        </div>
      </div>
      {error && (
        <p className="ga-notice" role="alert">
          {error}
        </p>
      )}
    </>
  );
}
