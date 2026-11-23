"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";

export default function EventConnections({ eventId }) {
  const [attendees, setAttendees] = useState([]);
  const [selected, setSelected] = useState(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    const db = createClient();
    async function load() {
      const { data: auth } = await db.auth.getUser();
      if (!active) return;
      if (!auth.user) { setError("Sign in to connect with attendees."); setLoading(false); return; }
      const result = await db.rpc("event_attendees", { p_event: eventId });
      if (!active) return;
      if (result.error) setError("Could not load attendees. Please try again.");
      else setAttendees(result.data.filter((attendee) => attendee.user_id !== auth.user.id));
      setLoading(false);
    }
    load();
    return () => { active = false; };
  }, [eventId]);

  return <div className="ga-card event-connections">
    <h2>Connect with attendees</h2>
    <p className="ga-muted">Attending and opted-in students can see each other here. Enable connections in <Link href="/profile">your profile</Link>.</p>
    {loading ? <p role="status">Loading attendees…</p> : attendees.length ? <div className="connection-layout">
      <div><h3>Attendees</h3><ul className="connection-list">{attendees.map((person) => <li key={person.user_id}>
        <button type="button" className="connection-person" aria-pressed={selected?.user_id === person.user_id}
          title={`${person.display_name}${person.major ? ` · ${person.major}` : ""}${person.interests?.length ? ` · ${person.interests.join(", ")}` : ""}`}
          onClick={() => setSelected(person)}>
          <span className="connection-avatar" aria-hidden="true" style={{ "--skin": person.avatar_skin_color, "--hair": person.avatar_hair_color, "--shirt": person.avatar_shirt_color }}><span /></span>
          <span>{person.display_name}<small>{person.major || "Attendee"}</small></span></button></li>)}</ul></div>
      <div>{selected ? <><h3>{selected.display_name}</h3><p className="ga-muted">{[selected.academic_year, selected.major].filter(Boolean).join(" · ")}</p>
        <p>Interests: {selected.interests?.join(", ") || "None shared"}</p>
        </> : <p>Select an attendee to view their profile.</p>}</div>
    </div> : <p>No other attendees are available yet. Confirm your RSVP and enable connections in your profile to join.</p>}
    <div className="connection-thread"><strong>Event messages</strong><p className="ga-muted">Messaging is coming soon.</p>
      <button type="button" className="ga-button secondary" disabled>Start conversation</button></div>
    {error && <p role="alert">{error}</p>}
  </div>;
}
