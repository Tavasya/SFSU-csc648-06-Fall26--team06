"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import { studentRequest } from "./useStudentData";

function classId() {
  return globalThis.crypto?.randomUUID?.() || `${Date.now()}-${Math.random()}`;
}

export default function ScheduleManager() {
  const [classes, setClasses] = useState([]);
  const [image, setImage] = useState(null);
  const [preview, setPreview] = useState("");
  const [loading, setLoading] = useState(true);
  const [scanning, setScanning] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const inputRef = useRef(null);

  useEffect(() => {
    const controller = new AbortController();
    studentRequest("/api/users/me/schedule", { signal: controller.signal })
      .then(({ classes: saved }) => setClasses(saved.map((course) => ({ ...course, id: classId() }))))
      .catch((requestError) => {
        if (!controller.signal.aborted) setError(requestError.message);
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort();
  }, []);

  useEffect(() => () => {
    if (preview) URL.revokeObjectURL(preview);
  }, [preview]);

  function chooseImage(event) {
    const file = event.target.files?.[0];
    if (!file) return;
    if (!["image/png", "image/jpeg", "image/webp"].includes(file.type)) {
      setError("Choose a PNG, JPG or WebP schedule image.");
      event.target.value = "";
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setError("Schedule images must be smaller than 5 MB.");
      event.target.value = "";
      return;
    }
    setImage(file);
    setPreview(URL.createObjectURL(file));
    setError("");
    setMessage("");
  }

  async function scanSchedule() {
    if (!image) {
      setError("Choose an image of your class schedule first.");
      return;
    }
    setScanning(true);
    setError("");
    setMessage("");
    try {
      const form = new FormData();
      form.append("image", image);
      const result = await studentRequest("/api/users/me/schedule/scan", {
        method: "POST",
        body: form,
      });
      setClasses(result.classes.map((course) => ({ ...course, id: classId() })));
      setMessage(result.classes.length
        ? "Review the scanned classes below, then save your schedule."
        : "No classes were detected. Add them manually below.");
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setScanning(false);
    }
  }

  function updateClass(id, field, value) {
    setClasses((current) => current.map((course) =>
      course.id === id ? { ...course, [field]: value } : course,
    ));
    setMessage("");
  }

  async function saveSchedule() {
    setSaving(true);
    setError("");
    setMessage("");
    try {
      const result = await studentRequest("/api/users/me/schedule", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          classes: classes.map(({ name, days, startTime, endTime }) => ({
            name, days, startTime, endTime,
          })),
        }),
      });
      setClasses(result.classes.map((course) => ({ ...course, id: classId() })));
      setMessage("Your class schedule is saved to your profile.");
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <section className="ga-card student-schedule">
      <div>
        <h2>Class schedule</h2>
        <p className="ga-muted">
          Add your weekly classes so the For You section can prioritize events that don&apos;t overlap.
          Your schedule also appears on your calendar.
        </p>
      </div>

      <div className="student-schedule-upload">
        <input
          ref={inputRef}
          type="file"
          accept="image/png,image/jpeg,image/webp"
          onChange={chooseImage}
          hidden
        />
        <div>
          <strong>Scan a schedule image</strong>
          <p className="ga-muted ga-small">PNG, JPG or WebP, up to 5 MB. You can also enter classes manually.</p>
        </div>
        <div className="student-actions">
          <button type="button" className="ga-button secondary" onClick={() => inputRef.current?.click()}>
            Choose image
          </button>
          {image && (
            <button type="button" className="ga-button" disabled={scanning} onClick={scanSchedule}>
              {scanning ? "Scanning…" : "Scan schedule"}
            </button>
          )}
        </div>
        {preview && (
          <Image
            unoptimized
            width={720}
            height={500}
            className="student-schedule-preview"
            src={preview}
            alt="Selected schedule preview"
          />
        )}
      </div>

      <div className="student-schedule-list">
        <div className="student-schedule-list-heading">
          <h3>Your weekly classes</h3>
          <button
            type="button"
            className="ga-button secondary"
            onClick={() => setClasses((current) => [
              ...current,
              { id: classId(), name: "", days: "Mon", startTime: "", endTime: "" },
            ])}
          >
            Add class
          </button>
        </div>
        {loading ? <p role="status">Loading your saved schedule…</p> : null}
        {!loading && !classes.length && (
          <p className="ga-muted">No classes saved yet. Scan an image or add a class to get started.</p>
        )}
        {classes.map((course) => (
          <div className="student-schedule-row" key={course.id}>
            <label>
              <span>Course or class name</span>
              <input value={course.name} maxLength={120} onChange={(event) => updateClass(course.id, "name", event.target.value)} />
            </label>
            <label>
              <span>Days (e.g. Mon, Wed)</span>
              <input value={course.days} onChange={(event) => updateClass(course.id, "days", event.target.value)} />
            </label>
            <label>
              <span>Start time</span>
              <input type="time" value={course.startTime} onChange={(event) => updateClass(course.id, "startTime", event.target.value)} />
            </label>
            <label>
              <span>End time</span>
              <input type="time" value={course.endTime} onChange={(event) => updateClass(course.id, "endTime", event.target.value)} />
            </label>
            <button
              type="button"
              className="ga-text-button"
              aria-label={`Remove ${course.name || "class"}`}
              onClick={() => setClasses((current) => current.filter((entry) => entry.id !== course.id))}
            >
              Remove
            </button>
          </div>
        ))}
      </div>

      {error && <p className="ga-notice" role="alert">{error}</p>}
      {message && <p role="status">{message}</p>}
      <div className="student-actions">
        <button type="button" className="ga-button" disabled={loading || saving} onClick={saveSchedule}>
          {saving ? "Saving…" : "Save schedule"}
        </button>
        <span className="ga-muted ga-small">Your schedule stays private to your account.</span>
      </div>
    </section>
  );
}
