"use client";

import Link from "next/link";
import { useState, useSyncExternalStore } from "react";
import { Moon, Sun, UserRound } from "lucide-react";
import { ACADEMIC_YEARS, GENDERS, AVATAR_COLORS } from "@/lib/student/profile";
import { studentRequest, useStudentData } from "./useStudentData";
import DataState from "./DataState";
import Interests from "./Interests";
import AvatarPreview from "./AvatarPreview";
import "./profile.css";

function subscribeTheme(callback) {
  const observer = new MutationObserver(callback);
  observer.observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });
  return () => observer.disconnect();
}
function ThemeSettings() {
  const theme = useSyncExternalStore(subscribeTheme,
    () => document.documentElement.dataset.theme || "light", () => null);
  function choose(value) {
    document.documentElement.setAttribute("data-theme", value);
    try { localStorage.setItem("gatoraid-theme", value); } catch { /* Use for this visit. */ }
  }
  return <div className="profile-theme" role="group" aria-label="Color theme">
    {[["light", Sun], ["dark", Moon]].map(([value, Icon]) => <button
      key={value} type="button" className="ga-button secondary" aria-pressed={theme === value}
      onClick={() => choose(value)}><Icon size={17} />{value === "light" ? "Light" : "Dark"}</button>)}
  </div>;
}

function ProfileForm({ data }) {
  const [profile, setProfile] = useState(data.profile);
  const [saved, setSaved] = useState(data.profile);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const dirty = JSON.stringify(profile) !== JSON.stringify(saved);
  function change(field, value) {
    setProfile((previous) => ({ ...previous, [field]: value }));
    setMessage(""); setError("");
  }
  async function save(event) {
    event.preventDefault(); setBusy(true); setMessage(""); setError("");
    try {
      const result = await studentRequest("/api/users/me/profile", {
        method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(profile),
      });
      setProfile(result.profile); setSaved(result.profile); setMessage("Your profile and notification preferences are saved.");
    } catch (error) { setError(error.message); }
    finally { setBusy(false); }
  }
  return <>
    <section className="ga-card profile-summary" aria-label="Profile overview">
      <span className="profile-avatar" aria-hidden="true">{saved.display_name?.trim().charAt(0).toUpperCase() || <UserRound />}</span>
      <div><h2>{saved.display_name || "Your campus profile"}</h2>
        <p className="ga-muted">{[saved.academic_year, saved.major].filter(Boolean).join(" · ") || "Tell us a little about yourself."}</p>
        <p className="ga-muted profile-email">{data.email}</p></div>
    </section>
    <form onSubmit={save} className="profile-form">
      <fieldset disabled={busy} className="ga-card profile-details">
        <legend>Profile details</legend>
        <p className="ga-muted">Your academic details and gender are optional. Your profile is private to your account.</p>
        <div className="profile-fields">
          <label>Name<input autoComplete="name" required maxLength={80} value={profile.display_name} onChange={(e) => change("display_name", e.target.value)} /></label>
          <label>Email<input type="email" value={data.email} readOnly aria-describedby="profile-email-help" />
            <small id="profile-email-help" className="ga-muted">{data.email_verified ? "Verified account email" : "Check your inbox to verify your account email"}</small></label>
          <label>Academic year<select value={profile.academic_year} onChange={(e) => change("academic_year", e.target.value)}>
            <option value="">Choose your year (optional)</option>{ACADEMIC_YEARS.map((year) => <option key={year}>{year}</option>)}
          </select></label>
          <label>Major<input maxLength={120} placeholder="e.g. Computer Science" value={profile.major} onChange={(e) => change("major", e.target.value)} /></label>
          <label>Gender<select value={profile.gender} onChange={(e) => change("gender", e.target.value)}>
            <option value="">Choose an option (optional)</option>{GENDERS.map((gender) => <option key={gender}>{gender}</option>)}
          </select></label>
        </div>
      </fieldset>
      <fieldset disabled={busy} className="ga-card profile-avatar-settings">
        <legend>Avatar colors</legend>
        <p className="ga-muted">Choose colors for your avatar. Save your profile to keep them.</p>
        <AvatarPreview skin={profile.avatar_skin_color} hair={profile.avatar_hair_color} shirt={profile.avatar_shirt_color} />
        {[["avatar_skin_color", "Skin color", ["Light", "Medium", "Tan", "Deep"]], ["avatar_hair_color", "Hair color", ["Black", "Brown", "Light brown", "Blonde", "Red", "Gray"]], ["avatar_shirt_color", "Shirt color", ["Purple", "Blue", "Green", "Red", "Gold"]]].map(([field, label, names]) => <label className="avatar-color-field" key={field}>
          {label}<select value={profile[field]} onChange={(e) => change(field, e.target.value)}>
            {AVATAR_COLORS[field].map((color, index) => <option key={color} value={color}>{names[index]}</option>)}
          </select>
        </label>)}
        <label className="profile-check"><span><strong>Connect with event attendees</strong><small className="ga-muted">Show your name, academic details, interests, and avatar to other opted-in attendees when you RSVP attending. They can message you about that event.</small></span>
          <input type="checkbox" checked={profile.attendee_visible} onChange={(event) => change("attendee_visible", event.target.checked)} /></label>
      </fieldset>
      <fieldset disabled={busy} className="ga-card profile-notifications" id="notifications">
        <legend>Notifications</legend>
        <p className="ga-muted" id="notification-help">Save your email preferences now. Email delivery is a future enhancement.</p>
        {[
          ["notify_cancellations", "Event cancellations", "When a saved or RSVP’d event is cancelled."],
          ["notify_updates", "Event updates", "Changes to the time, location, or details of your events."],
          ["notify_reminders", "Upcoming event reminders", "Reminders for events you saved or RSVP’d to."],
        ].map(([field, label, description]) => <label className="profile-check" key={field}>
          <span><strong>{label}</strong><small className="ga-muted">{description}</small></span>
          <input type="checkbox" checked={profile[field]} aria-describedby="notification-help" onChange={(e) => change(field, e.target.checked)} />
        </label>)}
      </fieldset>
      <div className="profile-save">
        {error && <p role="alert">{error}</p>}{message && <p role="status">{message}</p>}
        <div className="student-actions">
          <button className="ga-button" disabled={busy || !dirty}>{busy ? "Saving…" : "Save profile"}</button>
          <button type="button" className="ga-button secondary" disabled={busy || !dirty} onClick={() => {
            setProfile(saved); setMessage(""); setError("");
          }}>Discard changes</button>
        </div>
      </div>
    </form>
    <div className="profile-columns">
      <section aria-labelledby="profile-interests"><h2 id="profile-interests">Interests</h2><Interests embedded /></section>
      <div className="profile-sections">
        <section className="ga-card"><h2>Class schedule</h2><p className="ga-muted">Find events in your free time and see potential class conflicts.</p>
          <Link className="ga-button secondary" href="/schedule">Manage your schedule</Link></section>
        <section className="ga-card" id="settings"><h2>Appearance</h2><p className="ga-muted">Choose a theme for this browser. Changes apply immediately.</p><ThemeSettings /></section>
        <section className="ga-card"><h2>Account</h2><p className="ga-muted">Manage your plans and account security.</p>
          <div className="profile-links"><Link href="/saved">Your saved events and RSVPs</Link><Link href="/calendar">Your calendar</Link>
            <Link href="/forgot-password">Reset your password</Link></div></section>
      </div>
    </div>
  </>;
}

export default function Profile() {
  const state = useStudentData("/api/users/me/profile");
  return <>
    <div className="ga-heading"><div><h1>Your profile</h1><p className="ga-muted">Make GatorAid feel more like you.</p></div></div>
    {state.error?.status === 401 ? <section className="ga-card ga-empty"><h2>Your campus life, in one place</h2>
      <p>Sign in to manage your profile, interests, and settings.</p><Link className="ga-button" href="/login?next=/profile">Sign in or create an account</Link></section>
      : state.loading || state.error ? <DataState {...state} /> : <ProfileForm data={state.data} />}
  </>;
}
