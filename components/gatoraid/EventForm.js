"use client";
import Image from "next/image";
import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  CalendarDays,
  MapPin,
  Users,
  ImagePlus,
  CheckCircle2,
  ArrowLeft,
  Eye,
  Save,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { validateEvent } from "@/lib/events/validation";
import { localTime, pacificISO } from "@/lib/events/time";
import {
  bannerFor,
  bannerStyle,
  orderedCategoryNames,
} from "@/lib/events/banner";
export default function EventForm({
  event,
  categories,
  locations,
  userId,
  hostName,
  email,
}) {
  const router = useRouter();
  const [locationSearch, setLocationSearch] = useState("");
  const [savedId, setSavedId] = useState(event?.id || null);
  const [values, setValues] = useState(() => ({
    ...{
      title: "",
      description: "",
      start_date_time: "",
      end_date_time: "",
      location_id: "",
      room_number: "",
      category_ids: [],
      contact_email: email,
      capacity: "",
      audience: "All students",
      admission_type: "free",
      rsvp_required: true,
      wheelchair_accessible: false,
      asl_available: false,
      cover_path: null,
    },
    ...event,
    start_date_time: localTime(event?.start_date_time),
    end_date_time: localTime(event?.end_date_time),
    capacity: event?.capacity ?? "",
  }));
  const [errors, setErrors] = useState({}),
    [notice, setNotice] = useState(""),
    [busy, setBusy] = useState(false),
    [image, setImage] = useState(null),
    [uploading, setUploading] = useState(false),
    [dirty, setDirty] = useState(false);
  const file = useRef(null),
    form = useRef(null);
  useEffect(() => {
    if (values.cover_path)
      createClient()
        .storage.from("event-covers")
        .createSignedUrl(values.cover_path, 3600)
        .then(({ data }) => setImage(data?.signedUrl || null));
  }, [values.cover_path]);
  useEffect(() => {
    const warn = (e) => {
      if (dirty) {
        e.preventDefault();
        e.returnValue = "";
      }
    };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [dirty]);
  const set = (key, value) => {
    setValues((v) => ({ ...v, [key]: value }));
    if (key === "cover_path" && !value) setImage(null);
    setDirty(true);
    setErrors((e) => ({ ...e, [key]: null }));
  };
  const toggle = (id) =>
    set(
      "category_ids",
      values.category_ids.includes(id)
        ? values.category_ids.filter((x) => x !== id)
        : [...values.category_ids, id],
    );
  async function upload(e) {
    const selected = e.target.files?.[0];
    if (!selected) return;
    if (
      !["image/jpeg", "image/png"].includes(selected.type) ||
      selected.size > 5 * 1024 * 1024
    ) {
      setNotice("Choose a JPG or PNG image smaller than 5 MB.");
      return;
    }
    setUploading(true);
    setNotice("");
    const path =
      userId +
      "/" +
      crypto.randomUUID() +
      "." +
      (selected.type === "image/png" ? "png" : "jpg");
    const { error } = await createClient()
      .storage.from("event-covers")
      .upload(path, selected, { contentType: selected.type, upsert: false });
    setUploading(false);
    if (error) setNotice(error.message);
    else set("cover_path", path);
  }
  async function save(action) {
    setNotice("");
    const body = {
      ...values,
      start_date_time: pacificISO(values.start_date_time),
      end_date_time: pacificISO(values.end_date_time),
    };
    const validation = validateEvent(body);
    if (Object.keys(validation.errors).length) {
      setErrors(validation.errors);
      setNotice("Please check the highlighted fields.");
      return;
    }
    setBusy(true);
    try {
      const r = await fetch(
          savedId ? "/api/host/events/" + savedId : "/api/host/events",
          {
            method: savedId ? "PATCH" : "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(body),
          },
        ),
        data = await r.json();
      if (!r.ok) {
        setErrors(data.fields || {});
        throw new Error(data.error);
      }
      setSavedId(data.event.id);
      setDirty(false);
      if (action === "publish") {
        const published = await fetch(
          "/api/host/events/" + data.event.id + "/publish",
          { method: "POST" },
        );
        const result = await published.json();
        if (!published.ok)
          throw new Error(
            result.error ||
              "Could not publish. Your draft has been saved; try again.",
          );
      }
      router.push(
        action === "draft"
          ? "/host/events"
          : "/host/events/" + data.event.id + "/preview",
      );
      router.refresh();
    } catch (e) {
      setNotice(e.message);
    } finally {
      setBusy(false);
    }
  }
  const field = (name, label, type = "text", extra = {}) => (
    <label>
      {label}
      <input
        name={name}
        type={type}
        value={values[name]}
        onChange={(e) => set(name, e.target.value)}
        aria-invalid={!!errors[name]}
        {...extra}
      />
      {errors[name] && <small className="ga-field-error">{errors[name]}</small>}
    </label>
  );
  const location = locations.find((l) => l.id === values.location_id);
  // Categories in the order the host picked them; the first one picks the banner.
  const categoryNames = orderedCategoryNames(values.category_ids, categories);
  const banner = bannerFor(categoryNames[0]);
  const checks = [
    [
      "Title & description",
      values.title.length >= 3 && values.description.length >= 10,
    ],
    ["Date & time", !!values.start_date_time && !!values.end_date_time],
    ["Campus location", !!values.location_id],
    ["Categories", values.category_ids.length > 0],
  ];
  return (
    <>
      <Link
        className="ga-back"
        href="/host/events"
        onClick={(e) => {
          if (
            dirty &&
            !window.confirm("Leave this page without saving your changes?")
          )
            e.preventDefault();
        }}
      >
        <ArrowLeft size={16} />
        Back to My Events
      </Link>
      <div className="ga-heading">
        <div>
          <h1>{event ? "Edit event" : "Create event"}</h1>
          <p className="ga-muted">
            {event
              ? "Keep your community in the loop."
              : "Start something worth showing up for."}
          </p>
        </div>
        <div className="ga-actions">
          <button
            disabled={busy || uploading}
            className="ga-button secondary"
            onClick={() => save("draft")}
          >
            <Save size={15} />
            {event ? "Save changes" : "Save draft"}
          </button>
          <button
            disabled={busy || uploading}
            className="ga-button"
            onClick={() => save("preview")}
          >
            <Eye size={15} />
            Preview
          </button>
          <button
            type="button"
            className="ga-button"
            disabled={busy || uploading}
            onClick={() => save("publish")}
          >
            <CheckCircle2 size={16} />
            {busy
              ? "Saving…"
              : event?.publication_status === "published"
                ? "Update live event"
                : "Publish event"}
          </button>
        </div>
      </div>
      {notice && (
        <div role="alert" className="ga-notice">
          {notice}
        </div>
      )}
      <div className="ga-form-grid">
        <form
          ref={form}
          onSubmit={(e) => {
            e.preventDefault();
            save("preview");
          }}
          className="ga-form"
        >
          <section className="ga-card">
            <h2>
              <CalendarDays size={18} />
              Basic
            </h2>
            {field("title", "Event title", "text", {
              maxLength: 120,
              placeholder: "e.g. Hack Night: Build with AI",
            })}
            <div className="ga-field-row">
              <label>
                Hosted by
                <input value={hostName} disabled />
              </label>
              {field("contact_email", "Contact email", "email")}
            </div>
            <label>
              Description
              <textarea
                rows={5}
                maxLength={5000}
                value={values.description}
                onChange={(e) => set("description", e.target.value)}
                placeholder="What’s happening, who should come, and what makes it special?"
                aria-invalid={!!errors.description}
              />
              {errors.description && (
                <small className="ga-field-error">{errors.description}</small>
              )}
            </label>
            <label>
              Categories
              <span className="ga-muted ga-small">
                Choose the interests your event connects with.
              </span>
            </label>
            <div className="ga-chip-group">
              {categories.map((c) => (
                <button
                  type="button"
                  key={c.id}
                  className={
                    "ga-chip " +
                    (values.category_ids.includes(c.id) ? "selected" : "")
                  }
                  aria-pressed={values.category_ids.includes(c.id)}
                  onClick={() => toggle(c.id)}
                >
                  {c.name}
                </button>
              ))}
            </div>
            {errors.category_ids && (
              <small className="ga-field-error">{errors.category_ids}</small>
            )}
          </section>
          <section className="ga-card">
            <h2>
              <CalendarDays size={18} />
              Date & time
            </h2>
            <p className="ga-muted ga-small">
              All event times use Pacific Time (SFSU).
            </p>
            <div className="ga-field-row">
              {field("start_date_time", "Starts", "datetime-local")}
              {field("end_date_time", "Ends", "datetime-local")}
            </div>
          </section>
          <section className="ga-card">
            <h2>
              <MapPin size={18} />
              Location
            </h2>
            <label>
              Search campus locations
              <input
                type="search"
                value={locationSearch}
                onChange={(e) => setLocationSearch(e.target.value)}
                placeholder="Search by name or building code, e.g. TH or Quad"
              />
            </label>
            <div className="ga-field-row">
              <label>
                Campus location
                <select
                  value={values.location_id}
                  onChange={(e) => {
                    setValues((current) => ({
                      ...current,
                      location_id: e.target.value,
                      room_number: "",
                    }));
                    setDirty(true);
                    setErrors((current) => ({
                      ...current,
                      location_id: undefined,
                    }));
                  }}
                  aria-invalid={!!errors.location_id}
                >
                  <option value="">Choose a building or outdoor space</option>
                  {locations
                    .filter(
                      (l) =>
                        l.id === values.location_id ||
                        `${l.building_name} ${l.building_code || ""}`
                          .toLowerCase()
                          .includes(locationSearch.trim().toLowerCase()),
                    )
                    .map((l) => (
                      <option key={l.id} value={l.id}>
                        {l.building_name}
                        {l.building_code ? ` (${l.building_code})` : ""}
                        {l.location_kind === "outdoor" ? " · Outdoor" : ""}
                      </option>
                    ))}
                </select>
                {errors.location_id && (
                  <small className="ga-field-error">{errors.location_id}</small>
                )}
              </label>
              {field("room_number", "Room / meeting point", "text", {
                placeholder:
                  location?.location_kind === "outdoor"
                    ? "e.g. Meet by the main entrance"
                    : "Choose a suggestion or type a room",
                list: "campus-room-suggestions",
              })}
            </div>
            <datalist id="campus-room-suggestions">
              {(location?.room_suggestions || []).map((room) => (
                <option key={room} value={room} />
              ))}
            </datalist>
            <p className="ga-muted">
              Room suggestions come from SFSU directories. You can also enter a
              room or meeting detail. Selecting a location does not reserve the
              space.
            </p>
            {location && (
              <div className="ga-location-info">
                <MapPin size={22} />
                <div>
                  <strong>{location.building_name}</strong>
                  <p>{location.description}</p>
                  {location.source_url && (
                    <a
                      href={location.source_url}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      Official location directory
                    </a>
                  )}
                  {location.room_source_url && (
                    <span>
                      {" "}
                      ·{" "}
                      <a
                        href={location.room_source_url}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        Room information
                      </a>
                    </span>
                  )}
                </div>
              </div>
            )}
          </section>
          <section className="ga-card">
            <h2>
              <Users size={18} />
              Audience & admission
            </h2>
            <label>
              Who’s it for?
              <select
                value={values.audience}
                onChange={(e) => set("audience", e.target.value)}
              >
                {[
                  "All students",
                  "Undergraduate",
                  "Graduate",
                  "First year",
                  "Transfer",
                ].map((x) => (
                  <option key={x}>{x}</option>
                ))}
              </select>
            </label>
            <div className="ga-field-row">
              <label>
                Admission
                <select
                  value={values.admission_type}
                  onChange={(e) => set("admission_type", e.target.value)}
                >
                  <option value="free">Free</option>
                  <option value="paid">Paid</option>
                </select>
              </label>
              {field("capacity", "Capacity (optional)", "number", {
                min: 1,
                max: 100000,
                placeholder: "No limit",
              })}
            </div>
            <label className="ga-check">
              <input
                type="checkbox"
                checked={values.rsvp_required}
                onChange={(e) => set("rsvp_required", e.target.checked)}
              />
              RSVP required
            </label>
            <div className="ga-field-row">
              <label className="ga-check">
                <input
                  type="checkbox"
                  checked={values.wheelchair_accessible}
                  onChange={(e) =>
                    set("wheelchair_accessible", e.target.checked)
                  }
                />
                Wheelchair accessible
              </label>
              <label className="ga-check">
                <input
                  type="checkbox"
                  checked={values.asl_available}
                  onChange={(e) => set("asl_available", e.target.checked)}
                />
                ASL interpretation available
              </label>
            </div>
          </section>
          <section className="ga-card">
            <h2>
              <ImagePlus size={18} />
              Cover image
            </h2>
            <p className="ga-muted ga-small">
              JPG or PNG, up to 5 MB. Optional.
            </p>
            <input
              ref={file}
              type="file"
              accept="image/jpeg,image/png"
              onChange={upload}
              hidden
            />
            <div className="ga-upload">
              {image ? (
                <Image
                  unoptimized
                  width={1440}
                  height={800}
                  src={image}
                  alt="Event cover preview"
                />
              ) : (
                <ImagePlus size={32} />
              )}
              <div>
                <button
                  type="button"
                  disabled={uploading}
                  className="ga-button secondary"
                  onClick={() => file.current.click()}
                >
                  {uploading
                    ? "Uploading…"
                    : image
                      ? "Replace image"
                      : "Choose image"}
                </button>
                {image && (
                  <button
                    type="button"
                    className="ga-text-button"
                    onClick={() => set("cover_path", null)}
                  >
                    Remove
                  </button>
                )}
              </div>
            </div>
          </section>
        </form>
        <aside className="ga-form-aside">
          <p className="ga-muted ga-small">Live preview</p>
          <div className="ga-mini-event ga-card">
            <div
              className="ga-cover"
              style={image ? undefined : bannerStyle(banner)}
            >
              {image ? (
                <Image
                  unoptimized
                  width={1440}
                  height={800}
                  src={image}
                  alt=""
                />
              ) : (
                <banner.Icon size={48} />
              )}
            </div>
            <div className="ga-mini-body">
              <div className="ga-chip-group">
                {categoryNames.map((name) => (
                  <span className="ga-badge" key={name}>
                    {name}
                  </span>
                ))}
              </div>
              <h2>{values.title || "Your next great event"}</h2>
              <p className="ga-muted">
                {values.start_date_time
                  ? new Date(values.start_date_time).toLocaleDateString(
                      "en-US",
                      { month: "short", day: "numeric" },
                    )
                  : "Choose a date"}{" "}
                · {location?.building_name || "Choose a location"}
              </p>
              <span className="ga-badge">
                {values.admission_type === "free" ? "Free" : "Paid admission"}
              </span>
            </div>
          </div>
          <div className="ga-card ga-checklist">
            <h3>Ready to {event ? "save" : "publish"}?</h3>
            {checks.map(([label, done]) => (
              <div key={label} className={done ? "done" : ""}>
                <CheckCircle2 size={16} />
                {label}
              </div>
            ))}
            <p className="ga-muted ga-small">
              Save a private draft, preview it, or publish it for students to
              discover.
            </p>
          </div>
        </aside>
      </div>
    </>
  );
}
